import { Router } from 'express';
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
