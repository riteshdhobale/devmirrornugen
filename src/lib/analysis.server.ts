import type { DeveloperProfile } from "@/lib/mock/types";
import { getDemoDeveloper } from "@/lib/mock/developers";
import { analyzeGitHubUser } from "@/lib/github/analyze";
import type { GitHubAccess } from "@/lib/github/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enrichProfileWithAI } from "./ai-profile.server";

/** Cached analyses are served fresh for 24h — shared links load instantly. */
const FRESH_MS = 24 * 60 * 60 * 1000;

export interface AnalysisResult {
  profile: DeveloperProfile;
  cached: boolean;
  analyzedAt: string;
}

export interface CachedAnalysis extends AnalysisResult {
  /** False when the row exists but is older than the freshness window. */
  fresh: boolean;
}

/**
 * Cache-only lookup: curated demo profiles and previously analyzed developers.
 * Used to decide whether a request needs to spend a quota at all.
 */
export async function getCachedAnalysis(username: string): Promise<CachedAnalysis | null> {
  const key = username.trim().toLowerCase();

  const demo = getDemoDeveloper(key);
  if (demo) {
    return { profile: demo, cached: true, analyzedAt: new Date().toISOString(), fresh: true };
  }

  const { data } = await supabaseAdmin
    .from("analyses")
    .select("profile, analyzed_at")
    .eq("username", key)
    .maybeSingle();
  if (!data) return null;

  return {
    profile: data.profile as unknown as DeveloperProfile,
    cached: true,
    analyzedAt: data.analyzed_at,
    fresh: Date.now() - new Date(data.analyzed_at).getTime() < FRESH_MS,
  };
}

/** Runs a live GitHub analysis, enriches it with AI, and writes the cache. */
export async function analyzeAndCache(
  username: string,
  opts?: { connectionKey?: string },
): Promise<AnalysisResult> {
  const key = username.trim().toLowerCase();

  // Per-user GitHub connection (their quota) beats the shared server token,
  // which beats unauthenticated access.
  const access: GitHubAccess = {
    connectionKey: opts?.connectionKey,
    token: process.env["GITHUB_TOKEN"],
  };

  const heuristic = await analyzeGitHubUser(username.trim(), access);
  // AI enrichment is additive — a gateway failure never blocks an analysis.
  const profile = await enrichProfileWithAI(heuristic).catch(() => heuristic);
  const analyzedAt = new Date().toISOString();

  await supabaseAdmin
    .from("analyses")
    .upsert({ username: key, profile: JSON.parse(JSON.stringify(profile)), analyzed_at: analyzedAt });

  return { profile, cached: false, analyzedAt };
}

export async function getOrAnalyzeDeveloper(
  username: string,
  opts?: { connectionKey?: string },
): Promise<AnalysisResult> {
  const cached = await getCachedAnalysis(username);
  if (cached?.fresh) {
    return { profile: cached.profile, cached: true, analyzedAt: cached.analyzedAt };
  }

  try {
    return await analyzeAndCache(username, opts);
  } catch (error) {
    // An older cached analysis is still more useful than a hard failure when
    // GitHub has a transient outage or every available quota is exhausted.
    if (cached) {
      return { profile: cached.profile, cached: true, analyzedAt: cached.analyzedAt };
    }
    throw error;
  }
}
