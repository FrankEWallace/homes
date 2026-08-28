# Fair Housing / non-discrimination review — Phase 6

> Date: 2026-08-28 · Scope: search/filter/targeting logic + listing content.

The plan mandates a Fair Housing review of "any filtering/targeting logic." The
principle: seekers must not be able to filter, and the platform must not target,
on protected characteristics — race, colour, religion, sex, national/ethnic
origin, disability, familial status, or age. (Tanzania's Constitution Art. 13
prohibits discrimination; the US Fair Housing Act is the reference standard.)

## Filtering logic — reviewed, clean

The only search inputs (`SearchEngine` / `search_listings()`) are **property
attributes**:

| Input | Field | Protected characteristic? |
|-------|-------|---------------------------|
| `q` (text) | title/location/description FTS | No |
| `tenure` | sale / rent | No |
| `type` | house/apartment/… | No |
| `city` | location | No |
| `minPrice`/`maxPrice` | price | No |
| `minBeds`/`minBaths` | room counts | No |
| `bbox` | map bounds | No |
| `sort` | relevance/price/newest | No |

There is **no** demographic field to filter on, and none is derived. Saved-search
alerts and lead routing key off the same attributes + the listing's owning agent —
no audience targeting by seeker characteristics. **No change required.**

## Residual risk — listing free-text (tracked, not code)

Agents author `title`/`description`. Free text could carry discriminatory
preferences ("no children", "for members of X only"). This is a **content
moderation** concern, not a filtering one, and lands with **Admin essentials
(F14–F16, moderation/flags)** — deferred in this phase. Mitigations to add there:

- A moderation queue / flag for listings, with keyword heuristics for common
  discriminatory phrases surfaced for human review.
- A published non-discrimination policy agents accept at onboarding.

## Public posture

A non-discrimination notice is linked in the public footer
(`apps/web/src/app/(public)/layout.tsx`). Equal-opportunity language on the
listing/agent surfaces can follow with the moderation work.

## Verdict

Filtering/targeting logic is **non-discriminatory by construction**. The open
item is listing-content moderation, correctly scoped to the admin/moderation
slice.
