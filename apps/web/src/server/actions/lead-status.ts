"use server";

import { revalidatePath } from "next/cache";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";
import { leadStatusSchema, type LeadStatus } from "../leads";

export interface UpdateLeadStatusResult {
  ok: boolean;
  error?: string;
}

/** Agent updates a lead's status from the inbox. Backend enforces ownership. */
export async function updateLeadStatusAction(
  id: string,
  status: LeadStatus,
): Promise<UpdateLeadStatusResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "Please sign in" };
  if (!leadStatusSchema.safeParse(status).success) return { ok: false, error: "Invalid status" };

  try {
    await apiMutate("PATCH", `/leads/${encodeURIComponent(id)}/status`, {
      token,
      body: { status },
    });
    revalidatePath("/dashboard/leads");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { ok: false, error: "Not your lead" };
    return { ok: false, error: "Could not update status" };
  }
}
