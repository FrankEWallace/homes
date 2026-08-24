-- =====================================================================
-- 0002_search — PostGIS + full-text search (v1 search engine)
-- Kept behind the repository's SearchEngine interface so it can be
-- swapped for Typesense/OpenSearch at scale without touching feature code.
-- =====================================================================

-- Main search: bbox + filters + full-text ranking + pagination.
-- total_count is returned per-row via a window function (single round-trip).
create or replace function search_listings(
  p_q                text    default null,
  p_tenure           tenure  default null,
  p_min_price        numeric default null,
  p_max_price        numeric default null,
  p_min_beds         int     default null,
  p_min_baths        numeric default null,
  p_property_type_ids uuid[] default null,
  p_amenity_ids      uuid[]  default null,
  p_bbox             float8[] default null,   -- [minLng, minLat, maxLng, maxLat]
  p_sort             text    default 'relevance',
  p_limit            int     default 24,
  p_offset           int     default 0
)
returns table (
  id uuid,
  slug text,
  title text,
  tenure tenure,
  price numeric,
  currency char(3),
  rent_period rent_period,
  bedrooms int,
  bathrooms numeric,
  area_sqft numeric,
  city text,
  region text,
  property_type_id uuid,
  featured boolean,
  published_at timestamptz,
  lng double precision,
  lat double precision,
  primary_photo text,
  total_count bigint
)
language sql stable as $$
  with q as (
    select case when p_q is null or length(trim(p_q)) = 0
                then null
                else websearch_to_tsquery('english', p_q) end as tsq
  )
  select
    l.id, l.slug, l.title, l.tenure, l.price, l.currency, l.rent_period,
    l.bedrooms, l.bathrooms, l.area_sqft, l.city, l.region, l.property_type_id,
    l.featured, l.published_at,
    st_x(l.geom::geometry) as lng,
    st_y(l.geom::geometry) as lat,
    (select m.storage_path from listing_media m
       where m.listing_id = l.id and m.kind = 'photo'
       order by m.sort_order limit 1) as primary_photo,
    count(*) over() as total_count
  from listings l, q
  where l.status = 'published'
    and (p_tenure is null or l.tenure = p_tenure)
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_min_beds is null or l.bedrooms >= p_min_beds)
    and (p_min_baths is null or l.bathrooms >= p_min_baths)
    and (p_property_type_ids is null or l.property_type_id = any(p_property_type_ids))
    and (p_bbox is null or l.geom && st_makeenvelope(p_bbox[1], p_bbox[2], p_bbox[3], p_bbox[4], 4326)::geography)
    and (q.tsq is null or l.search_tsv @@ q.tsq)
    and (
      p_amenity_ids is null
      or (select count(distinct la.amenity_id) from listing_amenities la
            where la.listing_id = l.id and la.amenity_id = any(p_amenity_ids))
         = array_length(p_amenity_ids, 1)
    )
  order by
    l.featured desc,
    case when p_sort = 'relevance' and q.tsq is not null
         then ts_rank(l.search_tsv, q.tsq) end desc nulls last,
    case when p_sort = 'price_asc'  then l.price end asc  nulls last,
    case when p_sort = 'price_desc' then l.price end desc nulls last,
    l.published_at desc nulls last
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

-- Facet counts over the same filter set (property type, tenure, bedroom buckets).
-- v1 returns counts across the full filtered result; drill-down-exclusive
-- faceting is a later refinement.
create or replace function search_listing_facets(
  p_q                text    default null,
  p_tenure           tenure  default null,
  p_min_price        numeric default null,
  p_max_price        numeric default null,
  p_min_beds         int     default null,
  p_min_baths        numeric default null,
  p_property_type_ids uuid[] default null,
  p_amenity_ids      uuid[]  default null,
  p_bbox             float8[] default null
)
returns jsonb
language sql stable as $$
  with q as (
    select case when p_q is null or length(trim(p_q)) = 0
                then null else websearch_to_tsquery('english', p_q) end as tsq
  ),
  filtered as (
    select l.*
    from listings l, q
    where l.status = 'published'
      and (p_tenure is null or l.tenure = p_tenure)
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
      and (p_min_beds is null or l.bedrooms >= p_min_beds)
      and (p_min_baths is null or l.bathrooms >= p_min_baths)
      and (p_property_type_ids is null or l.property_type_id = any(p_property_type_ids))
      and (p_bbox is null or l.geom && st_makeenvelope(p_bbox[1], p_bbox[2], p_bbox[3], p_bbox[4], 4326)::geography)
      and (q.tsq is null or l.search_tsv @@ q.tsq)
      and (
        p_amenity_ids is null
        or (select count(distinct la.amenity_id) from listing_amenities la
              where la.listing_id = l.id and la.amenity_id = any(p_amenity_ids))
           = array_length(p_amenity_ids, 1)
      )
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'property_types', coalesce((
      select jsonb_object_agg(pt.slug, c.n) from (
        select property_type_id, count(*) n from filtered group by property_type_id
      ) c join property_types pt on pt.id = c.property_type_id
    ), '{}'::jsonb),
    'bedrooms', coalesce((
      select jsonb_object_agg(bucket, n) from (
        select least(coalesce(bedrooms, 0), 5) as bucket, count(*) n
        from filtered group by least(coalesce(bedrooms, 0), 5)
      ) b
    ), '{}'::jsonb)
  );
$$;
