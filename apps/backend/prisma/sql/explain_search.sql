-- =====================================================================
-- Phase 5 — search index-usage probe.
--
-- Runs EXPLAIN (ANALYZE, BUFFERS) over the representative query shapes that
-- search_listings() executes, so you can confirm the Phase-1 indexes are used:
--   listing_geom_idx        (GiST)  → bbox / spatial
--   listing_tsv_idx         (GIN)   → full-text
--   listing_title_trgm_idx  (GIN)   → title fuzzy
--   listing_published_idx   (partial btree) → status='published' + recency
--
-- CAVEAT: on the ~13-row seed the planner correctly prefers Seq Scan (indexes
-- only win at scale). Validate index usage against a scaled dataset — generate
-- one with the block at the bottom, or point this at a production-sized branch.
--
-- Usage:  psql "$DATABASE_URL" -f apps/backend/prisma/sql/explain_search.sql
-- =====================================================================

\timing on

-- 1. Full-text search (expect Bitmap Index Scan on listing_tsv_idx at scale)
explain (analyze, buffers)
select l.id, ts_rank(l.search_tsv, websearch_to_tsquery('english', 'beachfront villa')) r
from "Listing" l
where l.status = 'published'
  and l.search_tsv @@ websearch_to_tsquery('english', 'beachfront villa')
order by r desc
limit 24;

-- 2. Map-bounds / bbox (expect Index Scan using listing_geom_idx at scale)
explain (analyze, buffers)
select l.id
from "Listing" l
where l.status = 'published'
  and l.geom && st_makeenvelope(38.9, -7.0, 39.5, -6.6, 4326)::geography
limit 24;

-- 3. Faceted filter + recency sort (expect listing_published_idx to help)
explain (analyze, buffers)
select l.id
from "Listing" l
where l.status = 'published'
  and l.tenure = 'sale'
  and l."priceAmount" between 50000000 and 900000000
order by l."isFeatured" desc, l."publishedAt" desc
limit 24;

-- 4. City ilike (partial-match; benefits from trigram at scale)
explain (analyze, buffers)
select l.id
from "Listing" l
where l.status = 'published'
  and l.city ilike '%dar%'
limit 24;

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: generate a scaled dataset to make index plans meaningful.
-- Clones published listings with jittered coordinates/prices. Run, re-run the
-- EXPLAINs above, then ROLLBACK (this whole block is transactional).
-- ─────────────────────────────────────────────────────────────────────────────
-- begin;
--   insert into "Listing" (id, slug, title, description, type, tenure, status,
--     "priceAmount", "priceCurrency", bedrooms, bathrooms, "areaSqft",
--     city, region, country, address, latitude, longitude, images,
--     "hostId", "publishedAt", "createdAt", "updatedAt")
--   select
--     gen_random_uuid()::text,
--     slug || '-' || g,
--     title, description, type, tenure, status,
--     "priceAmount" * (0.7 + random() * 0.6), "priceCurrency",
--     bedrooms, bathrooms, "areaSqft",
--     city, region, country, address,
--     latitude + (random() - 0.5) * 0.4,
--     longitude + (random() - 0.5) * 0.4,
--     images, "hostId", "publishedAt", now(), now()
--   from "Listing", generate_series(1, 20000) g
--   where status = 'published';
--   analyze "Listing";
--   -- ... re-run the EXPLAINs above here ...
-- rollback;
