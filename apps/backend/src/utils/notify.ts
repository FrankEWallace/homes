import { prisma } from '../config/prisma';
import { sendSms } from './sms';
import { enqueuePush } from '../queues/push.queue';
import { findPreference, resolveChannels } from '../modules/notifications/preferences.service';
import { TIER_BY_TYPE, defaultChannelsForTier, isPushCapped, withinPushCap } from '../modules/notifications/notification-policy';
import { withinNotifyVelocity } from './sms-guard';
import type { NotificationType } from '@prisma/client';

export interface NotifyInput {
  userId: string;
  phone?: string | null;
  /** @deprecated FCM is now sent via DeviceToken table — this field is ignored */
  fcmToken?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  /**
   * Optional channel override. When omitted (the norm), channels are derived
   * from the type's priority tier — see notification-policy.ts. Preferences
   * can only narrow the result further.
   */
  channels?: ('sms' | 'push' | 'in_app')[];
}

/**
 * Persist a Notification row, fire an SMS, and enqueue a push via BullMQ.
 * Always resolves — delivery errors are logged, never propagated.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  const { userId, phone, type, title, body, data } = input;

  // The type's priority tier decides default channels (senders emit intent,
  // policy decides reach); an explicit `channels` override still wins.
  const tier = TIER_BY_TYPE[type];
  const requested = input.channels ?? defaultChannelsForTier(tier);

  // Honour the user's notification preferences (mandatory types bypass them).
  const pref = await findPreference(userId);
  const channels_ = resolveChannels(pref, type, requested);

  const tasks: Promise<any>[] = [];

  if (channels_.includes('in_app')) {
    tasks.push(prisma.notification.create({
      data: { userId, type, title, body, data: data ?? {} },
    }));
  }

  if (channels_.includes('sms') && phone) {
    // Cap automated notification SMS per phone to contain cost / runaway loops.
    if (await withinNotifyVelocity(phone)) {
      tasks.push(sendSms(phone, `${title}\n${body}`, { category: 'notification', userId }));
    } else {
      console.warn(`[notify] SMS velocity cap reached for ${phone} — skipping SMS (other channels still sent)`);
    }
  }

  if (channels_.includes('push')) {
    // Standard-tier push is rate-capped per user; critical bypasses the cap.
    // A suppressed push never drops the in-app record above.
    if (!isPushCapped(tier) || (await withinPushCap(userId))) {
      tasks.push(enqueuePush({ userId, title, body, data }));
    } else {
      console.warn(`[notify] push cap reached for ${userId} (${type}) — in-app still recorded`);
    }
  }

  await Promise.allSettled(tasks).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[notify] delivery error:', result.reason);
      }
    }
  });
}

/** Notify every admin user. Used for system-level events like dispute creation. */
export async function notifyAdmins(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: 'admin', status: 'active' },
    select: { id: true, phone: true },
  });

  await Promise.allSettled(
    admins.map((admin) =>
      notifyUser({ userId: admin.id, phone: admin.phone, type, title, body, data }),
    ),
  );
}
