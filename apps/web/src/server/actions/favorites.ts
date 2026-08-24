"use server";

import { revalidatePath } from "next/cache";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface ToggleResult {
  ok: boolean;
  saved?: boolean;
  /** Set when the user must sign in first. */
  authRequired?: boolean;
  error?: string;
}

/** Toggle a listing in the current seeker's favorites. Requires a session. */
export async function toggleFavoriteAction(listingId: string): Promise<ToggleResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, authRequired: true };

  try {
    const res = await apiMutate<{ data: { added: boolean } }>(
      "POST",
      `/wishlist/${encodeURIComponent(listingId)}/toggle`,
      { token },
    );
    revalidatePath("/favorites");
    return { ok: true, saved: res.data.added };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, authRequired: true };
    return { ok: false, error: "Could not update favorites" };
  }
}
