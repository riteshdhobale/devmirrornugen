import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export const saveComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        yourUsername: z.string().min(1).max(100),
        targetUsername: z.string().min(1).max(100),
        careerGoal: z.string().min(1).max(60),
        result: z.record(z.string(), z.unknown()),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("comparisons")
      .insert({
        user_id: context.userId,
        you_username: data.yourUsername,
        target_username: data.targetUsername,
        goal: data.careerGoal,
        result: data.result as unknown as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listMyComparisons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("comparisons")
      .select("id, you_username, target_username, goal, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { comparisons: data ?? [] };
  });

export const deleteComparison = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("comparisons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
