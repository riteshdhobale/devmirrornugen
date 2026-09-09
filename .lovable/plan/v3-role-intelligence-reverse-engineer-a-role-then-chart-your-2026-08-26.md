# V3 — Role Intelligence: reverse-engineer a role, then chart your path

Turn the platform from "compare yourself to one developer" into "compare yourself to the people already in the role you want" — then hand back a phased path and the exact projects to build.

## The loop

```text
TARGET ROLE
    ↓  AI nominates real developers working in that role
COHORT (analyzed live from GitHub, using your GitHub quota)
    ↓  frequency across the cohort
ROLE BENCHMARK   Python 95% · LLMs 84% · FastAPI 72% · Docker 68% ...
    ↓  your profile measured against it
YOUR ROLE GAP    strong / moderate / critical gap / missing
    ↓
PHASED PATH      Phase 1 → Phase 2 → Phase 3 → role
    ↓
PROJECT BLUEPRINTS  3 projects, each proving several critical gaps at once
```

## New routes

| Route | What it does |
|---|---|
| `/roles` | Role catalog (AI Engineer, ML Engineer, Backend, Full Stack, GenAI, Data, Web3). Shows which roles already have a cached benchmark. Signed-in only. |
| `/roles/$slug` | Role Intelligence: the cohort we analyzed, the common skill pattern with frequency bars, core vs important vs emerging skills, and the engineering evidence expected. |
| `/roadmap` | Your gap against a chosen role + the phased path + your three project blueprints. Saved to your account so progress persists. |

`/analyze/$username`, `/compare`, and `/recruiter` stay as they are; each gains an entry point into the role loop ("What does it take to be an AI Engineer?").

## How the cohort works

1. You pick a role (or paste a job description — the recruiter role-decoder already handles that and gets reused).
2. AI nominates real GitHub usernames plausibly working in that role, with a one-line reason each.
3. Every nominated username is verified against GitHub — hallucinated or dead accounts are dropped silently, and we keep nominating until enough resolve (target 8–12 analyzed profiles, hard ceiling so it never runs away).
4. Each resolving profile runs through the existing analysis pipeline (which already caches per username for 24h, so cohorts overlap cheaply).
5. Skill frequency across the cohort becomes the benchmark. Every number is explainable: "Docker — 7 of 11 developers, evidence in 19 repositories."

The cohort and the computed benchmark are cached per role for 7 days and shared by all users, so the expensive nomination + analysis happens once per role, not once per visitor.

## Cost and quota control (your main concern)

- **Whole role section requires sign-in.** No anonymous cohort analysis.
- **Your own GitHub connection does the fetching.** If you have not connected GitHub, `/roles/$slug` asks you to connect first (one click, the existing GitHub connect flow) — the cohort then runs on your ~5,000 req/hour quota, not our shared server token. The server token stays as fallback for cached reads only.
- **Shared 7-day role cache** so the second user asking about AI Engineer pays nothing.
- **Refresh is explicit** — a "re-run cohort" action, never automatic.
- Clear, honest failure states: exhausted GitHub quota, AI credits exhausted, cohort too small to be trustworthy (we say so rather than showing a fake benchmark).

## Your role gap

Deterministic first, AI second. Coverage is computed from your actual skills vs benchmark frequency × importance, so a benchmark exists even if AI is unavailable. Bands stay evidence-based, never fake precision:

```text
Python        ████████░░  Strong evidence
FastAPI       ██████░░░░  Moderate
LLM apps      ███████░░░  Moderate
Docker        ██░░░░░░░░  Critical gap
PostgreSQL    ███░░░░░░░  Critical gap
Testing       ░░░░░░░░░░  No public evidence
```

Plus the line that makes it useful: "You do not need to learn everything — these are the highest-leverage gaps for this role."

## Phased path + project blueprints

- The path renders as a vertical trajectory (Skill Universe visual language, same palette and motion), three phases max, each phase naming the skills it closes.
- Exactly three blueprints. Each states: what to build, the problem it solves, stack, what must be visible on GitHub, realistic scope, and **which of your critical gaps it proves** ("covers 6 of your 9 critical gaps").
- No "build a todo app" output — blueprints must be production-shaped, and the prompt enforces that.
- Saved roadmaps and blueprints appear on your dashboard alongside saved comparisons.

## Technical notes

- Migration: `role_benchmarks` (slug, cohort JSON, benchmark JSON, computed_at) service-role only; `user_roadmaps` (user_id, role slug, github username, gap + path + blueprints JSON) owner-scoped RLS with GRANTs. No new anon-readable tables.
- New server files: `src/lib/roles-types.ts` (client-safe contracts), `src/lib/roles.server.ts` (cohort nomination, verification, frequency aggregation, gap scoring, path + blueprint generation), `src/lib/roles.functions.ts` (`getRoleBenchmarkServer`, `buildRoadmapServer`, `saveRoadmapServer`), all using `requireSupabaseAuth` and the existing per-user GitHub connector key lookup.
- Routes live under `src/routes/_authenticated/` so the existing auth gate covers them; loaders stay out of the protected-fn trap by fetching from components via TanStack Query.
- AI calls reuse the existing gateway helper and the assigned model, with strict JSON schemas and validation before anything is stored; AI never invents a skill that has no evidence row behind it.
- Reuses `decodeRole` from Recruiter Mode for the job-description entry point instead of duplicating it.
- Every new route gets its own `head()` metadata.

## Not in this build

Recruiter candidate discovery/marketplace, resume parsing, pricing/billing tiers, progress tracking over time. The schema leaves room for all of them.
