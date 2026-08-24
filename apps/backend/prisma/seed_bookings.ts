import { PrismaClient, BookingStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding bookings for featured listings...');

  // 1. Get some guests
  const guests = await prisma.user.findMany({
    where: { role: UserRole.guest },
    take: 5,
  });

  if (guests.length === 0) {
    console.error('❌ No guests found. Please run seed_reviews.ts first.');
    return;
  }

  // 2. Get featured listings
  const featuredListings = await prisma.listing.findMany({
    where: { isFeatured: true },
    take: 3,
  });

  const targetListings = featuredListings.length > 0 ? featuredListings : await prisma.listing.findMany({ take: 3 });

  if (targetListings.length === 0) {
    console.error('❌ No listings found.');
    return;
  }

  // 3. Create Bookings
  for (const listing of targetListings) {
    console.info(`  🛒 Creating bookings for: ${listing.title}`);
    
    for (let i = 0; i < 3; i++) {
      const guest = guests[i % guests.length];
      const status = i === 0 ? BookingStatus.confirmed : BookingStatus.pending;
      const isBuddy = i % 2 === 0;

      await prisma.booking.create({
        data: {
          listingId: listing.id,
          guestId: guest.id,
          status,
          dateFrom: new Date(Date.now() + (i + 1) * 86400000), // Next few days
          unitPrice: listing.priceAmount,
          totalAmount: listing.priceAmount,
          currency: listing.priceCurrency,
          reference: `BOOK-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
          isLookingForBuddies: isBuddy,
        },
      });
    }

    // Update listing booking count
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        bookingCount: { increment: 3 },
      },
    });
  }

  console.info('  ✅ Seeded bookings successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
