import "server-only";
import { z } from "zod";
import { listingCardSchema, type ListingCard } from "@homes/shared";
import { apiGet } from "./api-client";
import { getAccessToken } from "./auth";

/**
 * Favorites seam. All calls carry the seeker's access token; the backend scopes
 * every query to the token's user, so there's no way to read another user's list.
 */

const idsResponse = z.object({ data: z.array(z.string()) });

/** Set of listing ids the current user has favorited (empty when signed out). */
export async function getFavoriteIds(): Promise<Set<string>> {
  const token = await getAccessToken();
  if (!token) return new Set();
  try {
    const res = await apiGet<unknown>("/wishlist/ids", { token });
    return new Set(idsResponse.parse(res).data);
  } catch {
    return new Set();
  }
}

const favoritesResponse = z.object({ data: z.array(listingCardSchema) });

/** The current user's favorited listings as cards. */
export async function getFavorites(): Promise<ListingCard[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await apiGet<unknown>("/wishlist", { token });
  return favoritesResponse.parse(res).data;
}
