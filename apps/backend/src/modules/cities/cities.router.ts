import { Router } from 'express';
import { getCities, getCityWeather } from './cities.controller';

const citiesRouter = Router();

/**
 * @openapi
 * /cities:
 *   get:
 *     tags: [Cities]
 *     summary: Retrieve a list of cities
 *     description: Returns a list of active cities with their hero images for the mobile app explore page.
 *     responses:
 *       200:
 *         description: A list of cities
 */
citiesRouter.get('/', getCities);

/**
 * @openapi
 * /cities/{slug}/weather:
 *   get:
 *     tags: [Cities]
 *     summary: Current weather for a city
 *     description: Server-side proxy to OpenWeather (key stays on the server). Cached ~10 min.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Current weather payload }
 *       404: { description: City not found }
 *       503: { description: Weather service not configured }
 */
citiesRouter.get('/:slug/weather', getCityWeather);

export { citiesRouter };
