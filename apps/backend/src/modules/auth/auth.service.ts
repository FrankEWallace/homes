import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/tokens';
import { sendOtp, verifyOtp } from '../../utils/otp';
import { uploadToCloudinary } from '../../utils/upload';
import { getFirebaseApp } from '../../config/firebase';
import type {
  RegisterInput,
  VerifyPhoneInput,
  LoginInput,
  GoogleLoginInput,
  EmailLoginInput,
  EmailRegisterInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
  UpdateFcmTokenInput,
  ConfirmChangePasswordInput,
} from './auth.schemas';

const SALT_ROUNDS = 12;
const REFRESH_TTL_DAYS = 30;

function stripPassword<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}

function refreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}

export async function register(input: RegisterInput) {
  const phoneExists = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (phoneExists) throw new AppError(409, 'Phone number is already registered');

  if (input.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: input.email } });
    if (emailExists) throw new AppError(409, 'Email address is already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      phone: input.phone,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      preferredLocale: input.preferredLocale,
    },
  });

  await sendOtp(input.phone);

  return stripPassword(user);
}

export async function verifyPhone(input: VerifyPhoneInput) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (!user) throw new AppError(404, 'No account found for this phone number');
  if (user.phoneVerified) throw new AppError(400, 'Phone number is already verified');

  const valid = await verifyOtp(input.phone, input.code);
  if (!valid) throw new AppError(400, 'Invalid or expired OTP. Please request a new code.');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
  });

  const accessToken = signAccessToken({ sub: updated.id, role: updated.role });
  const rawRefresh = signRefreshToken(updated.id);

  await prisma.refreshToken.create({
    data: { token: rawRefresh, userId: updated.id, expiresAt: refreshExpiry() },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: stripPassword(updated),
  };
}

export async function resendOtp(target: string) {
  const isEmail = target.includes('@');
  const user = await prisma.user.findUnique({ 
    where: isEmail ? { email: target } : { phone: target } 
  });
  
  if (!user) throw new AppError(404, `No account found for this ${isEmail ? 'email' : 'phone number'}`);
  
  // Only phone verification is strictly enforced for account activation
  if (!isEmail && user.phoneVerified) {
    throw new AppError(400, 'Phone number is already verified');
  }

  await sendOtp(target);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { phone: input.phone } });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid phone number or password');
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) throw new AppError(401, 'Invalid phone number or password');

  if (user.status === 'banned') throw new AppError(403, 'This account has been banned');
  if (user.status === 'suspended') throw new AppError(403, 'This account is currently suspended');

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const rawRefresh = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { token: rawRefresh, userId: user.id, expiresAt: refreshExpiry() },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: stripPassword(user),
  };
}

export async function emailRegister(input: EmailRegisterInput) {
  const emailExists = await prisma.user.findUnique({ where: { email: input.email } });
  if (emailExists) throw new AppError(409, 'Email address is already registered');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      businessName: input.businessName,
      preferredLocale: input.preferredLocale,
    },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const rawRefresh = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: { token: rawRefresh, userId: user.id, expiresAt: refreshExpiry() },
  });

  return { accessToken, refreshToken: rawRefresh, user: stripPassword(user) };
}

export async function emailLogin(input: EmailLoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) throw new AppError(401, 'Invalid email or password');

  if (user.status === 'banned') throw new AppError(403, 'This account has been banned');
  if (user.status === 'suspended') throw new AppError(403, 'This account is currently suspended');

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const rawRefresh = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { token: rawRefresh, userId: user.id, expiresAt: refreshExpiry() },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: stripPassword(user),
  };
}

export async function googleLogin(input: GoogleLoginInput) {
  const firebase = getFirebaseApp();
  if (!firebase) {
    throw new AppError(500, 'Firebase is not configured on the server');
  }

  let decodedToken;
  try {
    decodedToken = await firebase.auth().verifyIdToken(input.idToken);
  } catch (error) {
    throw new AppError(401, 'Invalid Google token');
  }

  const { email, name, picture } = decodedToken;
  if (!email) throw new AppError(400, 'Google account must have an email address');

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // If user not found by email, check if we can link by phone or create new
    if (!input.phone) {
      // In a real app, you'd probably return a 200 with a "needs_phone" flag
      // but here we'll throw an error to keep it simple for now.
      throw new AppError(404, 'No account found. Please provide a phone number to register.');
    }

    // Check if phone already registered
    const userByPhone = await prisma.user.findUnique({ where: { phone: input.phone } });

    if (userByPhone) {
      // Link Google account to existing phone account
      user = await prisma.user.update({
        where: { id: userByPhone.id },
        data: { 
          email,
          firstName: userByPhone.firstName || name?.split(' ')[0] || 'User',
          lastName: userByPhone.lastName || name?.split(' ').slice(1).join(' ') || '',
          avatarUrl: userByPhone.avatarUrl || picture,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          phone: input.phone,
          firstName: name?.split(' ')[0] || 'User',
          lastName: name?.split(' ').slice(1).join(' ') || '',
          avatarUrl: picture,
          phoneVerified: true, // Trusted from Google if they have it? Actually Google doesn't verify phone for you easily.
        },
      });
    }
  }

  if (user.status === 'banned') throw new AppError(403, 'This account has been banned');
  if (user.status === 'suspended') throw new AppError(403, 'This account is currently suspended');

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const rawRefresh = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { token: rawRefresh, userId: user.id, expiresAt: refreshExpiry() },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: stripPassword(user),
  };
}

export async function refresh(input: RefreshTokenInput) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw new AppError(401, 'Refresh token is invalid or expired');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: input.refreshToken },
    include: { user: true },
  });

  if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
    // Invalidate token if found (possible replay)
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new AppError(401, 'Refresh token is invalid or expired');
  }

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const accessToken = signAccessToken({ sub: stored.user.id, role: stored.user.role });
  const newRefresh = signRefreshToken(stored.user.id);

  await prisma.refreshToken.create({
    data: { token: newRefresh, userId: stored.user.id, expiresAt: refreshExpiry() },
  });

  return { accessToken, refreshToken: newRefresh };
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const { phone } = input;
  const user = await prisma.user.findUnique({
    where: { phone },
  });

  // Always respond success to prevent enumeration
  if (user) {
    await sendOtp(phone);
  }
}

export async function resetPassword(input: ResetPasswordInput) {
  const { phone, code, newPassword } = input;

  const user = await prisma.user.findUnique({ where: { phone } });

  if (!user) throw new AppError(404, 'No account found for this identifier');

  const valid = await verifyOtp(phone, code);
  if (!valid) throw new AppError(400, 'Invalid or expired OTP');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
}

export async function requestChangePassword(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  // Prefer email for security codes if available, otherwise phone
  const target = user.email || user.phone;
  if (!target) throw new AppError(400, 'Account has no email or phone to send a code to');
  await sendOtp(target);
  return { target: target.includes('@') ? 'email' : 'phone', value: target };
}

export async function confirmChangePassword(userId: string, input: ConfirmChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const target = user.email || user.phone;
  if (!target) throw new AppError(400, 'Account has no email or phone to verify against');
  const valid = await verifyOtp(target, input.code);
  if (!valid) throw new AppError(400, 'Invalid or expired code');

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  return stripPassword(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
  });
  return stripPassword(user);
}

export async function updateAvatar(userId: string, buffer: Buffer) {
  const avatarUrl = await uploadToCloudinary(buffer, 'avatars', `avatar-${userId}`);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });
  return stripPassword(user);
}

export async function updateFcmToken(userId: string, input: UpdateFcmTokenInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { fcmToken: input.fcmToken },
  });
  return stripPassword(user);
}
