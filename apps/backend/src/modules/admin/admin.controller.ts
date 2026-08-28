import type { RequestHandler } from 'express';
import * as adminService from './admin.service';
import { SuspendListingSchema } from './admin.schemas';
import { sendSuccess } from '../../utils/response';

export const getModerationQueue: RequestHandler = async (_req, res, next) => {
  try {
    const items = await adminService.getModerationQueue();
    sendSuccess(res, items, 'Moderation queue');
  } catch (err) {
    next(err);
  }
};

export const suspendListing: RequestHandler = async (req, res, next) => {
  try {
    const { reason } = SuspendListingSchema.parse(req.body);
    const listing = await adminService.suspendListing(req.user!.sub, String(req.params.id), reason);
    sendSuccess(res, listing, 'Listing suspended');
  } catch (err) {
    next(err);
  }
};

export const reinstateListing: RequestHandler = async (req, res, next) => {
  try {
    const listing = await adminService.reinstateListing(req.user!.sub, String(req.params.id));
    sendSuccess(res, listing, 'Listing reinstated');
  } catch (err) {
    next(err);
  }
};
