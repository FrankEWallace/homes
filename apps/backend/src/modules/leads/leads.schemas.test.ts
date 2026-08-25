import { CreateLeadSchema, UpdateLeadStatusSchema } from './leads.schemas';

describe('CreateLeadSchema', () => {
  const base = {
    listingId: 'listing_1',
    name: 'Alex Morgan',
    email: 'alex@example.com',
    message: 'I would like to arrange a viewing this weekend.',
  };

  it('accepts a minimal valid enquiry and defaults kind/source', () => {
    const parsed = CreateLeadSchema.parse(base);
    expect(parsed.kind).toBe('enquiry');
    expect(parsed.source).toBe('web');
  });

  it('rejects an invalid email', () => {
    expect(CreateLeadSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });

  it('rejects a too-short message', () => {
    expect(CreateLeadSchema.safeParse({ ...base, message: 'hi' }).success).toBe(false);
  });

  it('rejects a too-short name', () => {
    expect(CreateLeadSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('accepts a filled honeypot at the schema level (the service drops it)', () => {
    // The honeypot is intentionally NOT rejected here — createLead() silently
    // drops a filled `website` so bots get a fake success, not a 400 that reveals it.
    expect(CreateLeadSchema.safeParse({ ...base, website: 'http://spam' }).success).toBe(true);
    expect(CreateLeadSchema.safeParse({ ...base, website: '' }).success).toBe(true);
  });

  it('coerces preferredAt into a Date', () => {
    const parsed = CreateLeadSchema.parse({
      ...base,
      kind: 'viewing_request',
      preferredAt: '2026-09-01T15:00:00.000Z',
    });
    expect(parsed.preferredAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown kind', () => {
    expect(CreateLeadSchema.safeParse({ ...base, kind: 'spam' }).success).toBe(false);
  });
});

describe('UpdateLeadStatusSchema', () => {
  it('accepts known statuses and rejects others', () => {
    expect(UpdateLeadStatusSchema.safeParse({ status: 'contacted' }).success).toBe(true);
    expect(UpdateLeadStatusSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});
