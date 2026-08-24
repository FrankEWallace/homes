import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as wishlistController from './wishlist.controller';

const router = Router();

router.use(authenticate);

router.get('/', wishlistController.getWishlist);
router.get('/ids', wishlistController.getWishlistIds);
router.post('/:listingId/toggle', wishlistController.toggleWishlist);

export { router as wishlistRouter };
