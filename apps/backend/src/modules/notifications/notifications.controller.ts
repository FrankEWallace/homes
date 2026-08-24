import type { RequestHandler } from 'express';
import * as notificationsService from './notifications.service';
import {
  BulkSmsSchema,
  BroadcastSmsSchema,
  RoleBroadcastSmsSchema,
  DeviceTokenSchema,
  RemoveDeviceTokenSchema,
  NotificationPreferenceSchema,
} from './notifications.schemas';
import * as preferences from './preferences.service';
import { sendSuccess } from '../../utils/response';

// ─── User inbox ───────────────────────────────────────────────────────────────

export const listMyNotifications: RequestHandler = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const result = await notificationsService.listMyNotifications(req.user!.sub, page);
    sendSuccess(res, result.notifications, 'Success', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount: RequestHandler = async (req, res, next) => {
  try {
    const result = await notificationsService.getUnreadCount(req.user!.sub);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const markOneRead: RequestHandler = async (req, res, next) => {
  try {
    const notification = await notificationsService.markOneRead(
      String(req.params.id),
      req.user!.sub,
    );
    sendSuccess(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

export const markAllRead: RequestHandler = async (req, res, next) => {
  try {
    const result = await notificationsService.markAllRead(req.user!.sub);
    sendSuccess(res, result, `${result.updated} notification(s) marked as read`);
  } catch (err) {
    next(err);
  }
};

// ─── Device token ─────────────────────────────────────────────────────────────

export const registerDeviceToken: RequestHandler = async (req, res, next) => {
  try {
    const { token, platform } = DeviceTokenSchema.parse(req.body);
    await notificationsService.upsertDeviceToken(req.user!.sub, token, platform);
    sendSuccess(res, null, 'Device token registered');
  } catch (err) {
    next(err);
  }
};

export const unregisterDeviceToken: RequestHandler = async (req, res, next) => {
  try {
    const { token } = RemoveDeviceTokenSchema.parse(req.body);
    await notificationsService.removeDeviceToken(req.user!.sub, token);
    sendSuccess(res, null, 'Device token removed');
  } catch (err) {
    next(err);
  }
};

// ─── Notification preferences ─────────────────────────────────────────────────

export const getPreferences: RequestHandler = async (req, res, next) => {
  try {
    const pref = await preferences.getOrCreatePreference(req.user!.sub);
    sendSuccess(res, pref);
  } catch (err) {
    next(err);
  }
};

export const updatePreferences: RequestHandler = async (req, res, next) => {
  try {
    const input = NotificationPreferenceSchema.parse(req.body);
    const pref = await preferences.updatePreference(req.user!.sub, input);
    sendSuccess(res, pref, 'Preferences updated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notifications/sms/bulk
 * Send a custom message to each phone number individually.
 * Admin only.
 */
export const bulkSms: RequestHandler = async (req, res, next) => {
  try {
    const input = BulkSmsSchema.parse(req.body);
    const result = await notificationsService.sendBulk(input);
    sendSuccess(res, result, `SMS dispatched to ${result.sent} recipient(s)`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notifications/sms/broadcast
 * Broadcast the same message to an explicit list of phones.
 * Admin only.
 */
export const broadcastSms: RequestHandler = async (req, res, next) => {
  try {
    const input = BroadcastSmsSchema.parse(req.body);
    const result = await notificationsService.broadcast(input);
    sendSuccess(res, result, `SMS broadcast to ${result.sent} recipient(s)`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notifications/sms/role-broadcast
 * Broadcast to all verified users matching a role filter.
 * Admin only.
 */
export const roleBroadcastSms: RequestHandler = async (req, res, next) => {
  try {
    const input = RoleBroadcastSmsSchema.parse(req.body);
    const result = await notificationsService.roleBroadcast(input);
    sendSuccess(res, result, `SMS broadcast to ${result.sent} verified user(s)`);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /notifications/sms/history
 * Paginated SMS delivery log. Admin only.
 */
export const getSmsHistory: RequestHandler = async (req, res, next) => {
  try {
    const result = await notificationsService.listSmsHistory({
      page: parseInt(String(req.query.page ?? '1'), 10) || 1,
      category: req.query.category ? String(req.query.category) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
    });
    sendSuccess(res, result.items, 'Success', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /notifications/sms/stats
 * Aggregate SMS volume / failure / cost stats. Admin only.
 */
export const getSmsStats: RequestHandler = async (_req, res, next) => {
  try {
    const stats = await notificationsService.smsStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notifications/sms/inbound
 * Public provider webhook for inbound SMS — handles STOP/START opt-out.
 * Always responds 200 so the provider does not retry.
 */
export const inboundSms: RequestHandler = async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const from = String(body.from ?? body.sender ?? body.msisdn ?? body.phone ?? '');
    const text = String(body.text ?? body.message ?? body.content ?? body.body ?? '');
    if (!from || !text) {
      res.status(200).json({ received: true });
      return;
    }
    const result = await notificationsService.handleInboundSms(from, text);
    res.status(200).json({ received: true, ...result });
  } catch (err) {
    console.error('[sms] inbound webhook error:', err);
    res.status(200).json({ received: true });
  }
};
