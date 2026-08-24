import { z } from "zod";
import { tenureSchema } from "./listing";

/** Decimal columns arrive as strings over JSON (Prisma Decimal.toJSON). */
const decimal = z.coerce.number();

const hostSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

/** Full listing as returned by GET /listings/:id (permissive on extra fields). */
export const listingDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  type: z.string(),
  tenure: tenureSchema,
  status: z.string(),
  title: z.string(),
  description: z.string(),
  priceAmount: decimal,
  priceCurrency: z.string(),
  rentPeriod: z.string().nullable(),
  bedrooms: z.number().int().nullable(),
  bathrooms: decimal.nullable(),
  areaSqft: decimal.nullable(),
  lotSqft: decimal.nullable(),
  yearBuilt: z.number().int().nullable(),
  locationName: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string(),
  region: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string(),
  latitude: decimal.nullable(),
  longitude: decimal.nullable(),
  images: z.array(z.string()),
  isFeatured: z.boolean(),
  averageRating: decimal.nullable(),
  reviewCount: z.number().int(),
  host: hostSchema.nullable().optional(),
});
export type ListingDetail = z.infer<typeof listingDetailSchema>;

export const listingDetailResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: listingDetailSchema,
});
