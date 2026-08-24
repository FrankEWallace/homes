import { getFirebaseApp } from '../config/firebase';

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * FCM requires every `data` value to be a string; a null, number, or boolean
 * makes the whole `send()` call fail with `messaging/invalid-argument`.
 * Several notification call sites pass non-string values (e.g. `note: … ?? null`),
 * so coerce here at the boundary: drop null/undefined, stringify the rest.
 */
function sanitizeData(data?: Record<string, unknown>): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'string' ? value : String(value);
  }
  return out;
}

/**
 * Send a Firebase Cloud Messaging push notification to a single device token.
 * Returns true if the token is stale and should be deleted.
 * Silently no-ops when FCM is not configured (dev / test without credentials).
 */
export async function sendPush(payload: PushPayload): Promise<boolean> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    console.log(`[PUSH DEV] ${payload.token.slice(0, 12)}… → ${payload.title}: ${payload.body}`);
    return false;
  }

  try {
    await firebaseApp.messaging().send({
      token: payload.token,
      notification: { title: payload.title, body: payload.body },
      data: sanitizeData(payload.data),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    return false;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'messaging/registration-token-not-registered') {
      console.warn(`[PUSH] Stale token pruned for title="${payload.title}"`);
      return true;
    }
    console.error('[PUSH] FCM send error:', err);
    return false;
  }
}
