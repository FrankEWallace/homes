import { Router } from 'express';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
import { upload } from '../../utils/upload';
import * as ctrl from './listings.controller';

/**
 * @openapi
 * tags:
 *   name: Listings
 *   description: Marketplace listings — events, tours, accommodation, car rental, transport
 *
 * /listings:
 *   get:
 *     tags: [Listings]
 *     summary: Search / browse listings
 *     security: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [event, safari, tour, accommodation, transport, car_rental] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Full-text search query
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of approved listings
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   post:
 *     tags: [Listings]
 *     summary: Create a new listing (host only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, description, pricePerUnit, currency]
 *             properties:
 *               title:        { type: string }
 *               type:         { type: string, enum: [event, safari, tour, accommodation, transport, car_rental] }
 *               description:  { type: string }
 *               pricePerUnit: { type: number, example: 50000 }
 *               currency:     { type: string, example: TZS }
 *               location:     { type: string }
 *     responses:
 *       201:
 *         description: Listing created as draft
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       403: { description: Host role required }
 *
 * /listings/mine:
 *   get:
 *     tags: [Listings]
 *     summary: Get host's own listings
 *     responses:
 *       200:
 *         description: List of host's listings (all statuses)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       403: { description: Host role required }
 *
 * /listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get a single listing by ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Listing detail
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       404: { description: Not found }
 *   put:
 *     tags: [Listings]
 *     summary: Update a listing (host only, own listings)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:        { type: string }
 *               description:  { type: string }
 *               pricePerUnit: { type: number }
 *               location:     { type: string }
 *     responses:
 *       200:
 *         description: Listing updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       403: { description: Forbidden }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Listings]
 *     summary: Delete a listing (host only, own listings)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Listing deleted }
 *       403: { description: Forbidden }
 *
 * /listings/{id}/availability:
 *   get:
 *     tags: [Listings]
 *     summary: Get availability slots for a listing
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Availability slots
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *   put:
 *     tags: [Listings]
 *     summary: Set availability for a listing (host only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:      { type: string, format: date }
 *                     available: { type: boolean }
 *                     capacity:  { type: integer }
 *     responses:
 *       200: { description: Availability updated }
 *       403: { description: Forbidden }
 *
 * /listings/{id}/submit:
 *   post:
 *     tags: [Listings]
 *     summary: Submit a listing for admin approval (host only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Submitted for review }
 *       403: { description: Forbidden }
 *
 * /listings/{id}/images:
 *   post:
 *     tags: [Listings]
 *     summary: Upload images for a listing (host only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       200: { description: Images uploaded }
 *       403: { description: Forbidden }
 *   delete:
 *     tags: [Listings]
 *     summary: Remove an image from a listing (host only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageUrl]
 *             properties:
 *               imageUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Image removed }
 *       403: { description: Forbidden }
 *
 * /listings/{id}/approve:
 *   post:
 *     tags: [Listings]
 *     summary: Approve a pending listing (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Listing approved }
 *       403: { description: Admin role required }
 *
 * /listings/{id}/reject:
 *   post:
 *     tags: [Listings]
 *     summary: Reject a pending listing (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Listing rejected }
 *       403: { description: Admin role required }
 */

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/categories', ctrl.listCategories);
router.get('/types', ctrl.listListingTypes);
router.get('/', ctrl.searchListings);

router.get('/mine', authenticate, authorize('agent'), ctrl.getMyListings);
router.get('/:id', optionalAuthenticate, ctrl.getListing);

// ── Agent (host) ────────────────────────────────────────────────────────────────
router.post('/', authenticate, authorize('agent'), ctrl.createListing);
router.put('/:id', authenticate, authorize('agent'), ctrl.updateListing);
router.delete('/:id', authenticate, authorize('agent'), ctrl.deleteListing);
router.post('/:id/publish', authenticate, authorize('agent'), ctrl.publishListing);
router.post('/:id/unpublish', authenticate, authorize('agent'), ctrl.unpublishListing);
router.post(
  '/:id/images',
  authenticate,
  authorize('agent'),
  upload.array('images', 10),
  ctrl.uploadImages,
);
router.delete('/:id/images', authenticate, authorize('agent'), ctrl.removeImage);

export { router as listingsRouter };
