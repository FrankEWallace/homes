import { redis } from '../config/redis';
import { sendSms } from './sms';
import { sendPasswordResetEmail } from './mail';
import { smsTemplate, localeForPhone } from './sms-templates';

const OTP_TTL_SECONDS = 600; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 3;

interface OtpRecord {
  code: string;
  attempts: number;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const redisKey = (identifier: string) => `otp:${identifier}`;

/**
 * Sends an OTP to either a phone number or an email address.
 */
export async function sendOtp(target: string): Promise<void> {
  const code = generateCode();
  const record: OtpRecord = { code, attempts: 0 };
  await redis.setex(redisKey(target), OTP_TTL_SECONDS, JSON.stringify(record));

  const isEmail = target.includes('@');

  if (isEmail) {
    await sendPasswordResetEmail(target, code);
  } else {
    const locale = await localeForPhone(target);
    await sendSms(target, smsTemplate('otp', locale, { code }), { category: 'otp' });
  }
}

/**
 * Returns true if code is valid and deletes it.
 * Returns false if expired, wrong code, or too many attempts.
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const raw = await redis.get(redisKey(phone));
  if (!raw) return false;

  const record = JSON.parse(raw) as OtpRecord;
  record.attempts += 1;

  if (record.attempts > MAX_VERIFY_ATTEMPTS) {
    await redis.del(redisKey(phone));
    return false;
  }

  if (record.code !== code) {
    await redis.setex(redisKey(phone), OTP_TTL_SECONDS, JSON.stringify(record));
    return false;
  }

  await redis.del(redisKey(phone));
  return true;
}
