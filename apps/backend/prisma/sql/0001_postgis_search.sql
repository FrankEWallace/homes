-- =====================================================================
-- PostGIS geo-search for the real-estate marketplace.
-- Applied AFTER `prisma db push` / `prisma migrate` creates the Prisma
-- tables. Prisma keeps PascalCase table + camelCase column identifiers, so
-- everything here is quoted. Idempotent — safe to re-run.
--
-- Queried via prisma.$queryRaw behind the SearchEngine seam (src/search/*),
-- so Postgres -> Typesense/OpenSearch stays an adapter swap.
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ── Derived geo + full-text columns on "Listing" ─────────────────────────────
alter table "Listing" add column if not exists geom geography(Point, 4326);

alter table "Listing" add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '') || ' ' || coalesce(region, '') || ' ' || coalesce("locationName", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(address, '') || ' ' || coalesce("postalCode", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'D')
  ) stored;

-- Keep geom in sync with latitude/longitude (source of truth stays the columns).
create or replace function listing_sync_geom()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.geom := st_setsrid(st_makepoint(new.longitude::float8, new.latitude::float8), 4326)::geography;
  else
    new.geom := null;
  end if;
  return new;
end;
$$;

drop trigger if exists listing_geom_sync on "Listing";
create trigger listing_geom_sync
  before insert or update of latitude, longitude on "Listing"
  for each row execute function listing_sync_geom();

-- Backfill any existing rows.
update "Listing"
set geom = st_setsrid(st_makepoint(longitude::float8, latitude::float8), 4326)::geography
where longitude is not null and latitude is not null and geom is null;

-- Search-specific indexes (btree filters already exist via Prisma @@index).
create index if not exists listing_geom_idx       on "Listing" using gist (geom);
create index if not exists listing_tsv_idx        on "Listing" using gin (search_tsv);
create index if not exists listing_title_trgm_idx on "Listing" using gin (title gin_trgm_ops);
create index if not exists listing_published_idx  on "Listing" ("publishedAt" desc) where status = 'published';

-- ── search_listings() ────────────────────────────────────────────────────────
create or replace function search_listings(
  p_q         text     default null,
  p_tenure    "Tenure" default null,
  p_type      text     default null,
  p_city      text     default null,
  p_min_price numeric  default null,
  p_max_price numeric  default null,
  p_min_beds  int      default null,
  p_min_baths numeric  default null,
  p_bbox      float8[] default null,   -- [minLng, minLat, maxLng, maxLat]
  p_sort      text     default 'relevance',
  p_limit     int      default 24,
  p_offset    int      default 0
)
returns table (
  id text,
  slug text,
  title text,
  tenure text,
  price numeric,
  currency text,
  rent_period text,
  bedrooms int,
  bathrooms numeric,
  area_sqft numeric,
  city text,
  region text,
  property_type text,
  is_featured boolean,
  published_at timestamptz,
  lng double precision,
  lat double precision,
  primary_photo text,
  total_count bigint
)
language sql stable as $$
  with q as (
    select case when p_q is null or length(trim(p_q)) = 0
                then null else websearch_to_tsquery('english', p_q) end as tsq
  )
  select
    l.id, l.slug, l.title, l.tenure::text, l."priceAmount", l."priceCurrency",
    l."rentPeriod"::text, l.bedrooms, l.bathrooms, l."areaSqft", l.city, l.region,
    l.type,
    l."isFeatured", l."publishedAt",
    st_x(l.geom::geometry) as lng,
    st_y(l.geom::geometry) as lat,
    (case when array_length(l.images, 1) >= 1 then l.images[1] else null end) as primary_photo,
    count(*) over() as total_count
  from "Listing" l, q
  where l.status = 'published'
    and (p_tenure    is null or l.tenure = p_tenure)
    and (p_type      is null or l.type = p_type)
    and (p_city      is null or l.city ilike '%' || p_city || '%')
    and (p_min_price is null or l."priceAmount" >= p_min_price)
    and (p_max_price is null or l."priceAmount" <= p_max_price)
    and (p_min_beds  is null or l.bedrooms >= p_min_beds)
    and (p_min_baths is null or l.bathrooms >= p_min_baths)
    and (p_bbox      is null or l.geom && st_makeenvelope(p_bbox[1], p_bbox[2], p_bbox[3], p_bbox[4], 4326)::geography)
    and (q.tsq       is null or l.search_tsv @@ q.tsq)
  order by
    l."isFeatured" desc,
    case when p_sort = 'relevance' and q.tsq is not null then ts_rank(l.search_tsv, q.tsq) end desc nulls last,
    case when p_sort = 'price_asc'  then l."priceAmount" end asc  nulls last,
    case when p_sort = 'price_desc' then l."priceAmount" end desc nulls last,
    l."publishedAt" desc nulls last
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

-- ── search_listing_facets() ──────────────────────────────────────────────────
create or replace function search_listing_facets(
  p_q         text     default null,
  p_tenure    "Tenure" default null,
  p_type      text     default null,
  p_city      text     default null,
  p_min_price numeric  default null,
  p_max_price numeric  default null,
  p_min_beds  int      default null,
  p_min_baths numeric  default null,
  p_bbox      float8[] default null
)
returns jsonb
language sql stable as $$
  with q as (
    select case when p_q is null or length(trim(p_q)) = 0
                then null else websearch_to_tsquery('english', p_q) end as tsq
  ),
  filtered as (
    select l.* from "Listing" l, q
    where l.status = 'published'
      and (p_tenure    is null or l.tenure = p_tenure)
      and (p_type      is null or l.type = p_type)
      and (p_city      is null or l.city ilike '%' || p_city || '%')
      and (p_min_price is null or l."priceAmount" >= p_min_price)
      and (p_max_price is null or l."priceAmount" <= p_max_price)
      and (p_min_beds  is null or l.bedrooms >= p_min_beds)
      and (p_min_baths is null or l.bathrooms >= p_min_baths)
      and (p_bbox      is null or l.geom && st_makeenvelope(p_bbox[1], p_bbox[2], p_bbox[3], p_bbox[4], 4326)::geography)
      and (q.tsq       is null or l.search_tsv @@ q.tsq)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'tenure', coalesce((select jsonb_object_agg(tenure, n) from (
        select tenure::text as tenure, count(*) n from filtered group by tenure) t), '{}'::jsonb),
    'propertyTypes', coalesce((select jsonb_object_agg(type, n) from (
        select type, count(*) n from filtered group by type) t), '{}'::jsonb),
    'bedrooms', coalesce((select jsonb_object_agg(bucket, n) from (
        select least(coalesce(bedrooms, 0), 5) as bucket, count(*) n
        from filtered group by least(coalesce(bedrooms, 0), 5)) b), '{}'::jsonb)
  );
$$;
