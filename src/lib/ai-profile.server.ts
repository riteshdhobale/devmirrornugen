import type { DeveloperProfile } from "@/lib/mock/types";
import { callStructuredWithMetadata } from "./ai-gateway.server";

interface ProfileInsight {
  summary: string;
  trajectory: string;
  projectInsights: { name: string; why: string }[];
}

const INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "3-4 sentence evidence-based profile of this developer as an engineer.",
    },
    trajectory: {
      type: "string",
      description: "2 sentences on where their work is heading, based on recent vs older repos.",
    },
    projectInsights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          why: {
            type: "string",
            description: "One sentence: why this project signals real ability.",
          },
        },
        required: ["name", "why"],
      },
    },
  },
  required: ["summary", "trajectory", "projectInsights"],
};

/**
 * Reads the heuristic evidence and writes the narrative layer heuristics
 * can't produce. Failures degrade gracefully — callers fall back to the
 * heuristic-only profile.
 */
export async function enrichProfileWithAI(profile: DeveloperProfile): Promise<DeveloperProfile> {
  const evidence = {
    username: profile.username,
    name: profile.name,
    bio: profile.bio,
    primaryFocus: profile.primaryFocus,
    secondaryFocus: profile.secondaryFocus,
    stats: profile.stats,
    primaryLanguages: profile.primaryLanguages,
    currentDirection: profile.currentDirection,
    currentFocus: profile.currentFocus,
    historicalSkills: profile.historicalSkills,
    skills: profile.skills
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 14)
      .map((s) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        evidence: s.evidence,
      })),
    topProjects: profile.topProjects.map((p) => ({
      name: p.name,
      description: p.description,
      stack: p.techStack,
      stars: p.stars,
      lastActive: p.lastActive,
      signals: p.signals,
    })),
  };

  const response = await callStructuredWithMetadata<ProfileInsight>({
    provider: "nugen",
    schemaName: "developer_profile_insight",
    schema: INSIGHT_SCHEMA,
    effort: "low",
    instructions:
      "You are a domain-aligned Developer Skill & Engineering Intelligence model. " +
      "You receive only deterministic GitHub-derived evidence and write an evidence-grounded narrative layer. " +
      "Use only the supplied evidence. This evidence comes from GitHub metadata, language statistics, repository " +
      "topics/descriptions, and root-file signals; it does not include source code, dependency manifests, README " +
      "contents, commits, or implementation inspection. Treat unsupported information as unknown. " +
      "Distinguish direct observation from reasonable inference, and do not claim a technology or proficiency that " +
      "the evidence does not support. Be specific and reference actual projects and signals. No hype or placeholders. " +
      "Write in second person plural neutral ('This developer...'). For projectInsights, cover up to 4 listed " +
      "projects using their exact names.",
    input: `GitHub evidence for @${profile.username}:\n${JSON.stringify(evidence)}`,
  });

  const insight = response.data;
  const projectInsights = insight.projectInsights.filter((pi) =>
    profile.topProjects.some((p) => p.name === pi.name),
  );

  return {
    ...profile,
    aiSummary: insight.summary,
    aiTrajectory: insight.trajectory,
    aiProjectInsights: projectInsights,
    aiProvenance: { provider: response.metadata.provider, model: response.metadata.model },
  };
}
