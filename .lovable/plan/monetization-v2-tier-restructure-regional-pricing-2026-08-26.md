# Monetization v2 — Tier restructure + regional pricing

Turns the research report into working product: a three-tier consumer ladder, a three-tier recruiter ladder, a tightened free tier, and prices shown in each visitor's local currency.

## 1. New plan structure

**Consumer**

| Plan | Monthly (US) | Annual (US) | What it unlocks |
|---|---|---|---|
| Free (Explorer) | $0 | — | 3 profile analyses/mo, 1 comparison/mo, Skill Universe, role catalog browsing, free job-posting decoding |
| Pro | $12 | $119 | Unlimited analyses, deep project insights, unlimited comparisons, saved history |
| Career Pro | $20 | $229 | All Pro + Role Intelligence benchmarks, gap deep dive, phased roadmap, project blueprints, saved roadmaps |

**Recruiter**

| Plan | Monthly (US) | Annual (US) | Limits |
|---|---|---|---|
| Starter | $49 | $499 | 1 seat, 100 candidate analyses/mo |
| Recruiter Pro | $149 | $1,499 | 3 seats, 500 candidate analyses/mo |
| Business | $399 | $3,999 | 10 seats, 2,000 candidate analyses/mo |

Role Intelligence (benchmarks + roadmaps) moves from today's Pro to **Career Pro**. Recruiter screening moves to **any recruiter tier**, with a monthly candidate-analysis cap per tier. Existing `pro_plan` / `recruiter_plan` subscribers map to Pro and Recruiter Starter so nobody loses access.

## 2. Tightened free tier

- Free users: **3 analyses/month** and **1 comparison/month** (down from unlimited / 3).
- Running a *new* analysis requires sign-in; anonymous visitors can still open cached results and shared links, which keeps share links viral without opening a rate-limit hole.
- When a limit is hit, the page shows a value-framed upgrade card instead of an error, using report microcopy: e.g. "We found 3 critical skills missing from your profile compared to an AI Engineer. Unlock the full gap analysis to see exactly which skills and projects you need next."

## 3. Regional pricing

- Each price gets country overrides in the payment catalog: India (INR), SEA (USD-equivalent lower band), Europe (EUR), and US/CA/AU at base — roughly ₹499 Pro / ₹999 Career Pro / ₹4,999 recruiter Starter, EUR ~€10/€22/€45.
- The pricing page reads localized, pre-formatted amounts from the payment provider's price-preview API (IP-based detection), so a visitor in India sees ₹499 and checkout charges ₹499. Hardcoded US strings become fallbacks only, shown while the preview loads or if it fails.
- No manual country selector — detection is automatic, and the checkout recalculates if the buyer changes country.

## Technical notes

- **Catalog**: create `career_pro_plan` plus annual prices for every plan (`pro_yearly` exists), and recruiter `recruiter_pro_plan` / `recruiter_business_plan` with monthly + annual prices. Add `unit_price_overrides` per price for IN / SEA / EU. Existing `pro_plan` and `recruiter_plan` IDs are reused (never re-minted) — `recruiter_plan` becomes Starter.
- **Entitlements** (`src/lib/entitlements.server.ts`): extend `PlanTier` to `free | pro | career_pro | recruiter_starter | recruiter_pro | recruiter_business`, add a plan→limits table (analyses/mo, comparisons/mo, candidate analyses/mo, seats), and expose all counters in `Entitlement`.
- **Usage**: migration adds `analyses_used` and `candidates_used` to `public.user_usage` (existing owner-scoped RLS covers them). Counters are checked *before* increment so a blocked attempt isn't billed against the quota — fixes the current increment-then-check order.
- **Server gates**: `analysis.functions.ts` gains an authenticated quota check for fresh analyses (cache hits stay free); `compare-ai.functions.ts` switches to the new comparison limit; `roles.functions.ts` requires `career_pro` and returns `needs-upgrade` with the required tier; `recruiter.functions.ts` accepts any recruiter tier and enforces the candidate cap.
- **Result unions**: rename `needs-pro` to `needs-upgrade` carrying `requiredPlan`, so upgrade cards can name the right plan and price.
- **Pricing page**: rebuilt as consumer/recruiter toggle + monthly/annual switch, localized amounts via price preview, current-plan highlighting, and annual savings badges.
- **UI**: upgrade cards on `/analyze/$username`, `/compare/results`, `/roles/$slug`, `/roadmap`, `/recruiter`, plus a plan + remaining-quota chip in the dashboard.

## Out of scope this pass

Credit packs, one-time Career Blueprint purchase, analytics events, A/B variant framework, admin pricing dashboard, referral program.
