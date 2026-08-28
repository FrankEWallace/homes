/**
 * Centralised, bilingual SMS copy. Every user-facing SMS should be rendered
 * through `smsTemplate()` so wording lives in one place and is localised to the
 * recipient's `preferredLocale` (English or Swahili — the app's two languages).
 */
import { prisma } from '../config/prisma';

export type Locale = 'en' | 'sw';

type Vars = Record<string, string | number>;

export type SmsTemplateKey =
  | 'otp'
  | 'opt_out_confirm'
  | 'opt_in_confirm'
  | 'booking_confirmed'
  | 'payment_received';

const TEMPLATES: Record<SmsTemplateKey, Record<Locale, string>> = {
  otp: {
    en: 'Your Homes code is {code}. Valid for 10 minutes. Do not share this code.',
    sw: 'Namba yako ya uthibitisho ya Homes ni {code}. Inafaa kwa dakika 10. Usishiriki namba hii na mtu yeyote.',
  },
  opt_out_confirm: {
    en: 'You have been unsubscribed from Homes marketing SMS. Reply START to re-subscribe.',
    sw: 'Umejiondoa kwenye SMS za matangazo za Homes. Jibu ANZA kurejea.',
  },
  opt_in_confirm: {
    en: 'You are re-subscribed to Homes SMS updates.',
    sw: 'Umerejeshwa kwenye taarifa za SMS za Homes.',
  },
  booking_confirmed: {
    en: 'Your Homes booking {reference} is confirmed. See you soon!',
    sw: 'Uhifadhi wako wa Homes {reference} umethibitishwa. Tutaonana hivi karibuni!',
  },
  payment_received: {
    en: 'Homes received your payment of {amount} {currency}. Thank you!',
    sw: 'Homes imepokea malipo yako ya {amount} {currency}. Asante!',
  },
};

function interpolate(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** Coerce an arbitrary stored locale to one of the supported SMS locales. */
export function resolveLocale(raw?: string | null): Locale {
  return raw === 'sw' ? 'sw' : 'en';
}

/** Render an SMS template in the given locale (falls back to English copy). */
export function smsTemplate(key: SmsTemplateKey, locale: Locale, vars: Vars = {}): string {
  const entry = TEMPLATES[key];
  const text = entry[locale] ?? entry.en;
  return interpolate(text, vars);
}

/**
 * Look up a user's preferred SMS locale by phone number. Defaults to English
 * when the phone is unknown (e.g. during registration before the row exists).
 */
export async function localeForPhone(phone: string): Promise<Locale> {
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { preferredLocale: true },
    });
    return resolveLocale(user?.preferredLocale);
  } catch {
    return 'en';
  }
}
