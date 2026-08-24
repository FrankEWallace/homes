import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import type { RequestHandler } from 'express';

const envOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [];

const ALLOWED_ORIGINS = [
  ...envOrigins,
  env.API_BASE_URL.replace(/\/$/, ''),
  ...(env.NODE_ENV === 'production'
    ? [
      'https://admin.tojoin.co.tz',
      'https://tojoin.co.tz',
      'https://tojoin-admin.onrender.com',
      'https://tojoin-admin-33ly.onrender.com',
      'https://tojoin-baa8d.web.app',
      'https://tojoin-baa8d.firebaseapp.com',
    ]
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
      origin.endsWith('.onrender.com') || 
      origin.endsWith('.web.app') || 
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.fornax-ai.online') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.up.railway.app') ||
      origin.endsWith('.tojoin.co.tz') ||
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
