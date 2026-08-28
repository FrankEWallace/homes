import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getSitemapListings } from "@/server/listings";
import { getCities } from "@/server/cities";

/**
 * Sitemap: static routes + city landing pages + every published listing.
 *
 * We enumerate the full published catalogue (paging the backend `slug` feed),
 * not just the first result page. A single sitemap file may hold up to 50,000
 * URLs (Google's cap); at national scale, split this into per-shard files with
 * `generateSitemaps()` over the same paged `getSitemapListings()` feed and emit
 * a sitemap index. See docs/V1_IMPLEMENTATION_PLAN.md §Phase 5.
 *
 * Resilient: if the backend is unavailable, still emits the static routes.
 */
export const revalidate = 3600;

const MAX_URLS = 50_000;
const PAGE_SIZE = 1_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search?tenure=sale`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/search?tenure=rent`, changeFrequency: "hourly", priority: 0.8 },
  ];

  // City landing pages (SEO surface, F17).
  let cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const cities = await getCities();
    cityRoutes = cities.map((c) => ({
      url: `${base}/homes/${c.slug}`,
      changeFrequency: "daily",
      priority: 0.7,
      ...(c.updatedAt ? { lastModified: new Date(c.updatedAt) } : {}),
    }));
  } catch {
    cityRoutes = [];
  }

  // Every published listing, paged until exhausted or the per-file cap.
  const listingRoutes: MetadataRoute.Sitemap = [];
  try {
    let page = 1;
    let total = Infinity;
    while (listingRoutes.length < MAX_URLS && (page - 1) * PAGE_SIZE < total) {
      const { items, total: t } = await getSitemapListings(page, PAGE_SIZE);
      total = t;
      if (items.length === 0) break;
      for (const l of items) {
        listingRoutes.push({
          url: `${base}/listing/${l.slug}`,
          changeFrequency: "daily",
          priority: 0.6,
          lastModified: new Date(l.updatedAt),
        });
      }
      page += 1;
    }
    if (total > MAX_URLS) {
      // No silent truncation: surface that the sitemap needs sharding.
      console.warn(
        `[sitemap] ${total} published listings exceed the ${MAX_URLS}-URL single-file cap; ` +
          "shard via generateSitemaps() to index them all.",
      );
    }
  } catch {
    return [...staticRoutes, ...cityRoutes];
  }

  return [...staticRoutes, ...cityRoutes, ...listingRoutes];
}
