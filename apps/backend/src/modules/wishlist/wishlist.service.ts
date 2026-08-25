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
          areaSqft: true,
          city: true,
          region: true,
          type: true,
          isFeatured: true,
          longitude: true,
          latitude: true,
          images: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Map to the shared `ListingCard` contract so the web reuses the search card.
  return wishlists.map(({ listing: l }) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    tenure: l.tenure,
    price: Number(l.priceAmount),
    currency: l.priceCurrency,
    rentPeriod: l.rentPeriod ?? null,
    bedrooms: l.bedrooms ?? null,
    bathrooms: l.bathrooms != null ? Number(l.bathrooms) : null,
    areaSqft: l.areaSqft != null ? Number(l.areaSqft) : null,
    city: l.city ?? null,
    region: l.region ?? null,
    propertyType: l.type ?? null,
    isFeatured: l.isFeatured,
    lng: l.longitude != null ? Number(l.longitude) : null,
    lat: l.latitude != null ? Number(l.latitude) : null,
    primaryPhoto: l.images[0] ?? null,
  }));
}

export async function getWishlistIds(userId: string) {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return wishlists.map((w) => w.listingId);
}
