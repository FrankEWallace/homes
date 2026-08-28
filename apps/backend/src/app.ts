import express from 'express';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { Sentry } from './config/sentry';
import { swaggerSpec } from './config/swagger';
import { helmetMiddleware, corsMiddleware, globalRateLimit } from './middleware/security';
import { notFound, errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { router } from './routes/index';
import { LOCAL_UPLOAD_DIR } from './utils/upload';
import { env } from './config/env';

const app = express();

// ─── Observability (request id + timing + structured logs + metrics) ─────────
app.use(requestLogger);

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(globalRateLimit);

// ─── Parsing & compression ───────────────────────────────────────────────────
app.use(compression());
app.use(
  express.json({
    limit: '10mb',
    // Capture raw body so the PayMe webhook handler can verify the HMAC signature
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── API Docs ─────────────────────────────────────────────────────────────────
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Local dev media (only used when no cloud storage is configured) ─────────
if (env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(LOCAL_UPLOAD_DIR));
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export { app };
