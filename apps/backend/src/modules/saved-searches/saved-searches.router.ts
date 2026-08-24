import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './saved-searches.controller';

/**
 * @openapi
 * tags:
 *   name: SavedSearches
 *   description: Persisted search criteria with optional email alerts (F5)
 *
 * /saved-searches:
 *   get:
 *     tags: [SavedSearches]
 *     summary: List the current user's saved searches
 *     responses:
 *       200: { description: Saved searches }
 *   post:
 *     tags: [SavedSearches]
 *     summary: Save a search
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, query]
 *             properties:
 *               name:      { type: string }
 *               query:     { type: object }
 *               notify:    { type: boolean }
 *               frequency: { type: string, enum: [instant, daily] }
 *     responses:
 *       201: { description: Search saved }
 *
 * /saved-searches/{id}:
 *   patch:
 *     tags: [SavedSearches]
 *     summary: Update a saved search (rename, toggle alerts, frequency)
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [SavedSearches]
 *     summary: Delete a saved search
 *     responses:
 *       200: { description: Deleted }
 */

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export { router as savedSearchesRouter };
