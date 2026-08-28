import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { uploadToCloudinary } from '../../utils/upload';
import { paginate } from '../../utils/response';
import { searchEngine } from '../../search/engine';
import { geocodeAddress } from '../../utils/geocode';
import { parseCsv } from '../../utils/csv';
import { ImportRowSchema } from './listings.schemas';
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

  // Fill coordinates from the address when the agent didn't provide them, so the
  // listing lands on the map + geo search (geom is trigger-maintained from lat/lng).
  if (data.latitude == null || data.longitude == null) {
    const geo = await geocodeAddress(data);
    if (geo) {
      data.latitude = geo.lat;
      data.longitude = geo.lng;
    }
  }

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

/**
 * Lightweight projection of published listings for sitemap generation (Phase 5).
 * Returns only `slug` + `updatedAt` so the web layer can emit sitemap URLs at
 * scale without hydrating full listing rows. Paged so callers can shard across
 * multiple sitemap files when the catalogue grows past a single file's URL cap.
 */
export async function getPublishedListingSlugs(page: number, limit: number) {
  const where = { status: 'published' as const };
  const [rows, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);
  return { listings: rows, meta: paginate(page, limit, total) };
}

/**
 * Bulk-import listings from CSV (F9). Each row is validated, deduped against the
 * agent's existing (title, city) pairs, geocoded when coordinates are absent, and
 * created as a draft. Returns a per-row summary so the agent can fix and re-upload.
 */
const IMPORT_ROW_LIMIT = 200;

export async function importListings(hostId: string, csv: string) {
  const rows = parseCsv(csv);
  if (rows.length === 0) throw new AppError(400, 'No data rows found in the CSV');
  if (rows.length > IMPORT_ROW_LIMIT) {
    throw new AppError(400, `Too many rows (${rows.length}). Import at most ${IMPORT_ROW_LIMIT} at a time.`);
  }

  const existing = await prisma.listing.findMany({
    where: { hostId },
    select: { title: true, city: true },
  });
  const seen = new Set(existing.map((l) => `${l.title.toLowerCase()}|${l.city.toLowerCase()}`));

  const errors: { row: number; message: string }[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // 1-based + header row
    const parsed = ImportRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({ row: rowNum, message: parsed.error.issues[0]?.message ?? 'Invalid row' });
      continue;
    }
    const r = parsed.data;

    const key = `${r.title.toLowerCase()}|${r.city.toLowerCase()}`;
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);

    const images = (r.images ?? '')
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s));

    let latitude = r.latitude ?? null;
    let longitude = r.longitude ?? null;
    if (latitude == null || longitude == null) {
      const geo = await geocodeAddress({
        address: r.address,
        city: r.city,
        region: r.region,
        postalCode: r.postalcode,
        country: r.country,
      });
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
      }
    }

    try {
      await prisma.listing.create({
        data: {
          hostId,
          slug: generateSlug(r.title),
          type: r.type,
          tenure: r.tenure,
          title: r.title,
          description: r.description,
          priceAmount: new Prisma.Decimal(r.priceamount),
          priceCurrency: r.pricecurrency,
          rentPeriod: r.rentperiod,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          areaSqft: r.areasqft,
          address: r.address,
          city: r.city,
          region: r.region,
          postalCode: r.postalcode,
          country: r.country,
          latitude,
          longitude,
          images,
        },
      });
      created += 1;
    } catch (err) {
      errors.push({ row: rowNum, message: (err as Error).message });
    }
  }

  return { total: rows.length, created, skipped, errors };
}

/** Per-agent listing analytics (F12): views, enquiries, and saves per listing. */
export async function getAgentAnalytics(hostId: string) {
  const listings = await prisma.listing.findMany({
    where: { hostId },
    orderBy: { viewCount: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      viewCount: true,
      _count: { select: { leads: true, wishlistedBy: true } },
    },
  });

  const rows = listings.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    status: l.status,
    views: l.viewCount,
    leads: l._count.leads,
    saved: l._count.wishlistedBy,
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.views += r.views;
      acc.leads += r.leads;
      acc.saved += r.saved;
      if (r.status === 'published') acc.published += 1;
      return acc;
    },
    { listings: rows.length, published: 0, views: 0, leads: 0, saved: 0 },
  );

  return { totals, listings: rows };
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

  // Re-geocode when the address changed and the agent didn't deliberately edit the
  // coordinates. The edit form re-sends the stored lat/lng, so "coords absent" isn't
  // enough — treat coords that still match the stored values (or are absent) as
  // "follow the new address", and only skip when they were actually changed by hand.
  const addressTouched =
    data.address !== undefined ||
    data.city !== undefined ||
    data.region !== undefined ||
    data.postalCode !== undefined;
  const storedLat = listing.latitude != null ? Number(listing.latitude) : null;
  const storedLng = listing.longitude != null ? Number(listing.longitude) : null;
  const submittedLat = data.latitude != null ? Number(data.latitude) : null;
  const submittedLng = data.longitude != null ? Number(data.longitude) : null;
  const coordsUntouched = submittedLat === storedLat && submittedLng === storedLng;
  if (addressTouched && coordsUntouched) {
    const geo = await geocodeAddress({
      address: data.address ?? listing.address,
      city: data.city ?? listing.city,
      region: data.region ?? listing.region,
      postalCode: data.postalCode ?? listing.postalCode,
      country: data.country ?? listing.country,
    });
    if (geo) {
      data.latitude = geo.lat;
      data.longitude = geo.lng;
    }
  }

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
