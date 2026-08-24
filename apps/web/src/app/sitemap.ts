import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { searchListings } from "@/server/listings";

/**
 * v1 sitemap: static routes + published listings. At national scale this
 * graduates to sharded/segmented sitemaps (see docs/SYSTEM_DESIGN.md §NFR).
 * Resilient: if the backend is unavailable, still emits the static routes.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search?tenure=sale`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/search?tenure=rent`, changeFrequency: "hourly", priority: 0.8 },
  ];

  try {
    const { items } = await searchListings({ sort: "newest", page: 1, limit: 50 });
    const listingRoutes: MetadataRoute.Sitemap = items.map((l) => ({
      url: `${base}/listing/${l.slug}`,
      changeFrequency: "daily",
      priority: 0.6,
    }));
    return [...staticRoutes, ...listingRoutes];
  } catch {
    return staticRoutes;
  }
}
