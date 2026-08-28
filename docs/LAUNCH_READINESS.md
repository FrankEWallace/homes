# Launch readiness runbook — v1

> Phase 6, task 5. The checklist to take Homes from "feature-complete" to
> "in production." Companion to [SECURITY_AUDIT.md](SECURITY_AUDIT.md) and
> [V1_IMPLEMENTATION_PLAN.md](V1_IMPLEMENTATION_PLAN.md).

## 1. What ships where

| Component | Runtime | Notes |
|-----------|---------|-------|
| `apps/web` | Next.js 16 (Node) | Public marketplace (SSR/ISR) + agent/admin dashboard. Talks only to the backend API. |
| `apps/backend` | Express + Prisma | REST API at `/api/v1`; also runs the BullMQ workers (lead delivery, saved-search matcher). |
| Postgres + PostGIS | Neon (managed) v1 | Source of truth. PostGIS `geom`/`search_tsv` are added by raw SQL (see §3). |
| Redis | managed (Upstash/other) | BullMQ queues + Socket.io. |
| Media | R2 or Cloudinary | Prod object storage; local-disk fallback is dev-only. |
| Email | Resend | Lead notifications + saved-search digests. |

Two long-lived processes: the API (`node dist/server.js`) and — if you split
them — the worker. In v1 they run in-process; scale the worker out later.

## 2. Environment variables

### Backend (`apps/backend`)

**Required (no default — boot fails without them):**
- `API_BASE_URL` — public URL of the API, e.g. `https://api.homes.example`
- `DATABASE_URL` — Neon Postgres connection string (pooled)
- `REDIS_URL` — managed Redis URL
- `JWT_ACCESS_SECRET` — ≥ 32 random chars
- `JWT_REFRESH_SECRET` — ≥ 32 random chars, different from the access secret

**Required for correct behaviour in prod:**
- `NODE_ENV=production` — enables prod logging, hides error stacks, disables local media/uploads
- `ALLOWED_ORIGINS` — comma-separated **exact** web origins, e.g. `https://homes.example`
  (CORS is exact-match; there is no wildcard/suffix matching — set this or the web app can't call the API)
- `RESEND_API_KEY` + `EMAIL_FROM` (a verified sender) — without these, email is a logged no-op
- Media: **either** `CLOUDINARY_URL` **or** the `R2_*` set (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_CDN_URL`)

**Optional:** `SENTRY_DSN`, `PORT` (default 3000), rate-limit overrides, `OPENWEATHER_API_KEY`, map keys, `TEXTIFY_*` (SMS), `FCM_*` (push).

**Leave unset:** `PAYME_*` — payments were removed from the fork; no billing surface in v1.

### Web (`apps/web`)
- `API_BASE_URL` — same API URL as above (server-side fetches)
- `NEXT_PUBLIC_SITE_URL` — public site origin, e.g. `https://homes.example` (canonicals, sitemap, metadata)

Generate secrets with `openssl rand -base64 48`. Never commit real values — only
`.env.example` (placeholders) is tracked.

## 3. Database — migrate, PostGIS, seed

**Order matters.** Prisma does not know about the PostGIS columns, so a bare
`prisma db push` will try to DROP them. Apply schema, then the PostGIS SQL:

```bash
# 1. Prisma schema → DB (first provision only; use migrate deploy in CI thereafter)
pnpm --filter @homes/backend exec prisma db push

# 2. PostGIS: geom + search_tsv + search_listings()/facets + indexes + triggers
psql "$DATABASE_URL" -f apps/backend/prisma/sql/0001_postgis_search.sql

# 3. (optional) seed reference/demo data
pnpm --filter @homes/backend db:seed
```

Enum-only changes (like the `suspended` status) must be applied with
`ALTER TYPE … ADD VALUE`, **not** `db push`, to avoid the geom/tsv drop. When you
adopt Prisma migrations, generate the migration and hand-edit it to add the
PostGIS SQL so CI applies everything atomically.

## 4. Pre-deploy checklist

- [ ] `pnpm -r typecheck` green (web + backend)
- [ ] `pnpm --filter @homes/backend test` green
- [ ] `pnpm --filter @homes/web build` green
- [ ] `/vibe-security` gate clean — re-run after any auth/CORS change ([SECURITY_AUDIT.md](SECURITY_AUDIT.md))
- [ ] `pnpm audit` reviewed; no unpatched criticals
- [ ] `ALLOWED_ORIGINS` set to the real web origin(s)
- [ ] Fresh JWT secrets (not dev values); `NODE_ENV=production`
- [ ] Resend domain verified; `EMAIL_FROM` on that domain
- [ ] Media provider creds set (R2/Cloudinary)
- [ ] DB migrated + PostGIS SQL applied (§3); a smoke search returns rows
- [ ] Backups enabled + a restore rehearsed (§7)

## 5. Deploy

1. Provision Postgres (Neon), Redis, media bucket; set env on both apps.
2. Run the DB steps in §3 against the prod database.
3. Deploy `apps/backend` (build: `pnpm --filter @homes/backend build`, start: `node dist/server.js`).
4. Deploy `apps/web` (build: `pnpm --filter @homes/web build`, start: `next start`).
5. Point DNS; issue TLS. Confirm `NEXT_PUBLIC_SITE_URL` / `API_BASE_URL` match the live hosts.

## 6. Post-deploy smoke tests

```bash
API=https://api.homes.example/api/v1
curl -s $API/health                     # { success: true }
curl -s $API/health/ready               # database + redis both ok:true, else 503
curl -s "$API/listings?limit=3"         # returns seeded/real listings
curl -s $API/metrics                    # p50/p95 per route + search_listings op
```
Then in a browser: load `/`, run a search, open a listing, submit an enquiry,
confirm the agent inbox + email. Sign in as admin → `/dashboard/moderation`
loads. Verify `robots.txt` and `/sitemap.xml`.

## 7. Backups, restore & rollback

- **Backups:** Neon keeps continuous history — confirm PITR retention is enabled
  and set to an acceptable window. Snapshot before every migration.
- **Restore drill (do once before launch):** branch the Neon project (or restore
  to a throwaway), point a staging API at it, run the §6 smoke tests. Record the
  wall-clock time to restore.
- **App rollback:** redeploy the previous build/image (both apps are stateless).
  Keep the last known-good build tagged.
- **DB rollback:** additive migrations only where possible. For a bad migration,
  restore from the pre-migration snapshot. Never `--accept-data-loss` in prod
  (it would drop the PostGIS columns).

## 8. Observability (wired in Phase 5)

- `GET /metrics` — per-route + `search_listings` p50/p95/p99, error counts.
- `GET /health/ready` — DB + Redis probes (use as the load-balancer readiness check).
- Structured JSON logs; `search.slow` warns when a search crosses the 300 ms SLO;
  `request.failed` on 5xx. Ship stdout to your log aggregator.
- **To wire alerts:** point a collector at `/metrics` and alert on p95 > 300 ms,
  5xx rate, and `/health/ready` failures. (Provider not yet chosen — see below.)

## 9. Known deferrals (not blockers, track post-launch)

- Alerting backend / dashboards for the `/metrics` + logs above (pick a provider).
- Load test at spike scale for real p95 numbers (`apps/backend/load-test/` is ready).
- Backend zod v3→v4 for single-source contracts across the API boundary.
- A non-discrimination policy at agent onboarding + tuning the moderation heuristics.
- Split the BullMQ worker into its own process as volume grows.
