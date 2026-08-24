import { z } from 'zod';

const phone = z
  .string()
  .regex(/^\+255[0-9]{9}$/, 'Phone must be in E.164 format for Tanzania: +255XXXXXXXXX');

export const RegisterSchema = z.object({
  phone,
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  preferredLocale: z.enum(['en', 'sw']).default('en'),
});

export const VerifyPhoneSchema = z.object({
  phone,
  code: z.string().length(6, 'OTP must be exactly 6 digits'),
});

export const LoginSchema = z.object({
  phone,
  password: z.string().min(1),
});

export const EmailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Email-first registration (seekers + agents). No phone / OTP required — the
 * account is active immediately and tokens are issued on success. Email
 * verification can be layered on later.
 */
export const EmailRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  role: z.enum(['seeker', 'agent']).default('seeker'),
  businessName: z.string().max(200).optional(), // agencies
  preferredLocale: z.enum(['en', 'sw']).default('en'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  phone,
});

export const ResetPasswordSchema = z.object({
  phone,
  code: z.string().length(6),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RequestChangePasswordSchema = z.object({}); // Empty as we use user from token

export const ConfirmChangePasswordSchema = z.object({
  code: z.string().length(6),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const ResendOtpSchema = z.object({
  phone: phone.optional(),
  email: z.string().email().optional(),
}).refine(data => data.phone || data.email, {
  message: "Either phone or email must be provided",
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  email: z.string().email().optional(),
  preferredLocale: z.enum(['en', 'sw']).optional(),
  bio: z.string().max(1000).optional(),
  businessName: z.string().max(200).optional(),
});

export const UpdateFcmTokenSchema = z.object({
  fcmToken: z.string().min(1).max(500).nullable(),
});
export const GoogleLoginSchema = z.object({
  idToken: z.string().min(1),
  phone: phone.optional(),
});

export type GoogleLoginInput = z.infer<typeof GoogleLoginSchema>;
export type EmailLoginInput = z.infer<typeof EmailLoginSchema>;
export type EmailRegisterInput = z.infer<typeof EmailRegisterSchema>;
export type UpdateFcmTokenInput = z.infer<typeof UpdateFcmTokenSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyPhoneInput = z.infer<typeof VerifyPhoneSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type RequestChangePasswordInput = z.infer<typeof RequestChangePasswordSchema>;
export type ConfirmChangePasswordInput = z.infer<typeof ConfirmChangePasswordSchema>;
