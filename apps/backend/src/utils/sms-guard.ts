import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

/**
 * SMS guardrails: marketing opt-out (STOP compliance) and per-recipient
 * velocity limiting to contain cost and prevent runaway/abusive sends.
 */

/** Broadcasts above this recipient count require an explicit `confirm` flag. */
export const BROADCAST_CONFIRM_THRESHOLD = 500;

/** Max automated notification SMS to a single phone per rolling window. */
export const NOTIFY_VELOCITY_MAX = 5;
const NOTIFY_VELOCITY_WINDOW_SECONDS = 3600; // 1 hour

// ─── Opt-out (STOP) ───────────────────────────────────────────────────────────

const STOP_KEYWORDS = new Set(['stop', 'unsubscribe', 'acha', 'sitisha']); // en + sw
const START_KEYWORDS = new Set(['start', 'unstop', 'subscribe', 'anza']);

export function classifyInboundKeyword(text: string): 'stop' | 'start' | null {
  const word = text.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (STOP_KEYWORDS.has(word)) return 'stop';
  if (START_KEYWORDS.has(word)) return 'start';
  return null;
}

export async function optOut(phone: string, reason = 'user'): Promise<void> {
  await prisma.smsOptOut.upsert({
    where: { phone },
    update: { reason },
    create: { phone, reason },
  });
}

export async function optIn(phone: string): Promise<void> {
  await prisma.smsOptOut.deleteMany({ where: { phone } });
}

export async function isOptedOut(phone: string): Promise<boolean> {
  const row = await prisma.smsOptOut.findUnique({ where: { phone } });
  return row !== null;
}

/** Given a list of phones, return only those NOT opted out of marketing SMS. */
export async function filterOptedOut(phones: string[]): Promise<string[]> {
  if (phones.length === 0) return [];
  const optedOut = await prisma.smsOptOut.findMany({
    where: { phone: { in: phones } },
    select: { phone: true },
  });
  const blocked = new Set(optedOut.map((o) => o.phone));
  return phones.filter((p) => !blocked.has(p));
}

// ─── Velocity limiting ────────────────────────────────────────────────────────

/**
 * Returns true if this phone is still within its automated-notification quota
 * for the current window (and records the send). Fails open on Redis errors so
 * a cache outage never blocks delivery.
 */
export async function withinNotifyVelocity(phone: string): Promise<boolean> {
  const key = `sms:velocity:${phone}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, NOTIFY_VELOCITY_WINDOW_SECONDS);
    }
    return count <= NOTIFY_VELOCITY_MAX;
  } catch (err) {
    console.error('[sms-guard] velocity check failed (allowing send):', err);
    return true;
  }
}
