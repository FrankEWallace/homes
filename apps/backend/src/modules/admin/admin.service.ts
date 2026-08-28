import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { paginate } from '../../utils/response';
import { logAdminAction } from '../../utils/auditLog';
import type {
  CreateCityInput,
  UpdateCityInput,
  CreateListingTypeInput,
  UpdateListingTypeInput,
  UserQueryInput,
  UpdateUserInput,
} from './admin.schemas';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 140);
}

/**
 * Admin moderation (Phase 6, F14–F16 slice). Surfaces listings that need a
 * human look — potential Fair-Housing-violating content, likely duplicates, and
 * anything already suspended — and lets an admin take a listing down or reinstate
 * it. Takedowns use a dedicated `suspended` status that the agent publish flow
 * refuses to lift (see listings.service.publishListing).
 */

// Heuristic phrases that may indicate a discriminatory restriction on a
// protected characteristic. These are **surfaced for human review**, never
// auto-actioned — some have legitimate uses in context.
const DISCRIMINATORY_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'familial-status', re: /\bno (children|kids|infants|families)\b|\badults only\b/i },
  { label: 'religion', re: /\b(christians?|muslims?|hindus?|jews?)\s+only\b|\bno (christians?|muslims?|hindus?|jews?)\b/i },
  { label: 'sex', re: /\b(men|women|males?|females?)\s+only\b|\bno (men|women|males|females)\b/i },
  { label: 'disability', re: /\bable[-\s]bodied only\b|\bno disabled\b/i },
  { label: 'national-origin', re: /\b(locals?|nationals?)\s+only\b|\bno (foreigners|immigrants|expats)\b/i },
];

function contentFlags(text: string): string[] {
  return DISCRIMINATORY_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}

export interface ModerationFlag {
  type: 'content' | 'duplicate' | 'suspended';
  detail: string;
}

export async function getModerationQueue() {
  const listings = await prisma.listing.findMany({
    where: { status: { in: ['published', 'suspended'] } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      city: true,
      address: true,
      status: true,
      rejectionNote: true,
      createdAt: true,
      host: {
        select: { id: true, firstName: true, lastName: true, businessName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Duplicate signal: more than one listing sharing a normalized (title, city).
  const keyOf = (l: { title: string; city: string }) =>
    `${l.title.trim().toLowerCase()}|${l.city.trim().toLowerCase()}`;
  const keyCount = new Map<string, number>();
  for (const l of listings) keyCount.set(keyOf(l), (keyCount.get(keyOf(l)) ?? 0) + 1);

  const items = listings
    .map((l) => {
      const flags: ModerationFlag[] = [];
      if (l.status === 'suspended') {
        flags.push({ type: 'suspended', detail: l.rejectionNote ?? 'Suspended by moderation' });
      }
      for (const label of contentFlags(`${l.title} ${l.description ?? ''}`)) {
        flags.push({ type: 'content', detail: `Possible ${label} restriction` });
      }
      if ((keyCount.get(keyOf(l)) ?? 0) > 1) {
        flags.push({ type: 'duplicate', detail: `Duplicate title in ${l.city}` });
      }
      const { description: _d, ...rest } = l;
      return { ...rest, flags };
    })
    .filter((l) => l.flags.length > 0);

  return items;
}

export async function suspendListing(adminId: string, id: string, reason: string) {
  const listing = await prisma.listing.findUnique({ where: { id }, select: { id: true } });
  if (!listing) throw new AppError(404, 'Listing not found');

  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'suspended', rejectionNote: reason },
  });
  await logAdminAction({
    adminId,
    action: 'listing.suspend',
    targetType: 'listing',
    targetId: id,
    meta: { reason },
  });
  return updated;
}

export async function reinstateListing(adminId: string, id: string) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (listing.status !== 'suspended') {
    throw new AppError(400, 'Only a suspended listing can be reinstated');
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: { status: 'published', rejectionNote: null, publishedAt: listing.publishedAt ?? new Date() },
  });
  await logAdminAction({
    adminId,
    action: 'listing.reinstate',
    targetType: 'listing',
    targetId: id,
  });
  return updated;
}

// ─── Taxonomy: cities ─────────────────────────────────────────────────────────

export function listCities() {
  return prisma.city.findMany({ orderBy: { name: 'asc' } });
}

export async function createCity(adminId: string, input: CreateCityInput) {
  const slug = slugify(input.slug ?? input.name);
  const existing = await prisma.city.findFirst({
    where: { OR: [{ slug }, { name: input.name }] },
  });
  if (existing) throw new AppError(409, 'A city with that name or slug already exists');

  const city = await prisma.city.create({
    data: { name: input.name, slug, tags: input.tags ?? [], imageUrl: input.imageUrl ?? null },
  });
  await logAdminAction({ adminId, action: 'city.create', targetType: 'city', targetId: city.id });
  return city;
}

export async function updateCity(adminId: string, id: string, input: UpdateCityInput) {
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) throw new AppError(404, 'City not found');

  const updated = await prisma.city.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
  await logAdminAction({ adminId, action: 'city.update', targetType: 'city', targetId: id, meta: input });
  return updated;
}

export async function deleteCity(adminId: string, id: string) {
  const city = await prisma.city.findUnique({ where: { id } });
  if (!city) throw new AppError(404, 'City not found');
  await prisma.city.delete({ where: { id } });
  await logAdminAction({ adminId, action: 'city.delete', targetType: 'city', targetId: id, meta: { slug: city.slug } });
  return { deleted: true as const };
}

// ─── Taxonomy: property types ─────────────────────────────────────────────────

export async function listListingTypes() {
  const types = await prisma.listingType.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { listings: true } } },
  });
  return types.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    listingCount: t._count.listings,
  }));
}

export async function createListingType(adminId: string, input: CreateListingTypeInput) {
  const name = input.name.trim().toLowerCase();
  const slug = slugify(name);
  const existing = await prisma.listingType.findFirst({ where: { OR: [{ name }, { slug }] } });
  if (existing) throw new AppError(409, 'That property type already exists');

  const type = await prisma.listingType.create({
    data: { name, slug, description: input.description ?? null },
  });
  await logAdminAction({ adminId, action: 'listingType.create', targetType: 'listingType', targetId: type.id });
  return type;
}

export async function updateListingType(adminId: string, id: string, input: UpdateListingTypeInput) {
  const type = await prisma.listingType.findUnique({ where: { id } });
  if (!type) throw new AppError(404, 'Property type not found');
  // `name` is the FK target for Listing.type — immutable here to avoid orphaning.
  const updated = await prisma.listingType.update({
    where: { id },
    data: { ...(input.description !== undefined && { description: input.description }) },
  });
  await logAdminAction({ adminId, action: 'listingType.update', targetType: 'listingType', targetId: id });
  return updated;
}

export async function deleteListingType(adminId: string, id: string) {
  const type = await prisma.listingType.findUnique({
    where: { id },
    include: { _count: { select: { listings: true } } },
  });
  if (!type) throw new AppError(404, 'Property type not found');
  if (type._count.listings > 0) {
    throw new AppError(409, `${type._count.listings} listing(s) use this type — reassign them first`);
  }
  await prisma.listingType.delete({ where: { id } });
  await logAdminAction({ adminId, action: 'listingType.delete', targetType: 'listingType', targetId: id, meta: { name: type.name } });
  return { deleted: true as const };
}

// ─── User / agency management ────────────────────────────────────────────────

export async function listUsers(query: UserQueryInput) {
  const where = {
    ...(query.role && { role: query.role }),
    ...(query.status && { status: query.status }),
    ...(query.search && {
      OR: [
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { firstName: { contains: query.search, mode: 'insensitive' as const } },
        { lastName: { contains: query.search, mode: 'insensitive' as const } },
        { businessName: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        businessName: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { listings: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({ ...u, listingCount: u._count.listings, _count: undefined })),
    meta: paginate(query.page, query.limit, total),
  };
}

export async function updateUser(adminId: string, id: string, input: UpdateUserInput) {
  if (id === adminId) {
    throw new AppError(400, 'You cannot change your own role or status');
  }
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw new AppError(404, 'User not found');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.role !== undefined && { role: input.role }),
    },
    select: { id: true, email: true, role: true, status: true },
  });
  await logAdminAction({ adminId, action: 'user.update', targetType: 'user', targetId: id, meta: input });
  return updated;
}
