import "server-only";
import { z } from "zod";
import { savedSearchSchema, type SavedSearch } from "@homes/shared";
import { apiGet } from "./api-client";
import { getAccessToken } from "./auth";

// Canonical contracts live in @homes/shared — re-exported here for feature code.
export {
  savedSearchCriteriaSchema,
  savedSearchSchema,
  type SavedSearchCriteria,
  type SavedSearch,
} from "@homes/shared";

const listResponse = z.object({ data: z.array(savedSearchSchema) });

/** The current user's saved searches (empty when signed out). */
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await apiGet<unknown>("/saved-searches", { token });
  return listResponse.parse(res).data;
}
