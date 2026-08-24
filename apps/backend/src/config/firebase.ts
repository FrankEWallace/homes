import admin from 'firebase-admin';
import { env } from './env';

let app: admin.app.App | null = null;

/**
 * Returns the initialised Firebase Admin app, or null if FCM credentials
 * are not configured (dev / test environments without FCM secrets).
 */
export function getFirebaseApp(): admin.app.App | null {
  if (app) return app;

  if (!env.FCM_PROJECT_ID || !env.FCM_PRIVATE_KEY || !env.FCM_CLIENT_EMAIL) {
    return null;
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FCM_PROJECT_ID,
      // Cloud Run / Railway store the key with literal \n — restore newlines
      privateKey: env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: env.FCM_CLIENT_EMAIL,
    }),
  });

  return app;
}
