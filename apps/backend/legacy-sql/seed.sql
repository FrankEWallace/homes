-- =====================================================================
-- seed.sql — synthetic reference + listing data for local dev / tests.
-- Idempotent-ish: run against a fresh DB after migrations.
-- =====================================================================

-- Taxonomy
insert into property_types (slug, name) values
  ('house','House'), ('apartment','Apartment'), ('condo','Condo'),
  ('townhouse','Townhouse'), ('studio','Studio');

insert into amenities (slug, name) values
  ('parking','Parking'), ('pool','Pool'), ('gym','Gym'), ('balcony','Balcony'),
  ('garden','Garden'), ('pet_friendly','Pet friendly'), ('ac','Air conditioning'),
  ('elevator','Elevator');

-- Locations (country -> region -> city)
insert into locations (id, parent_id, kind, name, slug, centroid) values
  ('00000000-0000-0000-0000-000000000001', null, 'country', 'United States', 'us', null);
insert into locations (parent_id, kind, name, slug, centroid) values
  ((select id from locations where slug='us'), 'region', 'California', 'california',
     st_setsrid(st_makepoint(-119.4179, 36.7783),4326)),
  ((select id from locations where slug='us'), 'region', 'Texas', 'texas',
     st_setsrid(st_makepoint(-99.9018, 31.9686),4326));
insert into locations (parent_id, kind, name, slug, centroid) values
  ((select id from locations where slug='california'), 'city', 'San Francisco', 'san-francisco',
     st_setsrid(st_makepoint(-122.4194, 37.7749),4326)),
  ((select id from locations where slug='texas'), 'city', 'Austin', 'austin',
     st_setsrid(st_makepoint(-97.7431, 30.2672),4326));

-- Agency + agent
insert into agencies (id, name, slug, email, phone)
values ('00000000-0000-0000-0000-0000000000a1', 'Bay Realty', 'bay-realty', 'hello@bayrealty.test', '+1-415-555-0100');
insert into agents (agency_id, full_name, email, phone, role)
values ('00000000-0000-0000-0000-0000000000a1', 'Jordan Rivera', 'jordan@bayrealty.test', '+1-415-555-0101', 'owner');

-- Listings (published). Coordinates jittered around SF and Austin.
insert into listings
  (agency_id, agent_id, status, tenure, title, description, price, currency, rent_period,
   property_type_id, bedrooms, bathrooms, area_sqft, address_line, city, region, postal_code,
   location_id, geom, slug, featured, published_at)
select
  a.id, ag.id, 'published', v.tenure, v.title, v.descr, v.price, 'USD', v.rent_period,
  (select id from property_types where slug = v.ptype),
  v.beds, v.baths, v.area, v.addr, v.city, v.region, v.zip,
  (select id from locations where slug = v.city_slug),
  st_setsrid(st_makepoint(v.lng, v.lat), 4326),
  v.slug, v.featured, now() - (v.age_days || ' days')::interval
from agencies a
  cross join agents ag
  cross join (values
    ('sale'::tenure, 'Sunny Victorian near Dolores Park', 'Light-filled 3-bed Victorian with bay windows and a landscaped garden.', 1850000, null::rent_period, 'house', 3, 2.0, 1900, '1200 Guerrero St', 'San Francisco', 'California', '94110', 'san-francisco', -122.4239, 37.7566, 'sf-victorian-dolores', true, 3),
    ('sale', 'Modern SoMa Condo with skyline views', 'High-floor 2-bed condo, floor-to-ceiling glass, building gym and pool.', 1200000, null, 'condo', 2, 2.0, 1150, '333 Brannan St', 'San Francisco', 'California', '94107', 'san-francisco', -122.3931, 37.7817, 'sf-soma-condo', false, 9),
    ('rent', 'Cozy Mission studio', 'Efficient studio steps from BART, hardwood floors, great light.', 2600, 'month', 'studio', 0, 1.0, 480, '2500 Mission St', 'San Francisco', 'California', '94110', 'san-francisco', -122.4187, 37.7565, 'sf-mission-studio', false, 2),
    ('rent', 'Nob Hill 1-bed with parking', 'Classic 1-bed apartment, deeded parking, elevator building.', 3400, 'month', 'apartment', 1, 1.0, 720, '1000 California St', 'San Francisco', 'California', '94108', 'san-francisco', -122.4128, 37.7919, 'sf-nobhill-1bed', false, 6),
    ('sale', 'Noe Valley townhouse', 'Renovated 4-bed townhouse with roof deck and two-car garage.', 2650000, null, 'townhouse', 4, 3.0, 2400, '400 27th St', 'San Francisco', 'California', '94131', 'san-francisco', -122.4330, 37.7480, 'sf-noe-townhouse', true, 12),
    ('sale', 'East Austin bungalow', 'Charming 2-bed bungalow with a big backyard, walkable to cafes.', 720000, null, 'house', 2, 1.0, 1300, '1900 E 6th St', 'Austin', 'Texas', '78702', 'austin', -97.7220, 30.2610, 'atx-eastside-bungalow', false, 4),
    ('rent', 'Downtown Austin high-rise 2-bed', 'Amenity-rich tower with pool, gym, and lake views.', 3100, 'month', 'apartment', 2, 2.0, 1080, '200 Congress Ave', 'Austin', 'Texas', '78701', 'austin', -97.7460, 30.2640, 'atx-downtown-2bed', true, 1),
    ('sale', 'South Congress condo', 'Stylish 1-bed condo in the heart of SoCo, walk everywhere.', 545000, null, 'condo', 1, 1.0, 760, '1400 S Congress Ave', 'Austin', 'Texas', '78704', 'austin', -97.7500, 30.2480, 'atx-soco-condo', false, 8),
    ('rent', 'Zilker garden apartment', 'Quiet 1-bed near Zilker Park with private garden and AC.', 1950, 'month', 'apartment', 1, 1.0, 650, '2000 Barton Springs Rd', 'Austin', 'Texas', '78704', 'austin', -97.7690, 30.2630, 'atx-zilker-garden', false, 5),
    ('sale', 'Hyde Park family home', 'Spacious 4-bed, 3-bath with pool and mature oaks.', 985000, null, 'house', 4, 3.0, 2600, '4300 Avenue B', 'Austin', 'Texas', '78751', 'austin', -97.7280, 30.3060, 'atx-hydepark-home', false, 15)
  ) as v(tenure, title, descr, price, rent_period, ptype, beds, baths, area, addr, city, region, zip, city_slug, lng, lat, slug, featured, age_days)
where a.slug = 'bay-realty' and ag.email = 'jordan@bayrealty.test';

-- One primary photo per listing (placeholder storage keys; real media in Phase 2/4)
insert into listing_media (listing_id, kind, storage_path, alt, sort_order)
select l.id, 'photo', 'seed/' || l.slug || '/1.jpg', l.title, 0 from listings l;

-- A few amenities per listing
insert into listing_amenities (listing_id, amenity_id)
select l.id, am.id
from listings l
join amenities am on am.slug in ('parking','ac')
on conflict do nothing;
