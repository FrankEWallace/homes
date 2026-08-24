import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { sendSavedSearchAlertEmail, type AlertListingItem } from '../../utils/mail';
import { SavedSearchCriteriaSchema, type SavedSearchCriteria } from './saved-searches.schemas';

const MAX_ALERT_ITEMS = 20;

/** Translate stored search criteria into a Prisma filter over new listings. */
export function criteriaToWhere(c: SavedSearchCriteria, since: Date): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {
    status: 'published',
    createdAt: { gt: since },
  };

  if (c.tenure) where.tenure = c.tenure;
  if (c.type) where.type = c.type;
  if (c.city) where.city = { contains: c.city, mode: 'insensitive' };
  if (c.minBeds != null) where.bedrooms = { gte: c.minBeds };
  if (c.minBaths != null) where.bathrooms = { gte: c.minBaths };
  if (c.priceMin != null || c.priceMax != null) {
    where.priceAmount = {
      ...(c.priceMin != null && { gte: c.priceMin }),
      ...(c.priceMax != null && { lte: c.priceMax }),
    };
  }
  if (c.q) {
    where.OR = [
      { title: { contains: c.q, mode: 'insensitive' } },
      { description: { contains: c.q, mode: 'insensitive' } },
      { locationName: { contains: c.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

export function priceLabel(amount: Prisma.Decimal | number, currency: string, rentPeriod: string | null) {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
  return rentPeriod ? `${formatted}/${rentPeriod}` : formatted;
}

/**
 * Run alerts for every saved search with notifications on. For each, find listings
 * published since its watermark that match its criteria; if any, email the owner a
 * digest, drop an in-app notification, and advance the watermark. Idempotent per run:
 * a failure to email one search doesn't advance its watermark, so it retries next run.
 */
export async function runSavedSearchAlerts(): Promise<{ processed: number; notified: number }> {
  const searches = await prisma.savedSearch.findMany({
    where: { notify: true },
    include: { user: { select: { email: true } } },
  });

  let notified = 0;

  for (const search of searches) {
    const parsed = SavedSearchCriteriaSchema.safeParse(search.query);
    if (!parsed.success) {
      console.warn(`[savedSearch] ${search.id} has invalid criteria — skipping`);
      continue;
    }

    try {
      const listings = await prisma.listing.findMany({
        where: criteriaToWhere(parsed.data, search.lastCheckedAt),
        orderBy: { createdAt: 'desc' },
        take: MAX_ALERT_ITEMS,
        select: {
          title: true,
          slug: true,
          city: true,
          images: true,
          priceAmount: true,
          priceCurrency: true,
          rentPeriod: true,
        },
      });

      if (listings.length > 0) {
        const items: AlertListingItem[] = listings.map((l) => ({
          title: l.title,
          slug: l.slug,
          city: l.city,
          priceLabel: priceLabel(l.priceAmount, l.priceCurrency, l.rentPeriod),
          imageUrl: l.images[0] ?? null,
        }));

        if (search.user.email) {
          await sendSavedSearchAlertEmail(search.user.email, search.name, items);
        }

        await prisma.notification.create({
          data: {
            userId: search.userId,
            type: 'saved_search_match',
            title: 'New homes for your saved search',
            body: `${listings.length} new ${listings.length === 1 ? 'home' : 'homes'} match “${search.name}”`,
            data: { savedSearchId: search.id, count: listings.length },
          },
        });

        notified += 1;
      }

      // Advance the watermark only after a successful pass.
      await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          lastCheckedAt: new Date(),
          ...(listings.length > 0 && { lastNotifiedAt: new Date() }),
        },
      });
    } catch (err) {
      console.error(`[savedSearch] alert for ${search.id} failed:`, err);
      // Leave the watermark in place so the next run retries this window.
    }
  }

  return { processed: searches.length, notified };
}
