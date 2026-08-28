# Real Estate Marketplace — Project Rules

> Inherits the Blueprint framework from `/Applications/MAMP/htdocs/CLAUDE.md`.
> Read `/Applications/MAMP/htdocs/blueprint/SKILLS.md` before design/technical decisions.
> Scaffold guidance from create-next-app lives in `@AGENTS.md`.

## Segment

**`[PORTAL]`** (agent back-office) + public listings marketplace surface.
Public pages follow marketplace/`[ECOMMERCE]` patterns; the agent dashboard follows
`[PORTAL]` SP-1 (dark sidebar) patterns.

## What this is

A national-scale public **listings marketplace** (Zillow/Rightmove class). See:
- [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) — requirements + architecture
- [docs/V1_IMPLEMENTATION_PLAN.md](docs/V1_IMPLEMENTATION_PLAN.md) — the 6-phase build plan

## Stack (Path A — owned backend, monorepo)

**pnpm monorepo.** Frontend: Next.js 16 (App Router) · React 19 · TS · Tailwind v4 · shadcn/ui
(harvested from `studio-admin`) · Zustand · react-hook-form + Zod · TanStack Table · Recharts.
**Backend: Express + Prisma + Postgres** (adapted from an existing Express/Prisma marketplace
backend template) · Redis/BullMQ (queues) · Socket.io (realtime) · S3/Cloudinary (media) ·
Resend (email) · JWT auth. Postgres v1: Neon (managed) → self-hosted at scale.

## Non-negotiable architecture rules (project-specific)

1. **Portability seam is law.** Web feature code (pages, components) MUST go through the web
   data-access layer in `apps/web/src/server/*`. That layer calls the backend API (typed client
   from `@homes/shared`); no direct DB access from the web app.
2. **Search goes through the `SearchEngine` interface** — PostGIS (`search_listings`) via Prisma
   `$queryRaw` in the backend, so Postgres→Typesense/OpenSearch stays an adapter swap.
3. **Never trust the client.** Enforce authz in the backend (JWT + ownership checks in services),
   not the UI.
4. **Route groups:** `(public)` = marketplace, `(agent)` = back-office. Keep concerns separate.
5. **Shared contracts** (request/response Zod schemas, DTOs) live in `packages/shared` so web and
   backend validate against one source of truth.

## Layout

```
apps/web                Next.js frontend
  src/app/(public)      public marketplace routes (SEO/ISR)
  src/app/(agent)       agent back-office routes
  src/components/ui     harvested design system (shadcn)
  src/server            data-access seam → backend API client
apps/backend            Express + Prisma API (module = router/controller/service/schemas)
  prisma/schema.prisma  DB source of truth (Prisma)
  legacy-sql/           Phase-1 PostGIS schema + search — reference for the Prisma/PostGIS port
packages/shared         cross-cutting Zod schemas + types (@homes/shared)
docs/                   design, plan, backend-reuse analysis
```

## Database

Source of truth is `apps/backend/prisma/schema.prisma`. **PostGIS geo-search** is added as a raw
SQL migration and queried via Prisma `$queryRaw` (our Phase-1 `search_listings()` in
`apps/backend/legacy-sql/` ports directly). Manage with `prisma migrate` / `prisma generate`.
