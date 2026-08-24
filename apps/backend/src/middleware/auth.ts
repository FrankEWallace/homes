import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

export interface JwtPayload {
  sub: string; // userId
  role: 'seeker' | 'agent' | 'admin';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      /** Raw request body buffer — captured by express.json verify callback for webhook sig verification */
      rawBody?: Buffer;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  console.log(`[AUTH] Path: ${req.path}, Authorization Header: ${header ? 'Present' : 'Missing'}`);
  
  if (!header?.startsWith('Bearer ')) {
    console.warn(`[AUTH] 401 Unauthorized: Missing or invalid header for path ${req.path}`);
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    next();
  } catch {
    next(new AppError(401, 'Token is invalid or expired'));
  }
};

export const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    // If a token was provided but is invalid, we treat the user as unauthenticated
  }
  next();
};

export const authorize =
  (...roles: JwtPayload['role'][]): RequestHandler =>
    (req, _res, next) => {
      if (!req.user) {
        return next(new AppError(401, 'Authentication required'));
      }

      // Admin has super-user access and can perform any action
      const isAllowed = req.user.role === 'admin' || roles.includes(req.user.role);

      if (!isAllowed) {
        console.error(`[AUTH] 403 Forbidden: User role '${req.user.role}' does not match required roles: [${roles.join(', ')}]`);
        return next(new AppError(403, 'Insufficient permissions'));
      }

      next();
    };
