import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { uploadToCloudinary } from '../../utils/upload';
import { paginate } from '../../utils/response';
import { searchEngine } from '../../search/engine';
import type { CreateListingInput, UpdateListingInput, ListingQueryInput } from './listings.schemas';

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function createListing(hostId: string, input: CreateListingInput) {
  const { tagIds, metadata, priceAmount, ...data } = input;
  const slug = generateSlug(input.title);

  return prisma.listing.create({
    data: {
      ...data,
      slug,
      hostId,
      priceAmount: new Prisma.Decimal(priceAmount),
      metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

export async function getListing(idOrSlug: string, requesterId?: string, requesterRole?: string) {
  const listing = await prisma.listing.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          bio: true,
          businessName: true,
          phone: true,
          email: true,
        },
      },
      category: true,
      listingType: true,
      tags: { include: { tag: true } },
    },
  });

  if (!listing) throw new AppError(404, 'Listing not found');

  // Unpublished listings are visible only to their owner or an admin.
  if (listing.status !== 'published' && requesterRole !== 'admin' && listing.hostId !== requesterId) {
    throw new AppError(404, 'Listing not found');
  }

  return listing;
}

/**
 * Faceted geo-search via the PostGIS SearchEngine (search_listings /
 * search_listing_facets over $queryRaw). The engine is the swap point for
 * Typesense/OpenSearch at scale.
 */
export async function searchListings(input: ListingQueryInput) {
  const result = await searchEngine.search({
    q: input.search,
    tenure: input.tenure,
    type: input.type,
    city: input.city,
    minPrice: input.priceMin,
    maxPrice: input.priceMax,
    minBeds: input.minBeds,
    minBaths: input.minBaths,
    bbox: input.bbox,
    sort: input.sort,
    page: input.page,
    limit: input.limit,
  });

  return {
    listings: result.items,
    meta: { ...paginate(input.page, input.limit, result.total), facets: result.facets },
  };
}

export async function getMyListings(hostId: string) {
  return prisma.listing.findMany({
    where: { hostId },
    orderBy: { createdAt: 'desc' },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

export async function updateListing(id: string, hostId: string, role: string, input: UpdateListingInput) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (role !== 'admin' && listing.hostId !== hostId) throw new AppError(403, 'You do not own this listing');

  const { tagIds, metadata, priceAmount, ...data } = input;

  return prisma.listing.update({
    where: { id },
    data: {
      ...data,
      ...(priceAmount !== undefined && { priceAmount: new Prisma.Decimal(priceAmount) }),
      ...(metadata !== undefined && { metadata: (metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull }),
      ...(tagIds !== undefined && {
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      }),
    },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

export async function deleteListing(id: string, hostId: string, role: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (role !== 'admin' && listing.hostId !== hostId) throw new AppError(403, 'You do not own this listing');

  await prisma.listing.delete({ where: { id } });
}

/** Self-serve publish (free agent listings). Moderation gate is added later. */
export async function publishListing(id: string, hostId: string, role: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (role !== 'admin' && listing.hostId !== hostId) throw new AppError(403, 'You do not own this listing');

  return prisma.listing.update({
    where: { id },
    data: { status: 'published', publishedAt: listing.publishedAt ?? new Date(), rejectionNote: null },
  });
}

export async function unpublishListing(id: string, hostId: string, role: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (role !== 'admin' && listing.hostId !== hostId) throw new AppError(403, 'You do not own this listing');

  return prisma.listing.update({ where: { id }, data: { status: 'withdrawn' } });
}

export async function uploadImages(id: string, hostId: string, role: string, files: Express.Multer.File[]) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (role !== 'admin' && listing.hostId !== hostId) throw new AppError(403, 'You do not own this listing');
  if (!files.length) throw new AppError(400, 'No image files provided');

  const uploadedUrls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer, 'listings')));
  const updated = await prisma.listing.update({
    where: { id },
    data: { images: [...listing.images, ...uploadedUrls] },
  });
  return updated.images;
}

export async function removeImage(id: string, hostId: string, role: string, imageUrl: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (role !== 'admin' && listing.hostId !== hostId) throw new AppError(403, 'You do not own this listing');

  const updatedImages = listing.images.filter((url) => url !== imageUrl);
  if (updatedImages.length === listing.images.length) {
    throw new AppError(404, 'Image URL not found on this listing');
  }
  const updated = await prisma.listing.update({ where: { id }, data: { images: updatedImages } });
  return updated.images;
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

export async function listListingTypes() {
  return prisma.listingType.findMany({ orderBy: { name: 'asc' } });
}
