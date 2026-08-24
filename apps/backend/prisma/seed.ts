import { PrismaClient, UserRole, ListingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding database...');

  // 1. Listing Types
  const INITIAL_TYPES = [
    { name: 'event', label: 'Event' },
    { name: 'safari', label: 'Safari' },
    { name: 'tour', label: 'Tour' },
    { name: 'accommodation', label: 'Accommodation' },
    { name: 'transport', label: 'Transport' },
    { name: 'car_rental', label: 'Car Rental' },
  ];

  for (const type of INITIAL_TYPES) {
    await prisma.listingType.upsert({
      where: { name: type.name },
      update: {},
      create: {
        name: type.name,
        slug: type.name,
        description: `${type.label} listings`,
      },
    });
  }
  console.info('  ✅ Listing types');

  // 2. Categories
  const categoriesData = [
    { name: 'Events', slug: 'events' },
    { name: 'Safaris', slug: 'safaris' },
    { name: 'Tours', slug: 'tours' },
    { name: 'Accommodation', slug: 'accommodation' },
    { name: 'Transport', slug: 'transport' },
    { name: 'Car Rental', slug: 'car-rental' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const saved = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories.push(saved);
  }
  console.info(`  ✅ ${categories.length} categories`);

  // 3. Admins
  const password = await bcrypt.hash('Admin@1234!', 12);
  const admins = [
    { phone: '+255700000001', email: 'admin@tojoin.co.tz', first: 'Primary', last: 'Admin' },
    { phone: '+255744123456', email: 'support@tojoin.co.tz', first: 'Support', last: 'Team' },
    { phone: '+255788999888', email: 'mussa@tojoin.co.tz', first: 'Mussa', last: 'Admin' },
  ];

  for (const a of admins) {
    await prisma.user.upsert({
      where: { phone: a.phone },
      update: {},
      create: {
        phone: a.phone,
        phoneVerified: true,
        email: a.email,
        firstName: a.first,
        lastName: a.last,
        role: UserRole.admin,
        passwordHash: password,
      },
    });
  }
  console.info('  ✅ Admin users');

  // 4. Host user
  const host = await prisma.user.upsert({
    where: { phone: '+255700000002' },
    update: {},
    create: {
      phone: '+255700000002',
      phoneVerified: true,
      email: 'host@example.com',
      firstName: 'Fatuma',
      lastName: 'Hassan',
      role: UserRole.host,
      businessName: 'Safari Dreams Tanzania',
      passwordHash: await bcrypt.hash('Host@1234!', 12),
    },
  });

  // 5. Sample listing
  await prisma.listing.upsert({
    where: { slug: 'serengeti-sunrise-safari' },
    update: {},
    create: {
      hostId: host.id,
      categoryId: categories.find(c => c.slug === 'safaris')?.id,
      type: 'safari',
      status: ListingStatus.approved,
      title: 'Serengeti Sunrise Safari',
      description: 'Experience the magic of the Serengeti at dawn.',
      slug: 'serengeti-sunrise-safari',
      priceAmount: 250000,
      priceCurrency: 'TZS',
      priceUnit: 'per_person',
      locationName: 'Serengeti National Park',
      city: 'Arusha',
      capacityMax: 8,
      images: ['assets/seed/serengeti.jpg'],
      latitude: -2.3333,
      longitude: 34.8333,
    },
  });

  console.info('  ✅ Sample data seeded.');
  console.info('\n✅ Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
