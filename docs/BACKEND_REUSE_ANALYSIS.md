# Backend Reuse Analysis — ToJoin vs Supabase

> Decision doc: how to build our marketplace backend.
> Path A = adopt ToJoin's Express/Prisma backend. Path B = stay on Supabase (Phase 1), mine ToJoin for patterns.
> Last updated: 2026-08-19

---

## What ToJoin gives us

A production Express + **Prisma + Postgres** marketplace API (Redis/BullMQ queues, Socket.io realtime,
S3+Cloudinary media, Resend email, JWT auth, Swagger). Clean modules: `router → controller → service →
schemas(Zod)`. Its `admin` (Vite/React-Router) and `mobile` (Expo) apps do **not** fit our Next.js
frontend — the **backend is the reusable asset**.

Domain is a rentals/experiences **booking** marketplace (Tanzania, TZS). The *listings spine* is our
domain; the *bookings/payments/ticketing* half is not (we deferred transactions for v1).

---

## What actually transfers — per module (grounded in the code)

| Module | LOC | Verdict for our marketplace |
|---|---|---|
| `auth` | 926 | **Adapt.** JWT access/refresh + bcrypt + refresh-token table = lift. But it's **phone-OTP-first** (SMS); our seekers are email-first → rework the entry flow, keep the token machinery. |
| `listings` | 1136 | **Adapt.** Model + CRUD + host ownership + featured lift well. **Drop their search** (naive `ILIKE` + lat/long box) and wire our **PostGIS search** via Prisma `$queryRaw`. Retype fields to real-estate (tenure sale/rent, beds/baths, area). |
| `wishlist` | 105 | **Lift.** = our favorites (F5). Not coupled to bookings. |
| `chat` | 419 | **Lift.** ChatRoom/Message + Socket.io = agent↔seeker messaging / lead threads. |
| `cities` | 109 | **Lift → extend** into our hierarchical `locations` taxonomy. |
| `notifications` | 1035 | **Lift.** Email/SMS/push + preferences + templates = alerts + lead delivery (F20). |
| media (S3/Cloudinary, in utils) | — | **Lift.** Presigned uploads, image handling. |
| `reviews` | 378 | **Defer/adapt.** Couples to bookings (review-after-booking); real-estate reviews attach differently. Not v1. |
| `bookings` | 1123 | **Drop for v1.** We do leads, not transactional bookings. |
| `payments` | 1070 | **Drop for v1.** No billing in v1. |
| `disputes / earnings / payouts / promo / ticketTiers` | ~1500 | **Drop for v1.** |

**Reusable now (~2.7k LOC): auth, listings, wishlist, chat, cities, notifications, media.**
**Dropped (~3.7k LOC): bookings, payments, disputes, earnings, promo, ticketing.**

Data model: ~15 of the 30 Prisma models map (User, Listing, ListingType, City, Category, Tag,
Wishlist, Review, ChatRoom/Member/Message, Notification/Preference, RefreshToken, AdminAuditLog,
DeviceToken). The rest are booking/payment machinery we omit.

---

## Side-by-side

| Dimension | Path A — Adopt Express/Prisma | Path B — Stay Supabase, mine patterns |
|---|---|---|
| **Running-code reuse** | High — ~2.7k LOC of working modules + Prisma schema adapted | Low — reimplement logic onto Supabase; reuse *ideas*, Zod, structure |
| **Upfront effort** | Medium-high — fork, strip, retype Listing, adapt auth, port search, stand up Redis | Low-medium — extend Phase 1 (Supabase Auth + our PostGIS search already done) |
| **Fit to your doctrine** (own infra, cheap at scale) | **Strong** — self-hostable Express+Prisma+Postgres is exactly the owned backend | Weak — stays on managed BaaS you wanted to grow out of |
| **Cost at scale** | Lower unit cost — raw Postgres + commodity compute; you control it | Grows with Supabase compute/bandwidth/MAU; convenient but rented |
| **Ops burden** | Higher — you run Postgres, Redis, the API, on-call, scaling | Lower — Supabase manages DB/auth/storage |
| **Auth** | Their JWT/refresh (adapt phone→email) — fully owned | Supabase Auth (GoTrue) — managed, already portable |
| **Search** | Our PostGIS onto their Postgres (`$queryRaw`) — **our code either way** | Our PostGIS on Supabase Postgres — **already working (Phase 1)** |
| **Realtime (chat)** | Built-in (Socket.io) — lift | Supabase Realtime or add our own |
| **Media** | S3/Cloudinary presigned — lift | Supabase Storage (Phase 1 plan) |
| **Impact on Phase 1** | Retire Supabase migrations; **keep search SQL**; frontend + seam untouched | None — Phase 1 continues |
| **Time to v1** | Slower start, faster feature-fill (modules pre-built) | Faster start, slower feature-fill (build each module) |
| **Risk** | Domain baggage (booking/TZS assumptions) to excise cleanly; more infra to run | Rebuilding proven logic; managed-cost surprise at scale |

The constant in both rows: **our Phase-1 `src/server/*` seam and PostGIS search carry over unchanged.**
Only the adapter target differs (ToJoin API vs Supabase).

---

## Path A migration outline (monorepo — your leaning)

1. **Restructure to a workspace:** `apps/web` (current Next.js) + `apps/backend` (ToJoin, forked) + `packages/shared` (Zod/types). Mirror ToJoin's npm-workspaces layout.
2. **Strip** bookings/payments/disputes/earnings/promo/ticketing modules + their Prisma models & routes.
3. **Retype `Listing`** → real-estate fields (tenure, bedrooms, bathrooms, area_sqft, property_type) and fold in our schema decisions from `0001_init.sql`.
4. **Port search:** add PostGIS to the Prisma Postgres; expose `search_listings()`/facets; call via `$queryRaw` behind a `SearchEngine` impl.
5. **Adapt auth:** keep JWT/refresh/bcrypt; add email + email-OTP/password flow alongside (or replacing) phone-OTP.
6. **Repoint the web seam:** `src/server/adapters/*` calls the backend API (typed client from `packages/shared`) instead of Supabase.
7. **Infra:** Postgres (Neon v1 → self-hosted), Redis (queues + Socket.io), S3/Cloudinary. docker-compose already exists in ToJoin as a starting point.

---

## Recommendation

**Path A**, if you're committed to owning the backend — it converts "build a backend" into "adapt a
proven one," fits the own-infra/cheap-at-scale doctrine, and our search/seam survive. Accept the
higher ops burden and the one-time cost of excising the booking/TZS baggage.

**Path B**, if speed-to-first-launch and low ops matter more than owning infra now — Phase 1 already
runs, and ToJoin still pays off as a pattern/library reference.

Deciding factor: **do you want to run infrastructure in v1, or defer that until scale forces it?**
Path A pays the ownership cost now; Path B defers it (and pays managed fees meanwhile).
