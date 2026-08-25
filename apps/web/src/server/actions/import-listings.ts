"use server";

import { revalidatePath } from "next/cache";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface ImportResult {
  ok: boolean;
  error?: string;
  summary?: {
    total: number;
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
  };
}

/** Send raw CSV text to the backend bulk-import endpoint. */
export async function importListingsAction(csv: string): Promise<ImportResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "Please sign in again." };
  if (!csv.trim()) return { ok: false, error: "The file is empty." };

  try {
    const res = await apiMutate<{ data: ImportResult["summary"] }>("POST", "/listings/import", {
      token,
      body: { csv },
    });
    revalidatePath("/dashboard/listings");
    return { ok: true, summary: res.data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { ok: false, error: "Please sign in again." };
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Import failed. Please try again." };
  }
}
