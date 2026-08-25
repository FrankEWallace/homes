import { z } from "zod";

/**
 * Lead contracts (F4) — shared by the web app and (as the reference the backend
 * schema mirrors) the API. `website` is a honeypot: real users never fill it, so
 * a non-empty value flags a bot and is dropped server-side.
 */
export const leadKindSchema = z.enum(["enquiry", "contact", "viewing_request"]);
export type LeadKind = z.infer<typeof leadKindSchema>;

export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "closed"]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

/** Request body for `POST /leads`. */
export const createLeadRequestSchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
  kind: leadKindSchema.default("enquiry"),
  name: z.string().min(2, "Please enter your name").max(120),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(5).max(30).optional(),
  message: z.string().min(10, "Please add a short message").max(2000),
  preferredAt: z.coerce.date().optional(),
  source: z.string().max(40).default("web"),
  website: z.string().optional(), // honeypot — accepted, silently dropped server-side
});
export type CreateLeadRequest = z.infer<typeof createLeadRequestSchema>;

export const updateLeadStatusRequestSchema = z.object({ status: leadStatusSchema });
export type UpdateLeadStatusRequest = z.infer<typeof updateLeadStatusRequestSchema>;

/** A lead as returned in the agent inbox. */
export const leadSchema = z.object({
  id: z.string(),
  kind: leadKindSchema,
  status: leadStatusSchema,
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  message: z.string(),
  preferredAt: z.string().nullable(),
  createdAt: z.string(),
  listing: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    city: z.string().nullable(),
    images: z.array(z.string()),
  }),
});
export type Lead = z.infer<typeof leadSchema>;

export const leadStatsSchema = z.object({
  new: z.number(),
  contacted: z.number(),
  qualified: z.number(),
  closed: z.number(),
});
export type LeadStats = z.infer<typeof leadStatsSchema>;
