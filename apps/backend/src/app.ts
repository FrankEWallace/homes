import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { Sentry } from './config/sentry';
import { swaggerSpec } from './config/swagger';
import { helmetMiddleware, corsMiddleware, globalRateLimit } from './middleware/security';
import { notFound, errorHandler } from './middleware/errorHandler';
import { router } from './routes/index';
import { LOCAL_UPLOAD_DIR } from './utils/upload';
import { env } from './config/env';

const app = express();

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

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

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
