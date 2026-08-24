import { Router } from 'express';
import { authenticate, optionalAuthenticate, authorize } from '../../middleware/auth';
import { leadRateLimit } from '../../middleware/security';
import * as ctrl from './leads.controller';

/**
 * @openapi
 * tags:
 *   name: Leads
 *   description: Seeker enquiries / contact / viewing requests, and the agent inbox
 *
 * /leads:
 *   post:
 *     tags: [Leads]
 *     summary: Submit a lead on a listing (public, rate-limited)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, name, email, message]
 *             properties:
 *               listingId: { type: string }
 *               kind:      { type: string, enum: [enquiry, contact, viewing_request] }
 *               name:      { type: string }
 *               email:     { type: string, format: email }
 *               phone:     { type: string }
 *               message:   { type: string }
 *               preferredAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Lead accepted }
 *       404: { description: Listing not found }
 *   get:
 *     tags: [Leads]
 *     summary: List leads for the authenticated agent
 *     responses:
 *       200: { description: Lead inbox }
 *       401: { description: Unauthorized }
 *
 * /leads/stats:
 *   get:
 *     tags: [Leads]
 *     summary: Lead counts by status for the authenticated agent
 *     responses:
 *       200: { description: Status counts }
 *
 * /leads/{id}/status:
 *   patch:
 *     tags: [Leads]
 *     summary: Update a lead's status (owning agent only)
 *     responses:
 *       200: { description: Lead updated }
 *       403: { description: Access denied }
 */

const router = Router();

// Public submission — optional auth so a signed-in seeker is linked to the lead.
router.post('/', leadRateLimit, optionalAuthenticate, ctrl.createLead);

// Agent inbox.
router.get('/', authenticate, authorize('agent'), ctrl.listLeads);
router.get('/stats', authenticate, authorize('agent'), ctrl.leadStats);
router.patch('/:id/status', authenticate, authorize('agent'), ctrl.updateLeadStatus);

export { router as leadsRouter };
