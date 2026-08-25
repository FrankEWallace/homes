"use server";

import { revalidatePath } from "next/cache";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";
import { savedSearchCriteriaSchema, type SavedSearchCriteria } from "../saved-searches";

export interface SaveSearchResult {
  ok: boolean;
  authRequired?: boolean;
  error?: string;
}

/** Build a human label from criteria for the default saved-search name. */
function deriveName(c: SavedSearchCriteria): string {
  const parts: string[] = [];
  if (c.tenure) parts.push(c.tenure === "rent" ? "Rentals" : "For sale");
  if (c.city) parts.push(`in ${c.city}`);
  else if (c.q) parts.push(`“${c.q}”`);
  if (c.minBeds) parts.push(`${c.minBeds}+ beds`);
  if (c.priceMax) parts.push(`under ${c.priceMax.toLocaleString()}`);
  return parts.join(" · ") || "My search";
}

export async function createSavedSearchAction(
  rawCriteria: SavedSearchCriteria,
  name?: string,
): Promise<SaveSearchResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, authRequired: true };

  const parsed = savedSearchCriteriaSchema.safeParse(rawCriteria);
  if (!parsed.success) return { ok: false, error: "Invalid search" };

  try {
    await apiMutate("POST", "/saved-searches", {
      token,
      body: {
        name: name?.trim() || deriveName(parsed.data),
        query: parsed.data,
        notify: true,
      },
    });
    revalidatePath("/saved-searches");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, authRequired: true };
    return { ok: false, error: "Could not save this search" };
  }
}

export async function deleteSavedSearchAction(id: string): Promise<SaveSearchResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, authRequired: true };
  try {
    await apiMutate("DELETE", `/saved-searches/${encodeURIComponent(id)}`, { token });
    revalidatePath("/saved-searches");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, authRequired: true };
    return { ok: false, error: "Could not delete this search" };
  }
}

export async function toggleSavedSearchNotifyAction(
  id: string,
  notify: boolean,
): Promise<SaveSearchResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, authRequired: true };
  try {
    await apiMutate("PATCH", `/saved-searches/${encodeURIComponent(id)}`, {
      token,
      body: { notify },
    });
    revalidatePath("/saved-searches");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, authRequired: true };
    return { ok: false, error: "Could not update this search" };
  }
}
