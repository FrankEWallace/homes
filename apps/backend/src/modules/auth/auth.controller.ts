import type { RequestHandler } from 'express';
import * as authService from './auth.service';
import {
  RegisterSchema,
  VerifyPhoneSchema,
  LoginSchema,
  RefreshTokenSchema,
  LogoutSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ResendOtpSchema,
  UpdateProfileSchema,
  UpdateFcmTokenSchema,
  GoogleLoginSchema,
  EmailLoginSchema,
  EmailRegisterSchema,
  ConfirmChangePasswordSchema,
} from './auth.schemas';
import { sendSuccess, sendCreated } from '../../utils/response';

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const emailLogin: RequestHandler = async (req, res, next) => {
  try {
    const input = EmailLoginSchema.parse(req.body);
    const result = await authService.emailLogin(input);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const emailRegister: RequestHandler = async (req, res, next) => {
  try {
    const input = EmailRegisterSchema.parse(req.body);
    const result = await authService.emailRegister(input);
    sendCreated(res, result, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

export const googleLogin: RequestHandler = async (req, res, next) => {
  try {
    const input = GoogleLoginSchema.parse(req.body);
    const result = await authService.googleLogin(input);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = RegisterSchema.parse(req.body);
    const user = await authService.register(input);
    sendCreated(res, user, 'Registration successful. Please verify your phone number.');
  } catch (err) {
    next(err);
  }
};

export const verifyPhone: RequestHandler = async (req, res, next) => {
  try {
    const input = VerifyPhoneSchema.parse(req.body);
    const user = await authService.verifyPhone(input);
    sendSuccess(res, user, 'Phone number verified successfully');
  } catch (err) {
    next(err);
  }
};

export const resendOtp: RequestHandler = async (req, res, next) => {
  try {
    const { phone, email } = ResendOtpSchema.parse(req.body);
    const target = (phone || email)!;
    await authService.resendOtp(target);
    sendSuccess(res, null, `OTP resent to your ${phone ? 'phone number' : 'email address'}`);
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const input = RefreshTokenSchema.parse(req.body);
    const tokens = await authService.refresh(input);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const { refreshToken } = LogoutSchema.parse(req.body);
    await authService.logout(refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    const input = ForgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input);
    sendSuccess(res, null, 'If the account exists, a verification code has been sent');
  } catch (err) {
    next(err);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    const input = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    sendSuccess(res, null, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

export const requestChangePassword: RequestHandler = async (req, res, next) => {
  try {
    const result = await authService.requestChangePassword(req.user!.sub);
    sendSuccess(res, result, `Verification code sent to your ${result.target}`);
  } catch (err) {
    next(err);
  }
};

export const confirmChangePassword: RequestHandler = async (req, res, next) => {
  try {
    const input = ConfirmChangePasswordSchema.parse(req.body);
    await authService.confirmChangePassword(req.user!.sub, input);
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

export const getProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user!.sub);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const updateProfile: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.sub, input);
    sendSuccess(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

export const updateAvatar: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const user = await authService.updateAvatar(req.user!.sub, req.file.buffer);
    sendSuccess(res, user, 'Avatar updated');
  } catch (err) {
    next(err);
  }
};

export const updateFcmToken: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateFcmTokenSchema.parse(req.body);
    await authService.updateFcmToken(req.user!.sub, input);
    sendSuccess(res, null, 'FCM token updated');
  } catch (err) {
    next(err);
  }
};
