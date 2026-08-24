import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_TYPES = [
  { name: 'event', label: 'Event' },
  { name: 'safari', label: 'Safari' },
  { name: 'tour', label: 'Tour' },
  { name: 'accommodation', label: 'Accommodation' },
  { name: 'transport', label: 'Transport' },
  { name: 'car_rental', label: 'Car Rental' },
];

async function main() {
  console.log('🌱 Seeding listing types...');

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

  console.log('✅ Listing types seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
