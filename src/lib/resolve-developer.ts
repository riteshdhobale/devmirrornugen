import { getDemoDeveloper } from "@/lib/mock/developers";
import { analyzeDeveloperServer } from "@/lib/analysis.functions";
import { GitHubError } from "@/lib/github/api";
import { getPaddleEnvironment } from "@/lib/paddle";
import type { DeveloperProfile } from "@/lib/mock/types";

/**
 * Resolve any input to a DeveloperProfile.
 * Demo usernames ("you", "me", and the curated examples) return curated mock
 * data instantly; everything else goes through the server analysis pipeline
 * (GitHub fetch → heuristic extraction → AI enrichment), which caches results
 * so shared links load instantly.
 */
/** Thrown when a fresh analysis is blocked by sign-in or a monthly quota. */
export class AnalysisAccessError extends Error {
  constructor(
    public reason: "needs-auth" | "quota",
    message: string,
  ) {
    super(message);
    this.name = "AnalysisAccessError";
  }
}

export async function resolveDeveloper(username: string): Promise<DeveloperProfile> {
  const clean =
    username
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
      .replace(/\/+$/, "")
      .split("/")[0] ?? "";
  const demo = getDemoDeveloper(clean);
  if (demo) return demo;
  const res = await analyzeDeveloperServer({
    data: { username: clean, environment: getPaddleEnvironment() },
  });
  if (!res.ok) {
    if (res.reason === "needs-auth" || res.reason === "quota") {
      throw new AnalysisAccessError(res.reason, res.message);
    }
    throw new GitHubError(res.status, res.message);
  }
  return res.profile;
}

/** True when this username is served from curated demo data rather than GitHub. */
export function isDemoProfile(username: string): boolean {
  return getDemoDeveloper(username) !== null;
}
