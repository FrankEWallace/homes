# Load tests (Phase 5)

Validates the public read path against the plan's SLOs: **search p95 < 300 ms**,
**detail p95 < 300 ms**, **< 1% errors** under a sustained spike.

## Prerequisites

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) (`brew install k6`)
- The backend running and reachable, seeded with published listings.

## Run

```bash
# Local
BASE_URL=http://localhost:4000/api/v1 k6 run apps/backend/load-test/search.js

# Any deployed environment
BASE_URL=https://api.your-host.com/api/v1 k6 run apps/backend/load-test/search.js
```

k6 exits non-zero if any threshold fails, so this drops straight into CI as a
gate once a target environment exists.

## What it does

- Mixes representative queries (text, city, tenure+price, map bbox) against
  `GET /listings`.
- Fetches real slugs from `GET /listings/sitemap` so `GET /listings/:slug`
  detail hits aren't 404s.
- Records `search_latency` / `detail_latency` trends and asserts the SLOs.

## Notes

- Seed data (~13 listings) proves the harness works but won't stress the index
  paths. For meaningful numbers, run against a production-sized dataset — see the
  synthetic-data block in `../prisma/sql/explain_search.sql`.
- The backend exposes live percentiles at `GET /metrics` (search + per-route
  p50/p95/p99) and readiness at `GET /health/ready` — watch both during a run.
