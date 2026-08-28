import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logAdminAction } from '../../utils/auditLog';

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
