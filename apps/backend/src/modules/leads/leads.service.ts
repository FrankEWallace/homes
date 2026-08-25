import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { paginate } from '../../utils/response';
import { enqueueLeadDelivery } from '../../queues/leads.queue';
import type { CreateLeadInput, LeadQueryInput, UpdateLeadStatusInput } from './leads.schemas';

export interface LeadContext {
  seekerId?: string;
  ipAddress?: string;
}

/**
 * Persist a lead and kick off delivery to the listing's agent. The DB write is the
 * source of truth (the agent's inbox); email delivery is queued with retry so a
 * mail-provider hiccup never loses the lead. Honeypot hits are dropped silently.
 */
export async function createLead(input: CreateLeadInput, ctx: LeadContext) {
  // Honeypot: a filled `website` field means a bot. Pretend success, write nothing.
  if (input.website) {
    return { id: 'dropped', dropped: true as const };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    select: { id: true, hostId: true, status: true, title: true },
  });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (listing.status !== 'published') {
    throw new AppError(400, 'This listing is not accepting enquiries');
  }

  const lead = await prisma.lead.create({
    data: {
      listingId: listing.id,
      agentId: listing.hostId,
      seekerId: ctx.seekerId ?? null,
      kind: input.kind,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message,
      preferredAt: input.preferredAt ?? null,
      source: input.source,
      ipAddress: ctx.ipAddress ?? null,
    },
  });

  // In-app notification for the agent (best-effort — never block the lead write).
  await prisma.notification
    .create({
      data: {
        userId: listing.hostId,
        type: 'new_lead',
        title: 'New lead',
        body: `${input.name} enquired about “${listing.title}”`,
        data: { leadId: lead.id, listingId: listing.id },
      },
    })
    .catch((err) => console.error('[leads] notification create failed:', err));

  await enqueueLeadDelivery(lead.id).catch((err) =>
    console.error('[leads] enqueue delivery failed:', err),
  );

  return { id: lead.id, dropped: false as const };
}

/** Paginated lead inbox for an agent, newest first, with optional filters. */
export async function listAgentLeads(agentId: string, query: LeadQueryInput) {
  const where = {
    agentId,
    ...(query.status && { status: query.status }),
    ...(query.kind && { kind: query.kind }),
    ...(query.listingId && { listingId: query.listingId }),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        listing: { select: { id: true, title: true, slug: true, city: true, images: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, meta: paginate(query.page, query.limit, total) };
}

/** Status counts for the inbox header tabs. */
export async function getLeadStats(agentId: string) {
  const grouped = await prisma.lead.groupBy({
    by: ['status'],
    where: { agentId },
    _count: { _all: true },
  });
  const counts = { new: 0, contacted: 0, qualified: 0, closed: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;
  return counts;
}

/** Update a lead's status. Only the owning agent may do this. */
export async function updateLeadStatus(
  id: string,
  agentId: string,
  input: UpdateLeadStatusInput,
) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { agentId: true } });
  if (!lead) throw new AppError(404, 'Lead not found');
  if (lead.agentId !== agentId) throw new AppError(403, 'Access denied');

  return prisma.lead.update({ where: { id }, data: { status: input.status } });
}
