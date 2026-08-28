import "server-only";
import { apiGet } from "./api-client";

export interface CitySummary {
  slug: string;
  name: string;
  updatedAt?: string;
}

/**
 * Active cities (drive the `/homes/[city]` landing pages). Fetched via the
 * backend `GET /cities`. Resilient: returns an empty list if the backend is
 * unavailable so callers (e.g. the sitemap) still render.
 */
export async function getCities(): Promise<CitySummary[]> {
  try {
    const body = await apiGet<{ data: CitySummary[] }>("/cities", {
      next: { revalidate: 3600, tags: ["cities"] },
    });
    return body.data ?? [];
  } catch {
    return [];
  }
}
