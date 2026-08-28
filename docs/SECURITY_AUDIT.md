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
| 3 | **Medium–High** | **Overly permissive CORS** inherited from the upstream backend template (`middleware/security.ts`): production did **suffix matching** on `.onrender.com`, `.web.app`, `.firebaseapp.com`, `.railway.app`, `.fornax-ai.online` with `credentials: true` — any subdomain on those shared hosts could make authenticated cross-origin requests — plus hardcoded non-project brand origins. | Rewrote to an **exact-match, env-driven** allowlist: production origins come only from `ALLOWED_ORIGINS`; localhost is allowed only outside production; no suffix matching, no hardcoded brand domains. **Set your real prod origins in `ALLOWED_ORIGINS` at deploy.** |
| 4 | Low | Stale non-project origins in the prod list. | Removed with #3. |

## Open findings (code level)

None outstanding. The only remaining CORS action is operational: populate `ALLOWED_ORIGINS`
with the real production web origin(s) when domains are chosen (Phase 6 task 5).

## Deferred to `/vibe-security` + launch

- Full dependency/CVE scan, secret-scan of history, RLS-equivalent review at the
  Postgres layer, and the Blueprint `/vibe-security` gate (user-triggered).
