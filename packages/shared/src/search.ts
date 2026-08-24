import { z } from "zod";
import { listingCardSchema, tenureSchema } from "./listing";

/** Client-side search input (what the marketplace UI collects). */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  tenure: tenureSchema.optional(),
  type: z.string().optional(),
  city: z.string().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  minBeds: z.number().int().min(0).optional(),
  minBaths: z.number().min(0).optional(),
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc"]).default("relevance"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(24),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export const searchFacetsSchema = z.object({
  total: z.number(),
  tenure: z.record(z.string(), z.number()),
  propertyTypes: z.record(z.string(), z.number()),
  bedrooms: z.record(z.string(), z.number()),
});
export type SearchFacets = z.infer<typeof searchFacetsSchema>;

/** The backend's success envelope for GET /listings. */
export const searchResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.array(listingCardSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    facets: searchFacetsSchema,
  }),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

export type SearchResult = {
  items: SearchResponse["data"];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: SearchFacets;
};
