import type { RequestHandler } from 'express';
import * as wishlistService from './wishlist.service';
import { sendSuccess } from '../../utils/response';

export const toggleWishlist: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const listingId = req.params.listingId as string;

    const result = await wishlistService.toggleWishlist(userId, listingId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getWishlist: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const listings = await wishlistService.getWishlist(userId);
    sendSuccess(res, listings);
  } catch (err) {
    next(err);
  }
};

export const getWishlistIds: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const ids = await wishlistService.getWishlistIds(userId);
    sendSuccess(res, ids);
  } catch (err) {
    next(err);
  }
};
