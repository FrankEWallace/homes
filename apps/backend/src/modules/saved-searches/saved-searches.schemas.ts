import { z } from 'zod';

/**
 * Canonical search criteria persisted with a saved search. Mirrors the public
 * search URL params (see @homes/shared `SearchParams`) so "save this search" is a
 * straight capture of what the seeker is looking at. Matched against new listings
 * by the alert matcher.
 */
export const SavedSearchCriteriaSchema = z.object({
  q: z.string().max(120).optional(),
  tenure: z.enum(['sale', 'rent']).optional(),
  type: z.string().max(60).optional(),
  city: z.string().max(100).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  minBeds: z.coerce.number().int().min(0).max(50).optional(),
  minBaths: z.coerce.number().int().min(0).max(50).optional(),
});

export type SavedSearchCriteria = z.infer<typeof SavedSearchCriteriaSchema>;

export const CreateSavedSearchSchema = z.object({
  name: z.string().min(1, 'Please name this search').max(120),
  query: SavedSearchCriteriaSchema,
  notify: z.boolean().default(true),
  frequency: z.enum(['instant', 'daily']).default('instant'),
});

export type CreateSavedSearchInput = z.infer<typeof CreateSavedSearchSchema>;

export const UpdateSavedSearchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    notify: z.boolean().optional(),
    frequency: z.enum(['instant', 'daily']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export type UpdateSavedSearchInput = z.infer<typeof UpdateSavedSearchSchema>;
