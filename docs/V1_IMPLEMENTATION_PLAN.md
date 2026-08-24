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
