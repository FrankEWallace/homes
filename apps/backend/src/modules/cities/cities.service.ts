import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

export async function listActiveCities() {
  return prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

// ─── Weather proxy ───────────────────────────────────────────────────────────
// Wraps OpenWeather so the API key stays server-side. Results are cached briefly
// to stay well within free-tier limits and to keep the explore page snappy.

interface WeatherCacheEntry {
  data: unknown;
  expiresAt: number;
}

const WEATHER_TTL_MS = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, WeatherCacheEntry>();

export async function getCityWeather(slug: string) {
  if (!env.OPENWEATHER_API_KEY) {
    throw new AppError(503, 'Weather service is not configured');
  }

  const city = await prisma.city.findUnique({ where: { slug } });
  if (!city) throw new AppError(404, 'City not found');

  const cached = weatherCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city.name,
  )}&appid=${env.OPENWEATHER_API_KEY}&units=metric`;

  const res = await fetch(url);
  if (!res.ok) {
    // Serve stale data on upstream failure rather than erroring the explore page
    if (cached) return cached.data;
    throw new AppError(502, 'Failed to fetch weather data');
  }

  const data = await res.json();
  weatherCache.set(slug, { data, expiresAt: Date.now() + WEATHER_TTL_MS });
  return data;
}
