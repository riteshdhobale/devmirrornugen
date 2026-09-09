import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Returns the current Supabase user, refetching on auth state changes. */
export function useSupabaseUser() {
  const query = useQuery({
    queryKey: ["supabase-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
    staleTime: 30_000,
  });
  return query.data ?? null;
}
