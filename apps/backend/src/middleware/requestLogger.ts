import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../utils/logger';
import { recordHttp } from '../observability/metrics';

const SLOW_REQUEST_MS = 1000; // warn when a request crosses this threshold

/**
 * Request-scoped observability (Phase 5): assigns/propagates a request id,
 * times each request, records it into the metrics registry, and emits one
 * structured completion log. Slow or failing requests log at warn/error.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', requestId);
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    // Normalize the route so metrics group by pattern, not by concrete ids.
    const routePath = req.route?.path ?? req.path;
    const routeKey = `${req.method} ${req.baseUrl ?? ''}${routePath}` || `${req.method} ${req.path}`;
    recordHttp(routeKey, ms, res.statusCode);

    const fields = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms),
    };
    if (res.statusCode >= 500) logger.error('request.failed', fields);
    else if (res.statusCode >= 400 || ms >= SLOW_REQUEST_MS)
      logger.warn(ms >= SLOW_REQUEST_MS ? 'request.slow' : 'request.client_error', fields);
    else logger.info('request.completed', fields);
  });

  next();
};
