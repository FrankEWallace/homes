import "server-only";
import { z } from "zod";
import { apiGet } from "./api-client";
import { getAccessToken } from "./auth";

export const savedSearchCriteriaSchema = z.object({
  q: z.string().optional(),
  tenure: z.enum(["sale", "rent"]).optional(),
  type: z.string().optional(),
  city: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  minBeds: z.number().optional(),
  minBaths: z.number().optional(),
});
export type SavedSearchCriteria = z.infer<typeof savedSearchCriteriaSchema>;

export const savedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  query: savedSearchCriteriaSchema.passthrough(),
  notify: z.boolean(),
  frequency: z.enum(["instant", "daily"]),
  createdAt: z.string(),
  lastNotifiedAt: z.string().nullable(),
});
export type SavedSearch = z.infer<typeof savedSearchSchema>;

const listResponse = z.object({ data: z.array(savedSearchSchema) });

/** The current user's saved searches (empty when signed out). */
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await apiGet<unknown>("/saved-searches", { token });
  return listResponse.parse(res).data;
}
