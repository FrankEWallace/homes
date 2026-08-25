import "server-only";
import { z } from "zod";
import { apiGet, ApiError } from "./api-client";
import { getAccessToken } from "./auth";

/** Agent-facing listing row (all statuses). Decimal fields arrive as strings. */
export const agentListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(["draft", "published", "under_offer", "sold", "let", "withdrawn"]),
  tenure: z.enum(["sale", "rent"]),
  type: z.string(),
  description: z.string(),
  priceAmount: z.coerce.number(),
  priceCurrency: z.string(),
  rentPeriod: z.string().nullable(),
  bedrooms: z.coerce.number().nullable(),
  bathrooms: z.coerce.number().nullable(),
  areaSqft: z.coerce.number().nullable(),
  address: z.string().nullable(),
  city: z.string(),
  region: z.string().nullable(),
  postalCode: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  images: z.array(z.string()),
  viewCount: z.coerce.number(),
  createdAt: z.string(),
});
export type AgentListing = z.infer<typeof agentListingSchema>;

const listResponse = z.object({ data: z.array(agentListingSchema) });
const oneResponse = z.object({ data: agentListingSchema });

/** The signed-in agent's listings (all statuses). */
export async function getMyListings(): Promise<AgentListing[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await apiGet<unknown>("/listings/mine", { token });
  return listResponse.parse(res).data;
}

/** One of the agent's listings by id (for the edit form). Null if not found/owned. */
export async function getMyListing(id: string): Promise<AgentListing | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await apiGet<unknown>(`/listings/${encodeURIComponent(id)}`, { token });
    return oneResponse.parse(res).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

const typeSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });

/** Property types for the listing form select. */
export async function getListingTypes(): Promise<{ name: string; slug: string }[]> {
  try {
    const res = await apiGet<unknown>("/listings/types");
    return z.object({ data: z.array(typeSchema) }).parse(res).data;
  } catch {
    return [];
  }
}
