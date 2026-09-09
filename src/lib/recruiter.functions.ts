import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RoleResult, ScreenResult } from "@/lib/recruiter-types";
import { consumeUsage, getUserPlan } from "@/lib/entitlements.server";

const jdSchema = z.object({ jobDescription: z.string().min(40).max(12000) });

const screenSchema = z.object({
  jobDescription: z.string().min(40).max(12000),
  usernames: z.array(z.string().min(1).max(100)).min(1).max(4),
  environment: z.enum(["sandbox", "live"]),
});

/** Decode a job posting into a role spec + the GitHub projects it demands. */
export const decodeRoleServer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => jdSchema.parse(data))
  .handler(async ({ data }): Promise<RoleResult> => {
    const { buildRoleSpec } = await import("./recruiter.server");
    try {
      return { ok: true, role: await buildRoleSpec(data.jobDescription) };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Could not decode this posting." };
    }
  });

/** Decode the posting, then screen up to four GitHub candidates against it. */
export const screenCandidatesServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => screenSchema.parse(data))
  .handler(async ({ data, context }): Promise<ScreenResult> => {
    const { buildRoleSpec, screenCandidate } = await import("./recruiter.server");
    const { getOrAnalyzeDeveloper } = await import("./analysis.server");

    // Candidate screening is a Recruiter-plan feature, metered per tier.
    const { plan, recruiter } = await getUserPlan(
      context.supabase,
      data.environment,
      context.userId,
    );
    if (!recruiter) {
      return {
        ok: false,
        needsUpgrade: true,
        message:
          "Candidate screening is a DevMirror Recruiter feature. Upgrade to screen GitHub candidates against any job posting.",
      };
    }

    const unique = [...new Set(data.usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))];
    const quota = await consumeUsage(
      context.supabase,
      context.userId,
      plan,
      "candidates",
      unique.length,
    );
    if (!quota.allowed) {
      return {
        ok: false,
        needsUpgrade: true,
        message: `You've used ${quota.used} of ${quota.limit} candidate analyses this month. Upgrade your recruiter plan for more headroom.`,
      };
    }

    // Signed-in users with a connected GitHub account spend their own quota.
    const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
    const connectionKey = await getConnectionKeyForUser(context.userId, "github").catch(() => null);
    const opts = connectionKey ? { connectionKey } : undefined;

    let role;
    try {
      role = await buildRoleSpec(data.jobDescription);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Could not decode this posting." };
    }

    const failed: { username: string; message: string }[] = [];

    const settled = await Promise.all(
      unique.map(async (username) => {
        try {
          const { profile } = await getOrAnalyzeDeveloper(username, opts);
          return await screenCandidate(role, profile);
        } catch (err) {
          failed.push({
            username,
            message: err instanceof Error ? err.message : "Analysis failed.",
          });
          return null;
        }
      }),
    );

    const candidates = settled
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.fitScore - a.fitScore);

    return { ok: true, role, candidates, failed };
  });
