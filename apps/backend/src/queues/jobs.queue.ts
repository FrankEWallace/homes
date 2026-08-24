import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';

const QUEUE_NAME = 'scheduled-jobs';

export const jobsQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 100 },
});

// ── Expire featured/boosted listings whose window has passed ──────────────────
async function expireStaleBoosts() {
  const result = await prisma.listing.updateMany({
    where: { isFeatured: true, featuredUntil: { lte: new Date() } },
    data: { isFeatured: false, featuredAt: null, featuredUntil: null },
  });
  return result.count;
}

export function startJobsWorker() {
  const worker = new Worker<{ type: string }>(
    QUEUE_NAME,
    async (job) => {
      if (job.data.type === 'expire_boosts') return expireStaleBoosts();
      return undefined;
    },
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    console.error(`[JobsWorker] Job ${job?.id} (${job?.data?.type}) failed:`, err.message);
  });

  return worker;
}

// Schedule recurring jobs — call once at server startup
export async function scheduleRecurringJobs() {
  // Boost expiry: nightly at 02:00 UTC
  await jobsQueue.add(
    'expire-boosts',
    { type: 'expire_boosts' },
    { repeat: { pattern: '0 2 * * *' }, jobId: 'expire-boosts-recurring' },
  );
}
