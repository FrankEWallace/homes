// Phase 5 — public read-path load test (k6).
//
// Exercises the two hot public endpoints — faceted search and listing detail —
// and asserts the plan's SLOs: search p95 < 300 ms, detail p95 < 300 ms, and a
// <1% error rate. Point it at any environment; nothing here is local-only.
//
// Run:
//   BASE_URL=http://localhost:4000/api/v1 k6 run apps/backend/load-test/search.js
//   BASE_URL=https://api.example.com/api/v1 k6 run apps/backend/load-test/search.js
//
// Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api/v1';

const searchLatency = new Trend('search_latency', true);
const detailLatency = new Trend('detail_latency', true);

// Representative query mix — text, city, tenure, price, map bounds.
const QUERIES = [
  '?sort=newest&page=1&limit=24',
  '?search=beachfront&sort=relevance&limit=24',
  '?city=Dar%20es%20Salaam&tenure=sale&limit=24',
  '?tenure=rent&priceMax=2000000&minBeds=2&limit=24',
  '?bbox=38.9,-7.0,39.5,-6.6&limit=24',
];

export const options = {
  scenarios: {
    // Ramp to a sustained spike, then back down.
    read_path: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% errors
    search_latency: ['p(95)<300'], // plan SLO
    detail_latency: ['p(95)<300'],
  },
};

// Discover a real slug once per VU so detail hits aren't 404s.
function pickSlug() {
  const res = http.get(`${BASE_URL}/listings/sitemap?limit=50`);
  try {
    const body = res.json();
    const items = (body && body.data) || [];
    if (items.length) return items[Math.floor(Math.random() * items.length)].slug;
  } catch (_e) {
    // fall through
  }
  return null;
}

export default function () {
  // 1. Faceted search
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const searchRes = http.get(`${BASE_URL}/listings${q}`, { tags: { name: 'search' } });
  searchLatency.add(searchRes.timings.duration);
  check(searchRes, {
    'search 200': (r) => r.status === 200,
    'search has data': (r) => {
      try {
        return Array.isArray(r.json('data'));
      } catch (_e) {
        return false;
      }
    },
  });

  // 2. Listing detail
  const slug = pickSlug();
  if (slug) {
    const detailRes = http.get(`${BASE_URL}/listings/${slug}`, { tags: { name: 'detail' } });
    detailLatency.add(detailRes.timings.duration);
    check(detailRes, { 'detail 200': (r) => r.status === 200 });
  }

  sleep(1);
}
