# Monetizing DevMirror — two-sided freemium via Paddle

You asked how to monetize, for both recruiters and developers, and whether to go subscription or open-source-with-donations. You're unsure, so this plan makes the call and explains the reasoning, then sets up payments.

## The decision: two-sided freemium SaaS (not open-source + donations)

Open-source + Buy Me a Coffee is the *easy* choice but the *wrong* one here. DevMirror has a real B2B buyer (recruiters/HR) and a real B2C buyer (job-seeking developers). A donation model leaves that money on the table, gives you no usage signals, and caps income at whatever goodwill provides. The product already has a natural split — career intelligence for developers, screening intelligence for recruiters — which maps cleanly onto two paid tiers behind one generous free funnel.

**Why this beats donations:**

- Recruiters/HR are B2B buyers who expect to pay per-seat for hiring tooling — high willingness to pay, predictable revenue.
- Developers pay for career outcomes (roadmaps, benchmarks, gap analysis), not vanity.
- A free tier still does the "open & accessible" job: anyone can analyze any GitHub profile for free, forever. That is your lead-gen funnel and your community goodwill — you don't need to open-source the codebase to get that.
- Subscriptions give you recurring revenue to cover AI/GitHub-token costs, which donations won't reliably do.

## Pricing tiers


| Tier                | Price                       | Who it's for                            | What's included                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free**            | $0                          | Everyone, anonymous + signed-in         | Unlimited GitHub profile analysis · 3 comparisons/mo · basic gap visualization · connect your own GitHub (your quota) · 1 role benchmark/mo (AI cost-controlled)                                                                                                |
| **Pro** (Developer) | $12/mo or $99/yr (~$8/mo)   | Job-seeking & career-curious developers | Everything in Free, **unlimited**: comparisons, role benchmarks, gap analysis, roadmaps, 3 project blueprints · save unlimited roadmaps & comparisons · role-target history · priority cached analysis                                                          |
| **Recruiter**       | $49/mo or $390/yr (~$32/mo) | Recruiters, HR, hiring managers         | Everything in Pro, **plus**: job-posting → role-spec decoding (unlimited) · candidate screening up to 4 at a time, unlimited screenings · interview probes + fit scores + risks · saved roles & candidate reports · export/share reports · bulk screening queue |


Rationale:

- The **free tier stays generous on the core hook** (analyze any profile) so the funnel never breaks and shared links keep working. The *depth* tools (role benchmarks, roadmaps, recruiter screening) are where value compounds and where AI costs live — those gate the paid tiers.
- **Pro at $12/mo** is the standard career-tool price point (under a Netflix subscription); the yearly plan ($99, ~34% off) locks in retention and improves unit economics.
- **Recruiter at $49/mo** reflects B2B value and the fact that one good hire pays for years of the subscription. It includes Pro so a recruiter who's also a developer isn't double-billed.
- 1 role benchmark/mo free is enough to *taste* the feature (and convert), but not enough to farm AI for free — benchmarks are the most expensive thing to compute (live cohort analysis of 8–10 developers).

## Why Paddle (the payment provider)

Lovable's built-in payment eligibility check recommended **Paddle**, and it's the right call for you:

- **Merchant of record on every transaction** — Paddle is legally the seller, so it handles tax calculation, collection, filing, and remittance worldwide, plus chargebacks, refunds, and billing support. You don't need to register for VAT/sales tax in every country you sell to.
- One all-inclusive fee: **5% + 50¢** per checkout (no surprise surcharges), with microtransaction-friendly pricing for small amounts.
- Works for a seller based anywhere reaching a global customer base — ideal since your developer audience is global.
- A test (sandbox) environment is created immediately so you can try the full flow with no real money; going live needs Paddle verification.

(Stripe was the alternative, but full tax-compliance handling there is limited to ~36 seller countries and adds +3.5%; Paddle's MoR model is simpler and broader for a solo founder going global.)

## What gets built

### 1. Enable Paddle payments

Call `enable_paddle_payments`. This creates the Paddle sandbox (test) environment and wires the integration. Live payments activate after Paddle verification.

### 2. Create subscription products (Paddle)

Four products, all subscriptions:

- **Pro — Monthly** ($12/mo)
- **Pro — Yearly** ($99/yr)
- **Recruiter — Monthly** ($49/mo)
- **Recruiter — Yearly** ($390/yr)

Set a tax code on each (digital SaaS / software). Paddle handles the tax itself, but the product category must be correct.

### 3. Entitlement table (Lovable Cloud / database)

New table `user_entitlements`:

- `user_id` (auth.users FK, owner-scoped RLS)
- `plan` enum: `free` | `pro` | `recruiter`
- `status` (active / past_due / canceled / expired)
- `paddle_subscription_id`, `current_period_end`
- GRANTs to `authenticated` + `service_role`; RLS owner-scoped (a user reads/updates only their own row); service-role writes from the webhook.
- A security-definer helper `has_plan(_user_id, _plan)` for gating checks (mirrors the existing `has_role` pattern).

### 4. Paddle webhook → entitlement sync

A public server route under `src/routes/api/public/paddle-webhook.ts` (the `/api/public/` prefix bypasses site auth — verify the Paddle signature inside). It listens for `subscription.created`, `subscription.updated`, `subscription.canceled`, and writes the entitlement row with `service_role` (bypasses RLS). All writes go through the webhook, never client-side.

### 5. Entitlement checks + paywalls

- A `requirePlan(plan)` server middleware/helper (built on `requireSupabaseAuth`) that reads the user's entitlement and throws 402/403 if insufficient. Used by the gated server functions.
- Gate **Role Intelligence** (`getRoleBenchmarkServer`, `buildRoadmapServer`) behind `pro` — free users get the 1 benchmark/mo counter instead of unlimited.
- Gate **Recruiter Mode** (`screenCandidatesServer`) behind `recruiter`; `decodeRoleServer` (job-posting → blueprints) stays free as a taste.
- A free-tier monthly benchmark counter (stored in `user_entitlements` or a small `usage` table) reset on webhook renewal.

### 6. Upgrade UI

- A `/pricing` route (public, SEO-optimized) showing the three tiers and checkout buttons.
- "Upgrade" prompts on: the comparison results page (when hitting the 3/mo limit), the Roles page (when hitting the 1/mo benchmark limit), and the Recruiter page (always, for non-recruiter users).
- Checkout launches the Paddle overlay; on success the webhook flips the entitlement and the UI updates.

## What stays free (do not gate)

- GitHub profile analysis (`/analyze/$username`) — the core hook and the shared-link engine. Unlimited.
- The comparison results view when a *free* comparison is available (3/mo).
- Role catalog view (`/roles`) — browsing is free; running a benchmark is the gated action.

## Out of scope for this build

- Usage-based / credit-pack billing, annual contract invoicing for enterprises, team seats management UI, affiliate program, resume parsing marketplace, progress-over-time tracking, the recruiter candidate-discovery marketplace. The schema leaves room for all of these.
- Open-sourcing the codebase (separate decision; donations/sponsors can be added *in addition* to subscriptions later without conflict).

## Honest note on the economics

Developers are price-sensitive and churn-prone; expect Pro to be low-volume. The real money is **Recruiter** B2B — fewer users, far higher ARPU, stickier. Price and build accordingly: make the free + Pro funnel excellent so it feeds the recruiter tier, and don't over-invest in developer-tier features that don't convert. The free tier's generosity is intentional — it's marketing that pays for itself via recruiter conversions and shared-link growth.  
  
  
                   PAYMENT ABSTRACTION

                          │

              ┌───────────┴───────────┐

              INDIA                 GLOBAL

                │                     │

             RAZORPAY              STRIPE

                │                     │

       ₹ INR payments          USD / EUR / GBP

       UPI                     International cards

       Indian subscriptions    Global subscriptions