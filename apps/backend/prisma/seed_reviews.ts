import { PrismaClient, UserRole, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Seeding reviews...');

  const password = await bcrypt.hash('Guest@1234!', 12);

  // 1. Create Guests
  const guestsData = [
    { phone: '+255711222333', email: 'ali@example.com', first: 'Ali', last: 'Raza', avatar: 'assets/icon/icon.png' },
    { phone: '+255722333444', email: 'fahad@example.com', first: 'Fahad', last: 'Khan', avatar: 'assets/icon/icon.png' },
    { phone: '+255733444555', email: 'miss@example.com', first: 'Miss', last: 'Khan', avatar: 'assets/icon/icon.png' },
    { phone: '+255744555666', email: 'rohan@example.com', first: 'Rohan', last: 'Lama', avatar: 'assets/icon/icon.png' },
  ];

  const guests = [];
  for (const g of guestsData) {
    const user = await prisma.user.upsert({
      where: { phone: g.phone },
      update: {},
      create: {
        phone: g.phone,
        phoneVerified: true,
        email: g.email,
        firstName: g.first,
        lastName: g.last,
        avatarUrl: g.avatar,
        role: UserRole.guest,
        passwordHash: password,
      },
    });
    guests.push(user);
  }

  // 2. Find Listings
  const listings = await prisma.listing.findMany({ take: 5 });
  if (listings.length === 0) {
    console.error('❌ No listings found to review. Please run main seed first.');
    return;
  }

  // 3. Create Bookings and Reviews
  const comments = [
    "Amazing tour i like it iam so happy this tour ❤️🥰🥳thanks dojoin team god work",
    "It was good.",
    "I would like to take this opportunity to thank all the staff. did not get there names but the service was excellent",
    "Absolutely breathtaking views. Highly recommend!",
    "Great value for money and very well organized.",
  ];

  for (const listing of listings) {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < guests.length; i++) {
      const rating = i === 0 ? 5 : (i % 2 === 0 ? 4 : 5);
      const guest = guests[i];

      // Create a completed booking first
      const booking = await prisma.booking.create({
        data: {
          listingId: listing.id,
          guestId: guest.id,
          status: BookingStatus.completed,
          dateFrom: new Date(),
          dateTo: new Date(),
          unitPrice: listing.priceAmount,
          totalAmount: listing.priceAmount,
          currency: listing.priceCurrency,
          reference: `SEED-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
          completedAt: new Date(),
        },
      });

      // Create review
      await prisma.review.create({
        data: {
          listingId: listing.id,
          bookingId: booking.id,
          authorId: guest.id,
          rating,
          comment: comments[i % comments.length],
        },
      });

      sum += rating;
      count++;
    }

    // Update listing with average
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        averageRating: sum / count,
        reviewCount: count,
      },
    });
  }

  console.info(`  ✅ Seeded ${guests.length * listings.length} reviews across ${listings.length} listings.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
