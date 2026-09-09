import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { optionalSupabaseAuth } from "@/lib/optional-auth";

export type AnalyzeFailureReason = "needs-auth" | "quota" | "github";

export type AnalyzeServerResult =
  | {
      ok: true;
      profile: import("@/lib/mock/types").DeveloperProfile;
      cached: boolean;
      analyzedAt: string;
    }
  | { ok: false; status: number; message: string; reason: AnalyzeFailureReason };

function isLocalDevelopmentRequest(): boolean {
  const host = getRequest()?.headers.get("host")?.split(":")[0];
  return process.env.NODE_ENV === "development" && (host === "localhost" || host === "127.0.0.1");
}

export const analyzeDeveloperServer = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        username: z.string().min(1).max(100),
        environment: z.enum(["sandbox", "live"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<AnalyzeServerResult> => {
    const { getCachedAnalysis, analyzeAndCache } = await import("./analysis.server");

    // Anything already in the cache is free for everyone — shared links and
    // demo profiles never touch a quota.
    const cached = await getCachedAnalysis(data.username);
    if (cached?.fresh) {
      return { ok: true, profile: cached.profile, cached: true, analyzedAt: cached.analyzedAt };
    }

    // TODO(local-testing): remove this narrowly scoped bypass after Nugen assessment testing.
    // A localhost development request has no account or quota, but may run a fresh analysis.
    const localTestingBypass = !context.userId && isLocalDevelopmentRequest();

    // A fresh analysis costs GitHub + AI budget, so production requests require an account.
    if (!context.userId && !localTestingBypass) {
      if (cached) {
        return { ok: true, profile: cached.profile, cached: true, analyzedAt: cached.analyzedAt };
      }
      return {
        ok: false,
        status: 401,
        reason: "needs-auth",
        message:
          "Sign in to run a fresh analysis. Free accounts get 3 profile analyses every month.",
      };
    }

    if (!localTestingBypass) {
      const env = data.environment ?? "sandbox";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getUserPlan, consumeUsage } = await import("@/lib/entitlements.server");
      const entitlement = await getUserPlan(supabaseAdmin as never, env, context.userId!);
      const quota = await consumeUsage(
        supabaseAdmin as never,
        context.userId!,
        entitlement.plan,
        "analyses",
      );

      if (!quota.allowed) {
        if (cached) {
          return { ok: true, profile: cached.profile, cached: true, analyzedAt: cached.analyzedAt };
        }
        return {
          ok: false,
          status: 402,
          reason: "quota",
          message: `You've used all ${quota.limit} free analyses this month. Upgrade to Pro for unlimited profile analysis.`,
        };
      }
    }

    try {
      // Signed-in users with a connected GitHub account spend their own quota.
      const connectionKey = context.userId
        ? await import("@/server/appUserConnections.server")
            .then(({ getConnectionKeyForUser }) =>
              getConnectionKeyForUser(context.userId!, "github"),
            )
            .catch(() => null)
        : null;
      const result = await analyzeAndCache(
        data.username,
        connectionKey ? { connectionKey } : undefined,
      );
      return { ok: true, ...result };
    } catch (err) {
      if (cached) {
        return { ok: true, profile: cached.profile, cached: true, analyzedAt: cached.analyzedAt };
      }
      const { GitHubError } = await import("@/lib/github/api");
      if (err instanceof GitHubError) {
        return { ok: false, status: err.status, message: err.message, reason: "github" };
      }
      throw err;
    }
  });
