import type { NotificationType } from '@prisma/client';
import { redis } from '../../config/redis';

/**
 * Priority tiers decide the DEFAULT channels and rate-limiting for each
 * notification type — so senders emit an intent ("notify about X") and the
 * policy, not the call site, decides how loudly to reach the user.
 *
 *   security → OTP etc. Always sent, bypasses preferences (handled elsewhere).
 *   critical → money / access / trust. push + in-app + SMS. Never rate-capped.
 *   standard → actionable but not urgent. push + in-app (no SMS). Push capped.
 *   low      → informational / marketing. in-app only.
 *
 * A user's NotificationPreference can only narrow these further, never widen.
 */
export type NotificationTier = 'security' | 'critical' | 'standard' | 'low';

type Channel = 'sms' | 'push' | 'in_app';

export const TIER_BY_TYPE: Record<NotificationType, NotificationTier> = {
  // Security
  otp: 'security',

  // Critical — money, access, trust
  payment_received: 'critical',
  payment_failed: 'critical',
  payment_expired: 'critical',
  booking_confirmed: 'critical',
  booking_cancelled: 'critical',
  booking_pending_approval: 'critical',
  ticket_transferred: 'critical',
  dispute_raised: 'critical',
  dispute_response: 'critical',
  dispute_resolved: 'critical',
  kyc_approved: 'critical',
  kyc_rejected: 'critical',
  payout_failed: 'critical',

  // Standard — actionable, not urgent (push + in-app, no SMS, push capped)
  listing_approved: 'standard',
  listing_rejected: 'standard',
  payout_processed: 'standard',
  new_review: 'standard',
  new_message: 'standard',
  waitlist_spot_available: 'standard',

  // Low — informational / marketing (in-app only)
  earnings_available: 'low',
  listing_boosted: 'low',
  broadcast: 'low',
};

/** The default channel set a tier reaches out on before preferences apply. */
export function defaultChannelsForTier(tier: NotificationTier): Channel[] {
  switch (tier) {
    case 'critical':
      return ['push', 'in_app', 'sms'];
    case 'standard':
      return ['push', 'in_app'];
    case 'low':
      return ['in_app'];
    case 'security':
      return ['sms'];
  }
}

/** Only standard-tier push is rate-capped; critical bypasses, low never pushes. */
export function isPushCapped(tier: NotificationTier): boolean {
  return tier === 'standard';
}

// ─── Global push rate cap (mirrors the SMS velocity cap) ─────────────────────

/** Max standard-tier push notifications per user per rolling window. */
export const PUSH_VELOCITY_MAX = 8;
const PUSH_WINDOW_SECONDS = 3600; // 1 hour

/**
 * Returns true if the user is still under their push quota for the window
 * (and records the send). Fails open on Redis errors so a cache outage never
 * blocks delivery. Suppressing a push never drops the in-app record.
 */
export async function withinPushCap(userId: string): Promise<boolean> {
  const key = `push:velocity:${userId}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, PUSH_WINDOW_SECONDS);
    }
    return count <= PUSH_VELOCITY_MAX;
  } catch (err) {
    console.error('[notify] push cap check failed (allowing send):', err);
    return true;
  }
}
