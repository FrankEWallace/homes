import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as ctrl from './admin.controller';

const router = Router();

// All admin routes require an authenticated admin.
router.use(authenticate, authorize('admin'));

router.get('/moderation', ctrl.getModerationQueue);
router.post('/listings/:id/suspend', ctrl.suspendListing);
router.post('/listings/:id/reinstate', ctrl.reinstateListing);

export { router as adminRouter };
