import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY ?? '');

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const data = await resend.emails.send({
      from: process.env.MAIL_FROM ?? 'Homes <noreply@example.com>', // set a verified Resend domain
      to,
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #F26B24;">ToJoin Password Reset</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the verification code below to continue:</p>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1A1A1A; border-radius: 8px; margin: 20px 0;">
        ${code}
      </div>
      <p>This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #757575;">&copy; 2026 ToJoin Tanzania. All rights reserved.</p>
    </div>
  `;
  return sendEmail(email, 'Your Verification Code', html);
}
