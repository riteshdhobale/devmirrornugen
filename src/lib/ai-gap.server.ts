import type { ComparisonResult, DeveloperProfile } from "@/lib/mock/types";
import { callStructuredWithMetadata } from "./ai-gateway.server";

export interface GapAIResult {
  verdict: string;
  trajectory: string;
  gapInsights: { skill: string; insight: string }[];
  missions: { title: string; context: string; action: string }[];
}

const GAP_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      description:
        "3-4 sentence honest read of the distance between the two developers for the stated goal.",
    },
    trajectory: {
      type: "string",
      description:
        "2 sentences: the path from where the user is to where the target is, concretely.",
    },
    gapInsights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          skill: { type: "string" },
          insight: {
            type: "string",
            description:
              "One sentence: what the target does with this skill that the user doesn't.",
          },
        },
        required: ["skill", "insight"],
      },
    },
    missions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Short imperative mission name, 3-6 words." },
          context: {
            type: "string",
            description: "One sentence: why this mission closes the gap.",
          },
          action: { type: "string", description: "One concrete, specific, shippable action." },
        },
        required: ["title", "context", "action"],
      },
    },
  },
  required: ["verdict", "trajectory", "gapInsights", "missions"],
};

function compactProfile(p: DeveloperProfile) {
  return {
    username: p.username,
    primaryFocus: p.primaryFocus,
    stats: p.stats,
    primaryLanguages: p.primaryLanguages,
    currentDirection: p.currentDirection,
    currentFocus: p.currentFocus,
    skills: p.skills
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 14)
      .map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        confidence: s.confidence,
        evidence: s.evidence,
        recent: s.recent,
      })),
    topProjects: p.topProjects.slice(0, 5).map((pr) => ({
      name: pr.name,
      description: pr.description,
      stack: pr.techStack,
      stars: pr.stars,
      signals: pr.signals,
      complexity: pr.complexity,
    })),
  };
}

export async function generateGapAnalysis(
  you: DeveloperProfile,
  target: DeveloperProfile,
  result: ComparisonResult,
): Promise<GapAIResult> {
  const response = await callStructuredWithMetadata<GapAIResult>({
    provider: "nugen",
    schemaName: "gap_analysis",
    schema: GAP_SCHEMA,
    effort: "medium",
    instructions:
      "You are a domain-aligned Developer Skill & Engineering Intelligence model comparing two engineers. " +
      "Use only the supplied deterministic profiles and comparison records. Evidence is limited to GitHub metadata, " +
      "language statistics, repository topics/descriptions, and root-file signals; it does not include source code, " +
      "dependency manifests, README contents, commits, or implementation inspection. Treat unsupported information as " +
      "unknown, and do not turn an absence of public evidence into a claim of absence of skill. Write the layer " +
      "heuristics cannot: an honest verdict, a concrete trajectory, per-gap insight, and exactly 3 missions ordered " +
      "by impact. Reference only supplied real projects, skills, and evidence. No hype or generic advice like " +
      "'practice more' — every mission must be shippable and specific. gapInsights must cover each critical gap " +
      "using its exact supplied skill name.",
    input: JSON.stringify({
      goal: result.goalLabel,
      you: compactProfile(you),
      target: compactProfile(target),
      heuristic: {
        matchScore: result.matchScore,
        sharedStack: result.sharedStack,
        criticalGaps: result.criticalGaps.map((g) => ({
          skill: g.skill,
          targetLevel: g.targetProficiency,
          userLevel: g.userProficiency,
          targetEvidence: g.targetEvidence,
        })),
        skillsToImprove: result.skillsToImprove.map((g) => g.skill),
        strongMatches: result.strongMatches.map((g) => g.skill),
      },
    }),
  });
  return response.data;
}
