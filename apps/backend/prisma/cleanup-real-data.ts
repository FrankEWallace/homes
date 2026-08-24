import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🧹 Cleaning up real seeded data...');

  const slugsToDelete = [
    'serengeti-great-migration-safari',
    'zanzibar-stone-town-cultural-walk',
    'ngorongoro-crater-day-trip',
    'kilimanjaro-marangu-route',
    'mafia-island-whale-sharks',
    'nungwi-catamaran-cruise',
    'tarangire-elephant-safari',
    'prison-island-zanzibar',
    'arusha-waterfall-coffee',
    'selous-boat-safari'
  ];

  const deleteResult = await prisma.listing.deleteMany({
    where: {
      slug: {
        in: slugsToDelete
      }
    }
  });

  console.info(`✅ Deleted ${deleteResult.count} listings.`);

  // Also delete the admin host if no other listings remain for them
  const adminHost = await prisma.user.findUnique({
    where: { phone: '+255700000010' }
  });

  if (adminHost) {
    const hostListingsCount = await prisma.listing.count({
      where: { hostId: adminHost.id }
    });

    if (hostListingsCount === 0) {
      // Need to delete dependencies first if any (e.g., reviews, bookings)
      // For now assume it's clean since it's "seeded real data"
      await prisma.user.delete({
        where: { id: adminHost.id }
      });
      console.info('✅ Deleted admin host user (+255700000010).');
    } else {
      console.warn(`⚠️ Admin host (+255700000010) still has ${hostListingsCount} listings. Skipping user deletion.`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
