import type { NotificationType, NotificationPreference } from '@prisma/client';
import { prisma } from '../../config/prisma';

export type Channel = 'sms' | 'push' | 'in_app';

/** Category boolean columns on NotificationPreference that gate a whole topic. */
type CategoryField =
  | 'bookingUpdates'
  | 'paymentUpdates'
  | 'listingUpdates'
  | 'disputeUpdates'
  | 'payoutUpdates'
  | 'messages'
  | 'promotions';

/**
 * Maps each notification type to the category switch that controls it.
 * Types absent from this map (e.g. kyc_*) have no category gate — only the
 * channel switches apply to them.
 */
const CATEGORY_BY_TYPE: Partial<Record<NotificationType, CategoryField>> = {
  booking_confirmed: 'bookingUpdates',
  booking_cancelled: 'bookingUpdates',
  booking_pending_approval: 'bookingUpdates',
  ticket_transferred: 'bookingUpdates',

  payment_received: 'paymentUpdates',
  payment_failed: 'paymentUpdates',
  payment_expired: 'paymentUpdates',

  listing_approved: 'listingUpdates',
  listing_rejected: 'listingUpdates',
  listing_boosted: 'listingUpdates',
  new_review: 'listingUpdates',

  dispute_raised: 'disputeUpdates',
  dispute_response: 'disputeUpdates',
  dispute_resolved: 'disputeUpdates',

  payout_processed: 'payoutUpdates',
  payout_failed: 'payoutUpdates',
  earnings_available: 'payoutUpdates',

  new_message: 'messages',

  broadcast: 'promotions',
  waitlist_spot_available: 'promotions',
};

/**
 * Security / transactional types that MUST always be delivered, regardless of
 * the user's preferences. Enforced here in code, never toggleable.
 */
const MANDATORY_TYPES: ReadonlySet<NotificationType> = new Set<NotificationType>([
  'otp',
]);

const CHANNEL_FIELD: Record<Channel, keyof NotificationPreference> = {
  push: 'pushEnabled',
  sms: 'smsEnabled',
  in_app: 'inAppEnabled',
};

/**
 * Given a user's preferences (or null when they've never set any), return which
 * of the requested channels should actually be used for a notification `type`.
 *
 * A channel survives only if BOTH its channel switch AND the type's category
 * switch are enabled. Mandatory types bypass all gates.
 */
export function resolveChannels(
  pref: NotificationPreference | null,
  type: NotificationType,
  requested: Channel[],
): Channel[] {
  if (MANDATORY_TYPES.has(type)) return requested;
  if (!pref) return requested; // no preferences set → default all-on

  const category = CATEGORY_BY_TYPE[type];
  return requested.filter((ch) => {
    if (pref[CHANNEL_FIELD[ch]] === false) return false;
    if (category && pref[category] === false) return false;
    return true;
  });
}

/**
 * Fetch preferences for the notification hot path WITHOUT creating a row.
 * Returns null when the user has never customised anything (treated as all-on).
 */
export function findPreference(userId: string): Promise<NotificationPreference | null> {
  return prisma.notificationPreference.findUnique({ where: { userId } });
}

/** Fields a user is allowed to update. */
export interface PreferenceUpdate {
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  inAppEnabled?: boolean;
  bookingUpdates?: boolean;
  paymentUpdates?: boolean;
  listingUpdates?: boolean;
  disputeUpdates?: boolean;
  payoutUpdates?: boolean;
  messages?: boolean;
  promotions?: boolean;
}

/**
 * Get the user's preferences, creating a default (all-on) row if none exists.
 * Used by the settings endpoints (not the hot notification path).
 */
export function getOrCreatePreference(userId: string): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

/** Apply a partial update, creating the row first if needed. */
export function updatePreference(
  userId: string,
  input: PreferenceUpdate,
): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input },
  });
}
