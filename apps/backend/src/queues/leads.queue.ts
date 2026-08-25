import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { sendLeadNotificationEmail } from '../utils/mail';

const QUEUE_NAME = 'lead-delivery';

/**
 * Delivers a lead to the listing's agent by email. Enqueued transactionally after
 * the lead row is written (see leads.service). Retries with exponential backoff so
 * a transient Resend/network failure doesn't drop the lead — the row is already
 * persisted regardless, so the agent still sees it in their inbox.
 */
export const leadsQueue = new Queue<{ leadId: string }>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/** Enqueue delivery of a persisted lead. Safe no-op-ish: failures are retried. */
export async function enqueueLeadDelivery(leadId: string) {
  await leadsQueue.add('deliver', { leadId }, { jobId: `lead-${leadId}` });
}

async function deliverLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      listing: { select: { title: true, slug: true } },
      agent: { select: { email: true, firstName: true } },
    },
  });
  if (!lead) return; // lead deleted before delivery — nothing to do
  if (lead.deliveredAt) return; // already delivered (idempotent on retry)
  if (!lead.agent.email) return; // no address on file — in-app notification still stands

  await sendLeadNotificationEmail(lead.agent.email, {
    agentName: lead.agent.firstName,
    listingTitle: lead.listing.title,
    listingSlug: lead.listing.slug,
    kind: lead.kind,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    preferredAt: lead.preferredAt,
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { deliveredAt: new Date() },
  });
}

export function startLeadsWorker() {
  const worker = new Worker<{ leadId: string }>(
    QUEUE_NAME,
    async (job) => deliverLead(job.data.leadId),
    { connection: redis },
  );

  worker.on('failed', (job, err) => {
    console.error(
      `[LeadsWorker] delivery for lead ${job?.data?.leadId} failed (attempt ${job?.attemptsMade}):`,
      err.message,
    );
  });

  return worker;
}
