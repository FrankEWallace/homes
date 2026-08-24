# Real Estate Marketplace — System Design

> Status: **Living document — v1 design in progress**
> Segment (Blueprint): Public listings marketplace (PORTAL/ECOMMERCE hybrid)
> Last updated: 2026-08-18

---

## 1. Product Definition

A **public listings marketplace** at **national scale** — Zillow / Rightmove class. Property
seekers (buyers & renters) search and discover listings; agents publish and manage listings and
receive leads. Search-heavy, media-heavy, and SEO-critical.

**Design target:** millions of active listings, millions of daily visitors, heavy search/media
load, traffic spikes.

---

## 2. Scope

### v1 — In
- Seeker search + map, filters, faceted refinement, sorting
- Listing detail (gallery, tour/video, floor plans, map, price history)
- Favorites, saved searches + email/push alerts
- Lead / enquiry capture and agent contact
- Seeker & agent accounts (auth + roles)
- **Free** agent listing management (create/edit/publish/media, status)
- Agent lead inbox + basic listing analytics

### v1 — Out (deferred)
- Billing / subscriptions / paid placement / featured listings
- MLS / RESO feed ingestion (v1 = manual + CSV/API only)
- Heavy moderation / admin plane
- Mortgage integrations, price estimates, recommendations

---

## 3. Functional Requirements

### A. Property seekers (public)
| # | Requirement |
|---|---|
| F1 | Search by location (map + text) with filters: price, beds/baths, type, buy/rent, area, amenities |
| F2 | Faceted refinement + sorting; map-driven "search as I move" |
| F3 | Listing detail: gallery, tour/video, floor plans, description, price history, map, nearby amenities |
| F4 | Contact agent / request viewing / enquiry (lead capture) |
| F5 | Accounts: favorites, saved searches, email/push alerts on new matches |
| F6 | Mortgage / affordability calculator *(deferred)* |
| F7 | Share listing, recently viewed, similar listings *(recommendations deferred)* |

### B. Agents / agencies (back-office)
| # | Requirement |
|---|---|
| F8 | Create / edit / publish / expire listings, upload media, set status |
| F9 | Bulk import via feeds (MLS/RESO/CSV) + API *(feeds deferred; CSV/API v1)* |
| F10 | Receive & manage leads (inbox, assignment, status), respond |
| F11 | Agency profile, branch/team management, per-agent listings |
| F12 | Listing analytics: views, enquiries, saved counts |
| F13 | Subscription / quota tiers *(deferred)* |

### C. Admin / platform
| # | Requirement |
|---|---|
| F14 | Moderation, fraud/duplicate detection *(light in v1)* |
| F15 | Taxonomy management (locations, types, amenities) |
| F16 | User/agency management, RBAC, billing oversight *(billing deferred)* |
| F17 | Content/SEO management (per-city/neighborhood landing pages) |

### D. Cross-cutting
| # | Requirement |
|---|---|
| F18 | Ingestion: normalize, dedupe, geocode, validate incoming listings |
| F19 | Search index kept in sync with source of truth |
| F20 | Notification engine (email/SMS/push) for alerts + lead delivery |
| F21 | SEO surface: server-rendered indexable pages, sitemaps, structured data |

---

## 4. Non-Functional Requirements

| Category | Target |
|---|---|
| **Performance** | Search p95 < 300 ms; listing LCP < 2.5 s (CWV "good"); instant map pan/filter |
| **Scalability** | 1M–10M+ listings; millions of daily visitors; horizontal scale on every read tier |
| **Availability** | 99.9% public site; read path degrades gracefully if back-office/ingestion is down |
| **SEO / crawlability** | Every listing + location page SSR/ISR, canonical URLs, JSON-LD (`RealEstateListing`), fresh sitemaps |
| **Data freshness** | New/changed listing searchable within minutes; sold/withdrawn removed fast |
| **Security & privacy** | Lead PII protected; RBAC + tenant isolation between agencies; never trust the client (Blueprint §11) |
| **Compliance** | GDPR/CCPA (consent, deletion); Fair Housing (no discriminatory targeting/filtering) |
| **Observability** | Tracing on search + ingestion; alerts on index lag, feed failures, lead-delivery failures |
| **Cost efficiency** | Media + search dominate; aggressive CDN/caching, tiered storage, owned infra at scale (§6) |
| **Accessibility / i18n** | WCAG AA; currency/units/locale ready for multi-region |

---

## 5. Architecture Principles

1. **Portability over provider lock-in ("own Supabase" doctrine).** App code depends only on
   **open, portable primitives** — Postgres wire protocol, S3 API, standard JWT, Redis protocol,
   containers. Managed providers are used in v1 for speed; the same open-source software is
   self-hosted at scale for cost control. Provider swap = connection string + adapter change, not
   a rewrite.
2. **Service boundary / repository layer.** App never calls a proprietary provider SDK directly.
   All data access goes through our own API / repository layer — this layer *is* our backend, and
   becomes self-hostable at scale.
3. **Decouple planes.** Public read path (CDN + static + search) is independent of the
   write/back-office plane so the marketplace stays up under partial failure.
4. **Derived data is disposable.** Search index, caches, and static pages are rebuildable
   projections of the Postgres source of truth, kept in sync by events / on-demand revalidation.
5. **Mobile-first, tokens-only UI** per Blueprint (no arbitrary pixel values, ≤3 type sizes/screen).

---

## 6. Core System Needs → How We Meet Them

| Core need | v1 approach | Graduates to (at scale, owned) |
|---|---|---|
| **Geo + faceted search** | Postgres + PostGIS + full-text (`tsvector`/trigram) via our API | Self-hosted Typesense / OpenSearch |
| **Media at scale** | S3-compatible storage + `next/image` transforms | Self-hosted MinIO/Garage + Cloudflare CDN |
| **SEO page rendering** | Next.js 16 App Router — Cache Components (PPR / `use cache`) + ISR for listing & city pages; JSON-LD; sitemaps | Same, more edge caching; optionally self-hosted Node |
| **Freshness** | On listing write → `revalidateTag` (on-demand ISR) + index upsert | Event bus / CDC fan-out |
| **Source of truth** | Postgres + PostGIS, RLS for tenant isolation | Self-hosted Postgres + read replicas |
| **Auth & roles** | Standard JWT auth (GoTrue-compatible), seeker/agent roles | Self-hosted GoTrue / our own on same DB |
| **Lead delivery** | Leads table → worker/Edge Function → email (Resend) with retry | Queue + DLQ, CRM webhooks |
| **Saved-search alerts** | Scheduled job matching new listings → notifications | Percolator-style reverse matching |
| **Availability under spikes** | Vercel edge/CDN + static generation; managed DB HA | Owned autoscaling compute, multi-AZ |

### The portable-primitive → provider map

| Layer | Portable primitive (app depends on) | v1 (managed) | At scale (owned) |
|---|---|---|---|
| Database | Postgres + PostGIS wire protocol | Supabase / Neon | Self-hosted Postgres |
| Auth | Standard JWT + Postgres rows | Supabase Auth (GoTrue) | Self-hosted GoTrue / own |
| Storage | S3 API | Supabase Storage / R2 | Self-hosted MinIO / Garage |
| Search | Postgres FTS → Typesense/OpenSearch | Postgres | Self-hosted engine |
| Cache/Queue | Redis/Valkey protocol | Managed | Self-hosted Valkey |
| CDN/media | Standard HTTP CDN | Vercel / Cloudflare | Cloudflare |

---

## 7. Tech Stack & Reuse

**Web tier:** Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui (Radix/Base UI) ·
Zustand · react-hook-form + Zod · TanStack Table · Recharts · React Compiler.

**Reuse base — `studio-admin` (nextdashboard):** a UI-only template (no backend/DB). We lift the
design system and back-office screens; we build the public marketplace surface new.

| From studio-admin | Reuse for |
|---|---|
| `components/ui/*`, Tailwind v4 preset, theming | Design system (public + back-office) |
| `dashboard/` shell, sidebar, `users`, `roles`, `crm` | Agent back-office |
| `auth/v1`, `auth/v2` | Seeker + agent auth UI (wire to real backend) |
| TanStack data-table, kanban, analytics charts | Listing tables, lead pipeline, analytics |
| `calendar` | Viewing scheduling (later) |

**Build new:** public search + map, listing cards, listing detail/gallery, saved searches, lead forms.

---

## 8. App Structure Decision

**Single Next.js app with route groups** for v1 (not a monorepo).

- `(public)` — marketplace routes (own layout, seeker auth, SEO/ISR)
- `(agent)` — back-office routes (own layout, agent auth, dashboard shell)
- Shared `components/`, `lib/`, and a `server/`/`api` data-access layer (the service boundary from §5).

Monorepo split is deferred until a separate team owns the back-office or release cadences diverge.
Starting single does not foreclose the split.

---

## 9. Open Questions / Next Steps

- [ ] Confirm v1 managed provider for the portable primitives (Supabase vs Neon+GoTrue+R2)
- [ ] High-level architecture diagram (components + data flow)
- [ ] Data model (listings, media, agencies, agents, users, favorites, saved_searches, leads, taxonomy)
- [ ] Search design detail (PostGIS schema, indexes, ranking)
- [ ] URL / routing + SEO scheme (canonical structure for listings & location pages)
- [ ] Ingestion pipeline detail (normalize/geocode/dedupe)

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-18 | Initial design: product def, scope, FR/NFR, principles, core-needs mapping, stack/reuse, structure decision |
