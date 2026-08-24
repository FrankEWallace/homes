import type { RequestHandler } from 'express';
import * as service from './saved-searches.service';
import { CreateSavedSearchSchema, UpdateSavedSearchSchema } from './saved-searches.schemas';
import { sendSuccess, sendCreated } from '../../utils/response';

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = CreateSavedSearchSchema.parse(req.body);
    const saved = await service.createSavedSearch(req.user!.sub, input);
    sendCreated(res, saved, 'Search saved');
  } catch (err) {
    next(err);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const items = await service.listSavedSearches(req.user!.sub);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateSavedSearchSchema.parse(req.body);
    const saved = await service.updateSavedSearch(req.params.id as string, req.user!.sub, input);
    sendSuccess(res, saved, 'Saved search updated');
  } catch (err) {
    next(err);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    const result = await service.deleteSavedSearch(req.params.id as string, req.user!.sub);
    sendSuccess(res, result, 'Saved search deleted');
  } catch (err) {
    next(err);
  }
};
