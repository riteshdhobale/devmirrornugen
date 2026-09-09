import type { PaddleEnv } from "@/lib/paddle.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanTier =
  | "free"
  | "pro"
  | "career_pro"
  | "recruiter_starter"
  | "recruiter_pro"
  | "recruiter_business";

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Explorer",
  pro: "Pro",
  career_pro: "Career Pro",
  recruiter_starter: "Recruiter Starter",
  recruiter_pro: "Recruiter Pro",
  recruiter_business: "Recruiter Business",
};

/** Sentinel for "no practical cap" — kept finite so it survives JSON. */
export const UNLIMITED = 999_999;

export interface PlanLimits {
  /** Fresh GitHub analyses per month (cache hits are always free). */
  analyses: number;
  /** Developer-vs-developer comparisons per month. */
  comparisons: number;
  /** Recruiter candidate screenings per month. */
  candidates: number;
  seats: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { analyses: 3, comparisons: 1, candidates: 0, seats: 1 },
  pro: { analyses: UNLIMITED, comparisons: UNLIMITED, candidates: 0, seats: 1 },
  career_pro: { analyses: UNLIMITED, comparisons: UNLIMITED, candidates: 0, seats: 1 },
  recruiter_starter: { analyses: UNLIMITED, comparisons: UNLIMITED, candidates: 100, seats: 1 },
  recruiter_pro: { analyses: UNLIMITED, comparisons: UNLIMITED, candidates: 500, seats: 3 },
  recruiter_business: { analyses: UNLIMITED, comparisons: UNLIMITED, candidates: 2000, seats: 10 },
};

export type UsageKind = "analyses" | "comparisons" | "candidates";

const USAGE_COLUMN: Record<UsageKind, string> = {
  analyses: "analyses_used",
  comparisons: "comparisons_used",
  candidates: "candidates_used",
};

export interface Entitlement {
  plan: PlanTier;
  planLabel: string;
  active: boolean;
  productId: string | null;
  limits: PlanLimits;
  used: { analyses: number; comparisons: number; candidates: number };
  /** Convenience flags the UI gates on. */
  roleIntelligence: boolean;
  recruiter: boolean;
  /** Kept for backwards compatibility with existing comparison UI. */
  comparisonsUsed: number;
  comparisonsLimit: number;
}

/** Role Intelligence (benchmarks, roadmaps, blueprints) is a Career Pro feature. */
export function hasRoleIntelligence(plan: PlanTier): boolean {
  return plan !== "free" && plan !== "pro";
}

/** Any recruiter tier can screen candidates. */
export function isRecruiterPlan(plan: PlanTier): boolean {
  return (
    plan === "recruiter_starter" || plan === "recruiter_pro" || plan === "recruiter_business"
  );
}

/** Whether a subscription row counts as currently granting access. */
function isGranting(row: { status: string; current_period_end: string | null }): boolean {
  const now = Date.now();
  const end = row.current_period_end ? Date.parse(row.current_period_end) : NaN;
  const withinPeriod = !row.current_period_end || end > now;
  if (row.status === "active" || row.status === "trialing") return withinPeriod;
  // canceled keeps access until the period ends
  if (row.status === "canceled") return end > now;
  // past_due / paused — keep access; Paddle dunning handles revocation
  return row.status === "past_due" || row.status === "paused";
}

/** Maps the most recent active subscription product to a plan tier. */
function tierForProduct(productId: string | null): PlanTier {
  switch (productId) {
    case "career_pro_plan":
      return "career_pro";
    case "recruiter_business_plan":
      return "recruiter_business";
    case "recruiter_pro_plan":
      return "recruiter_pro";
    // legacy single recruiter product maps to Starter so nobody loses access
    case "recruiter_plan":
      return "recruiter_starter";
    case "pro_plan":
      return "pro";
    default:
      return "free";
  }
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

interface UsageRow {
  analyses_used?: number | null;
  comparisons_used?: number | null;
  candidates_used?: number | null;
}

async function readUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ analyses: number; comparisons: number; candidates: number }> {
  const { data } = await supabase
    .from("user_usage")
    .select("analyses_used, comparisons_used, candidates_used")
    .eq("user_id", userId)
    .eq("month_key", monthKey())
    .maybeSingle();
  const row = (data ?? {}) as UsageRow;
  return {
    analyses: row.analyses_used ?? 0,
    comparisons: row.comparisons_used ?? 0,
    candidates: row.candidates_used ?? 0,
  };
}

/**
 * Reads the signed-in user's most recent subscription and derives their plan,
 * limits, and month-to-date usage. `env` only controls which rows we read —
 * rows themselves are created exclusively by the verified payment webhook.
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  env: PaddleEnv,
  userId?: string,
): Promise<Entitlement> {
  let query = supabase
    .from("subscriptions")
    .select("user_id, product_id, status, current_period_end")
    .eq("environment", env);
  if (userId) query = query.eq("user_id", userId);

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const active = data ? isGranting(data) : false;
  const productId = active && data ? (data.product_id as string | null) : null;
  const plan = tierForProduct(productId);
  const limits = PLAN_LIMITS[plan];

  const resolvedUserId = userId ?? (data?.user_id as string | undefined);
  const used = resolvedUserId
    ? await readUsage(supabase, resolvedUserId)
    : { analyses: 0, comparisons: 0, candidates: 0 };

  return {
    plan,
    planLabel: PLAN_LABEL[plan],
    active,
    productId,
    limits,
    used,
    roleIntelligence: hasRoleIntelligence(plan),
    recruiter: isRecruiterPlan(plan),
    comparisonsUsed: used.comparisons,
    comparisonsLimit: limits.comparisons,
  };
}

export interface ConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Checks the monthly allowance for `kind` and only increments when the action
 * is allowed, so a blocked attempt is never billed against the quota.
 */
export async function consumeUsage(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanTier,
  kind: UsageKind,
  amount = 1,
): Promise<ConsumeResult> {
  const limit = PLAN_LIMITS[plan][kind];
  const column = USAGE_COLUMN[kind];
  const key = monthKey();

  const current = await readUsage(supabase, userId);
  const usedBefore = current[kind];

  if (usedBefore + amount > limit) {
    return { allowed: false, used: usedBefore, limit };
  }

  const used = usedBefore + amount;
  // Unlimited plans skip the write entirely — nothing to meter.
  if (limit >= UNLIMITED) return { allowed: true, used, limit };

  const { data: existing } = await supabase
    .from("user_usage")
    .select("id")
    .eq("user_id", userId)
    .eq("month_key", key)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_usage")
      .update({ [column]: used, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("month_key", key);
  } else {
    await supabase
      .from("user_usage")
      .insert({ user_id: userId, month_key: key, [column]: used });
  }

  return { allowed: true, used, limit };
}
