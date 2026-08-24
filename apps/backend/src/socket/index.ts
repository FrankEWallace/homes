import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../middleware/auth';
import { registerChatHandlers } from './chat.socket';

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS.split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Redis pub/sub adapter for multi-instance support
  // ioredis auto-connects when lazyConnect is omitted (default false)
  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  io.adapter(createAdapter(pubClient, subClient));
  console.info('✅ Socket.io Redis adapter initialised');

  // JWT auth middleware — rejects connections with invalid/missing tokens
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      (socket as any).userId = payload.sub;
      (socket as any).userRole = payload.role;
      next();
    } catch {
      next(new Error('Token is invalid or expired'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    console.info(`[Socket] connected userId=${userId} socketId=${socket.id}`);

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.info(`[Socket] disconnected userId=${userId} reason=${reason}`);
    });
  });

  return io;
}
