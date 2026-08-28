import { z } from 'zod';

export const SuspendListingSchema = z.object({
  reason: z.string().min(1, 'A reason is required').max(500),
});

export type SuspendListingInput = z.infer<typeof SuspendListingSchema>;

// ─── Taxonomy: cities ─────────────────────────────────────────────────────────
export const CreateCitySchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(140).optional(),
  tags: z.array(z.string().max(60)).max(10).optional(),
  imageUrl: z.string().url().optional(),
});

export const UpdateCitySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tags: z.array(z.string().max(60)).max(10).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Taxonomy: property types ─────────────────────────────────────────────────
export const CreateListingTypeSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(200).optional(),
});

export const UpdateListingTypeSchema = z.object({
  description: z.string().max(200).nullable().optional(),
});

// ─── User / agency management ────────────────────────────────────────────────
export const UserQuerySchema = z.object({
  role: z.enum(['seeker', 'agent', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const UpdateUserSchema = z
  .object({
    status: z.enum(['active', 'suspended', 'banned']).optional(),
    role: z.enum(['seeker', 'agent', 'admin']).optional(),
  })
  .refine((v) => v.status !== undefined || v.role !== undefined, {
    message: 'Nothing to update',
  });

export type CreateCityInput = z.infer<typeof CreateCitySchema>;
export type UpdateCityInput = z.infer<typeof UpdateCitySchema>;
export type CreateListingTypeInput = z.infer<typeof CreateListingTypeSchema>;
export type UpdateListingTypeInput = z.infer<typeof UpdateListingTypeSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
