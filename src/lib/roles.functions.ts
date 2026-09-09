import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { getRoleDefinition } from "@/lib/roles-types";
import type { BenchmarkResult, RoadmapResult, SavedRoadmap } from "@/lib/roles-types";
import { getUserPlan } from "@/lib/entitlements.server";
import type { PaddleEnv } from "@/lib/paddle.server";

const envField = z.enum(["sandbox", "live"]);

const slugSchema = z.object({
  slug: z.string().min(2).max(40),
  refresh: z.boolean().optional(),
  environment: envField,
});

const roadmapSchema = z.object({
  slug: z.string().min(2).max(40),
  username: z.string().min(1).max(100),
  environment: envField,
});

/**
 * Role Intelligence runs on the signed-in user's own GitHub connection so
 * cohort analysis never burns the shared server quota. Returns the key or a
 * "needs-github" signal the UI turns into a connect prompt.
 */
async function requireConnectionKey(userId: string): Promise<
  { ok: true; connectionKey: string } | { ok: false }
> {
  const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  const key = await getConnectionKeyForUser(userId, "github").catch(() => null);
  return key ? { ok: true, connectionKey: key } : { ok: false };
}

const NEEDS_GITHUB = {
  ok: false as const,
  reason: "needs-github" as const,
  message:
    "Connect your GitHub account to run role intelligence — cohort analysis uses your own GitHub quota, not a shared one.",
};

const NEEDS_UPGRADE = {
  ok: false as const,
  reason: "needs-upgrade" as const,
  requiredPlan: "Career Pro",
  message:
    "Role Intelligence — cohort benchmarks, gap analysis, phased roadmaps, and project blueprints — is a DevMirror Career Pro feature. Upgrade to reverse-engineer any role.",
};

/** Career Pro (or any recruiter tier) unlocks Role Intelligence. */
async function requireRoleIntelligence(
  userId: string,
  supabase: Parameters<typeof getUserPlan>[0],
  env: PaddleEnv,
): Promise<boolean> {
  const { roleIntelligence } = await getUserPlan(supabase, env, userId);
  return roleIntelligence;
}

/** Cohort + common skill pattern for a role (7-day shared cache). */
export const getRoleBenchmarkServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => slugSchema.parse(data))
  .handler(async ({ data, context }): Promise<BenchmarkResult> => {
    const role = getRoleDefinition(data.slug);
    if (!role) return { ok: false, reason: "error", message: "Unknown role." };

    if (!(await requireRoleIntelligence(context.userId, context.supabase, data.environment))) return NEEDS_UPGRADE;

    const access = await requireConnectionKey(context.userId);
    if (!access.ok) return NEEDS_GITHUB;

    const { getRoleBenchmark } = await import("./roles.server");
    try {
      const benchmark = await getRoleBenchmark(role, {
        connectionKey: access.connectionKey,
        ...(data.refresh ? { refresh: true } : {}),
      });
      return { ok: true, benchmark };
    } catch (err) {
      return {
        ok: false,
        reason: "error",
        message: err instanceof Error ? err.message : "Could not build this role benchmark.",
      };
    }
  });

/** Your gap against a role, plus the phased path and three project blueprints. */
export const buildRoadmapServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roadmapSchema.parse(data))
  .handler(async ({ data, context }): Promise<RoadmapResult> => {
    const role = getRoleDefinition(data.slug);
    if (!role) return { ok: false, reason: "error", message: "Unknown role." };

    if (!(await requireRoleIntelligence(context.userId, context.supabase, data.environment))) return NEEDS_UPGRADE;

    const access = await requireConnectionKey(context.userId);
    if (!access.ok) return NEEDS_GITHUB;

    const { getRoleBenchmark, buildRoadmap } = await import("./roles.server");
    const { getOrAnalyzeDeveloper } = await import("./analysis.server");
    try {
      const benchmark = await getRoleBenchmark(role, { connectionKey: access.connectionKey });
      const { profile } = await getOrAnalyzeDeveloper(data.username, {
        connectionKey: access.connectionKey,
      });
      return { ok: true, roadmap: await buildRoadmap(role, benchmark, profile) };
    } catch (err) {
      return {
        ok: false,
        reason: "error",
        message: err instanceof Error ? err.message : "Could not build your roadmap.",
      };
    }
  });

export const saveRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        roleSlug: z.string().min(2).max(40),
        roleLabel: z.string().min(1).max(60),
        githubUsername: z.string().min(1).max(100),
        readiness: z.number().min(0).max(100),
        roadmap: z.record(z.string(), z.unknown()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("user_roadmaps")
      .insert({
        user_id: context.userId,
        role_slug: data.roleSlug,
        role_label: data.roleLabel,
        github_username: data.githubUsername,
        readiness: Math.round(data.readiness),
        roadmap: data.roadmap as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listMyRoadmaps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedRoadmap[]> => {
    const { data, error } = await context.supabase
      .from("user_roadmaps")
      .select("id, role_slug, role_label, github_username, readiness, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      roleSlug: row.role_slug as string,
      roleLabel: row.role_label as string,
      githubUsername: row.github_username as string,
      readiness: row.readiness as number,
      createdAt: row.created_at as string,
    }));
  });

export const deleteRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_roadmaps").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
