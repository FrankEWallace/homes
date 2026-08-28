import "server-only";
import {
  type ListingDetail,
  type SearchParams,
  type SearchResult,
  listingDetailResponseSchema,
  searchResponseSchema,
} from "@homes/shared";
import { apiGet, ApiError } from "./api-client";

/**
 * Search listings via the backend `GET /listings` (PostGIS SearchEngine).
 * The response is validated against the shared contract so the web and backend
 * stay in sync on one source of truth.
 */
export async function searchListings(params: SearchParams): Promise<SearchResult> {
  const body = await apiGet<unknown>("/listings", {
    query: {
      search: params.q, // backend query param is `search`
      tenure: params.tenure,
      type: params.type,
      city: params.city,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      minBeds: params.minBeds,
      minBaths: params.minBaths,
      bbox: params.bbox, // array -> comma-joined by the client
      sort: params.sort,
      page: params.page,
      limit: params.limit,
    },
    // Public search: cache briefly at the edge; invalidated on listing writes later.
    next: { revalidate: 30, tags: ["listings"] },
  });

  const parsed = searchResponseSchema.parse(body);
  return {
    items: parsed.data,
    page: parsed.meta.page,
    limit: parsed.meta.limit,
    total: parsed.meta.total,
    totalPages: parsed.meta.totalPages,
    facets: parsed.meta.facets,
  };
}

export interface SitemapListing {
  slug: string;
  updatedAt: string;
}

/**
 * Lightweight published-listing feed for sitemap generation (Phase 5).
 * Pages through `GET /listings/sitemap` (slug + updatedAt only) so the sitemap
 * can enumerate the full catalogue and shard across files at scale.
 */
export async function getSitemapListings(
  page: number,
  limit: number,
): Promise<{ items: SitemapListing[]; total: number }> {
  const body = await apiGet<{ data: SitemapListing[]; meta?: { total?: number } }>(
    "/listings/sitemap",
    {
      query: { page, limit },
      next: { revalidate: 3600, tags: ["listings"] },
    },
  );
  return { items: body.data ?? [], total: body.meta?.total ?? 0 };
}

/** Fetch one listing by id or slug via GET /listings/:id. Returns null on 404. */
export async function getListing(idOrSlug: string): Promise<ListingDetail | null> {
  try {
    const body = await apiGet<unknown>(`/listings/${encodeURIComponent(idOrSlug)}`, {
      next: { revalidate: 60, tags: ["listings", `listing:${idOrSlug}`] },
    });
    return listingDetailResponseSchema.parse(body).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
