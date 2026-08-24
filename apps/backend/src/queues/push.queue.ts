import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { sendPush } from '../utils/push';
import { prisma } from '../config/prisma';

const QUEUE_NAME = 'push-notifications';

export const pushQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export function enqueuePush(payload: PushJobData): Promise<unknown> {
  return pushQueue.add('send', payload);
}

export function startPushWorker() {
  const worker = new Worker<PushJobData>(
    QUEUE_NAME,
    async (job) => {
      const { userId, title, body, data } = job.data;

      const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: { id: true, token: true },
      });

      if (tokens.length === 0) return;

      const staleIds: string[] = [];

      await Promise.allSettled(
        tokens.map(async ({ id, token }) => {
          const isStale = await sendPush({ token, title, body, data });
          if (isStale) staleIds.push(id);
        }),
      );

      if (staleIds.length > 0) {
        await prisma.deviceToken.deleteMany({ where: { id: { in: staleIds } } });
      }

      // Update lastUsedAt for active tokens
      const activeIds = tokens.map((t) => t.id).filter((id) => !staleIds.includes(id));
      if (activeIds.length > 0) {
        await prisma.deviceToken.updateMany({
          where: { id: { in: activeIds } },
          data: { lastUsedAt: new Date() },
        });
      }
    },
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    console.error(`[PushWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
