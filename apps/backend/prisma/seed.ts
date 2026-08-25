import { PrismaClient, UserRole, ListingStatus, Tenure, RentPeriod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Real-estate marketplace seed. Idempotent (upserts by unique keys) so it can be
 * re-run safely. Produces enough to exercise the full Phase-3 flow end-to-end:
 * two agents who own published listings, two seekers who can favorite / save
 * searches / enquire, across a couple of cities. `geom`/`search_tsv` are handled
 * by the PostGIS trigger + generated column (prisma/sql/0001_postgis_search.sql),
 * so we only set latitude/longitude here.
 */
async function main() {
  console.info('🌱 Seeding real-estate marketplace...');

  // ── 1. Property types (Listing.type references ListingType.name) ────────────
  const PROPERTY_TYPES = [
    { name: 'house', label: 'House' },
    { name: 'apartment', label: 'Apartment' },
    { name: 'condo', label: 'Condo' },
    { name: 'townhouse', label: 'Townhouse' },
    { name: 'land', label: 'Land' },
  ];
  for (const t of PROPERTY_TYPES) {
    await prisma.listingType.upsert({
      where: { name: t.name },
      update: { description: `${t.label} listings` },
      create: { name: t.name, slug: t.name, description: `${t.label} listings` },
    });
  }
  console.info(`  ✅ ${PROPERTY_TYPES.length} property types`);

  // ── 2. Categories (residential / commercial) ────────────────────────────────
  const CATEGORIES = [
    { name: 'Residential', slug: 'residential' },
    { name: 'Commercial', slug: 'commercial' },
  ];
  const categories = [];
  for (const c of CATEGORIES) {
    categories.push(
      await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c }),
    );
  }
  const residentialId = categories.find((c) => c.slug === 'residential')?.id;
  console.info(`  ✅ ${categories.length} categories`);

  // ── 3. Cities (drive /homes/[city] landing pages) ───────────────────────────
  const CITIES = [
    { name: 'Austin', slug: 'austin', tags: ['Texas', 'Live music'] },
    { name: 'San Francisco', slug: 'san-francisco', tags: ['California', 'Bay Area'] },
  ];
  for (const c of CITIES) {
    await prisma.city.upsert({
      where: { slug: c.slug },
      update: { name: c.name, tags: c.tags, isActive: true },
      create: { name: c.name, slug: c.slug, tags: c.tags, isActive: true },
    });
  }
  console.info(`  ✅ ${CITIES.length} cities`);

  // ── 4. Users: admin, agents, seekers (email-first login) ────────────────────
  const pw = (plain: string) => bcrypt.hash(plain, 12);

  await prisma.user.upsert({
    where: { email: 'admin@homes.test' },
    update: {},
    create: {
      email: 'admin@homes.test',
      firstName: 'Site',
      lastName: 'Admin',
      role: UserRole.admin,
      passwordHash: await pw('Admin@1234!'),
    },
  });

  const agentA = await prisma.user.upsert({
    where: { email: 'agent.rivera@homes.test' },
    update: {},
    create: {
      email: 'agent.rivera@homes.test',
      firstName: 'Maria',
      lastName: 'Rivera',
      role: UserRole.agent,
      businessName: 'Rivera Realty',
      bio: 'Austin residential specialist.',
      passwordHash: await pw('Agent@1234!'),
    },
  });

  const agentB = await prisma.user.upsert({
    where: { email: 'agent.chen@homes.test' },
    update: {},
    create: {
      email: 'agent.chen@homes.test',
      firstName: 'David',
      lastName: 'Chen',
      role: UserRole.agent,
      businessName: 'Bay Area Homes',
      bio: 'SF condos and modern rentals.',
      passwordHash: await pw('Agent@1234!'),
    },
  });

  await prisma.user.upsert({
    where: { email: 'seeker.sam@homes.test' },
    update: {},
    create: {
      email: 'seeker.sam@homes.test',
      firstName: 'Sam',
      lastName: 'Okoro',
      role: UserRole.seeker,
      passwordHash: await pw('Seeker@1234!'),
    },
  });

  await prisma.user.upsert({
    where: { email: 'seeker.priya@homes.test' },
    update: {},
    create: {
      email: 'seeker.priya@homes.test',
      firstName: 'Priya',
      lastName: 'Shah',
      role: UserRole.seeker,
      passwordHash: await pw('Seeker@1234!'),
    },
  });
  console.info('  ✅ 1 admin, 2 agents, 2 seekers (password: Agent@1234! / Seeker@1234!)');

  // ── 5. Published listings ───────────────────────────────────────────────────
  type Seed = {
    slug: string;
    hostId: string;
    type: string;
    tenure: Tenure;
    rentPeriod?: RentPeriod;
    title: string;
    description: string;
    priceAmount: number;
    bedrooms: number;
    bathrooms: number;
    areaSqft: number;
    yearBuilt?: number;
    locationName: string;
    address: string;
    city: string;
    region: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    images: string[];
    isFeatured?: boolean;
  };

  const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

  const LISTINGS: Seed[] = [
    {
      slug: 'sunny-victorian-near-dolores-park',
      hostId: agentB.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'Sunny Victorian near Dolores Park',
      description:
        'A light-filled restored Victorian steps from Dolores Park. Original bay windows, chef’s kitchen, and a landscaped garden. Walk to the Mission’s best cafés and transit.',
      priceAmount: 1875000,
      bedrooms: 3,
      bathrooms: 2,
      areaSqft: 1980,
      yearBuilt: 1908,
      locationName: 'Mission District',
      address: '742 Guerrero St',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94110',
      latitude: 37.7599,
      longitude: -122.4241,
      images: [img('photo-1568605114967-8130f3a36994'), img('photo-1570129477492-45c003edd2be')],
      isFeatured: true,
    },
    {
      slug: 'modern-soma-condo',
      hostId: agentB.id,
      type: 'condo',
      tenure: Tenure.sale,
      title: 'Modern SoMa Condo with skyline views',
      description:
        'Floor-to-ceiling windows, in-unit laundry, and a shared roof deck. Full-service building with gym and 24/7 concierge. Minutes to Caltrain and the Embarcadero.',
      priceAmount: 985000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1120,
      yearBuilt: 2016,
      locationName: 'SoMa',
      address: '333 Harrison St',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94105',
      latitude: 37.7845,
      longitude: -122.3925,
      images: [img('photo-1512917774080-9991f1c4c750'), img('photo-1560448204-e02f11c3d0e2')],
    },
    {
      slug: 'nob-hill-1-bed-with-parking',
      hostId: agentB.id,
      type: 'apartment',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Nob Hill 1-bed with parking',
      description:
        'Charming top-floor one-bedroom with deeded parking — rare for the neighborhood. Hardwood floors, updated bath, and a quiet tree-lined street.',
      priceAmount: 3200,
      bedrooms: 1,
      bathrooms: 1,
      areaSqft: 680,
      yearBuilt: 1925,
      locationName: 'Nob Hill',
      address: '1201 Pine St',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94109',
      latitude: 37.7909,
      longitude: -122.4185,
      images: [img('photo-1522708323590-d24dbb6b0267')],
    },
    {
      slug: 'downtown-austin-2-bed',
      hostId: agentA.id,
      type: 'condo',
      tenure: Tenure.sale,
      title: 'Downtown Austin 2-bed high-rise',
      description:
        'Sleek downtown condo with a wraparound balcony over Lady Bird Lake. Resort-style pool, valet, and steps to Rainey Street. Investor- and lock-and-leave friendly.',
      priceAmount: 720000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1240,
      yearBuilt: 2019,
      locationName: 'Rainey Street District',
      address: '70 Rainey St',
      city: 'Austin',
      region: 'TX',
      postalCode: '78701',
      latitude: 30.2588,
      longitude: -97.7386,
      images: [img('photo-1545324418-cc1a3fa10c00'), img('photo-1502672260266-1c1ef2d93688')],
      isFeatured: true,
    },
    {
      slug: 'east-austin-bungalow',
      hostId: agentA.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'East Austin bungalow with studio',
      description:
        'Renovated 1930s bungalow with a detached studio — perfect for a home office or short-term rental. Xeriscaped yard, screened porch, and a walkable location.',
      priceAmount: 640000,
      bedrooms: 3,
      bathrooms: 2,
      areaSqft: 1560,
      yearBuilt: 1936,
      locationName: 'Holly',
      address: '2105 E Cesar Chavez St',
      city: 'Austin',
      region: 'TX',
      postalCode: '78702',
      latitude: 30.2555,
      longitude: -97.7211,
      images: [img('photo-1449844908441-8829872d2607'), img('photo-1449752376156-b47f52816d0c')],
    },
    {
      slug: 'south-congress-townhouse-rental',
      hostId: agentA.id,
      type: 'townhouse',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'South Congress townhouse',
      description:
        'Three-story townhouse in the heart of SoCo. Rooftop terrace with downtown views, two-car garage, and stainless kitchen. Walk to shops, tacos, and live music.',
      priceAmount: 4100,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1850,
      yearBuilt: 2014,
      locationName: 'South Congress',
      address: '1500 S Congress Ave',
      city: 'Austin',
      region: 'TX',
      postalCode: '78704',
      latitude: 30.2489,
      longitude: -97.7501,
      images: [img('photo-1580587771525-78b9dba3b914'), img('photo-1600585154340-be6161a56a0c')],
    },
    {
      slug: 'lakeway-hill-country-land',
      hostId: agentA.id,
      type: 'land',
      tenure: Tenure.sale,
      title: 'Hill Country lot with lake views',
      description:
        'Just over an acre of gently sloped land with panoramic Hill Country and lake views. Utilities at the street, no timeline to build. Bring your architect.',
      priceAmount: 295000,
      bedrooms: 0,
      bathrooms: 0,
      areaSqft: 0,
      locationName: 'Lakeway',
      address: 'Lot 14 Vista Ridge',
      city: 'Austin',
      region: 'TX',
      postalCode: '78734',
      latitude: 30.3624,
      longitude: -97.9946,
      images: [img('photo-1500382017468-9049fed747ef')],
    },
    {
      slug: 'inner-sunset-family-home',
      hostId: agentB.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'Inner Sunset family home',
      description:
        'Spacious four-bedroom near Golden Gate Park with a remodeled kitchen, bonus room, and two-car garage. Top-rated schools and easy access to UCSF.',
      priceAmount: 2250000,
      bedrooms: 4,
      bathrooms: 3,
      areaSqft: 2410,
      yearBuilt: 1941,
      locationName: 'Inner Sunset',
      address: '1330 9th Ave',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94122',
      latitude: 37.7638,
      longitude: -122.4661,
      images: [img('photo-1576941089067-2de3c901e126'), img('photo-1600607687939-ce8a6c25118c')],
    },
  ];

  const now = new Date();
  for (const l of LISTINGS) {
    const { slug, images, isFeatured, ...rest } = l;
    await prisma.listing.upsert({
      where: { slug },
      update: {
        ...rest,
        images,
        status: ListingStatus.published,
        publishedAt: now,
        isFeatured: !!isFeatured,
        categoryId: residentialId,
      },
      create: {
        ...rest,
        slug,
        images,
        status: ListingStatus.published,
        publishedAt: now,
        isFeatured: !!isFeatured,
        categoryId: residentialId,
        priceCurrency: 'USD',
        country: 'US',
      },
    });
  }
  console.info(`  ✅ ${LISTINGS.length} published listings across Austin + San Francisco`);

  console.info('\n✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
