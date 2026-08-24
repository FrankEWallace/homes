import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * SearchEngine — the seam that keeps Postgres/PostGIS swappable for
 * Typesense/OpenSearch. Feature code depends on this interface; the concrete
 * engine calls search_listings()/search_listing_facets() via $queryRaw.
 */
export interface SearchParams {
  q?: string;
  tenure?: 'sale' | 'rent';
  type?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc';
  page: number;
  limit: number;
}

export interface ListingCard {
  id: string;
  slug: string;
  title: string;
  tenure: 'sale' | 'rent';
  price: number;
  currency: string;
  rentPeriod: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  city: string | null;
  region: string | null;
  propertyType: string | null;
  isFeatured: boolean;
  lng: number | null;
  lat: number | null;
  primaryPhoto: string | null;
}

export interface SearchFacets {
  total: number;
  tenure: Record<string, number>;
  propertyTypes: Record<string, number>;
  bedrooms: Record<string, number>;
}

export interface SearchResult {
  items: ListingCard[];
  total: number;
  page: number;
  limit: number;
  facets: SearchFacets;
}

export interface SearchEngine {
  search(params: SearchParams): Promise<SearchResult>;
}

type Row = {
  id: string;
  slug: string;
  title: string;
  tenure: string;
  price: Prisma.Decimal | number;
  currency: string;
  rent_period: string | null;
  bedrooms: number | null;
  bathrooms: Prisma.Decimal | number | null;
  area_sqft: Prisma.Decimal | number | null;
  city: string | null;
  region: string | null;
  property_type: string | null;
  is_featured: boolean;
  lng: number | null;
  lat: number | null;
  primary_photo: string | null;
  total_count: bigint | number;
};

const num = (v: Prisma.Decimal | number | null): number | null =>
  v === null ? null : typeof v === 'number' ? v : Number(v);

function toCard(r: Row): ListingCard {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tenure: r.tenure as 'sale' | 'rent',
    price: num(r.price) ?? 0,
    currency: r.currency,
    rentPeriod: r.rent_period,
    bedrooms: r.bedrooms,
    bathrooms: num(r.bathrooms),
    areaSqft: num(r.area_sqft),
    city: r.city,
    region: r.region,
    propertyType: r.property_type,
    isFeatured: r.is_featured,
    lng: r.lng,
    lat: r.lat,
    primaryPhoto: r.primary_photo,
  };
}

export function createPostgresSearchEngine(): SearchEngine {
  return {
    async search(p) {
      const offset = (p.page - 1) * p.limit;
      const tenure = p.tenure ?? null;
      const type = p.type ?? null;
      const city = p.city ?? null;
      const minPrice = p.minPrice ?? null;
      const maxPrice = p.maxPrice ?? null;
      const minBeds = p.minBeds ?? null;
      const minBaths = p.minBaths ?? null;
      const q = p.q ?? null;
      const bbox = p.bbox ?? null;
      const sort = p.sort ?? 'relevance';

      const [rows, facetRows] = await Promise.all([
        prisma.$queryRaw<Row[]>`
          select * from search_listings(
            ${q}::text, ${tenure}::"Tenure", ${type}::text, ${city}::text,
            ${minPrice}::numeric, ${maxPrice}::numeric, ${minBeds}::int, ${minBaths}::numeric,
            ${bbox}::float8[], ${sort}::text, ${p.limit}::int, ${offset}::int
          )`,
        prisma.$queryRaw<{ facets: SearchFacets }[]>`
          select search_listing_facets(
            ${q}::text, ${tenure}::"Tenure", ${type}::text, ${city}::text,
            ${minPrice}::numeric, ${maxPrice}::numeric, ${minBeds}::int, ${minBaths}::numeric,
            ${bbox}::float8[]
          ) as facets`,
      ]);

      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const facets = facetRows[0]?.facets ?? {
        total: 0,
        tenure: {},
        propertyTypes: {},
        bedrooms: {},
      };

      return {
        items: rows.map(toCard),
        total,
        page: p.page,
        limit: p.limit,
        facets,
      };
    },
  };
}

export const searchEngine: SearchEngine = createPostgresSearchEngine();
