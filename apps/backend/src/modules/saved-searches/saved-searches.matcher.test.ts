import { criteriaToWhere, priceLabel } from './saved-searches.matcher';

const SINCE = new Date('2026-08-01T00:00:00.000Z');

describe('criteriaToWhere', () => {
  it('always scopes to published listings created after the watermark', () => {
    const where = criteriaToWhere({}, SINCE);
    expect(where.status).toBe('published');
    expect(where.createdAt).toEqual({ gt: SINCE });
  });

  it('maps tenure, city (case-insensitive contains), and bed/bath floors', () => {
    const where = criteriaToWhere(
      { tenure: 'rent', city: 'austin', minBeds: 2, minBaths: 1 },
      SINCE,
    );
    expect(where.tenure).toBe('rent');
    expect(where.city).toEqual({ contains: 'austin', mode: 'insensitive' });
    expect(where.bedrooms).toEqual({ gte: 2 });
    expect(where.bathrooms).toEqual({ gte: 1 });
  });

  it('builds a price range from priceMin/priceMax', () => {
    expect(criteriaToWhere({ priceMin: 100, priceMax: 500 }, SINCE).priceAmount).toEqual({
      gte: 100,
      lte: 500,
    });
    expect(criteriaToWhere({ priceMax: 500 }, SINCE).priceAmount).toEqual({ lte: 500 });
    expect(criteriaToWhere({ priceMin: 100 }, SINCE).priceAmount).toEqual({ gte: 100 });
  });

  it('turns a free-text query into an OR over title/description/location', () => {
    const where = criteriaToWhere({ q: 'loft' }, SINCE);
    expect(where.OR).toHaveLength(3);
    expect(where.OR).toContainEqual({ title: { contains: 'loft', mode: 'insensitive' } });
  });

  it('omits filters that are not set', () => {
    const where = criteriaToWhere({ tenure: 'sale' }, SINCE);
    expect(where.city).toBeUndefined();
    expect(where.priceAmount).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });
});

describe('priceLabel', () => {
  it('formats a sale price with no rent period', () => {
    expect(priceLabel(720000, 'USD', null)).toBe('$720,000');
  });

  it('appends the rent period for rentals', () => {
    expect(priceLabel(3200, 'USD', 'month')).toBe('$3,200/month');
  });
});
