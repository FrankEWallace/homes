"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { getAccessToken } from "../auth";

export interface UploadResult {
  ok: boolean;
  images?: string[];
  error?: string;
}

/**
 * Forward image files to the backend `POST /listings/:id/images` (multipart).
 * The backend stores them (R2/Cloudinary, or local disk in dev) and returns the
 * listing's full image list. We re-post FormData rather than JSON so the binary
 * passes straight through with the auth token attached.
 */
export async function uploadListingImagesAction(id: string, formData: FormData): Promise<UploadResult> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "Please sign in again." };

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Choose at least one image." };

  const forward = new FormData();
  for (const f of files) forward.append("images", f, f.name);

  try {
    const res = await fetch(`${env.API_BASE_URL}/listings/${encodeURIComponent(id)}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // let fetch set the multipart boundary
      body: forward,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: (body && (body.message as string)) || `Upload failed (${res.status})` };
    }
    revalidatePath(`/dashboard/listings/${id}/edit`);
    return { ok: true, images: (body?.data?.images as string[]) ?? [] };
  } catch {
    return { ok: false, error: "Upload failed. Please try again." };
  }
}
