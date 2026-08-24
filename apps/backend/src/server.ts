import { initSentry } from './config/sentry';
initSentry(); // must be first — instruments before any other imports

import { createServer } from 'http';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { initSocket } from './socket';
import { startPushWorker } from './queues/push.queue';
import { startJobsWorker, scheduleRecurringJobs } from './queues/jobs.queue';
import { startLeadsWorker } from './queues/leads.queue';

async function start() {
  await prisma.$connect();
  console.info('✅ Database connected');

  if (redis.status === 'wait') await redis.connect();

  const httpServer = createServer(app);
  const io = initSocket(httpServer);
  app.set('io', io);

  const pushWorker = startPushWorker();
  console.info('✅ Push notification worker started');

  const jobsWorker = startJobsWorker();
  await scheduleRecurringJobs();
  console.info('✅ Scheduled jobs worker started (boost expiry + saved-search alerts)');

  const leadsWorker = startLeadsWorker();
  console.info('✅ Lead delivery worker started');

  httpServer.listen(env.PORT, () => {
    console.info(`✅ Server running on http://localhost:${env.PORT}`);
    console.info(`   Environment: ${env.NODE_ENV}`);
    console.info(`   API base: /api/v1`);
    if (env.NODE_ENV !== 'production') {
      console.info(`   API docs:  http://localhost:${env.PORT}/api/v1/docs`);
    }
  });

  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await Promise.all([
        prisma.$disconnect(),
        redis.quit(),
        pushWorker.close(),
        jobsWorker.close(),
        leadsWorker.close(),
        io.close(),
      ]);
      console.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
