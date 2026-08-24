import { z } from "zod";

export const tenureSchema = z.enum(["sale", "rent"]);
export type Tenure = z.infer<typeof tenureSchema>;

/** A listing as returned by search / shown on a card or map pin. */
export const listingCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  tenure: tenureSchema,
  price: z.number(),
  currency: z.string(),
  rentPeriod: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  bathrooms: z.number().nullable(),
  areaSqft: z.number().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  propertyType: z.string().nullable(),
  isFeatured: z.boolean(),
  lng: z.number().nullable(),
  lat: z.number().nullable(),
  primaryPhoto: z.string().nullable(),
});
export type ListingCard = z.infer<typeof listingCardSchema>;
