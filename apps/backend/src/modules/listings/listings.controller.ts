import type { RequestHandler } from 'express';
import * as listingsService from './listings.service';
import { CreateListingSchema, UpdateListingSchema, ListingQuerySchema, ImportCsvSchema } from './listings.schemas';
import { sendSuccess, sendCreated } from '../../utils/response';

const p = (v: string | string[]): string => String(v);

export const createListing: RequestHandler = async (req, res, next) => {
  try {
    const input = CreateListingSchema.parse(req.body);
    const listing = await listingsService.createListing(req.user!.sub, input);
    sendCreated(res, listing, 'Listing created as draft');
  } catch (err) {
    next(err);
  }
};

export const listCategories: RequestHandler = async (_req, res, next) => {
  try {
    const categories = await listingsService.listCategories();
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
};

export const listListingTypes: RequestHandler = async (_req, res, next) => {
  try {
    const types = await listingsService.listListingTypes();
    sendSuccess(res, types);
  } catch (err) {
    next(err);
  }
};

export const searchListings: RequestHandler = async (req, res, next) => {
  try {
    const query = ListingQuerySchema.parse(req.query);
    const result = await listingsService.searchListings(query);
    sendSuccess(res, result.listings, 'Listings retrieved', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

const SITEMAP_MAX_LIMIT = 50_000; // Google's per-sitemap-file URL cap

export const listSitemapSlugs: RequestHandler = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(SITEMAP_MAX_LIMIT, Math.max(1, Number(req.query.limit) || SITEMAP_MAX_LIMIT));
    const result = await listingsService.getPublishedListingSlugs(page, limit);
    sendSuccess(res, result.listings, 'Sitemap slugs retrieved', 200, result.meta);
  } catch (err) {
    next(err);
  }
};

export const getListing: RequestHandler = async (req, res, next) => {
  try {
    const listing = await listingsService.getListing(p(req.params.id), req.user?.sub, req.user?.role);
    sendSuccess(res, listing);
  } catch (err) {
    next(err);
  }
};

export const getMyListings: RequestHandler = async (req, res, next) => {
  try {
    const listings = await listingsService.getMyListings(req.user!.sub);
    sendSuccess(res, listings);
  } catch (err) {
    next(err);
  }
};

export const getAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const analytics = await listingsService.getAgentAnalytics(req.user!.sub);
    sendSuccess(res, analytics);
  } catch (err) {
    next(err);
  }
};

export const importListings: RequestHandler = async (req, res, next) => {
  try {
    const { csv } = ImportCsvSchema.parse(req.body);
    const result = await listingsService.importListings(req.user!.sub, csv);
    sendSuccess(res, result, 'Import complete');
  } catch (err) {
    next(err);
  }
};

export const updateListing: RequestHandler = async (req, res, next) => {
  try {
    const input = UpdateListingSchema.parse(req.body);
    const listing = await listingsService.updateListing(p(req.params.id), req.user!.sub, req.user!.role, input);
    sendSuccess(res, listing, 'Listing updated');
  } catch (err) {
    next(err);
  }
};

export const deleteListing: RequestHandler = async (req, res, next) => {
  try {
    await listingsService.deleteListing(p(req.params.id), req.user!.sub, req.user!.role);
    sendSuccess(res, null, 'Listing deleted');
  } catch (err) {
    next(err);
  }
};

export const publishListing: RequestHandler = async (req, res, next) => {
  try {
    const listing = await listingsService.publishListing(p(req.params.id), req.user!.sub, req.user!.role);
    sendSuccess(res, listing, 'Listing published');
  } catch (err) {
    next(err);
  }
};

export const unpublishListing: RequestHandler = async (req, res, next) => {
  try {
    const listing = await listingsService.unpublishListing(p(req.params.id), req.user!.sub, req.user!.role);
    sendSuccess(res, listing, 'Listing withdrawn');
  } catch (err) {
    next(err);
  }
};

export const uploadImages: RequestHandler = async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    const urls = await listingsService.uploadImages(p(req.params.id), req.user!.sub, req.user!.role, files ?? []);
    sendSuccess(res, { images: urls }, 'Images uploaded');
  } catch (err) {
    next(err);
  }
};

export const removeImage: RequestHandler = async (req, res, next) => {
  try {
    const { imageUrl } = req.body as { imageUrl: string };
    if (!imageUrl) return next(new Error('imageUrl is required'));
    const urls = await listingsService.removeImage(p(req.params.id), req.user!.sub, req.user!.role, imageUrl);
    sendSuccess(res, { images: urls }, 'Image removed');
  } catch (err) {
    next(err);
  }
};
