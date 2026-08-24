import { z } from 'zod';

/** Tanzanian phone in international format */
const tzPhone = z
  .string()
  .regex(/^\+255[67][0-9]{8}$/, 'Phone must be +2556XXXXXXXX or +2557XXXXXXXX format');

/**
 * Send a custom message to each recipient individually.
 * Use when different users should receive different content.
 */
export const BulkSmsSchema = z.object({
  recipients: z
    .array(
      z.object({
        phone: tzPhone,
        message: z.string().min(1).max(160),
      }),
    )
    .min(1)
    .max(1000),
  /** Required to proceed when recipient count exceeds the safety threshold. */
  confirm: z.boolean().optional(),
});

/**
 * Broadcast the same message to a list of phone numbers.
 */
export const BroadcastSmsSchema = z.object({
  phones: z.array(tzPhone).min(1).max(1000),
  message: z.string().min(1).max(160),
  confirm: z.boolean().optional(),
});

/**
 * Broadcast to all users matching a role filter.
 * Fetches phone numbers from the database automatically.
 */
export const RoleBroadcastSmsSchema = z.object({
  roles: z
    .array(z.enum(['seeker', 'agent', 'admin']))
    .min(1)
    .default(['seeker', 'agent']),
  message: z.string().min(1).max(160),
  confirm: z.boolean().optional(),
});

export const DeviceTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['android', 'ios']),
});

export const RemoveDeviceTokenSchema = z.object({
  token: z.string().min(1).max(500),
});

/**
 * Partial update of a user's notification preferences. Every field is optional;
 * only the provided switches are changed. At least one field must be present.
 */
export const NotificationPreferenceSchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    bookingUpdates: z.boolean().optional(),
    paymentUpdates: z.boolean().optional(),
    listingUpdates: z.boolean().optional(),
    disputeUpdates: z.boolean().optional(),
    payoutUpdates: z.boolean().optional(),
    messages: z.boolean().optional(),
    promotions: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Provide at least one preference field to update',
  });

export type BulkSmsInput = z.infer<typeof BulkSmsSchema>;
export type BroadcastSmsInput = z.infer<typeof BroadcastSmsSchema>;
export type RoleBroadcastSmsInput = z.infer<typeof RoleBroadcastSmsSchema>;
export type DeviceTokenInput = z.infer<typeof DeviceTokenSchema>;
export type NotificationPreferenceInput = z.infer<typeof NotificationPreferenceSchema>;
