import { Resend } from 'resend';

// Lazily constructed so the server boots without email configured (dev). When
// RESEND_API_KEY is unset, sendEmail() is a logged no-op instead of throwing.
let resend: Resend | null = null;
function getResend(): Resend | null {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const client = getResend();
  if (!client) {
    console.warn(`[mail] RESEND_API_KEY unset — skipping email "${subject}" to ${to}`);
    return null;
  }
  try {
    return await client.emails.send({
      from: process.env.MAIL_FROM ?? 'Homes <noreply@example.com>', // set a verified Resend domain
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #ff385c;">Homes Password Reset</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the verification code below to continue:</p>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1A1A1A; border-radius: 8px; margin: 20px 0;">
        ${code}
      </div>
      <p>This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #757575;">&copy; 2026 Homes. All rights reserved.</p>
    </div>
  `;
  return sendEmail(email, 'Your Verification Code', html);
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

const APP_URL = process.env.WEB_APP_URL ?? 'http://localhost:3000';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shell(inner: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; color: #1A1A1A;">
      ${inner}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #757575;">&copy; 2026 Homes. All rights reserved.</p>
    </div>
  `;
}

// ─── Lead delivery (F4/F20) ──────────────────────────────────────────────────

export interface LeadEmailData {
  agentName: string;
  listingTitle: string;
  listingSlug: string;
  kind: 'enquiry' | 'contact' | 'viewing_request';
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  preferredAt?: Date | null;
}

const LEAD_KIND_LABEL: Record<LeadEmailData['kind'], string> = {
  enquiry: 'New enquiry',
  contact: 'Contact request',
  viewing_request: 'Viewing request',
};

/** Notify an agent that a seeker submitted a lead on one of their listings. */
export async function sendLeadNotificationEmail(to: string, data: LeadEmailData) {
  const label = LEAD_KIND_LABEL[data.kind];
  const listingUrl = `${APP_URL}/listing/${data.listingSlug}`;
  const preferred = data.preferredAt
    ? `<p><strong>Preferred time:</strong> ${escapeHtml(data.preferredAt.toLocaleString())}</p>`
    : '';
  const phone = data.phone
    ? `<p><strong>Phone:</strong> <a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></p>`
    : '';

  const html = shell(`
    <h2 style="color: #ff385c;">${label} — ${escapeHtml(data.listingTitle)}</h2>
    <p>Hi ${escapeHtml(data.agentName)},</p>
    <p>You have a new ${label.toLowerCase()} from a buyer on <a href="${listingUrl}">${escapeHtml(data.listingTitle)}</a>.</p>
    <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>From:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
      ${phone}
      ${preferred}
      <p style="margin-top: 12px;"><strong>Message:</strong><br/>${escapeHtml(data.message).replace(/\n/g, '<br/>')}</p>
    </div>
    <p><a href="${APP_URL}/dashboard/leads" style="display:inline-block;background:#ff385c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Open your lead inbox</a></p>
  `);

  return sendEmail(to, `${label}: ${data.listingTitle}`, html);
}

// ─── Saved-search alerts (F5/F20) ────────────────────────────────────────────

export interface AlertListingItem {
  title: string;
  slug: string;
  city: string;
  priceLabel: string;
  imageUrl?: string | null;
}

/** Digest of new listings matching a seeker's saved search. */
export async function sendSavedSearchAlertEmail(
  to: string,
  searchName: string,
  listings: AlertListingItem[],
) {
  const rows = listings
    .map(
      (l) => `
      <a href="${APP_URL}/listing/${l.slug}" style="display:block;text-decoration:none;color:#1A1A1A;padding:12px 0;border-bottom:1px solid #eee;">
        <strong>${escapeHtml(l.title)}</strong><br/>
        <span style="color:#757575;">${escapeHtml(l.city)} · ${escapeHtml(l.priceLabel)}</span>
      </a>`,
    )
    .join('');

  const count = listings.length;
  const html = shell(`
    <h2 style="color: #ff385c;">${count} new ${count === 1 ? 'home' : 'homes'} for “${escapeHtml(searchName)}”</h2>
    <p>New listings just matched your saved search:</p>
    <div style="margin: 16px 0;">${rows}</div>
    <p><a href="${APP_URL}/saved-searches" style="display:inline-block;background:#ff385c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Manage saved searches</a></p>
  `);

  return sendEmail(to, `${count} new ${count === 1 ? 'home' : 'homes'} for “${searchName}”`, html);
}

