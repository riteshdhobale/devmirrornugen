import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { getEntitlement } from "@/utils/payments.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import type { Entitlement } from "@/lib/entitlements.server";

export function useSubscription(): {
  entitlement: Entitlement | undefined;
  isLoading: boolean;
  refetch: () => void;
} {
  const user = useSupabaseUser();
  const fetchEntitlement = useServerFn(getEntitlement);
  const env = getPaddleEnvironment();

  const query = useQuery({
    queryKey: ["entitlement", user?.id, env],
    queryFn: () => fetchEntitlement({ data: { environment: env } }),
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    entitlement: query.data,
    isLoading: query.isLoading,
    refetch: () => query.refetch(),
  };
}
