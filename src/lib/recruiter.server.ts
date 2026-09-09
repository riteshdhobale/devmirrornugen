import type { DeveloperProfile } from "@/lib/mock/types";
import type { CandidateFit, RoleSpec } from "@/lib/recruiter-types";
import { callResponsesStructured } from "./ai-gateway.server";

const ROLE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Normalized role title, e.g. 'Senior Backend Engineer'." },
    seniority: { type: "string", description: "Intern / Junior / Mid / Senior / Staff — inferred." },
    summary: {
      type: "string",
      description: "2 sentences: what this role actually needs someone to be able to build.",
    },
    requirements: {
      type: "array",
      description: "8-14 concrete technical requirements, ordered by weight then importance.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string", description: "Specific technology or capability, 1-4 words." },
          why: { type: "string", description: "One sentence: why this role needs it." },
          weight: { type: "string", enum: ["must-have", "important", "nice-to-have"] },
        },
        required: ["skill", "why", "weight"],
      },
    },
    portfolioBlueprints: {
      type: "array",
      description: "Exactly 3 GitHub projects a candidate should have shipped to be credible for this role.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Project name a repo could actually be called." },
          pitch: { type: "string", description: "One sentence on what it does and why it proves the role." },
          stack: { type: "array", items: { type: "string" } },
          mustShow: {
            type: "array",
            description: "3-5 things the repo must demonstrate (tests, CI, Docker, evals, README, deploy...).",
            items: { type: "string" },
          },
          scope: { type: "string", description: "Realistic scope/effort, e.g. '2-3 weekends'." },
        },
        required: ["name", "pitch", "stack", "mustShow", "scope"],
      },
    },
    screeningSignals: {
      type: "array",
      description: "4-6 things to look for on a GitHub profile that predict success in this role.",
      items: { type: "string" },
    },
    redFlags: {
      type: "array",
      description: "3-4 GitHub patterns that look impressive but do not prove this role.",
      items: { type: "string" },
    },
  },
  required: [
    "title",
    "seniority",
    "summary",
    "requirements",
    "portfolioBlueprints",
    "screeningSignals",
    "redFlags",
  ],
};

const FIT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      description: "3-4 sentences: an honest hiring read of this candidate against this role.",
    },
    matched: {
      type: "array",
      description: "Requirements the profile genuinely evidences.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string" },
          evidence: { type: "string", description: "The concrete repo/work that proves it." },
        },
        required: ["skill", "evidence"],
      },
    },
    missing: {
      type: "array",
      description: "Requirements with no evidence on the profile.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string" },
          note: { type: "string", description: "One sentence: what would have proven it." },
        },
        required: ["skill", "note"],
      },
    },
    standoutProject: { type: "string", description: "Name of the single most role-relevant project." },
    risks: { type: "array", description: "2-3 honest hiring risks.", items: { type: "string" } },
    interviewProbes: {
      type: "array",
      description: "Exactly 3 sharp, specific interview questions grounded in their actual repos.",
      items: { type: "string" },
    },
  },
  required: ["verdict", "matched", "missing", "standoutProject", "risks", "interviewProbes"],
};

export async function buildRoleSpec(jobDescription: string): Promise<RoleSpec> {
  return callResponsesStructured<RoleSpec>({
    schemaName: "role_spec",
    schema: ROLE_SCHEMA,
    effort: "low",
    instructions:
      "You decode job postings into an evidence-based technical spec for a developer intelligence product. " +
      "Strip recruiter fluff and buzzwords; keep only what a candidate must be able to build. " +
      "Portfolio blueprints must be concrete, shippable GitHub projects — never 'build a portfolio site' " +
      "or vague advice. Be specific about the engineering signals a reviewer can verify in a repo.",
    input: JSON.stringify({ jobDescription: jobDescription.slice(0, 12000) }),
  });
}

function norm(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9+#.]/g, "");
}

/** Deterministic requirement coverage — also the fallback when AI is unavailable. */
export function scoreCoverage(role: RoleSpec, profile: DeveloperProfile) {
  const haystack = new Set<string>();
  for (const s of profile.skills) haystack.add(norm(s.name));
  for (const t of [...profile.primaryLanguages, ...profile.currentFocus, ...profile.historicalSkills])
    haystack.add(norm(t));
  for (const p of profile.topProjects) for (const t of p.techStack) haystack.add(norm(t));

  const has = (skill: string) => {
    const n = norm(skill);
    if (!n) return false;
    for (const h of haystack) if (h === n || h.includes(n) || n.includes(h)) return true;
    return false;
  };

  const weightOf = { "must-have": 3, important: 2, "nice-to-have": 1 } as const;
  let total = 0;
  let earned = 0;
  const covered: string[] = [];
  const uncovered: string[] = [];

  for (const r of role.requirements) {
    const w = weightOf[r.weight] ?? 1;
    total += w;
    if (has(r.skill)) {
      earned += w;
      covered.push(r.skill);
    } else {
      uncovered.push(r.skill);
    }
  }

  const fitScore = total === 0 ? 0 : Math.round((earned / total) * 100);
  return { fitScore, covered, uncovered };
}

export async function screenCandidate(role: RoleSpec, profile: DeveloperProfile): Promise<CandidateFit> {
  const coverage = scoreCoverage(role, profile);
  const band: CandidateFit["band"] =
    coverage.fitScore >= 70 ? "strong" : coverage.fitScore >= 45 ? "possible" : "stretch";

  const base: CandidateFit = {
    username: profile.username,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    primaryFocus: profile.primaryFocus,
    fitScore: coverage.fitScore,
    band,
    verdict:
      profile.aiSummary ??
      `${profile.name} evidences ${coverage.covered.length} of ${role.requirements.length} requirements for ${role.title}.`,
    matched: coverage.covered.map((skill) => ({ skill, evidence: "Present in public repositories." })),
    missing: coverage.uncovered.map((skill) => ({ skill, note: "No public evidence found." })),
    standoutProject: profile.topProjects[0]?.name ?? "—",
    risks: [],
    interviewProbes: [],
  };

  try {
    const ai = await callResponsesStructured<{
      verdict: string;
      matched: { skill: string; evidence: string }[];
      missing: { skill: string; note: string }[];
      standoutProject: string;
      risks: string[];
      interviewProbes: string[];
    }>({
      schemaName: "candidate_fit",
      schema: FIT_SCHEMA,
      effort: "medium",
      instructions:
        "You are the screening engine of a developer intelligence product used by technical recruiters. " +
        "Judge only on evidence in the profile — repos, stack, engineering signals, activity. " +
        "Never inflate: absence of evidence is not evidence. Reference real project names. " +
        "Use the exact requirement skill names supplied. Interview probes must be answerable only by " +
        "someone who actually built the referenced work.",
      input: JSON.stringify({
        role: {
          title: role.title,
          seniority: role.seniority,
          summary: role.summary,
          requirements: role.requirements,
        },
        heuristicCoverage: coverage,
        candidate: {
          username: profile.username,
          name: profile.name,
          bio: profile.bio,
          primaryFocus: profile.primaryFocus,
          currentDirection: profile.currentDirection,
          stats: profile.stats,
          languages: profile.primaryLanguages,
          skills: profile.skills.map((s) => ({
            name: s.name,
            proficiency: s.proficiency,
            evidence: s.evidence.slice(0, 2),
          })),
          projects: profile.topProjects.map((p) => ({
            name: p.name,
            description: p.description,
            stack: p.techStack,
            signals: p.signals,
            complexity: p.complexity,
          })),
        },
      }),
    });
    return { ...base, ...ai };
  } catch {
    return base; // AI is additive — heuristic screening still ships.
  }
}
