import { z } from 'zod';

// ─── Lead capture (public) ───────────────────────────────────────────────────

/**
 * Enquiry / contact / viewing-request submitted from a listing detail page.
 * `website` is a honeypot: real users never see or fill it, so a non-empty value
 * flags a bot and the submission is silently accepted-then-dropped in the service.
 */
export const CreateLeadSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  kind: z.enum(['enquiry', 'contact', 'viewing_request']).default('enquiry'),
  name: z.string().min(2, 'Please enter your name').max(120),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(5).max(30).optional(),
  message: z.string().min(10, 'Please add a short message').max(2000),
  preferredAt: z.coerce.date().optional(), // viewing_request slot
  source: z.string().max(40).default('web'),
  // Honeypot — real users never fill it. Accepted here so a filled value reaches
  // the service, which silently drops it (a hard schema reject would reveal the
  // honeypot to bots). See createLead().
  website: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

// ─── Agent inbox (authenticated) ─────────────────────────────────────────────

export const LeadQuerySchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'closed']).optional(),
  kind: z.enum(['enquiry', 'contact', 'viewing_request']).optional(),
  listingId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type LeadQueryInput = z.infer<typeof LeadQuerySchema>;

export const UpdateLeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'closed']),
});

export type UpdateLeadStatusInput = z.infer<typeof UpdateLeadStatusSchema>;
