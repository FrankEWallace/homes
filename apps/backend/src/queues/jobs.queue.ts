import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { runSavedSearchAlerts } from '../modules/saved-searches/saved-searches.matcher';

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
      if (job.data.type === 'saved_search_alerts') return runSavedSearchAlerts();
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

  // Saved-search alerts: every 15 minutes (instant-ish digests).
  await jobsQueue.add(
    'saved-search-alerts',
    { type: 'saved_search_alerts' },
    { repeat: { pattern: '*/15 * * * *' }, jobId: 'saved-search-alerts-recurring' },
  );
}
