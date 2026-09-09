/**
 * Role Intelligence engine (server-only).
 *
 * Pipeline: AI nominates real developers working in a role -> every nomination
 * is verified against GitHub -> resolving profiles run through the existing
 * analysis pipeline -> skill frequency across the cohort becomes the benchmark.
 * Benchmarks are cached per role and shared by every user, so the expensive
 * part happens once per role rather than once per visitor.
 */
import type { DeveloperProfile, Skill } from "@/lib/mock/types";
import type {
  BenchmarkSkill,
  CohortMember,
  GapLevel,
  GapVerdict,
  RoadmapBlueprint,
  RoadmapPhase,
  RoleBenchmark,
  RoleDefinition,
  RoleGapRow,
  RoleRoadmap,
  SkillTier,
} from "@/lib/roles-types";
import { callResponsesStructured } from "./ai-gateway.server";
import { fetchUser, type GitHubAccess } from "@/lib/github/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Benchmarks stay fresh for 7 days. */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
/** Enough profiles to see a pattern, few enough to stay inside a request. */
const TARGET_COHORT = 8;
const MAX_ANALYZED = 10;
const MIN_COHORT = 4;

const NOMINATION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    developers: {
      type: "array",
      description:
        "16 real, existing GitHub accounts of individual people who visibly work in this role. Never organizations, never invented handles.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          username: { type: "string", description: "Exact GitHub login, no URL, no @." },
          why: {
            type: "string",
            description: "One short sentence: what they build that makes them an example of this role.",
          },
        },
        required: ["username", "why"],
      },
    },
  },
  required: ["developers"],
};

const ROADMAP_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: {
      type: "string",
      description: "One sentence, direct and honest: where this developer stands against this role.",
    },
    leverage: {
      type: "string",
      description:
        "2 sentences naming the highest-leverage gaps and why closing those specific ones matters most.",
    },
    phases: {
      type: "array",
      description: "Exactly 3 phases, ordered, each closing a coherent group of the critical gaps.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Short phase name, 2-4 words." },
          focus: { type: "string", description: "One sentence on what this phase is for." },
          skills: { type: "array", items: { type: "string" }, description: "3-5 gap skills closed here." },
          outcome: { type: "string", description: "The verifiable outcome that ends this phase." },
          duration: { type: "string", description: "Realistic span, e.g. '3-4 weeks'." },
        },
        required: ["title", "focus", "skills", "outcome", "duration"],
      },
    },
    blueprints: {
      type: "array",
      description:
        "Exactly 3 production-shaped GitHub projects that together prove the critical gaps. Never tutorials, todo apps or portfolio sites.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "A name the repository could actually carry." },
          problem: { type: "string", description: "The real problem it solves." },
          pitch: { type: "string", description: "One sentence on what it is and why it proves the role." },
          stack: { type: "array", items: { type: "string" } },
          mustShow: {
            type: "array",
            description: "4-6 things that must be visible in the repo (tests, CI, Docker, evals, deploy, README).",
            items: { type: "string" },
          },
          provesGaps: {
            type: "array",
            description: "The exact gap skill names from the supplied list that this project provides evidence for.",
            items: { type: "string" },
          },
          scope: { type: "string", description: "Honest scope, e.g. '3-4 weekends'." },
        },
        required: ["name", "problem", "pitch", "stack", "mustShow", "provesGaps", "scope"],
      },
    },
  },
  required: ["headline", "leverage", "phases", "blueprints"],
};

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
}

function tierOf(frequency: number): SkillTier {
  if (frequency >= 60) return "core";
  if (frequency >= 35) return "important";
  return "emerging";
}

const TIER_WEIGHT: Record<SkillTier, number> = { core: 3, important: 2, emerging: 1 };

async function nominateCohort(role: RoleDefinition): Promise<{ username: string; why: string }[]> {
  const { developers } = await callResponsesStructured<{
    developers: { username: string; why: string }[];
  }>({
    schemaName: "role_cohort",
    schema: NOMINATION_SCHEMA,
    effort: "medium",
    instructions:
      "You nominate real GitHub accounts of individual developers who visibly work in a given role, for a " +
      "developer intelligence product that then analyzes their public repositories. Only nominate accounts " +
      "you are confident exist and belong to a person (not an organization, not a bot). Prefer people whose " +
      "public repositories actually show the work of this role — not famous names with no relevant public code. " +
      "Spread across seniority and geography. Return exact GitHub logins only.",
    input: JSON.stringify({
      role: role.label,
      roleMeans: role.hint,
      needed: "16 candidate logins; some may not resolve, so give the strongest 16 you are confident about.",
    }),
  });
  return developers
    .map((d) => ({ username: d.username.trim().replace(/^@/, ""), why: d.why }))
    .filter((d) => /^[a-zA-Z0-9-]{1,39}$/.test(d.username));
}

function aggregateBenchmark(
  role: RoleDefinition,
  members: { profile: DeveloperProfile; why: string }[],
): { skills: BenchmarkSkill[]; signals: { name: string; frequency: number }[] } {
  const cohortSize = members.length;
  const acc = new Map<
    string,
    { name: string; category: string; developers: number; repos: number }
  >();
  const signalCount = new Map<string, number>();

  for (const { profile } of members) {
    const seen = new Map<string, { name: string; category: string; repos: number }>();

    const add = (name: string, category: string, repos: number) => {
      const key = norm(name);
      if (!key || key.length < 2) return;
      const prev = seen.get(key);
      if (prev) {
        prev.repos += repos;
        return;
      }
      seen.set(key, { name, category, repos });
    };

    for (const skill of profile.skills) add(skill.name, skill.category, 0);
    for (const project of profile.topProjects) {
      for (const tech of project.techStack) add(tech, "Technology", 1);
    }

    const devSignals = new Set<string>();
    for (const project of profile.topProjects) {
      for (const signal of project.signals) devSignals.add(signal);
    }
    for (const signal of devSignals) {
      signalCount.set(signal, (signalCount.get(signal) ?? 0) + 1);
    }

    for (const [key, value] of seen) {
      const row = acc.get(key);
      if (row) {
        row.developers += 1;
        row.repos += value.repos;
        if (row.category === "Technology" && value.category !== "Technology") {
          row.category = value.category;
        }
      } else {
        acc.set(key, {
          name: value.name,
          category: value.category,
          developers: 1,
          repos: value.repos,
        });
      }
    }
  }

  const skills: BenchmarkSkill[] = [...acc.values()]
    .map((row) => {
      const frequency = Math.round((row.developers / cohortSize) * 100);
      return {
        name: row.name,
        category: row.category,
        tier: tierOf(frequency),
        frequency,
        developerCount: row.developers,
        cohortSize,
        repoCount: row.repos,
      };
    })
    // A single developer's personal habit is not a role pattern.
    .filter((s) => s.developerCount >= 2 && s.frequency >= 20)
    .sort((a, b) => b.frequency - a.frequency || b.repoCount - a.repoCount)
    .slice(0, 24);

  const signals = [...signalCount.entries()]
    .map(([name, count]) => ({ name, frequency: Math.round((count / cohortSize) * 100) }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8);

  void role;
  return { skills, signals };
}

export interface BenchmarkOptions {
  connectionKey?: string;
  /** Force a fresh cohort run even if a cached benchmark is still valid. */
  refresh?: boolean;
}

export async function getRoleBenchmark(
  role: RoleDefinition,
  opts: BenchmarkOptions = {},
): Promise<RoleBenchmark> {
  if (!opts.refresh) {
    const { data: cached } = await supabaseAdmin
      .from("role_benchmarks")
      .select("cohort, benchmark, computed_at")
      .eq("slug", role.slug)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.computed_at).getTime() < FRESH_MS) {
      const benchmark = cached.benchmark as unknown as {
        skills: BenchmarkSkill[];
        signals: { name: string; frequency: number }[];
      };
      const cohort = cached.cohort as unknown as CohortMember[];
      return {
        slug: role.slug,
        label: role.label,
        cohortSize: cohort.length,
        cohort,
        skills: benchmark.skills,
        signals: benchmark.signals ?? [],
        computedAt: cached.computed_at,
        cached: true,
      };
    }
  }

  const access: GitHubAccess = {
    connectionKey: opts.connectionKey,
    token: process.env["GITHUB_TOKEN"],
  };
  const nominations = await nominateCohort(role);
  const { getOrAnalyzeDeveloper } = await import("./analysis.server");

  const members: { profile: DeveloperProfile; why: string }[] = [];
  let attempts = 0;

  for (const nomination of nominations) {
    if (members.length >= TARGET_COHORT || attempts >= MAX_ANALYZED) break;
    // Verify first: one cheap request keeps hallucinated logins out of the
    // expensive deep-analysis path.
    let exists = true;
    try {
      await fetchUser(nomination.username, access);
    } catch {
      exists = false;
    }
    if (!exists) continue;

    attempts += 1;
    try {
      const { profile } = await getOrAnalyzeDeveloper(nomination.username, {
        ...(opts.connectionKey ? { connectionKey: opts.connectionKey } : {}),
      });
      members.push({ profile, why: nomination.why });
    } catch {
      // A single failed profile never sinks the cohort.
    }
  }

  if (members.length < MIN_COHORT) {
    throw new Error(
      `Only ${members.length} developer${members.length === 1 ? "" : "s"} could be analyzed for ${role.label} — too few for a trustworthy benchmark. Try again in a minute.`,
    );
  }

  const { skills, signals } = aggregateBenchmark(role, members);
  const cohort: CohortMember[] = members.map(({ profile, why }) => ({
    username: profile.username,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    primaryFocus: profile.primaryFocus,
    why,
    topProject: profile.topProjects[0]?.name ?? "—",
  }));
  const computedAt = new Date().toISOString();

  await supabaseAdmin.from("role_benchmarks").upsert({
    slug: role.slug,
    cohort: JSON.parse(JSON.stringify(cohort)),
    benchmark: JSON.parse(JSON.stringify({ skills, signals })),
    computed_at: computedAt,
  });

  return {
    slug: role.slug,
    label: role.label,
    cohortSize: cohort.length,
    cohort,
    skills,
    signals,
    computedAt,
    cached: false,
  };
}

function levelFor(
  benchmarkSkill: BenchmarkSkill,
  profile: DeveloperProfile,
): { level: GapLevel; strength: number; evidence: string } {
  const target = norm(benchmarkSkill.name);
  const matches = (value: string) => {
    const n = norm(value);
    if (!n) return false;
    return n === target || (target.length >= 3 && (n.includes(target) || target.includes(n)));
  };

  const skill: Skill | undefined = profile.skills.find((s) => matches(s.name));
  if (skill) {
    const repos = profile.topProjects.filter((p) => p.techStack.some(matches)).length;
    const suffix = repos > 0 ? ` · ${repos} project${repos === 1 ? "" : "s"}` : "";
    if (skill.proficiency === "expert" || skill.proficiency === "advanced") {
      return {
        level: skill.recent ? "strong" : "moderate",
        strength: skill.recent ? 90 : 65,
        evidence: (skill.evidence[0] ?? "Evidence across your repositories") + suffix,
      };
    }
    if (skill.proficiency === "intermediate") {
      return {
        level: "moderate",
        strength: 60,
        evidence: (skill.evidence[0] ?? "Used in your repositories") + suffix,
      };
    }
    return {
      level: "limited",
      strength: 32,
      evidence: (skill.evidence[0] ?? "Appears once in your work") + suffix,
    };
  }

  const inStack = profile.topProjects.some((p) => p.techStack.some(matches));
  if (inStack || profile.primaryLanguages.some(matches) || profile.currentFocus.some(matches)) {
    return { level: "limited", strength: 30, evidence: "Mentioned in a project stack only" };
  }
  if (profile.historicalSkills.some(matches)) {
    return { level: "limited", strength: 22, evidence: "Only in older work — not recent" };
  }
  return { level: "none", strength: 0, evidence: "Nothing public proves this yet" };
}

function verdictFor(skill: BenchmarkSkill, level: GapLevel): GapVerdict {
  if (level === "strong") return "match";
  if (level === "moderate") return skill.tier === "core" ? "improve" : "match";
  if (skill.tier === "core") return "critical";
  if (skill.tier === "important") return level === "limited" ? "improve" : "critical";
  return "optional";
}

export function buildGapRows(benchmark: RoleBenchmark, profile: DeveloperProfile) {
  const rows: RoleGapRow[] = benchmark.skills.map((skill) => {
    const { level, strength, evidence } = levelFor(skill, profile);
    return {
      skill: skill.name,
      category: skill.category,
      tier: skill.tier,
      frequency: skill.frequency,
      level,
      strength,
      verdict: verdictFor(skill, level),
      evidence,
    };
  });

  let weighted = 0;
  let total = 0;
  for (const row of rows) {
    const weight = (row.frequency / 100) * TIER_WEIGHT[row.tier];
    total += weight * 100;
    weighted += weight * row.strength;
  }
  const readiness = total === 0 ? 0 : Math.round((weighted / total) * 100);

  const order: Record<GapVerdict, number> = { critical: 0, improve: 1, match: 2, optional: 3 };
  rows.sort((a, b) => order[a.verdict] - order[b.verdict] || b.frequency - a.frequency);

  return { rows, readiness };
}

function fallbackPlan(rows: RoleGapRow[]): { phases: RoadmapPhase[]; blueprints: RoadmapBlueprint[] } {
  const gaps = rows.filter((r) => r.verdict === "critical" || r.verdict === "improve");
  const chunk = Math.max(1, Math.ceil(gaps.length / 3));
  const phases: RoadmapPhase[] = [0, 1, 2].map((i) => {
    const slice = gaps.slice(i * chunk, (i + 1) * chunk);
    return {
      title: ["Foundation", "Applied depth", "Production proof"][i] ?? "Phase",
      focus: `Close ${slice.length} of your highest-frequency gaps for this role.`,
      skills: slice.map((s) => s.skill),
      outcome: "Public repository evidence for each skill in this phase.",
      duration: "3-4 weeks",
    };
  });
  return { phases, blueprints: [] };
}

export async function buildRoadmap(
  role: RoleDefinition,
  benchmark: RoleBenchmark,
  profile: DeveloperProfile,
): Promise<RoleRoadmap> {
  const { rows, readiness } = buildGapRows(benchmark, profile);
  const gapSkills = rows
    .filter((r) => r.verdict === "critical" || r.verdict === "improve")
    .map((r) => ({ skill: r.skill, verdict: r.verdict, frequency: r.frequency, level: r.level }));

  const base: RoleRoadmap = {
    role: { slug: role.slug, label: role.label },
    username: profile.username,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    readiness,
    headline: `${profile.name} covers ${readiness}% of what the ${role.label} cohort demonstrates.`,
    leverage:
      gapSkills.length > 0
        ? `Your highest-leverage gaps are ${gapSkills
            .slice(0, 4)
            .map((g) => g.skill)
            .join(", ")}. You do not need to learn everything this cohort knows.`
        : "You already evidence the common pattern for this role — depth and scale are the next frontier.",
    rows,
    ...fallbackPlan(rows),
    benchmark: { cohortSize: benchmark.cohortSize, computedAt: benchmark.computedAt },
  };

  try {
    const ai = await callResponsesStructured<{
      headline: string;
      leverage: string;
      phases: RoadmapPhase[];
      blueprints: RoadmapBlueprint[];
    }>({
      schemaName: "role_roadmap",
      schema: ROADMAP_SCHEMA,
      effort: "medium",
      instructions:
        "You are the career reverse-engineering engine of a developer intelligence product. You are given a " +
        "role benchmark derived from real developers already in the role, and one developer's evidence-based " +
        "profile. Recommend only what closes the supplied gaps for THIS role — never everything the cohort " +
        "knows, never skills with no bearing on the role. Be concrete and honest; absence of evidence is not " +
        "evidence of absence of skill, so speak about public evidence. Projects must be production-shaped and " +
        "each must close several gaps at once. Use the exact gap skill names supplied in provesGaps and phase skills.",
      input: JSON.stringify({
        role: { label: role.label, means: role.hint },
        benchmark: {
          cohortSize: benchmark.cohortSize,
          pattern: benchmark.skills.map((s) => ({
            skill: s.name,
            tier: s.tier,
            frequency: s.frequency,
          })),
          expectedSignals: benchmark.signals,
        },
        developer: {
          username: profile.username,
          name: profile.name,
          primaryFocus: profile.primaryFocus,
          currentDirection: profile.currentDirection,
          languages: profile.primaryLanguages,
          projects: profile.topProjects.map((p) => ({
            name: p.name,
            stack: p.techStack,
            signals: p.signals,
            complexity: p.complexity,
          })),
        },
        readiness,
        gaps: gapSkills,
        strengths: rows.filter((r) => r.verdict === "match").map((r) => r.skill),
      }),
    });

    return {
      ...base,
      headline: ai.headline || base.headline,
      leverage: ai.leverage || base.leverage,
      phases: ai.phases?.length ? ai.phases.slice(0, 3) : base.phases,
      blueprints: ai.blueprints?.slice(0, 3) ?? [],
    };
  } catch {
    return base; // AI is additive — the deterministic gap map still ships.
  }
}
