import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as notificationsController from './notifications.controller';

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: User notification inbox and admin SMS broadcast endpoints
 */

const router = Router();

// ── Public provider webhook (no auth — the SMS provider calls this) ─────────
// Mounted BEFORE any authenticate guard so it doesn't require a Bearer token.
router.post('/sms/inbound', notificationsController.inboundSms);

// ── User inbox routes (any authenticated user) ─────────────────────────────

/**
 * @openapi
 * /notifications/me:
 *   get:
 *     tags: [Notifications]
 *     summary: Get the current user's notification inbox (paginated, unread first)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated list of notifications
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
router.get('/me', authenticate, notificationsController.listMyNotifications);

/**
 * @openapi
 * /notifications/me/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get count of unread notifications (for badge display)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 */
router.get('/me/unread-count', authenticate, notificationsController.getUnreadCount);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 *       403: { description: Not your notification }
 *       404: { description: Not found }
 */
router.patch('/:id/read', authenticate, notificationsController.markOneRead);

/**
 * @openapi
 * /notifications/mark-all-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all of the current user's notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated: { type: integer }
 */
router.post('/mark-all-read', authenticate, notificationsController.markAllRead);

// ── Device token routes ────────────────────────────────────────────────────
router.post('/device-token', authenticate, notificationsController.registerDeviceToken);
router.delete('/device-token', authenticate, notificationsController.unregisterDeviceToken);

// ── Notification preference routes ─────────────────────────────────────────

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Get the current user's notification preferences (created on first read)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: The user's notification preferences }
 *   patch:
 *     tags: [Notifications]
 *     summary: Update one or more notification preference switches
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushEnabled: { type: boolean }
 *               smsEnabled: { type: boolean }
 *               inAppEnabled: { type: boolean }
 *               bookingUpdates: { type: boolean }
 *               paymentUpdates: { type: boolean }
 *               listingUpdates: { type: boolean }
 *               disputeUpdates: { type: boolean }
 *               payoutUpdates: { type: boolean }
 *               messages: { type: boolean }
 *               promotions: { type: boolean }
 *     responses:
 *       200: { description: Updated preferences }
 */
router.get('/preferences', authenticate, notificationsController.getPreferences);
router.patch('/preferences', authenticate, notificationsController.updatePreferences);

// ── Admin SMS routes ───────────────────────────────────────────────────────
router.use(authenticate, authorize('admin'));

/**
 * @openapi
 * /notifications/sms/bulk:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a custom SMS to each recipient
 *     description: Each recipient can receive a different message. All sent in one Textify API call.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipients]
 *             properties:
 *               recipients:
 *                 type: array
 *                 maxItems: 1000
 *                 items:
 *                   type: object
 *                   required: [phone, message]
 *                   properties:
 *                     phone:
 *                       type: string
 *                       example: "+255712345678"
 *                     message:
 *                       type: string
 *                       maxLength: 160
 *     responses:
 *       200:
 *         description: SMS dispatched
 */
router.post('/sms/bulk', notificationsController.bulkSms);

/**
 * @openapi
 * /notifications/sms/broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Broadcast the same message to multiple phones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phones, message]
 *             properties:
 *               phones:
 *                 type: array
 *                 maxItems: 1000
 *                 items:
 *                   type: string
 *                   example: "+255712345678"
 *               message:
 *                 type: string
 *                 maxLength: 160
 *     responses:
 *       200:
 *         description: SMS broadcast sent
 */
router.post('/sms/broadcast', notificationsController.broadcastSms);

/**
 * @openapi
 * /notifications/sms/role-broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Broadcast to all verified users matching a role filter
 *     description: Queries the DB for verified users with the given roles and sends the message.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [guest, host, admin]
 *                 default: [guest, host]
 *               message:
 *                 type: string
 *                 maxLength: 160
 *     responses:
 *       200:
 *         description: SMS broadcast sent to matched users
 */
router.post('/sms/role-broadcast', notificationsController.roleBroadcastSms);

/**
 * @openapi
 * /notifications/sms/history:
 *   get:
 *     tags: [Notifications]
 *     summary: Paginated SMS delivery log (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [otp, transactional, notification, broadcast] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [sent, failed, delivered] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by recipient phone substring
 *     responses:
 *       200: { description: Paginated SMS log }
 */
router.get('/sms/history', notificationsController.getSmsHistory);

/**
 * @openapi
 * /notifications/sms/stats:
 *   get:
 *     tags: [Notifications]
 *     summary: Aggregate SMS volume / failure / segment-cost stats (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: SMS stats }
 */
router.get('/sms/stats', notificationsController.getSmsStats);

export { router as notificationsRouter };
