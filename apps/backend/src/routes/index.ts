import { Router } from 'express';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { snapshot } from '../observability/metrics';
import { authRouter } from '../modules/auth/auth.router';
import { listingsRouter } from '../modules/listings/listings.router';
import { notificationsRouter } from '../modules/notifications/notifications.router';
import { chatRouter } from '../modules/chat/chat.router';
import { wishlistRouter } from '../modules/wishlist/wishlist.router';
import { citiesRouter } from '../modules/cities/cities.router';
import { leadsRouter } from '../modules/leads/leads.router';
import { savedSearchesRouter } from '../modules/saved-searches/saved-searches.router';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     security: []
 *     responses:
 *       200:
 *         description: API is running
 */
router.get('/health', async (_req, res) => {
  const dbUrl = process.env.DATABASE_URL || 'Not Set';
  const dbHost = dbUrl.split('@')[1]?.split('/')[0] || 'Unknown';

  res.json({
    success: true,
    message: 'Homes API is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    db_host: dbHost,
  });
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags: [System]
 *     summary: Readiness probe — checks Postgres + Redis connectivity
 *     security: []
 *     responses:
 *       200: { description: All dependencies reachable }
 *       503: { description: One or more dependencies are unavailable }
 */
router.get('/health/ready', async (_req, res) => {
  const check = async (fn: () => Promise<unknown>) => {
    const started = process.hrtime.bigint();
    try {
      await fn();
      return { ok: true, latencyMs: Number(process.hrtime.bigint() - started) / 1e6 };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  };

  const [db, cache] = await Promise.all([
    check(() => prisma.$queryRaw`select 1`),
    check(() => redis.ping()),
  ]);

  const ready = db.ok && cache.ok;
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ready' : 'degraded',
    checks: { database: db, redis: cache },
    timestamp: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /metrics:
 *   get:
 *     tags: [System]
 *     summary: In-process request + operation latency metrics (p50/p95/p99)
 *     security: []
 *     responses:
 *       200: { description: Metrics snapshot }
 */
router.get('/metrics', (_req, res) => {
  res.json({ success: true, data: snapshot(), timestamp: new Date().toISOString() });
});

// v1 marketplace modules
router.use('/cities', citiesRouter);
router.use('/auth', authRouter);
router.use('/listings', listingsRouter);
router.use('/notifications', notificationsRouter);
router.use('/chat', chatRouter);
router.use('/wishlist', wishlistRouter);
router.use('/leads', leadsRouter);
router.use('/saved-searches', savedSearchesRouter);

export { router };
