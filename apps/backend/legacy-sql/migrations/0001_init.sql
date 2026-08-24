-- =====================================================================
-- 0001_init — Real Estate Marketplace core schema (v1)
-- Postgres 16 + PostGIS. Source of truth. Derived data (search, caches,
-- static pages) are rebuildable projections of these tables.
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------- enums ----------
create type tenure as enum ('sale', 'rent');
create type listing_status as enum ('draft', 'published', 'under_offer', 'sold', 'let', 'withdrawn');
create type rent_period as enum ('week', 'month', 'year');
create type agent_role as enum ('owner', 'admin', 'agent');
create type lead_status as enum ('new', 'contacted', 'qualified', 'closed', 'spam');
create type media_kind as enum ('photo', 'floorplan', 'tour', 'video');

-- ---------- updated_at helper ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- identity (portable: link by auth_user_id, not FK to auth.users) ----------
create table agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  email       text,
  phone       text,
  logo_path   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger agencies_updated before update on agencies for each row execute function set_updated_at();

create table agents (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,               -- GoTrue user id (Supabase now, self-hosted later)
  agency_id     uuid references agencies(id) on delete set null,
  full_name     text not null,
  email         text not null,
  phone         text,
  role          agent_role not null default 'agent',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger agents_updated before update on agents for each row execute function set_updated_at();
create index agents_agency_idx on agents(agency_id);

create table app_users (                    -- seekers
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,
  email         text not null,
  full_name     text,
  created_at    timestamptz not null default now()
);

-- ---------- taxonomy (F15) ----------
create table locations (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references locations(id) on delete cascade,
  kind        text not null check (kind in ('country','region','city','neighborhood')),
  name        text not null,
  slug        text not null,
  centroid    geography(Point, 4326),
  created_at  timestamptz not null default now(),
  unique (parent_id, slug)
);
create index locations_parent_idx on locations(parent_id);
create index locations_centroid_idx on locations using gist (centroid);

create table property_types (
  id    uuid primary key default gen_random_uuid(),
  slug  text not null unique,
  name  text not null
);

create table amenities (
  id    uuid primary key default gen_random_uuid(),
  slug  text not null unique,
  name  text not null
);

-- ---------- listings (core) ----------
create table listings (
  id               uuid primary key default gen_random_uuid(),
  agency_id        uuid references agencies(id) on delete set null,
  agent_id         uuid references agents(id) on delete set null,
  status           listing_status not null default 'draft',
  tenure           tenure not null,
  title            text not null,
  description      text,
  price            numeric(14,2) not null,
  currency         char(3) not null default 'USD',
  rent_period      rent_period,             -- required when tenure = 'rent'
  property_type_id uuid references property_types(id),
  bedrooms         int,
  bathrooms        numeric(3,1),
  area_sqft        numeric(10,1),
  lot_sqft         numeric(12,1),
  year_built       int,
  address_line     text,
  city             text,
  region           text,
  postal_code      text,
  country          char(2) not null default 'US',
  location_id      uuid references locations(id) on delete set null,
  geom             geography(Point, 4326),
  slug             text not null unique,
  featured         boolean not null default false,
  view_count       int not null default 0,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- full-text projection kept in-row (derived, rebuildable)
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(city,'') || ' ' || coalesce(region,'') || ' ' || coalesce(postal_code,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(address_line,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'D')
  ) stored,
  constraint rent_needs_period check (tenure <> 'rent' or rent_period is not null)
);
create trigger listings_updated before update on listings for each row execute function set_updated_at();

-- Search & filter indexes
create index listings_geom_idx        on listings using gist (geom);
create index listings_tsv_idx         on listings using gin (search_tsv);
create index listings_title_trgm_idx  on listings using gin (title gin_trgm_ops);
create index listings_status_idx      on listings(status);
create index listings_tenure_idx      on listings(tenure);
create index listings_price_idx       on listings(price);
create index listings_ptype_idx       on listings(property_type_id);
create index listings_location_idx    on listings(location_id);
create index listings_beds_idx        on listings(bedrooms);
-- Hot path: only published listings are publicly searchable
create index listings_published_idx   on listings(published_at desc) where status = 'published';

create table listing_media (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  kind        media_kind not null default 'photo',
  storage_path text not null,              -- S3 key; served through storage adapter
  alt         text,
  width       int,
  height      int,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index listing_media_listing_idx on listing_media(listing_id, sort_order);

create table listing_amenities (
  listing_id  uuid not null references listings(id) on delete cascade,
  amenity_id  uuid not null references amenities(id) on delete cascade,
  primary key (listing_id, amenity_id)
);

create table listing_price_history (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  price       numeric(14,2) not null,
  recorded_at timestamptz not null default now()
);
create index listing_price_history_idx on listing_price_history(listing_id, recorded_at desc);

-- ---------- seeker engagement ----------
create table favorites (
  id          uuid primary key default gen_random_uuid(),
  app_user_id uuid not null references app_users(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (app_user_id, listing_id)
);
create index favorites_user_idx on favorites(app_user_id);

create table saved_searches (
  id             uuid primary key default gen_random_uuid(),
  app_user_id    uuid not null references app_users(id) on delete cascade,
  name           text,
  query          jsonb not null,           -- normalized search criteria
  alert_frequency text not null default 'daily' check (alert_frequency in ('instant','daily','weekly','off')),
  last_run_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index saved_searches_user_idx on saved_searches(app_user_id);

create table leads (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references listings(id) on delete set null,
  agent_id    uuid references agents(id) on delete set null,
  agency_id   uuid references agencies(id) on delete set null,
  app_user_id uuid references app_users(id) on delete set null, -- null for anonymous enquiries
  name        text not null,
  email       text not null,
  phone       text,
  message     text,
  source      text not null default 'listing_enquiry',
  status      lead_status not null default 'new',
  created_at  timestamptz not null default now()
);
create index leads_agency_idx on leads(agency_id, created_at desc);
create index leads_listing_idx on leads(listing_id);

-- =====================================================================
-- Row-Level Security — never trust the client (Blueprint §11)
-- App server uses the service role for writes; these policies protect
-- direct (anon/authenticated) access.
-- =====================================================================
alter table listings         enable row level security;
alter table listing_media    enable row level security;
alter table listing_amenities enable row level security;
alter table listing_price_history enable row level security;
alter table favorites        enable row level security;
alter table saved_searches   enable row level security;
alter table leads            enable row level security;
alter table agents           enable row level security;
alter table agencies         enable row level security;

-- Public read: only published listings and their public sub-data
create policy listings_public_read on listings
  for select using (status = 'published');
create policy media_public_read on listing_media
  for select using (exists (select 1 from listings l where l.id = listing_id and l.status = 'published'));
create policy amenities_public_read on listing_amenities
  for select using (exists (select 1 from listings l where l.id = listing_id and l.status = 'published'));
create policy price_history_public_read on listing_price_history
  for select using (exists (select 1 from listings l where l.id = listing_id and l.status = 'published'));

-- Agents manage only their own agency's listings
create policy listings_agency_all on listings
  for all using (
    agency_id in (select agency_id from agents where auth_user_id = auth.uid())
  ) with check (
    agency_id in (select agency_id from agents where auth_user_id = auth.uid())
  );

-- Leads: readable only by the owning agency's members (PII lockdown). Inserts
-- go through the server (service role); no anon insert policy on purpose.
create policy leads_agency_read on leads
  for select using (
    agency_id in (select agency_id from agents where auth_user_id = auth.uid())
  );

-- Seeker-owned rows
create policy favorites_owner on favorites
  for all using (app_user_id in (select id from app_users where auth_user_id = auth.uid()))
  with check (app_user_id in (select id from app_users where auth_user_id = auth.uid()));
create policy saved_searches_owner on saved_searches
  for all using (app_user_id in (select id from app_users where auth_user_id = auth.uid()))
  with check (app_user_id in (select id from app_users where auth_user_id = auth.uid()));

-- Taxonomy is public reference data (no RLS; readable by all roles)
