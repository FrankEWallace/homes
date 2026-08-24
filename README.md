# Homes — Real Estate Marketplace

National-scale public listings marketplace. **pnpm monorepo**:
Next.js 16 · React 19 · Tailwind v4 (web) + Express · Prisma · Postgres/PostGIS (backend).

- **Design & requirements:** [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)
- **Build plan:** [docs/V1_IMPLEMENTATION_PLAN.md](docs/V1_IMPLEMENTATION_PLAN.md)
- **Backend reuse (Path A):** [docs/BACKEND_REUSE_ANALYSIS.md](docs/BACKEND_REUSE_ANALYSIS.md)
- **Project rules:** [CLAUDE.md](CLAUDE.md)

## Workspace

```
apps/web        Next.js frontend (public marketplace + agent back-office)
apps/backend    Express + Prisma API (adapted from the ToJoin marketplace backend)
packages/shared cross-cutting Zod schemas + types (@homes/shared)
```

## Getting started

```bash
pnpm install
pnpm dev:web        # http://localhost:3000  (renders without a DB)
pnpm dev:backend    # needs Postgres + Redis + env (below)
```

## Database (Postgres + PostGIS via Prisma)

Source of truth is `apps/backend/prisma/schema.prisma`. Geo-search lives in a raw SQL file
applied on top of the Prisma tables.

```bash
cd apps/backend
cp .env.example .env         # set DATABASE_URL (+ DATABASE_URL_UNPOOLED), Redis, JWT secrets

pnpm exec prisma db push     # create tables from schema.prisma
psql "$DATABASE_URL" -f prisma/sql/0001_postgis_search.sql   # geom + FTS + search_listings()
```

`prisma/sql/0001_postgis_search.sql` adds the `geom` (geography) + `search_tsv` columns, the
GiST/GIN indexes, and the `search_listings()` / `search_listing_facets()` functions. It is
idempotent. When we move from `db push` to `prisma migrate`, this becomes a migration step.

> The `prisma/seed*.ts` scripts are inherited from the fork and still reference removed
> (booking/payment) models — they need rewriting before use.

## Architecture seam (important)

- **Web:** feature code goes through `apps/web/src/server/*`, which calls the backend API. No direct DB access from the web app.
- **Backend:** search goes through the `SearchEngine` interface (`apps/backend/src/search/engine.ts`) — PostGIS today via `$queryRaw`, swappable for Typesense/OpenSearch. Authz is enforced in services (JWT + ownership), never trusted from the client.

See [CLAUDE.md](CLAUDE.md).

## Scripts (root)

| Command | What |
|---|---|
| `pnpm dev:web` / `pnpm dev:backend` | run an app |
| `pnpm build` | build all packages |
| `pnpm typecheck` | typecheck all packages |
| `pnpm lint` / `format` | Biome |
