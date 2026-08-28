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

## Blueprint `/vibe-security` gate — run 2026-08-28

Ran the mandated 9-step audit
(`/Applications/MAMP/htdocs/blueprint/.claude/skills/vibe-security/`), adapted from
the Laravel checklist to this Express/Prisma/Next stack.

| Step | Area | Result |
|------|------|--------|
| 1 | Secrets & env | ✅ Only `.env.example` tracked (placeholders); no hardcoded secrets; `NEXT_PUBLIC_SITE_URL` is the sole public var (non-secret). |
| 2 | DB access control | ✅ All raw SQL is parameterized tagged-template `$queryRaw` (no `…Unsafe`, no interpolation); no `req.body` spread into Prisma — every write goes through a Zod-parsed input; FKs defined in schema. |
| 3 | Auth & authz | ✅ Web session in httpOnly cookie; JWT pinned to HS256; ownership checks in leads/listings/wishlist/saved-searches/admin services (verified: cross-owner → 403). |
| 4 | Rate limiting | ⚠️→✅ **Fixed:** login/`login-email`/`google`/`reset-password` had only the global limiter → added `loginRateLimit` (10 / 15 min per email+IP). Verified: 10×401 then 429. Lead/register/OTP/forgot-password already limited. |
| 5 | Payments | ✅ N/A — payment/booking modules stripped from the fork; no billing surface. |
| 6 | AI / LLM | ✅ N/A — no AI integration. |
| 7 | Deployment | ✅ `helmet` on; error handler returns generic 500 and leaks the stack **only** when `NODE_ENV !== 'production'`; CORS is exact-match env-driven; no source maps/`.git` served. |
| 8 | Input validation | ✅ Zod validation at every route edge; no SQL-string interpolation; state-changing routes are JSON+token (not cookie-form) so CSRF surface is minimal, and the session cookie is `sameSite: lax`. |
| 9 | RBAC / tenancy | ✅ Admin routes gated by `authenticate + authorize('admin')` (verified seeker → 403); agent data scoped by `hostId`/token, never client-supplied ids. |

**Outcome: clean.** One Medium finding (login brute-force) found and fixed this pass.

## Still recommended before/at launch (operational, not code)

- Populate `ALLOWED_ORIGINS` with the real production web origin(s).
- Dependency/CVE scan (`pnpm audit`) and a secret-scan of git history in CI.
- Re-run this gate after any auth/CORS change. See [LAUNCH_READINESS.md](LAUNCH_READINESS.md).
