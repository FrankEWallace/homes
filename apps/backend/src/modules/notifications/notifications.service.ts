import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { sendBulkSms, broadcastSms } from '../../utils/sms';
import { sendSms } from '../../utils/sms';
import { filterOptedOut, classifyInboundKeyword, optOut, optIn, BROADCAST_CONFIRM_THRESHOLD } from '../../utils/sms-guard';
import { smsTemplate, localeForPhone } from '../../utils/sms-templates';
import type { BulkSmsInput, BroadcastSmsInput, RoleBroadcastSmsInput } from './notifications.schemas';

/** Guard large sends behind an explicit confirm flag to prevent costly mistakes. */
function assertConfirmed(count: number, confirm?: boolean) {
  if (count > BROADCAST_CONFIRM_THRESHOLD && !confirm) {
    throw new AppError(
      409,
      `This send would reach ${count} recipients (over the ${BROADCAST_CONFIRM_THRESHOLD} safety limit). Resend with confirm=true to proceed.`,
    );
  }
}

// ─── Device token management ─────────────────────────────────────────────────

/** Register or refresh an FCM device token for the current user. */
export async function upsertDeviceToken(
  userId: string,
  token: string,
  platform: 'android' | 'ios',
) {
  return prisma.deviceToken.upsert({
    where: { token },
    update: { userId, platform, lastUsedAt: new Date() },
    create: { userId, token, platform },
  });
}

/** Unregister a specific FCM token (e.g. on logout). */
export async function removeDeviceToken(userId: string, token: string) {
  const existing = await prisma.deviceToken.findUnique({ where: { token } });
  if (!existing) return;
  if (existing.userId !== userId) throw new AppError(403, 'Token does not belong to this user');
  await prisma.deviceToken.delete({ where: { token } });
}

export interface SmsSendResult {
  sent: number;
  /** Recipients removed because they opted out of marketing SMS. */
  skippedOptOut?: number;
}

// ─── User inbox ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/** Paginated notification inbox for the current user. Unread first, then newest. */
export async function listMyNotifications(userId: string, page: number) {
  const skip = (page - 1) * PAGE_SIZE;
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    notifications,
    meta: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
}

/** Count of unread notifications for badge display. */
export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, readAt: null },
  });
  return { count };
}

/** Mark a single notification as read. Only the owner may do this. */
export async function markOneRead(id: string, userId: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new AppError(404, 'Notification not found');
  if (notification.userId !== userId) throw new AppError(403, 'Access denied');
  if (notification.readAt) return notification; // already read — idempotent

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

/** Mark all of the user's notifications as read in one operation. */
export async function markAllRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: count };
}

/** Send a custom message to each recipient in the list (opted-out phones skipped). */
export async function sendBulk(input: BulkSmsInput): Promise<SmsSendResult> {
  assertConfirmed(input.recipients.length, input.confirm);
  const allowedPhones = new Set(await filterOptedOut(input.recipients.map((r) => r.phone)));
  const recipients = input.recipients.filter((r) => allowedPhones.has(r.phone));
  const skippedOptOut = input.recipients.length - recipients.length;

  await sendBulkSms(recipients.map(({ phone, message }) => ({ phone, message })));
  return { sent: recipients.length, skippedOptOut };
}

/** Broadcast the same message to an explicit list of phones (opted-out skipped). */
export async function broadcast(input: BroadcastSmsInput): Promise<SmsSendResult> {
  assertConfirmed(input.phones.length, input.confirm);
  const phones = await filterOptedOut(input.phones);
  const skippedOptOut = input.phones.length - phones.length;

  await broadcastSms(phones, input.message);
  return { sent: phones.length, skippedOptOut };
}

/**
 * Broadcast to all verified users whose role matches the filter.
 * Only sends to users with a confirmed phone number (phoneVerified = true),
 * and skips anyone who has opted out of marketing SMS.
 */
export async function roleBroadcast(input: RoleBroadcastSmsInput): Promise<SmsSendResult> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: input.roles },
      phoneVerified: true,
    },
    select: { phone: true },
  });

  const allPhones = users.map((u: any) => u.phone).filter(Boolean) as string[];
  assertConfirmed(allPhones.length, input.confirm);

  const phones = await filterOptedOut(allPhones);
  const skippedOptOut = allPhones.length - phones.length;
  if (phones.length === 0) return { sent: 0, skippedOptOut };

  await broadcastSms(phones, input.message);
  return { sent: phones.length, skippedOptOut };
}

// ─── Inbound SMS (STOP / START opt-out) ──────────────────────────────────────

/** Normalise an inbound sender to the +255XXXXXXXXX format we store. */
function normalizeInboundPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255')) return `+${digits}`;
  if (digits.startsWith('0')) return `+255${digits.slice(1)}`;
  if (raw.startsWith('+')) return raw;
  return `+255${digits}`;
}

/**
 * Handle an inbound SMS from the provider webhook: honour STOP/START keywords
 * for marketing opt-out. Returns the action taken (for logging/response).
 */
export async function handleInboundSms(from: string, text: string) {
  const phone = normalizeInboundPhone(from);
  const kind = classifyInboundKeyword(text);

  const locale = await localeForPhone(phone);

  if (kind === 'stop') {
    await optOut(phone, 'stop_keyword');
    await sendSms(phone, smsTemplate('opt_out_confirm', locale), { category: 'transactional' }).catch(() => {});
    return { action: 'opted_out', phone };
  }

  if (kind === 'start') {
    await optIn(phone);
    await sendSms(phone, smsTemplate('opt_in_confirm', locale), { category: 'transactional' }).catch(() => {});
    return { action: 'opted_in', phone };
  }

  return { action: 'ignored', phone };
}

// ─── SMS delivery history (admin) ─────────────────────────────────────────────

const SMS_PAGE_SIZE = 25;

export interface SmsHistoryQuery {
  page?: number;
  category?: string;
  status?: string;
  search?: string;
}

/** Paginated, filterable SMS audit log for the admin dashboard. */
export async function listSmsHistory(query: SmsHistoryQuery) {
  const page = Math.max(1, query.page ?? 1);
  const where: any = {};
  if (query.category) where.category = query.category;
  if (query.status) where.status = query.status;
  if (query.search) where.recipient = { contains: query.search };

  const [items, total] = await Promise.all([
    prisma.smsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * SMS_PAGE_SIZE,
      take: SMS_PAGE_SIZE,
    }),
    prisma.smsLog.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      pageSize: SMS_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / SMS_PAGE_SIZE),
    },
  };
}

/** Aggregate SMS stats for the admin dashboard header (volume, failures, cost). */
export async function smsStats() {
  const [total, sent, failed, segments, byCategory] = await Promise.all([
    prisma.smsLog.count(),
    prisma.smsLog.count({ where: { status: 'sent' } }),
    prisma.smsLog.count({ where: { status: 'failed' } }),
    prisma.smsLog.aggregate({ _sum: { segments: true } }),
    prisma.smsLog.groupBy({ by: ['category'], _count: { _all: true } }),
  ]);

  return {
    total,
    sent,
    failed,
    totalSegments: segments._sum.segments ?? 0,
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count._all })),
  };
}
