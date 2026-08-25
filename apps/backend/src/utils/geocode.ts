/**
 * Best-effort forward geocoding via OpenStreetMap Nominatim (keyless). Used to
 * fill a listing's latitude/longitude from its address when the agent doesn't
 * supply coordinates, so the listing shows on the map + geo search. Never throws:
 * a failure just leaves coords null (the listing still saves).
 *
 * Nominatim usage policy requires a descriptive User-Agent and modest rate; set
 * NOMINATIM_URL to a self-hosted instance for production volume.
 */
export interface GeocodeParts {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

const BASE = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.GEOCODER_USER_AGENT ?? 'HomesMarketplace/1.0';

export async function geocodeAddress(parts: GeocodeParts): Promise<{ lat: number; lng: number } | null> {
  const q = [parts.address, parts.city, parts.region, parts.postalCode, parts.country]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(', ');
  if (!q) return null;

  const url = `${BASE}/search?format=json&limit=1&q=${encodeURIComponent(q)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const hit = data[0];
    if (!hit) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn('[geocode] lookup failed:', (err as Error).message);
    return null;
  }
}
