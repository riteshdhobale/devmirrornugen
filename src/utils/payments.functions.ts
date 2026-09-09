import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";
import { consumeUsage, getUserPlan, type Entitlement } from "@/lib/entitlements.server";

/** Resolve a human-readable price ID (e.g. pro_monthly) to a Paddle internal ID. */
export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}&status=active`,
    );
    const result = await response.json();
    const prices = (result.data ?? []) as { id: string; created_at?: string }[];
    if (!prices.length) throw new Error("Price not found");
    // A price ID can have historical rows; always use the newest active one.
    const newest = [...prices].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    )[0]!;
    return newest.id;
  });

const entitlementSchema = z.object({ environment: z.enum(["sandbox", "live"]) });

/** Returns the signed-in user's plan, limits, and month-to-date usage. */
export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entitlementSchema.parse(data))
  .handler(async ({ data, context }): Promise<Entitlement> => {
    return getUserPlan(context.supabase, data.environment, context.userId);
  });

/**
 * Records a comparison against the monthly allowance. Free users get 1/month;
 * paid plans are unlimited. The counter only moves when the action is allowed.
 */
export const recordComparisonUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entitlementSchema.parse(data))
  .handler(async ({ data, context }) => {
    const entitlement = await getUserPlan(context.supabase, data.environment, context.userId);
    const result = await consumeUsage(
      context.supabase,
      context.userId,
      entitlement.plan,
      "comparisons",
    );
    return { ...result, plan: entitlement.plan };
  });

/**
 * Records a fresh profile analysis against the monthly allowance. Free users
 * get 3/month; cached results never call this.
 */
export const recordAnalysisUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entitlementSchema.parse(data))
  .handler(async ({ data, context }) => {
    const entitlement = await getUserPlan(context.supabase, data.environment, context.userId);
    const result = await consumeUsage(
      context.supabase,
      context.userId,
      entitlement.plan,
      "analyses",
    );
    return { ...result, plan: entitlement.plan };
  });
