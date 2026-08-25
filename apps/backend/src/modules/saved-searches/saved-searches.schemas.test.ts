import {
  CreateSavedSearchSchema,
  UpdateSavedSearchSchema,
  SavedSearchCriteriaSchema,
} from './saved-searches.schemas';

describe('SavedSearchCriteriaSchema', () => {
  it('accepts an empty criteria object', () => {
    expect(SavedSearchCriteriaSchema.safeParse({}).success).toBe(true);
  });

  it('coerces numeric strings for price/beds', () => {
    const parsed = SavedSearchCriteriaSchema.parse({ priceMax: '500000', minBeds: '2' });
    expect(parsed.priceMax).toBe(500000);
    expect(parsed.minBeds).toBe(2);
  });

  it('rejects an unknown tenure', () => {
    expect(SavedSearchCriteriaSchema.safeParse({ tenure: 'lease' }).success).toBe(false);
  });
});

describe('CreateSavedSearchSchema', () => {
  it('defaults notify=true and frequency=instant', () => {
    const parsed = CreateSavedSearchSchema.parse({ name: 'Austin rentals', query: { city: 'Austin' } });
    expect(parsed.notify).toBe(true);
    expect(parsed.frequency).toBe('instant');
  });

  it('requires a name', () => {
    expect(CreateSavedSearchSchema.safeParse({ name: '', query: {} }).success).toBe(false);
  });
});

describe('UpdateSavedSearchSchema', () => {
  it('rejects an empty update', () => {
    expect(UpdateSavedSearchSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a single-field update', () => {
    expect(UpdateSavedSearchSchema.safeParse({ notify: false }).success).toBe(true);
  });
});
