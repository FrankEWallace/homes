"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface ListingFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const numOpt = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().optional(),
);

const listingFormSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200),
    type: z.string().min(1, "Choose a property type"),
    tenure: z.enum(["sale", "rent"]),
    description: z.string().min(20, "Description must be at least 20 characters").max(5000),
    priceAmount: z.coerce.number().positive("Enter a price greater than 0"),
    rentPeriod: z.enum(["week", "month", "year"]).optional(),
    bedrooms: numOpt,
    bathrooms: numOpt,
    areaSqft: numOpt,
    city: z.string().min(2, "City is required").max(100),
    region: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    postalCode: z.string().max(20).optional(),
    latitude: numOpt,
    longitude: numOpt,
    images: z.array(z.string().url()).max(20),
  })
  .refine((d) => d.tenure !== "rent" || !!d.rentPeriod, {
    path: ["rentPeriod"],
    message: "Rentals need a rent period",
  });

function parseForm(formData: FormData) {
  const images = String(formData.get("images") ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return listingFormSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    tenure: formData.get("tenure"),
    description: formData.get("description"),
    priceAmount: formData.get("priceAmount"),
    rentPeriod: formData.get("rentPeriod") || undefined,
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    areaSqft: formData.get("areaSqft"),
    city: formData.get("city"),
    region: formData.get("region") || undefined,
    address: formData.get("address") || undefined,
    postalCode: formData.get("postalCode") || undefined,
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    images,
  });
}

/** Create (no id) or update (id) a listing. Redirects to the list on success. */
export async function saveListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const token = await getAccessToken();
  if (!token) return { error: "Your session expired — please sign in again." };

  const id = formData.get("id");
  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    if (typeof id === "string" && id) {
      await apiMutate("PUT", `/listings/${encodeURIComponent(id)}`, { token, body: parsed.data });
    } else {
      await apiMutate("POST", "/listings", { token, body: parsed.data });
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { error: "Your session expired — please sign in again." };
      if (err.status === 403) return { error: "You don't have permission to edit this listing." };
      return { error: err.message };
    }
    return { error: "Could not save the listing. Please try again." };
  }

  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
}

async function mutateStatus(
  method: "POST" | "DELETE",
  path: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "Please sign in" };
  try {
    await apiMutate(method, path, { token });
    revalidatePath("/dashboard/listings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { ok: false, error: "Not your listing" };
    return { ok: false, error: "Action failed" };
  }
}

export async function publishListingAction(id: string) {
  return mutateStatus("POST", `/listings/${encodeURIComponent(id)}/publish`);
}
export async function unpublishListingAction(id: string) {
  return mutateStatus("POST", `/listings/${encodeURIComponent(id)}/unpublish`);
}
export async function deleteListingAction(id: string) {
  return mutateStatus("DELETE", `/listings/${encodeURIComponent(id)}`);
}
