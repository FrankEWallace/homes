import { z } from 'zod';

const boolish = z.preprocess(
  (val) => (typeof val === 'string' ? val === 'true' : val),
  z.boolean(),
);

// ─── Listing schemas (real-estate) ───────────────────────────────────────────

export const CreateListingSchema = z
  .object({
    type: z.string().min(1, 'Property type is required'), // -> ListingType.name
    tenure: z.enum(['sale', 'rent']),
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
    categoryId: z.string().optional(),

    priceAmount: z.coerce.number().positive('Price must be greater than 0'),
    priceCurrency: z.string().length(3).default('USD'),
    rentPeriod: z.enum(['week', 'month', 'year']).optional(),

    bedrooms: z.coerce.number().int().min(0).max(50).optional(),
    bathrooms: z.coerce.number().min(0).max(50).optional(),
    areaSqft: z.coerce.number().positive().optional(),
    lotSqft: z.coerce.number().positive().optional(),
    yearBuilt: z.coerce.number().int().min(1600).max(new Date().getFullYear() + 2).optional(),

    locationName: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    city: z.string().min(2).max(100),
    region: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().length(2).default('US'),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),

    tagIds: z.array(z.string()).max(20).optional(),
    images: z.array(z.string()).default([]),
    metadata: z.record(z.unknown()).optional(),
    isFeatured: boolish.optional(),
    requiresApproval: boolish.default(false),
  })
  .superRefine((data, ctx) => {
    if (data.tenure === 'rent' && !data.rentPeriod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rentPeriod'],
        message: 'Rental listings must specify a rent period',
      });
    }
  });

export const UpdateListingSchema = CreateListingSchema.innerType().partial();

// ─── CSV bulk import ──────────────────────────────────────────────────────────

const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** One row from an uploaded CSV. Lenient coercion; images are `;`-separated URLs. */
export const ImportRowSchema = z
  .object({
    title: z.string().min(3).max(200),
    type: z.string().min(1),
    tenure: z.enum(['sale', 'rent']),
    description: z.string().min(20).max(5000),
    priceamount: z.coerce.number().positive(),
    pricecurrency: z.preprocess(emptyToUndef, z.string().length(3).default('USD')),
    rentperiod: z.preprocess(emptyToUndef, z.enum(['week', 'month', 'year']).optional()),
    bedrooms: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(50).optional()),
    bathrooms: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(50).optional()),
    areasqft: z.preprocess(emptyToUndef, z.coerce.number().positive().optional()),
    address: z.preprocess(emptyToUndef, z.string().max(500).optional()),
    city: z.string().min(2).max(100),
    region: z.preprocess(emptyToUndef, z.string().max(100).optional()),
    postalcode: z.preprocess(emptyToUndef, z.string().max(20).optional()),
    country: z.preprocess(emptyToUndef, z.string().length(2).default('US')),
    latitude: z.preprocess(emptyToUndef, z.coerce.number().min(-90).max(90).optional()),
    longitude: z.preprocess(emptyToUndef, z.coerce.number().min(-180).max(180).optional()),
    images: z.preprocess(emptyToUndef, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.tenure === 'rent' && !data.rentperiod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rentperiod'], message: 'rent needs rentPeriod' });
    }
  });

export type ImportRowInput = z.infer<typeof ImportRowSchema>;

export const ImportCsvSchema = z.object({
  csv: z.string().min(1, 'CSV content is required').max(2_000_000),
});

export const ListingQuerySchema = z.object({
  tenure: z.enum(['sale', 'rent']).optional(),
  type: z.string().optional(), // property type
  city: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().max(120).optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  minBeds: z.coerce.number().int().min(0).optional(),
  minBaths: z.coerce.number().min(0).optional(),
  // Map viewport as "minLng,minLat,maxLng,maxLat"
  bbox: z
    .string()
    .transform((s) => s.split(',').map(Number))
    .pipe(z.tuple([z.number(), z.number(), z.number(), z.number()]))
    .optional(),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc']).default('relevance'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type ListingQueryInput = z.infer<typeof ListingQuerySchema>;
