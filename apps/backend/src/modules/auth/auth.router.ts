import { Router } from 'express';
import { otpRateLimit, loginRateLimit } from '../../middleware/security';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../utils/upload';
import * as ctrl from './auth.controller';

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Registration, OTP verification, login, and profile management
 *
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, phone, password]
 *             properties:
 *               firstName: { type: string, example: Amina }
 *               lastName:  { type: string, example: Yusuf }
 *               phone:     { type: string, example: '+255712345678' }
 *               password:  { type: string, format: password }
 *               email:     { type: string, format: email, example: amina@example.com }
 *     responses:
 *       201:
 *         description: User created — OTP sent to phone
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       409: { description: Phone number already registered }
 *
 * /auth/verify-phone:
 *   post:
 *     tags: [Auth]
 *     summary: Verify phone number with OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone: { type: string, example: '+255712345678' }
 *               code:  { type: string, example: '123456' }
 *     responses:
 *       200:
 *         description: Phone verified — returns access + refresh tokens
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       400: { description: Invalid or expired OTP }
 *
 * /auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP to phone (rate-limited)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: '+255712345678' }
 *     responses:
 *       200: { description: OTP resent }
 *       429: { description: Rate limit exceeded }
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with phone and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone:    { type: string, example: '+255712345678' }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: Invalid credentials }
 *
 * /auth/login-email:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: user@example.com }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: Invalid credentials }
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: Invalid or expired refresh token }
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout and invalidate refresh token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 *
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: '+255712345678' }
 *     responses:
 *       200: { description: OTP sent if account exists }
 *
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code, newPassword]
 *             properties:
 *               phone:       { type: string, example: '+255712345678' }
 *               code:        { type: string, example: '123456' }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200: { description: Password reset successful }
 *       400: { description: Invalid or expired OTP }
 *
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Login or Register with Google
 *     description: >
 *       Verifies a Google ID Token from Firebase. If the user doesn't exist,
 *       they will be registered. Note: `phone` is required for new users
 *       as it's a mandatory field in our system.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string, description: Firebase ID Token }
 *               phone:   { type: string, example: '+255712345678', description: Required for new users }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: Invalid Google token }
 *       404: { description: User not found and phone not provided }
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get authenticated user profile
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: Unauthorized }
 *   patch:
 *     tags: [Auth]
 *     summary: Update authenticated user profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:   { type: string }
 *               avatar: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       401: { description: Unauthorized }
 *
 * /auth/me/fcm-token:
 *   patch:
 *     tags: [Auth]
 *     summary: Register or clear a Firebase Cloud Messaging push token
 *     description: >
 *       The mobile app should call this endpoint after it receives a new FCM token
 *       from Firebase (e.g. on app launch and on token refresh). Send `null` to
 *       deregister push notifications (e.g. on logout).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fcmToken]
 *             properties:
 *               fcmToken: { type: string, nullable: true, example: 'eX...token' }
 *     responses:
 *       200: { description: FCM token saved }
 *       401: { description: Unauthorized }
 */

const router = Router();

// Public routes
router.post('/register', otpRateLimit, ctrl.register);
router.post('/register-email', ctrl.emailRegister);
router.post('/verify-phone', ctrl.verifyPhone);
router.post('/resend-otp', otpRateLimit, ctrl.resendOtp);
router.post('/login', loginRateLimit, ctrl.login);
router.post('/login-email', loginRateLimit, ctrl.emailLogin);
router.post('/google', loginRateLimit, ctrl.googleLogin);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', otpRateLimit, ctrl.forgotPassword);
router.post('/reset-password', loginRateLimit, ctrl.resetPassword);

// Authenticated routes
router.get('/me', authenticate, ctrl.getProfile);
router.patch('/me', authenticate, ctrl.updateProfile);
router.patch('/me/avatar', authenticate, upload.single('avatar'), ctrl.updateAvatar);
router.patch('/me/fcm-token', authenticate, ctrl.updateFcmToken);

// Change Password (requires authentication)
router.post('/me/change-password/request', authenticate, ctrl.requestChangePassword);
router.post('/me/change-password/confirm', authenticate, ctrl.confirmChangePassword);

// GDPR / CCPA: data access + erasure (Phase 6)
router.get('/me/export', authenticate, ctrl.exportData);
router.delete('/me', authenticate, ctrl.deleteAccount);

export { router as authRouter };
