jest.mock('../../config/prisma', () => ({
  prisma: {
    listing: { findUnique: jest.fn() },
    lead: { create: jest.fn() },
    notification: { create: jest.fn() },
  },
}));

jest.mock('../../queues/leads.queue', () => ({
  enqueueLeadDelivery: jest.fn().mockResolvedValue(undefined),
}));

import { prisma } from '../../config/prisma';
import { enqueueLeadDelivery } from '../../queues/leads.queue';
import { createLead } from './leads.service';
import type { CreateLeadInput } from './leads.schemas';

const anyPrisma = prisma as unknown as {
  listing: { findUnique: jest.Mock };
  lead: { create: jest.Mock };
  notification: { create: jest.Mock };
};

const input: CreateLeadInput = {
  listingId: 'listing_1',
  kind: 'enquiry',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  message: 'I would like to arrange a viewing this weekend.',
  source: 'web',
};

describe('createLead', () => {
  beforeEach(() => {
    anyPrisma.listing.findUnique.mockResolvedValue({
      id: 'listing_1',
      hostId: 'agent_1',
      status: 'published',
      title: 'Sunny 2-bed',
    });
    anyPrisma.lead.create.mockResolvedValue({ id: 'lead_1' });
    anyPrisma.notification.create.mockResolvedValue({});
  });

  it('drops honeypot submissions without touching the DB', async () => {
    const result = await createLead({ ...input, website: 'http://spam' }, {});
    expect(result.dropped).toBe(true);
    expect(anyPrisma.lead.create).not.toHaveBeenCalled();
    expect(enqueueLeadDelivery).not.toHaveBeenCalled();
  });

  it('writes the lead, notifies the agent, and enqueues delivery', async () => {
    const result = await createLead(input, { seekerId: 'seeker_1', ipAddress: '1.2.3.4' });

    expect(result).toEqual({ id: 'lead_1', dropped: false });

    expect(anyPrisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing_1',
          agentId: 'agent_1',
          seekerId: 'seeker_1',
          ipAddress: '1.2.3.4',
        }),
      }),
    );
    expect(anyPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'agent_1', type: 'new_lead' }) }),
    );
    expect(enqueueLeadDelivery).toHaveBeenCalledWith('lead_1');
  });

  it('rejects an enquiry on a non-existent listing', async () => {
    anyPrisma.listing.findUnique.mockResolvedValue(null);
    await expect(createLead(input, {})).rejects.toMatchObject({ statusCode: 404 });
    expect(anyPrisma.lead.create).not.toHaveBeenCalled();
  });

  it('rejects an enquiry on an unpublished listing', async () => {
    anyPrisma.listing.findUnique.mockResolvedValue({
      id: 'listing_1',
      hostId: 'agent_1',
      status: 'draft',
      title: 'Draft',
    });
    await expect(createLead(input, {})).rejects.toMatchObject({ statusCode: 400 });
    expect(anyPrisma.lead.create).not.toHaveBeenCalled();
  });
});
