import { z } from "zod";
import { tenureSchema } from "./listing";

/**
 * Saved-search contracts (F5). `criteria` mirrors the public search URL params so
 * "save this search" is a straight capture of what the seeker is looking at; the
 * alert matcher runs it against new listings.
 */
export const alertFrequencySchema = z.enum(["instant", "daily"]);
export type AlertFrequency = z.infer<typeof alertFrequencySchema>;

export const savedSearchCriteriaSchema = z.object({
  q: z.string().max(120).optional(),
  tenure: tenureSchema.optional(),
  type: z.string().max(60).optional(),
  city: z.string().max(100).optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  minBeds: z.number().int().min(0).max(50).optional(),
  minBaths: z.number().int().min(0).max(50).optional(),
});
export type SavedSearchCriteria = z.infer<typeof savedSearchCriteriaSchema>;

export const createSavedSearchRequestSchema = z.object({
  name: z.string().min(1, "Please name this search").max(120),
  query: savedSearchCriteriaSchema,
  notify: z.boolean().default(true),
  frequency: alertFrequencySchema.default("instant"),
});
export type CreateSavedSearchRequest = z.infer<typeof createSavedSearchRequestSchema>;

export const updateSavedSearchRequestSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    notify: z.boolean().optional(),
    frequency: alertFrequencySchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
export type UpdateSavedSearchRequest = z.infer<typeof updateSavedSearchRequestSchema>;

/** A saved search as returned by the API. */
export const savedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  query: savedSearchCriteriaSchema.passthrough(),
  notify: z.boolean(),
  frequency: alertFrequencySchema,
  createdAt: z.string(),
  lastNotifiedAt: z.string().nullable(),
});
export type SavedSearch = z.infer<typeof savedSearchSchema>;
