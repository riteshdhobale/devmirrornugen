import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Like requireSupabaseAuth, but never throws: public server functions can use
 * it to learn *who* is calling (when a session bearer is attached) while still
 * serving anonymous callers. Context always carries `userId: string | null`.
 */
export const optionalSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    let userId: string | null = null;
    try {
      const request = getRequest();
      const authHeader = request?.headers.get("authorization");
      const token =
        authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const url = process.env["SUPABASE_URL"];
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
      if (token && token.split(".").length === 3 && url && key) {
        const supabase = createClient<Database>(url, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase.auth.getClaims(token);
        if (!error && data?.claims?.sub) userId = data.claims.sub;
      }
    } catch {
      userId = null; // treat any auth failure as anonymous
    }
    return next({ context: { userId } });
  },
);
