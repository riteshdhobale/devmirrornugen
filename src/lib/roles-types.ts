/** Client-safe contracts for Role Intelligence (V3). */

export interface RoleDefinition {
  slug: string;
  label: string;
  blurb: string;
  /** Seed hint given to the cohort nominator so roles stay distinguishable. */
  hint: string;
}

export const ROLE_CATALOG: RoleDefinition[] = [
  {
    slug: "ai-engineer",
    label: "AI Engineer",
    blurb: "Ships LLM products: retrieval, agents, evals, and the APIs around them.",
    hint: "builds production LLM/RAG/agent applications and the backend services around them",
  },
  {
    slug: "ml-engineer",
    label: "ML Engineer",
    blurb: "Trains, evaluates and serves models in production pipelines.",
    hint: "trains and serves machine learning models, owns training pipelines and model deployment",
  },
  {
    slug: "backend-engineer",
    label: "Backend Engineer",
    blurb: "Owns APIs, data models, reliability and everything behind the request.",
    hint: "builds production backend services, APIs, databases, queues and infrastructure",
  },
  {
    slug: "fullstack-engineer",
    label: "Full Stack Engineer",
    blurb: "Carries a product from database to interface without a handoff.",
    hint: "builds complete web products end to end, frontend and backend and deployment",
  },
  {
    slug: "genai-engineer",
    label: "GenAI Engineer",
    blurb: "Generative systems: multimodal pipelines, prompts, orchestration, guardrails.",
    hint: "builds generative AI systems — text, image, audio pipelines, orchestration and guardrails",
  },
  {
    slug: "data-engineer",
    label: "Data Engineer",
    blurb: "Moves data reliably: pipelines, warehouses, orchestration, quality.",
    hint: "builds data pipelines, warehouses, orchestration and analytics infrastructure",
  },
  {
    slug: "data-scientist",
    label: "Data Scientist",
    blurb: "Turns messy data into models, experiments and decisions.",
    hint: "does applied data science, notebooks, statistics, experimentation and modelling",
  },
  {
    slug: "web3-engineer",
    label: "Web3 Engineer",
    blurb: "Smart contracts, on-chain data, and the apps built on top.",
    hint: "builds smart contracts and on-chain applications",
  },
];

export function getRoleDefinition(slug: string): RoleDefinition | null {
  return ROLE_CATALOG.find((r) => r.slug === slug) ?? null;
}

export type SkillTier = "core" | "important" | "emerging";

export interface BenchmarkSkill {
  name: string;
  category: string;
  tier: SkillTier;
  /** Share of the analyzed cohort with evidence for this skill, 0–100. */
  frequency: number;
  developerCount: number;
  cohortSize: number;
  /** Repositories across the cohort where this technology shows up. */
  repoCount: number;
}

export interface CohortMember {
  username: string;
  name: string;
  avatarUrl: string;
  primaryFocus: string;
  why: string;
  topProject: string;
}

export interface RoleBenchmark {
  slug: string;
  label: string;
  cohortSize: number;
  cohort: CohortMember[];
  skills: BenchmarkSkill[];
  /** Engineering signals (Docker, tests, CI/CD…) with cohort frequency. */
  signals: { name: string; frequency: number }[];
  computedAt: string;
  cached: boolean;
}

export type GapLevel = "strong" | "moderate" | "limited" | "none";

export const GAP_LEVEL_LABEL: Record<GapLevel, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  limited: "Limited evidence",
  none: "No public evidence",
};

export type GapVerdict = "match" | "improve" | "critical" | "optional";

export const GAP_VERDICT_LABEL: Record<GapVerdict, string> = {
  match: "Match",
  improve: "Improve",
  critical: "Critical gap",
  optional: "Optional",
};

export interface RoleGapRow {
  skill: string;
  category: string;
  tier: SkillTier;
  frequency: number;
  level: GapLevel;
  /** 0–100 strength bar for the row. */
  strength: number;
  verdict: GapVerdict;
  evidence: string;
}

export interface RoadmapPhase {
  title: string;
  focus: string;
  skills: string[];
  outcome: string;
  duration: string;
}

export interface RoadmapBlueprint {
  name: string;
  problem: string;
  pitch: string;
  stack: string[];
  mustShow: string[];
  provesGaps: string[];
  scope: string;
}

export interface RoleRoadmap {
  role: { slug: string; label: string };
  username: string;
  name: string;
  avatarUrl: string;
  /** Weighted coverage of the role benchmark, 0–100. */
  readiness: number;
  headline: string;
  leverage: string;
  rows: RoleGapRow[];
  phases: RoadmapPhase[];
  blueprints: RoadmapBlueprint[];
  benchmark: { cohortSize: number; computedAt: string };
}

export type GateReason = "needs-github" | "needs-upgrade" | "error";

export type BenchmarkResult =
  | { ok: true; benchmark: RoleBenchmark }
  | { ok: false; reason: GateReason; message: string; requiredPlan?: string };

export type RoadmapResult =
  | { ok: true; roadmap: RoleRoadmap }
  | { ok: false; reason: GateReason; message: string; requiredPlan?: string };

export interface SavedRoadmap {
  id: string;
  roleSlug: string;
  roleLabel: string;
  githubUsername: string;
  readiness: number;
  createdAt: string;
}
