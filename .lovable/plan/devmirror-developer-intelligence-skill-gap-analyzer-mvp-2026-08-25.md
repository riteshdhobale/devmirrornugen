# DevMirror — Developer Intelligence & Skill Gap Analyzer (MVP)

## What we're building

A dark-mode-first developer intelligence dashboard that analyzes GitHub profiles, compares two developers, and produces goal-aware skill gap recommendations. Version 1 is a polished frontend with realistic mock data and a clean, reusable component architecture, per the PRD's final instruction.

## Stack adaptation

The PRD mentions Next.js/FastAPI/PostgreSQL. This project runs on **TanStack Start (React 19 + Vite) + Tailwind CSS v4**, which covers the same surface. Since V1 is mock-data-driven, no FastAPI/PostgreSQL/GitHub OAuth is needed yet — the architecture (data collector → evidence extraction → skill graph → comparison engine) will be mirrored as typed mock-data modules so a real backend can replace it later without touching the UI.

## Design direction

Dark-mode-first, modern developer tool (Linear / Vercel / GitHub / Cursor / Supabase feel): minimal, clean typography, high information density, cards for summaries, subtle borders, no gradients or gimmicky animation, no chatbot UI.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing: hero, username input, "Analyze a GitHub Profile" CTA, "Compare With Me" secondary CTA, brief how-it-works |
| `/analyze/$username` | Developer Analysis dashboard with tabs: Overview, Skills, Projects, Tech Stack, Activity. Primary CTA: Compare With Me |
| `/compare` | Comparison setup: your GitHub, target GitHub, career goal dropdown (AI Engineer, ML Engineer, Backend, Full Stack, SWE, Data Scientist, Web3), optional resume upload (UI only) |
| `/compare/results` | Comparison dashboard: match score, critical gaps / improve / strong matches, side-by-side skill table, tech stack + project comparison, goal-aware recommendations, "Your Next 3 Actions" |

## Component architecture (reusable)

- `SkillCard` — skill name, proficiency, confidence, evidence list ("Strong/Moderate/Limited evidence" wording)
- `ComparisonRow` — side-by-side skill with progress bars + status badge (Critical Gap / Improve / Match / Not Required)
- `ProgressIndicator` — proficiency bars, match score ring
- `ProjectCard` — name, plain-English description, tech stack chips, complexity badge, engineering signals (Docker, tests, CI/CD, DB, auth, deploy)
- `GapCard` — gap severity, priority, why-it-matters, what-to-learn, recommended goal
- `RecommendationCard` — structured recommendation per PRD §14
- `SnapshotStat`, `FocusBadge`, `TabNav`, `StatusBadge`

## Mock data layer

Typed modules under `src/lib/mock/` modeling the PRD pipeline:

- `types.ts` — DeveloperProfile, Skill (with confidence + evidence), Project (with signals + complexity), ComparisonResult, GapPriority
- `developers.ts` — 3–4 realistic developer profiles (e.g. an AI engineer target with FastAPI/RAG/LangChain, plus a "you" beginner profile)
- `comparison.ts` — deterministic comparison engine: gap size × goal relevance × importance × recency → Critical / Important / Strong / Not Required, plus goal-aware recommendations (e.g. DSA for AI Engineer goal: "150–250 quality problems", NOT "solve 15,000")
- Username routing: any username resolves to a mock profile (deterministic pick by username hash) so the flow always works

## Dashboard content (per PRD)

- **Overview**: avatar, name, bio, primary/secondary focus, snapshot stats (repos, stars, followers, languages, recent activity)
- **Skills**: grouped categories (Programming, AI/ML, Backend, DevOps), each with proficiency, confidence, evidence strings
- **Projects**: top 3–5 meaningful projects (ranked by size/activity/README/signals, not stars), engineering signal badges
- **Tech Stack / Activity**: current direction vs historical skills split
- **Comparison**: match score ring, color-coded gap summary (🔴/🟡/🟢 as styled badges), side-by-side table, recommendations, "Your Next 3 Actions" as the most prominent section

## Technical notes

- New semantic tokens in `src/styles.css` for the dark-first palette (success/warning/danger gap colors, surface levels)
- `head()` metadata per route (unique title/description/og tags); no og:image since no hosted imagery
- shadcn components added as needed (tabs, badge, progress, select, input, button)
- `createFileRoute` strings match filenames exactly (`/analyze/$username`)
- Resume upload is front-end-only in V1 (nice-to-have); the comparison setup page shows the field but results come from mock data
