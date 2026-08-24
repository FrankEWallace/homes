import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function toggleWishlist(userId: string, listingId: string) {
  // Verify listing exists
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new AppError(404, 'Listing not found');

  const existing = await prisma.wishlist.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });

  if (existing) {
    await prisma.wishlist.delete({
      where: { userId_listingId: { userId, listingId } },
    });
    return { added: false };
  } else {
    await prisma.wishlist.create({
      data: { userId, listingId },
    });
    return { added: true };
  }
}

export async function getWishlist(userId: string) {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          tenure: true,
          priceAmount: true,
          priceCurrency: true,
          rentPeriod: true,
          bedrooms: true,
          bathrooms: true,
          city: true,
          images: true,
          averageRating: true,
          reviewCount: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return wishlists.map((w) => w.listing);
}

export async function getWishlistIds(userId: string) {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return wishlists.map((w) => w.listingId);
}
