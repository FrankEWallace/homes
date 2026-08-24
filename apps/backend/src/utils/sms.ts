import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { SmsCategory } from '@prisma/client';

// Textify's live API lives under /api/v1 and authenticates with a Bearer token.
// (The old /api/message/create path returns HTTP 405 from the marketing SPA.)
const TEXTIFY_BASE_URL = env.TEXTIFY_BASE_URL;

interface TextifyMessage {
  receiver: string;
  content: string;
}

interface TextifyPayload {
  sender_name: string;
  is_scheduled: boolean;
  messages: TextifyMessage[];
}

interface TextifyResponse {
  success: boolean;
  message: string;
}

/** Extra context recorded alongside each SMS in the SmsLog audit table. */
export interface SmsContext {
  category?: SmsCategory;
  userId?: string | null;
}

/** SMS are billed per 160-character segment — estimate for cost reporting. */
function estimateSegments(content: string): number {
  return Math.max(1, Math.ceil(content.length / 160));
}

/**
 * Persist one SmsLog row per message. Never throws — logging failures must not
 * break (or mask) the actual send path.
 */
async function logMessages(
  messages: TextifyMessage[],
  ctx: SmsContext,
  status: 'sent' | 'failed',
  provider: string,
  providerResponse: unknown,
  errorMessage?: string,
): Promise<void> {
  if (messages.length === 0) return;
  try {
    await prisma.smsLog.createMany({
      data: messages.map((m) => ({
        recipient: m.receiver,
        content: m.content,
        category: ctx.category ?? 'transactional',
        status,
        provider,
        providerResponse: (providerResponse ?? undefined) as any,
        errorMessage: errorMessage ?? null,
        segments: estimateSegments(m.content),
        userId: ctx.userId ?? null,
      })),
    });
  } catch (err) {
    console.error('[sms] failed to write SmsLog:', err);
  }
}

/**
 * Send one or more SMS messages via Textify Africa, recording each in SmsLog.
 * Throws if the API returns a non-2xx status (after logging the failure).
 */
async function dispatch(messages: TextifyMessage[], ctx: SmsContext = {}): Promise<void> {
  if (messages.length === 0) return;

  // Dev mode — log to console AND SmsLog so history works without Textify.
  if (!env.TEXTIFY_API_KEY) {
    for (const { receiver, content } of messages) {
      console.log(`[SMS DEV] ${receiver} → ${content}`);
    }
    await logMessages(messages, ctx, 'sent', 'dev-console', { dev: true });
    return;
  }

  const payload: TextifyPayload = {
    sender_name: env.TEXTIFY_SENDER_NAME,
    is_scheduled: false,
    messages,
  };

  let res: Response;
  try {
    res = await fetch(`${TEXTIFY_BASE_URL}/message/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.TEXTIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    await logMessages(messages, ctx, 'failed', 'textify', null, String(err));
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    await logMessages(messages, ctx, 'failed', 'textify', { httpStatus: res.status, body: text }, `HTTP ${res.status}`);
    throw new Error(`Textify SMS failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TextifyResponse;
  if (!data.success) {
    await logMessages(messages, ctx, 'failed', 'textify', data as unknown, data.message);
    throw new Error(`Textify SMS error: ${data.message}`);
  }

  await logMessages(messages, ctx, 'sent', 'textify', data as unknown);
}

/** Send a single SMS message. */
export async function sendSms(phone: string, message: string, ctx: SmsContext = {}): Promise<void> {
  await dispatch([{ receiver: phone, content: message }], ctx);
}

export interface BulkRecipient {
  phone: string;
  message: string;
}

/**
 * Send bulk SMS — each recipient can have a different message body.
 * Textify accepts all recipients in a single API call.
 */
export async function sendBulkSms(recipients: BulkRecipient[], ctx: SmsContext = {}): Promise<void> {
  if (recipients.length === 0) return;
  await dispatch(
    recipients.map(({ phone, message }) => ({ receiver: phone, content: message })),
    { category: 'broadcast', ...ctx },
  );
}

/**
 * Broadcast the same message to multiple phone numbers in a single API call.
 */
export async function broadcastSms(phones: string[], message: string, ctx: SmsContext = {}): Promise<void> {
  if (phones.length === 0) return;
  await dispatch(
    phones.map((phone) => ({ receiver: phone, content: message })),
    { category: 'broadcast', ...ctx },
  );
}
