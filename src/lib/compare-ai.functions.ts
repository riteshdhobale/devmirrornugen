import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { optionalSupabaseAuth } from "@/lib/optional-auth";

const GOALS = [
  "ai-engineer",
  "ml-engineer",
  "backend-engineer",
  "fullstack-engineer",
  "software-engineer",
  "data-scientist",
  "web3-engineer",
] as const;

export const generateGapAnalysisServer = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        you: z.string().min(1).max(100),
        target: z.string().min(1).max(100),
        goal: z.enum(GOALS),
        environment: z.enum(["sandbox", "live"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getOrAnalyzeDeveloper } = await import("./analysis.server");
    const { compareDevelopers } = await import("@/lib/mock/comparison");
    const { generateGapAnalysis } = await import("./ai-gap.server");

    // Signed-in users with a connected GitHub account spend their own quota.
    let connectionKey: string | null = null;
    if (context.userId) {
      const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
      connectionKey = await getConnectionKeyForUser(context.userId, "github").catch(() => null);
    }
    const opts = connectionKey ? { connectionKey } : undefined;

    const [youResult, targetResult] = await Promise.all([
      getOrAnalyzeDeveloper(data.you, opts),
      getOrAnalyzeDeveloper(data.target, opts),
    ]);
    const heuristic = compareDevelopers(youResult.profile, targetResult.profile, data.goal);
    return generateGapAnalysis(youResult.profile, targetResult.profile, heuristic);
  });
