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
    { name: 'Dar es Salaam', slug: 'dar-es-salaam', tags: ['Coastal', 'Business hub'] },
    { name: 'Arusha', slug: 'arusha', tags: ['Northern Zone', 'Safari gateway'] },
    { name: 'Zanzibar City', slug: 'zanzibar-city', tags: ['Unguja', 'Beachfront'] },
    { name: 'Mwanza', slug: 'mwanza', tags: ['Lake Zone', 'Lake Victoria'] },
    { name: 'Dodoma', slug: 'dodoma', tags: ['Capital city', 'Central Zone'] },
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
    where: { email: 'agent.masenza@homes.test' },
    update: { firstName: 'Raheem', lastName: 'Masenza' },
    create: {
      email: 'agent.masenza@homes.test',
      firstName: 'Raheem',
      lastName: 'Masenza',
      role: UserRole.agent,
      businessName: 'Dar Prime Properties',
      bio: 'Dar es Salaam residential and rental specialist — Masaki, Oyster Bay, Mikocheni.',
      passwordHash: await pw('Agent@1234!'),
    },
  });

  const agentB = await prisma.user.upsert({
    where: { email: 'agent.muhowela@homes.test' },
    update: { firstName: 'Tino', lastName: 'Muhowela' },
    create: {
      email: 'agent.muhowela@homes.test',
      firstName: 'Tino',
      lastName: 'Muhowela',
      role: UserRole.agent,
      businessName: 'Serengeti Homes',
      bio: 'Homes and land across Arusha, Zanzibar, Mwanza, and Dodoma.',
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
      slug: 'oyster-bay-beachfront-villa',
      hostId: agentA.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'Oyster Bay beachfront villa',
      description:
        'A five-bedroom beachfront villa in Oyster Bay with private ocean access, a landscaped garden, staff quarters, and a backup generator. Minutes from the Peninsula and Slipway.',
      priceAmount: 850000000,
      bedrooms: 5,
      bathrooms: 5,
      areaSqft: 4200,
      yearBuilt: 2015,
      locationName: 'Oyster Bay',
      address: 'Toure Drive',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11101',
      latitude: -6.7746,
      longitude: 39.2794,
      images: [img('photo-1568605114967-8130f3a36994'), img('photo-1570129477492-45c003edd2be')],
      isFeatured: true,
    },
    {
      slug: 'masaki-modern-townhouse',
      hostId: agentA.id,
      type: 'townhouse',
      tenure: Tenure.sale,
      title: 'Masaki modern gated townhouse',
      description:
        'A four-bedroom townhouse in a secure gated community in Masaki, close to embassies, Yacht Club, and international schools. Fitted kitchen, borehole water, and 24-hour security.',
      priceAmount: 620000000,
      bedrooms: 4,
      bathrooms: 4,
      areaSqft: 2900,
      yearBuilt: 2019,
      locationName: 'Masaki',
      address: 'Chole Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11103',
      latitude: -6.7583,
      longitude: 39.2837,
      images: [img('photo-1512917774080-9991f1c4c750'), img('photo-1560448204-e02f11c3d0e2')],
      isFeatured: true,
    },
    {
      slug: 'mikocheni-3-bed-house-sale',
      hostId: agentA.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'Mikocheni family house',
      description:
        'A well-maintained three-bedroom house on a quiet street in Mikocheni. Tiled throughout, fitted kitchen, boys’ quarters, and space to extend. Close to shops and schools.',
      priceAmount: 220000000,
      bedrooms: 3,
      bathrooms: 3,
      areaSqft: 1900,
      yearBuilt: 2008,
      locationName: 'Mikocheni',
      address: 'Mwai Kibaki Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11102',
      latitude: -6.7667,
      longitude: 39.2333,
      images: [img('photo-1449844908441-8829872d2607'), img('photo-1449752376156-b47f52816d0c')],
    },
    {
      slug: 'msasani-2-bed-apartment-rent',
      hostId: agentA.id,
      type: 'apartment',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Msasani 2-bedroom serviced apartment',
      description:
        'Furnished two-bedroom apartment in a serviced block near Msasani Slipway. Backup power and water, swimming pool, and secure parking. Popular with expats.',
      priceAmount: 1800000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1150,
      yearBuilt: 2017,
      locationName: 'Msasani',
      address: 'Haile Selassie Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11101',
      latitude: -6.7469,
      longitude: 39.2694,
      images: [img('photo-1522708323590-d24dbb6b0267')],
      isFeatured: true,
    },
    {
      slug: 'upanga-1-bed-apartment-rent',
      hostId: agentA.id,
      type: 'apartment',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Upanga 1-bedroom apartment',
      description:
        'A tidy one-bedroom apartment in Upanga, walking distance to the city centre and Muhimbili. Reliable water supply and secure compound.',
      priceAmount: 450000,
      bedrooms: 1,
      bathrooms: 1,
      areaSqft: 650,
      yearBuilt: 2005,
      locationName: 'Upanga',
      address: 'Upanga Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11105',
      latitude: -6.8095,
      longitude: 39.2793,
      images: [img('photo-1580587771525-78b9dba3b914')],
    },
    {
      slug: 'kinondoni-studio-rent',
      hostId: agentA.id,
      type: 'apartment',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Kinondoni studio room',
      description:
        'A compact, self-contained studio room in Kinondoni — ideal for a student or young professional. Shared compound with 24-hour water and a gated entrance.',
      priceAmount: 120000,
      bedrooms: 0,
      bathrooms: 1,
      areaSqft: 280,
      yearBuilt: 2010,
      locationName: 'Kinondoni',
      address: 'Ali Hassan Mwinyi Road',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      postalCode: '11104',
      latitude: -6.7789,
      longitude: 39.2564,
      images: [img('photo-1600585154340-be6161a56a0c')],
    },
    {
      slug: 'njiro-arusha-family-home',
      hostId: agentB.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'Njiro family home with garden',
      description:
        'A four-bedroom home in the popular Njiro area of Arusha, with a large garden, mountain views, and space for a car port. Near international schools and the golf course.',
      priceAmount: 180000000,
      bedrooms: 4,
      bathrooms: 3,
      areaSqft: 2600,
      yearBuilt: 2012,
      locationName: 'Njiro',
      address: 'Njiro Hill Road',
      city: 'Arusha',
      region: 'Arusha',
      postalCode: '23103',
      latitude: -3.4167,
      longitude: 36.7,
      images: [img('photo-1502672260266-1c1ef2d93688'), img('photo-1545324418-cc1a3fa10c00')],
      isFeatured: true,
    },
    {
      slug: 'arusha-2-bed-house-rent',
      hostId: agentB.id,
      type: 'house',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Sekei two-bedroom house',
      description:
        'A quiet two-bedroom house in Sekei, Arusha, with a small garden and secure parking. Close to safari tour operator offices and the town centre.',
      priceAmount: 500000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1050,
      yearBuilt: 2009,
      locationName: 'Sekei',
      address: 'Sekei Road',
      city: 'Arusha',
      region: 'Arusha',
      postalCode: '23102',
      latitude: -3.3563,
      longitude: 36.6892,
      images: [img('photo-1449752376156-b47f52816d0c')],
    },
    {
      slug: 'mwanza-igogo-apartment-sale',
      hostId: agentB.id,
      type: 'apartment',
      tenure: Tenure.sale,
      title: 'Igogo lakeside apartment',
      description:
        'A modern two-bedroom apartment near Lake Victoria in Igogo, Mwanza, with a balcony and secure underground parking. Close to the CCM Kirumba grounds.',
      priceAmount: 95000000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1080,
      yearBuilt: 2020,
      locationName: 'Igogo',
      address: 'Kenyatta Road',
      city: 'Mwanza',
      region: 'Mwanza',
      postalCode: '33101',
      latitude: -2.5164,
      longitude: 32.9175,
      images: [img('photo-1576941089067-2de3c901e126')],
    },
    {
      slug: 'zanzibar-nungwi-beach-villa',
      hostId: agentB.id,
      type: 'house',
      tenure: Tenure.sale,
      title: 'Nungwi beachfront villa',
      description:
        'A three-bedroom beachfront villa near Nungwi with an infinity pool, private access to the beach, and views over the Indian Ocean. Sold furnished, popular for holiday letting.',
      priceAmount: 650000000,
      bedrooms: 3,
      bathrooms: 4,
      areaSqft: 3100,
      yearBuilt: 2018,
      locationName: 'Nungwi',
      address: 'Nungwi Beach Road',
      city: 'Zanzibar City',
      region: 'Zanzibar',
      postalCode: '71101',
      latitude: -5.7333,
      longitude: 39.2833,
      images: [img('photo-1600607687939-ce8a6c25118c'), img('photo-1568605114967-8130f3a36994')],
      isFeatured: true,
    },
    {
      slug: 'stone-town-apartment-rent',
      hostId: agentB.id,
      type: 'apartment',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Stone Town heritage apartment',
      description:
        'A one-bedroom apartment inside a restored Zanzibari heritage building in Stone Town, with carved doors and a shared rooftop terrace overlooking the harbour.',
      priceAmount: 900000,
      bedrooms: 1,
      bathrooms: 1,
      areaSqft: 700,
      yearBuilt: 1930,
      locationName: 'Stone Town',
      address: 'Kenyatta Road',
      city: 'Zanzibar City',
      region: 'Zanzibar',
      postalCode: '71000',
      latitude: -6.1659,
      longitude: 39.199,
      images: [img('photo-1560448204-e02f11c3d0e2')],
    },
    {
      slug: 'dodoma-plot-of-land',
      hostId: agentB.id,
      type: 'land',
      tenure: Tenure.sale,
      title: 'Residential plot near Dodoma city centre',
      description:
        'A quarter-acre residential plot in a fast-growing part of Dodoma, with title deed in place and road access. Ideal for building as the capital continues to expand.',
      priceAmount: 22000000,
      bedrooms: 0,
      bathrooms: 0,
      areaSqft: 0,
      locationName: 'Area C',
      address: 'Nyerere Road',
      city: 'Dodoma',
      region: 'Dodoma',
      postalCode: '41111',
      latitude: -6.173,
      longitude: 35.7419,
      images: [img('photo-1500382017468-9049fed747ef')],
    },
    {
      slug: 'dodoma-3-bed-house-rent',
      hostId: agentB.id,
      type: 'house',
      tenure: Tenure.rent,
      rentPeriod: RentPeriod.month,
      title: 'Dodoma three-bedroom government-area house',
      description:
        'A three-bedroom house near the government ministries area in Dodoma, with a fenced compound and reliable water supply. Well suited to civil servants and diplomats.',
      priceAmount: 650000,
      bedrooms: 3,
      bathrooms: 2,
      areaSqft: 1500,
      yearBuilt: 2016,
      locationName: 'Area D',
      address: 'Uhuru Street',
      city: 'Dodoma',
      region: 'Dodoma',
      postalCode: '41110',
      latitude: -6.1815,
      longitude: 35.7473,
      images: [img('photo-1580587771525-78b9dba3b914')],
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
        priceCurrency: 'TZS',
        country: 'TZ',
      },
    });
  }
  console.info(
    `  ✅ ${LISTINGS.length} published listings across Dar es Salaam, Arusha, Mwanza, Zanzibar, and Dodoma`,
  );

  // Old placeholder agents from a prior seed revision — remove now that all
  // listings above have been reassigned to the current agents.
  await prisma.user.deleteMany({
    where: { email: { in: ['agent.mushi@homes.test', 'agent.kessy@homes.test'] } },
  });

  console.info('\n✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
