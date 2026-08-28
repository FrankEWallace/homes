# Security audit — Phase 6 (manual pass)

> Date: 2026-08-28 · Scope: backend authz/PII/rate-limits + auth hardening.
> Companion to the Blueprint-mandated `/vibe-security` run (user-triggered, still
> pending before launch).

## Verified good

- **Lead authz / PII lockdown** — `listAgentLeads` and `getLeadStats` scope every
  query by `agentId`; `updateLeadStatus` checks `lead.agentId === caller` (403
  otherwise). Lead PII (email/phone/ip) is only ever returned to the owning
  agent. Public submit is honeypot- + rate-limited (8 / 10 min per IP).
- **Ownership on listings** — agent CRUD re-checks `hostId`/role in the service
  on every mutation (not just the UI).
- **Session model** — JWT access in httpOnly cookie; web never trusts the client
  for authz; backend is the enforcement point.

## Fixed in this pass

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | Low | `authenticate` logged `[AUTH] Path … Authorization: Present/Missing` via `console.log` on **every** request — noise + activity leak. | Removed; failures still surface through the structured logger. |
| 2 | Low | `jwt.verify` didn't pin the algorithm (theoretical alg-confusion surface). | Pinned `algorithms: ['HS256']` in both `authenticate` + `optionalAuthenticate`. Tokens are HS256-signed. |

## Open findings (need a decision — not changed to avoid breaking deploys)

| # | Severity | Finding | Recommendation |
|---|----------|---------|----------------|
| 3 | **Medium–High** | **CORS allowlist inherited from the ToJoin fork** (`middleware/security.ts`). Production hardcodes `*.tojoin.co.tz` and does **suffix matching** on `.onrender.com`, `.web.app`, `.firebaseapp.com`, `.railway.app`, `.fornax-ai.online` with `credentials: true` — any subdomain on those shared hosts can make authenticated cross-origin requests. | Replace with an explicit allowlist of *this* project's real prod origins once domains are chosen (Phase 6 task 5). Drop the shared-host suffix matches. Keep it env-driven via `ALLOWED_ORIGINS`. |
| 4 | Low | Stale ToJoin origins in the prod list are dead links but signal drift. | Remove alongside #3. |

## Deferred to `/vibe-security` + launch

- Full dependency/CVE scan, secret-scan of history, RLS-equivalent review at the
  Postgres layer, and the Blueprint `/vibe-security` gate (user-triggered).
