# Real Estate Marketplace — v1 Implementation Plan

> Companion to [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
> Status: **Plan — ready to execute**
> Last updated: 2026-08-18

---

## 0. How we build

- **Vertical slices, not horizontal layers.** Each phase ships an end-to-end usable thing
  (DB → API → UI), so we always have something demoable and never a half-built layer cake.
- **Portability seam is law.** Feature code calls our own `server/` data-access layer
  (repositories + service functions), never the Supabase SDK directly. One `db/`, `auth/`,
  `storage/` adapter module wraps the provider. Swapping to owned infra later touches only those
  adapters. (Principle §04.1–2 of the design.)
- **Definition of Done (every feature):** typed (Zod at the edge), RLS/authz enforced in the
  data layer (never trust the client), mobile-first UI using Blueprint tokens, loading + empty +
  error states, and a happy-path test.
- **v1 provider:** Supabase (Postgres 16 + PostGIS, Auth/GoTrue, Storage/S3). Behind our adapters.
- **Reuse base:** `studio-admin` design system + back-office screens; public surface built new.

### Cross-cutting workstreams (run continuously, not a phase)
| Stream | What |
|---|---|
| **Design system** | Port studio-admin `components/ui`, Tailwind v4 preset, theming into the app once (Phase 1), then reuse |
| **CI/CD** | Vercel preview deploys per PR; lint (Biome) + typecheck + test gates; DB migrations in CI |
| **Security** | RLS policies reviewed per table; `/vibe-security` before launch (Blueprint mandate) |
| **Testing** | Vitest (units/services) + Playwright (critical flows: search, lead submit, listing publish) |
| **Observability** | Structured logging + tracing wired from Phase 1; dashboards for search latency, lead delivery, index lag |

---

## Phase 1 — Foundations & data core  *(de-risks everything)*

**Goal:** the skeleton app, the schema, and search working against seed data.

### Tasks
1. **Scaffold app** — Next.js 16 (App Router), TypeScript, Tailwind v4, Biome, React Compiler. Route groups `(public)` and `(agent)` with separate layouts.
2. **Port design system** from studio-admin — `components/ui`, theme tokens (Blueprint-compliant), fonts, `next-themes`.
3. **Provision Supabase** (dev + prod projects) — env via Vercel; enable PostGIS.
4. **Data-access layer** — `server/db` (connection), `server/repositories/*`, `server/services/*`. This is the portability seam. Zod schemas for all entities.
5. **Schema + migrations** (source of truth):
   - `agencies`, `agents` (+ roles), `users` (seekers)
   - `listings` (+ `geography(Point)`, status, tenure buy/rent, price, attrs), `listing_media`, `listing_price_history`
   - `taxonomy`: `locations` (hierarchical + PostGIS boundaries), `property_types`, `amenities`
   - `favorites`, `saved_searches`, `leads`
   - RLS policies: agency tenant isolation, lead PII lockdown, public read on published listings only
6. **Search v1** — PostGIS spatial indexes (GiST) + `tsvector` full-text + trigram; a `search_listings()` service (bbox + filters + facets + ranking + pagination).
7. **Seed data** — synthetic listings across a few cities so search/UI are testable.

**Exit criteria:** `search_listings()` returns correct, ranked, faceted results by map bounds + filters against seed data; migrations run in CI; design tokens render.

---

## Phase 2 — Public seeker surface  *(the marketplace people see)*

**Goal:** anonymous users can search, browse, and view listings — SEO-ready.

### Tasks
1. **Search results page** — map + list, filter panel (price, beds/baths, type, buy/rent, amenities), sort, "search as I move the map", faceted counts, pagination. Map via MapLibre/Mapbox (client), results via our search service.
2. **Listing detail page** — gallery, floor plans, description, price history, map, nearby amenities, agent contact block. Server-rendered.
3. **Media handling** — upload/derivative pipeline stub + `next/image` responsive delivery from Supabase Storage (S3 API through our adapter).
4. **Home + location landing pages** — per-city/neighborhood pages generated from `locations` taxonomy (SEO surface, F17).
5. **SEO baseline** — canonical URLs, JSON-LD `RealEstateListing`, metadata, sitemap route, robots. ISR / Cache Components for listing + location pages with on-demand `revalidateTag` on write.

**Exit criteria:** a fresh visitor can find a listing via search or a city page and view its full detail; pages are server-rendered, indexable, and hit CWV "good" on a seed listing.

---

## Phase 3 — Seeker accounts & leads  *(engagement + the revenue signal)*

**Goal:** seekers create accounts and generate leads; agents' inboxes fill.

### Tasks
1. **Seeker auth** — Supabase Auth via our `auth/` adapter; sign up / in / out, session, `(public)` middleware.
2. **Favorites** (F5) — save/unsave, "my favorites" page.
3. **Saved searches + alerts** (F5) — persist search criteria; scheduled matcher (Supabase cron / Vercel cron) runs new listings against saved searches → email via Resend.
4. **Lead capture** (F4) — enquiry/contact/viewing-request forms with anti-spam + rate limiting; transactional write to `leads`, then enqueue delivery (worker/Edge Function) to the listing's agent with retry.
5. **Notification engine** (F20) — email templates (lead delivery, alert digest); delivery logging + failure alerting.

**Exit criteria:** a seeker signs up, saves a search, favorites a listing, submits an enquiry; the agent receives the lead by email and it appears in the DB; a new matching listing triggers an alert email.

---

## Phase 4 — Agent back-office  *(supply side; heavy studio-admin reuse)*

**Goal:** agents self-serve their listings and leads for free.

### Tasks
1. **Agent auth + onboarding** — agent/agency roles, `(agent)` middleware, agency profile (F11).
2. **Listing management** (F8) — create/edit/publish/expire wizard, media upload (drag-drop, reorder, S3 adapter), status transitions, geocoding on save. Reuse studio-admin form + data-table patterns.
3. **Bulk import** (F9, v1 slice) — CSV upload + validation + the same normalize/geocode/dedupe path as manual entry; optional API endpoint.
4. **Lead inbox** (F10) — list, assign, status, respond; reuse studio-admin CRM/kanban patterns.
5. **Listing analytics** (F12) — views, enquiries, saved counts; reuse Recharts dashboards.
6. **Write → derived-data sync** (F18–F19) — every listing write goes through normalize/geocode/dedupe, upserts the search projection, and fires `revalidateTag` for affected public pages.

**Exit criteria:** an agent registers, publishes a listing (manual + CSV), it appears in public search within minutes, and enquiries land in their inbox.

---

## Phase 5 — SEO, performance & observability hardening

**Goal:** national-scale readiness on the read path.

### Tasks
1. **Search performance** — validate p95 < 300 ms at seed scale; index tuning; cache hot queries. Confirm the seam to graduate to Typesense/OpenSearch is clean (adapter-only).
2. **Rendering/caching** — audit Cache Components/ISR coverage; edge caching; image tiering; CWV pass across templates.
3. **Sitemaps at scale** — sharded/segmented sitemaps for millions of URLs; freshness pings.
4. **Observability** — dashboards + alerts for search latency, index lag, lead-delivery failures, feed errors (F19).
5. **Load test** the public read path (search + listing detail) against spike scenarios.

**Exit criteria:** search + detail pages meet latency/CWV targets under load; alerts fire on injected failures.

---

## Phase 6 — Compliance, security & launch

**Goal:** ship v1.

### Tasks
1. **Security review** — run `/vibe-security` (Blueprint mandate); RLS policy audit; PII access review; rate-limit + anti-spam verification.
2. **Compliance** — GDPR/CCPA consent + data-deletion flow; Fair Housing review of any filtering/targeting logic; cookie/consent handling.
3. **A11y** — WCAG AA pass on public flows.
4. **Admin essentials** (light, F14–F16) — taxonomy management UI, user/agency management, minimal moderation/duplicate flags.
5. **Launch readiness** — runbooks, backups/restore test, rollback plan, production env + domains.

**Exit criteria:** security review clean, compliance flows working, launch checklist green.

---

## Sequencing & dependencies

```
Phase 1 (foundations+data+search)  ─┬─►  Phase 2 (public surface)  ─┬─►  Phase 5 (hardening) ─► Phase 6 (launch)
                                    │                               │
                                    └─►  Phase 3 (accounts+leads) ──┤
                                    │                               │
                                    └─►  Phase 4 (agent back-office)┘
```

- **Phase 1 gates everything** — schema + search + the data-access seam are the foundation.
- **Phases 2, 3, 4 can overlap** once Phase 1 is stable (public surface, seeker accounts, and agent back-office share the data layer but touch different routes/tables).
- **Critical path to a demoable marketplace:** Phase 1 → Phase 2. Leads (3) and supply (4) make it a real two-sided product.

## Risk register

| Risk | Mitigation |
|---|---|
| Postgres search doesn't hold p95 at scale | Seam to Typesense/OpenSearch is adapter-only; validate early in Phase 5, keep the interface engine-agnostic from Phase 1 |
| Provider lock-in creeping into feature code | Enforce the data-access seam in review; no Supabase import outside `server/adapters/*` |
| Media cost/perf at scale | Tiered storage + CDN + derivative-only delivery from day one (Phase 2) |
| Stale listings (top user complaint) | Freshness pipeline (F18–19) built into Phase 4 write path, not bolted on |
| Fair Housing exposure in filtering | Compliance review in Phase 6; keep targeting logic auditable |

---

## Phase 1 progress (2026-08-18)

Done:
- ✅ Scaffolded Next.js 16 app (App Router, TS, Tailwind v4, Biome, React Compiler); route groups `(public)` + `(agent)` with separate layouts. Builds green.
- ✅ Ported design system from `studio-admin` (60 shadcn/ui components, theme tokens, `cn`, presets) — renders live.
- ✅ Data-access seam: `src/server/adapters/supabase.ts` (only Supabase import site), `src/server/search.ts` (`SearchEngine` interface + Postgres engine), Zod schemas in `src/lib/schemas.ts`, typed env in `src/lib/env.ts`.
- ✅ Schema + migrations: `0001_init.sql` (tables, PostGIS/FTS indexes, RLS), `0002_search.sql` (`search_listings` + facets).
- ✅ Seed data (`supabase/seed.sql`) — 2 cities, ~10 listings.
- ✅ Project `CLAUDE.md`, `README.md`, `.env.example`.

Remaining (needs user):
- ⏳ Provision the Supabase project + set env, then `supabase db reset` to apply migrations/seed.
- ⏳ Run `search_listings()` against seed data to confirm exit criteria (ranked/faceted/bbox results).

## Phase 2 progress (2026-08-19)

- ✅ **Design system**: integrated an Airbnb-style token set (Rausch coral accent, Hof/Foggy neutrals, faint canvas, pill radii, DM Sans as the Cereal substitute) as marketplace tokens in the web `globals.css` — public surface only; agent back-office keeps the shadcn look.
- ✅ **Search UI**: `/search` with a client `FilterBar` (location, tenure, beds, max price, sort → URL params), photography-first `ListingCard` (no border/shadow, wishlist heart, featured pill), results grid, pagination.
- ✅ **Listing detail**: `/listing/[slug]` — gallery, price, spec grid, description, location placeholder, sticky agent contact card; SEO `generateMetadata` + `RealEstateListing` JSON-LD.
- ✅ **Seam**: `getListing()` added; shared `listingDetail` + `search` contracts in `@homes/shared`.
- ✅ **Verified live in-browser** (web+backend+PostGIS+Redis): home capsule, search grid (cards with price/beds/baths/sqft), listing detail — all served through the seam.
- ✅ **Repo**: initialized git, pushed to **github.com/FrankEWallace/homes** (private). Push protection caught a hardcoded **Resend API key** in the ToJoin fork (`apps/backend/src/utils/mail.ts`); removed it (now env-only) before the key entered history.
- ✅ **Map view** (2026-08-19): MapLibre GL (keyless CARTO basemap) — split list+map on `/search` with price-pin markers + fit-to-bounds; single-pin map on listing detail.
- ✅ **Media display**: `next/image` with `remotePatterns` (Unsplash/Cloudinary); cards + gallery render real photos when a listing has image URLs. (Agent upload pipeline = Phase 4.)
- ✅ **SEO surface**: `robots.ts`, `sitemap.ts` (static + published listings, resilient fallback), per-city landing pages `/homes/[city]` (SSR/ISR + canonical), canonical on listing detail, "popular cities" internal links on home. Verified: sitemap lists all listings, robots disallows `/dashboard`.
- 🐛 Fixed a contract mismatch surfaced by the sitemap: shared `SearchParams.limit` max was 60 but backend caps at 50 → aligned both to 50.
- **Agent dashboard** (harvested from studio-admin sidebar) + app-wide DM Sans landed alongside.
- **Deferred to Phase 3/4**: favorites/saved-search persistence, real lead capture, agent media upload, "search as I move the map" live refetch.

**Phase 2 is complete.**

## Phase 3 progress (2026-08-24)

Backend:
- ✅ **Data model**: `Lead` (kind/status, denormalised `agentId`, optional `seekerId`,
  `deliveredAt`) + `SavedSearch` (JSON `query`, `notify`, `frequency`, `lastCheckedAt`
  watermark); `LeadKind`/`LeadStatus`/`AlertFrequency` enums; `new_lead` +
  `saved_search_match` notification types; reverse relations. `prisma generate` clean.
- ✅ **Leads module** (`modules/leads/*`): public `POST /leads` — rate-limited (8/10min per
  IP) + honeypot anti-spam, published-listing check, transactional write → agent in-app
  notification → **queued email delivery with retry** (`queues/leads.queue.ts`, 5 attempts
  exp-backoff, idempotent on `deliveredAt`). Agent inbox `GET /leads`, `GET /leads/stats`,
  `PATCH /leads/:id/status` with role + ownership checks.
- ✅ **Saved-searches module** (`modules/saved-searches/*`): CRUD (auth) + a **15-min BullMQ
  matcher** that runs new published listings against each saved search's criteria since its
  watermark → Resend digest + in-app notification, advancing the watermark only on success.
- ✅ **Email templates** (`utils/mail.ts`): lead-notification + saved-search-alert (HTML,
  env-gated no-op when `RESEND_API_KEY` unset). Added `WEB_APP_URL` for links.
- ✅ Wishlist service now returns the shared `ListingCard` contract (web reuse). Backend
  `tsc` clean.

Web:
- ✅ **Seeker auth**: httpOnly-cookie session over the backend JWT (`server/auth.ts`),
  `/login` + `/register` pages + server actions, logout, and a **`proxy.ts`** route guard
  (Next 16 middleware→proxy rename) for `/favorites`, `/saved-searches`, `/account`.
- ✅ **SEO-preserving personalization**: the shared `(public)` layout stays static and
  content pages (home, listing, city) keep ISR — the header account menu and enquiry-form
  prefill hydrate client-side from a `/api/me` route handler instead of `cookies()`. Verified
  by `next build`: `/` static, `/listing/[slug]` + `/homes/[city]` unchanged.
- ✅ **Favorites**: optimistic `WishlistHeart` → `/wishlist/toggle` (auth redirect when
  signed out), `/favorites` page.
- ✅ **Saved searches**: "Save search" on results (captures the URL params), `/saved-searches`
  manage page (per-row alert toggle + delete).
- ✅ **Lead capture**: `EnquiryForm` (contact / viewing-request, honeypot, seeker prefill) →
  `POST /leads`; agent `/dashboard/leads` wired to the real inbox with status updates +
  counts. Web `tsc` + `next build` green.

Hardening (2026-08-24, DB-free):
- ✅ **Shared contracts** — lead + saved-search Zod schemas moved to `@homes/shared`; web seam
  imports them. (Backend still mirrors in zod v3 — full single-source needs a backend
  v3→v4 migration, tracked as follow-up.)
- ✅ **Tests** — Jest config + 29 DB-free tests (schema validation, matcher, mail escaping,
  mocked-Prisma `createLead`).
- ✅ **Loading/error states** — skeletons + error boundaries for the new routes; branded 404.
- ✅ **CI** — `.github/workflows/ci.yml` gates PRs on build + typecheck + tests (lint advisory).

**Exit criteria — VERIFIED LIVE (2026-08-25)** against local Postgres 17 + PostGIS 3.5 + Redis
(`homes_dev`, seeded): seeker login → favorite (wishlist row) → save search → submit enquiry +
viewing request → **agent inbox shows the lead** + `new_lead` in-app notification + email
delivery worker ran (`deliveredAt` set; Resend unset ⇒ logged no-op) → inserted a new matching
Austin listing → **matcher fired** (`processed:1, notified:1`, `saved_search_match` notification,
watermark advanced). Web UI verified in-browser: search renders live results incl. the new
listing; `proxy.ts` guard redirects `/favorites` + `/saved-searches` → `/login`.
- 🐛 **Fixed during verification:** BullMQ rejects custom job ids containing `:` — lead-delivery
  emails failed to enqueue (`jobId: lead:<id>` → `lead-<id>`). Lead row + inbox were unaffected.

Remaining (follow-up):
- ⏳ Set `RESEND_API_KEY` (+ verified domain) for real email delivery; unset = logged no-op.
- ⏳ Backend zod v3→v4 migration for true single-source contracts across the API boundary.
- ↪ Deferred to Phase 4: agent onboarding/auth UI polish, lead assignment/threads, "search as
  I move the map" live refetch, daily-digest batching (only `instant` matcher runs today).

## Phase 4 progress (2026-08-25)

Core (done + verified live):
- ✅ **Agent auth gating** — `proxy.ts` guards `/dashboard` on session; the `(agent)` layout
  enforces agent/admin role (redirects otherwise) and shows the agency name. Backend still
  re-checks role + ownership on every mutation.
- ✅ **Listing management** — agent seam (`getMyListings`/`getMyListing`/`getListingTypes`) +
  server actions (create/update/publish/unpublish/delete). Real `/dashboard/listings` table
  (status badges + row-action menu), shared new/edit form with per-field validation (saves a
  draft; publish from the list). Backend agent CRUD was already in place from the ToJoin port.
- ✅ **Agency profile** — `/dashboard/settings` wired to `PATCH /auth/me` (name, agency, bio).
- **Verified live**: agent login → dashboard lists real listings; create → publish via the agent
  API surfaces in the dashboard **and public search** (PostGIS `geom` trigger populates); delete
  works; guard redirects when signed out. Web `next build` green.
- Note: dropped `revalidateTag` (Next 16 requires a cache profile) — public freshness rides the
  existing 30–60s ISR windows ("within minutes"), matching the exit criterion.

Follow-on slices (done + verified live, 2026-08-25):
- ✅ **Geocoding on save** — keyless OSM Nominatim fills lat/lng from the address on
  create/update/import when coords are absent (verified: `1100 Congress Ave` → real coords).
- ✅ **Listing analytics** (F12) — `GET /listings/analytics` (views/enquiries/saved per listing);
  `/dashboard/analytics` stat tiles + Recharts bar chart (reflects the Phase 3 lead/favorite).
- ✅ **Bulk CSV import** (F9) — quote-aware parser (+tests), per-row validation, (title,city)
  dedupe, geocode, drafts; `/dashboard/listings/import` with a result summary. Verified:
  1 created / 1 duplicate skipped / 1 invalid reported.
- ✅ **Binary media upload** — agent image upload wired to `POST /listings/:id/images`; backend
  gains a **local-disk dev fallback** (served at `/uploads`) so it works without cloud creds,
  R2/Cloudinary in prod. Unified with manual URL entry in the listing form. Verified: PNG upload
  → stored → served 200 → removable.

**Phase 4 exit criteria met:** an agent registers/signs in, publishes a listing (manual **and**
CSV), it appears in public search within the ISR window (geo trigger populated), and enquiries
land in their inbox (Phase 3). Remaining polish: media reorder/drag-drop, moderation gate,
per-listing view tracking increment.

## Phase 5 progress (2026-08-28)

Read-path hardening — implementable tracks done + verified live (backend on
Neon Postgres + Redis, web dev on :3000):

- ✅ **Sitemaps at scale** — `sitemap.ts` now enumerates the **full** published
  catalogue (was capped at 50 and missing city pages). New lightweight backend
  feed `GET /listings/sitemap` (slug + updatedAt projection, paged, 50k cap) →
  web seam `getSitemapListings()` pages until exhausted; adds all `/homes/[city]`
  landing pages via a new `getCities()` seam. Single `/sitemap.xml` preserved
  (robots unchanged); logs a warning instead of silently truncating past the
  50k-URL single-file cap, with the `generateSitemaps()` shard-out path
  documented. **Verified:** `/sitemap.xml` → 21 URLs (3 static + 5 cities + 13
  listings).
- ✅ **Observability** — structured JSON logger (`utils/logger.ts`),
  request-id + timing middleware (`middleware/requestLogger.ts`) feeding an
  in-process metrics registry (`observability/metrics.ts`, p50/p95/p99 per route
  + named op, bounded ring buffer). New `GET /metrics` (live percentiles) and
  `GET /health/ready` (Postgres `select 1` + Redis `ping` with latencies →
  200/503). Search path records a `search_listings` op latency and **warns above
  the 300 ms SLO**. Replaced `morgan` with the structured logger. **Verified
  live:** all three endpoints; `search_listings` op p50/p95 recorded; slow-query
  warn fired (Neon remote latency).
- ✅ **Caching audit** — confirmed public freshness correctly rides fetch-level
  `revalidate` (search 30 s, listing 60 s, city page 300 s route ISR); dashboard
  routes are `force-dynamic`. No gap — deliberately did **not** add a route-level
  `revalidate` to listing detail (would have made it staler than the 60 s fetch).
- ✅ **Search index tuning harness** — `prisma/sql/explain_search.sql`:
  `EXPLAIN (ANALYZE, BUFFERS)` probes for the FTS/bbox/facet/trigram query shapes
  + a transactional synthetic-data generator (index plans only diverge from seq
  scan at scale — noted).
- ✅ **Load test** — k6 script `apps/backend/load-test/search.js` (+README):
  ramping-VU spike over the search + detail endpoints, asserts p95 < 300 ms and
  < 1% errors; discovers real slugs via `/listings/sitemap`. Ready-to-run against
  any `BASE_URL`; drops into CI as a gate.

Deferred (need infra/decisions, not local-verifiable):
- ⏳ **Real p95/CWV numbers under load** — needs a deployed target env; harness is
  ready (`k6 run` + watch `/metrics`).
- ⏳ **Alerting backend + dashboards** — wire `/metrics` + `search.slow`/
  `request.failed` logs to a provider (Vercel/Grafana/OTel exporter). The
  `record*()` + logger surfaces are the seam.
- ⏳ **Backend zod v3→v4** (carried from Phase 3) for single-source contracts.

## Phase 6 progress (2026-08-28)

Security + compliance code (first slice) — done + verified live:

- ✅ **Security audit (manual pass)** — see [SECURITY_AUDIT.md](SECURITY_AUDIT.md).
  Verified lead authz/PII lockdown + listing ownership are enforced server-side.
  Fixed: removed noisy per-request auth `console.log`; pinned `jwt.verify` to
  `HS256`. **Open (needs domains):** the CORS allowlist is still the ToJoin
  fork's — suffix-matches `*.onrender.com`/`*.web.app`/`*.railway.app` with
  credentials; must become an explicit prod-origin allowlist in task 5.
- ✅ **GDPR/CCPA data access + erasure** — backend `GET /auth/me/export`
  (profile + wishlists + saved searches + submitted leads + notifications as a
  JSON download; excludes `passwordHash`/`fcmToken`) and `DELETE /auth/me`
  (password re-auth; transactional delete with cascades; **scrubs PII on the
  seeker's submitted leads** while the lead survives as the agent's record;
  **blocks** agents with live listings → 409). Web: `/account` privacy page
  (download-data link → `/api/me/export` route handler that keeps the httpOnly
  token server-side; two-step delete with password confirm), `deleteAccountAction`.
  **Verified live** on Neon: export redacts credentials; delete happy-path (register
  → lead → delete 200 → re-login 401 → agent inbox lead scrubbed to "Deleted user"
  / redacted email / null phone); guards return 409 (has listings) + 401 (wrong pw).
- ✅ **Cookie/consent** — privacy-preserving banner (essential-only default; sets
  nothing non-essential either way), persisted per-viewer in `localStorage`;
  `/privacy` summary page; footer Privacy + Account links. Verified in-browser.

Deferred (rest of Phase 6):
- ⏳ CORS allowlist rewrite (needs real prod domains — task 5), `/vibe-security`
  run (user-triggered), Fair Housing review of filtering, WCAG AA a11y pass,
  admin essentials (F14–F16), launch readiness (prod env, backups, runbooks).

## Changelog
| Date | Change |
|---|---|
| 2026-08-18 | Initial v1 implementation plan — 6 phases, cross-cutting streams, sequencing, risks |
| 2026-08-18 | Phase 1 executed: app scaffold, design-system harvest, data-access seam, schema + search migrations, seed |
| 2026-08-19 | **Backend pivot → Path A** ([BACKEND_REUSE_ANALYSIS.md](BACKEND_REUSE_ANALYSIS.md)): adopt ToJoin's Express/Prisma backend instead of Supabase. Restructured to pnpm **monorepo** (`apps/web` + `apps/backend` + `packages/shared`); web builds, backend typechecks. |
| 2026-08-19 | Path A **step 1** — stripped 9 transactional modules (bookings, payments, disputes, earnings, promo, waitlist, host, admin, reviews); rewired routes + jobs queue. Backend typechecks. |
| 2026-08-19 | Path A **step 2** — retyped `Listing` for real estate (tenure, beds/baths, area, property type, publish flow) + pruned ~13 transactional Prisma models/enums; rewrote listings module (schemas/service/controller/router), fixed wishlist select. `prisma generate` + whole-workspace `tsc` clean. Interim Prisma search in place (PostGIS swap = step 3). **TODO:** `prisma/seed*.ts` still reference old models — rewrite when DB is provisioned. |
| 2026-08-19 | Path A **step 5 — DONE (Path A complete)** — repointed the web seam to the backend API: shared contracts in `packages/shared` (`listingCardSchema`, `searchParams/Response`), web API client + `searchListings` seam (`apps/web/src/server/*`), removed the Supabase adapter/deps, added a `/search` page. **Verified full stack live in-browser**: `/search?q=austin` → web seam → Express `GET /api/v1/listings` → PostGIS → rendered cards (Postgres + Redis + Next all running). Whole-workspace `tsc` + web build clean. |
| 2026-08-19 | Path A **step 4** — auth adaptation: roles renamed `guest/host → seeker/agent` (enum + middleware + `authorize()` + notifications + swagger + chat labels); `phone` made optional; added OTP-free **email-first register** (`POST /auth/register-email`, seeker/agent, tokens issued immediately) alongside the existing phone/email login. **Verified** vs local DB: register (phone null) → login → JWT role correct; wrong-password + duplicate-email rejected. (Stale listings Swagger JSDoc left as cosmetic debt.) |
| 2026-08-19 | Path A **step 3** — PostGIS search on the Prisma Postgres: `prisma/sql/0001_postgis_search.sql` (geom + FTS columns, GiST/GIN indexes, `search_listings()`/facets on the `"Listing"` table) + `src/search/engine.ts` (`SearchEngine` via `$queryRaw`). Retired the interim Prisma search; added `bbox` map-bounds param. **Verified end-to-end** against local Postgres+PostGIS: `prisma db push` → apply SQL → seed → search (full-text, filters, bbox, facets, draft-exclusion) correct via both psql and the TS engine. Removed stale ToJoin migrations (schema via `db push` for now). |
| 2026-08-28 | **Phase 6 started (security + compliance)** — manual security audit ([SECURITY_AUDIT.md](SECURITY_AUDIT.md); fixed auth log noise + pinned JWT alg; flagged inherited CORS). GDPR data-export (`GET /auth/me/export`) + erasure (`DELETE /auth/me`, password re-auth, lead-PII scrub, agent-with-listings guard); web `/account` + `/privacy` + cookie-consent banner. Verified live on Neon incl. full delete→scrub flow; 35 backend tests green. |
| 2026-08-28 | **Phase 5 executed (read-path hardening)** — sitemaps-at-scale (full catalogue + city pages via new `/listings/sitemap` feed + `getCities()` seam), observability (structured logger, request-id/timing middleware, in-process metrics registry, `/metrics` + `/health/ready`, search-SLO slow-query warn; dropped morgan), caching audit (no gap), EXPLAIN index-tuning harness, and a k6 load-test harness. Verified live on Neon+Redis; 35 backend tests green. |
| 2026-08-24 | **Phase 3 executed** — accounts & leads. Backend: `Lead` + `SavedSearch` models/enums; leads module (rate-limited + honeypot public submit → txn write + notification + retrying email queue; agent inbox); saved-searches module + 15-min BullMQ alert matcher; lead + alert email templates. Web: httpOnly-cookie seeker auth (login/register/logout, `proxy.ts` guard), favorites (optimistic heart + page), saved searches (save + manage), lead capture form, agent inbox wired to real data. Personalization hydrates client-side via `/api/me` so listing/city pages keep ISR. Backend + web `tsc` and `next build` green; live DB verification still gated on provisioning. |
