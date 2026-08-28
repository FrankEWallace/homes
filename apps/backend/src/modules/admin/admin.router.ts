import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as ctrl from './admin.controller';

const router = Router();

// All admin routes require an authenticated admin.
router.use(authenticate, authorize('admin'));

// Moderation
router.get('/moderation', ctrl.getModerationQueue);
router.post('/listings/:id/suspend', ctrl.suspendListing);
router.post('/listings/:id/reinstate', ctrl.reinstateListing);

// Taxonomy — cities
router.get('/cities', ctrl.listCities);
router.post('/cities', ctrl.createCity);
router.patch('/cities/:id', ctrl.updateCity);
router.delete('/cities/:id', ctrl.deleteCity);

// Taxonomy — property types
router.get('/listing-types', ctrl.listListingTypes);
router.post('/listing-types', ctrl.createListingType);
router.patch('/listing-types/:id', ctrl.updateListingType);
router.delete('/listing-types/:id', ctrl.deleteListingType);

// Users / agencies
router.get('/users', ctrl.listUsers);
router.patch('/users/:id', ctrl.updateUser);

export { router as adminRouter };
