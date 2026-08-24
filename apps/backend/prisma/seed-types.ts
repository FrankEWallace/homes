import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Property types referenced by Listing.type (ListingType.name). Idempotent. */
const PROPERTY_TYPES = [
  { name: 'house', label: 'House' },
  { name: 'apartment', label: 'Apartment' },
  { name: 'condo', label: 'Condo' },
  { name: 'townhouse', label: 'Townhouse' },
  { name: 'land', label: 'Land' },
];

async function main() {
  console.log('🌱 Seeding property types...');

  for (const t of PROPERTY_TYPES) {
    await prisma.listingType.upsert({
      where: { name: t.name },
      update: { description: `${t.label} listings` },
      create: { name: t.name, slug: t.name, description: `${t.label} listings` },
    });
  }

  console.log('✅ Property types seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
