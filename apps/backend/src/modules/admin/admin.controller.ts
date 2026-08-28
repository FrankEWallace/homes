import type { RequestHandler } from 'express';
import * as adminService from './admin.service';
import {
  SuspendListingSchema,
  CreateCitySchema,
  UpdateCitySchema,
  CreateListingTypeSchema,
  UpdateListingTypeSchema,
  UserQuerySchema,
  UpdateUserSchema,
} from './admin.schemas';
import { sendSuccess, sendCreated } from '../../utils/response';

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

// ─── Taxonomy: cities ─────────────────────────────────────────────────────────
export const listCities: RequestHandler = async (_req, res, next) => {
  try {
    sendSuccess(res, await adminService.listCities());
  } catch (err) {
    next(err);
  }
};

export const createCity: RequestHandler = async (req, res, next) => {
  try {
    const input = CreateCitySchema.parse(req.body);
    sendCreated(res, await adminService.createCity(req.user!.sub, input), 'City created');
  } catch (err) {
    next(err);
  }
};

export const updateCity: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateCitySchema.parse(req.body);
    sendSuccess(res, await adminService.updateCity(req.user!.sub, String(req.params.id), input), 'City updated');
  } catch (err) {
    next(err);
  }
};

export const deleteCity: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(res, await adminService.deleteCity(req.user!.sub, String(req.params.id)), 'City deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Taxonomy: property types ─────────────────────────────────────────────────
export const listListingTypes: RequestHandler = async (_req, res, next) => {
  try {
    sendSuccess(res, await adminService.listListingTypes());
  } catch (err) {
    next(err);
  }
};

export const createListingType: RequestHandler = async (req, res, next) => {
  try {
    const input = CreateListingTypeSchema.parse(req.body);
    sendCreated(res, await adminService.createListingType(req.user!.sub, input), 'Property type created');
  } catch (err) {
    next(err);
  }
};

export const updateListingType: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateListingTypeSchema.parse(req.body);
    sendSuccess(res, await adminService.updateListingType(req.user!.sub, String(req.params.id), input), 'Property type updated');
  } catch (err) {
    next(err);
  }
};

export const deleteListingType: RequestHandler = async (req, res, next) => {
  try {
    sendSuccess(res, await adminService.deleteListingType(req.user!.sub, String(req.params.id)), 'Property type deleted');
  } catch (err) {
    next(err);
  }
};

// ─── User / agency management ────────────────────────────────────────────────
export const listUsers: RequestHandler = async (req, res, next) => {
  try {
    const query = UserQuerySchema.parse(req.query);
    const result = await adminService.listUsers(query);
    sendSuccess(res, result.users, 'Users', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

export const updateUser: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateUserSchema.parse(req.body);
    sendSuccess(res, await adminService.updateUser(req.user!.sub, String(req.params.id), input), 'User updated');
  } catch (err) {
    next(err);
  }
};
