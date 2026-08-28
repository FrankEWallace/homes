import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import type { RequestHandler } from 'express';

const envOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

// Exact-match allowlist. Real production origins come from ALLOWED_ORIGINS (env);
// localhost variants are added only in non-production. No brand domains and no
// shared-host suffix matching — those let any subdomain make credentialed calls.
const ALLOWED_ORIGINS = [
  ...envOrigins,
  env.API_BASE_URL.replace(/\/$/, ''),
  ...(env.NODE_ENV === 'production'
    ? []
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
    ]),
];

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow CDN images
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl)
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed =
      ALLOWED_ORIGINS.includes('*') ||
      ALLOWED_ORIGINS.includes(origin) ||
      (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
});

export const globalRateLimit: RequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Lead capture: throttle per IP to blunt spam/abuse on the public enquiry form.
export const leadRateLimit: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8,
  keyGenerator: (req) => req.ip ?? 'unknown',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many enquiries. Please wait a moment and try again.' },
});

export const otpRateLimit: RequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: env.OTP_RATE_LIMIT_MAX,
  keyGenerator: (req) => req.body?.phone ?? req.ip ?? 'unknown',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please wait before trying again.' },
});

// Login: throttle password-guessing. Keyed by the account identifier when present
// (so one attacker can't lock every user by hammering from one IP) and the IP.
export const loginRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: (req) => `${req.body?.email ?? req.body?.phone ?? 'anon'}:${req.ip ?? 'unknown'}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
});
