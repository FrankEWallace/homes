import { z } from 'zod';

export const SuspendListingSchema = z.object({
  reason: z.string().min(1, 'A reason is required').max(500),
});

export type SuspendListingInput = z.infer<typeof SuspendListingSchema>;
