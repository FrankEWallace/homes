"use server";

import { revalidatePath } from "next/cache";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface ModerationActionState {
  error?: string;
  ok?: boolean;
}

/** Admin: suspend (take down) a listing with a reason. */
export async function suspendListingAction(
  listingId: string,
  reason: string,
): Promise<ModerationActionState> {
  const token = await getAccessToken();
  if (!token) return { error: "Not signed in" };
  if (!reason.trim()) return { error: "A reason is required" };
  try {
    await apiMutate("POST", `/admin/listings/${listingId}/suspend`, {
      token,
      body: { reason },
    });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Could not suspend the listing" };
  }
  revalidatePath("/dashboard/moderation");
  return { ok: true };
}

/** Admin: reinstate a suspended listing. */
export async function reinstateListingAction(listingId: string): Promise<ModerationActionState> {
  const token = await getAccessToken();
  if (!token) return { error: "Not signed in" };
  try {
    await apiMutate("POST", `/admin/listings/${listingId}/reinstate`, { token });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Could not reinstate the listing" };
  }
  revalidatePath("/dashboard/moderation");
  return { ok: true };
}
