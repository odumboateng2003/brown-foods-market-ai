import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Returns whether the current signed-in customer is suspended (soft-deleted or banned).
 * Suspended customers cannot add to cart, checkout, or view their account.
 */
export function useCustomerStatus() {
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-account-status", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("deleted_at")
        .eq("id", user!.id)
        .maybeSingle();
      return { suspended: !!data?.deleted_at };
    },
    staleTime: 30_000,
  });
  return {
    loading: authLoading || (!!user && isLoading),
    suspended: !!data?.suspended,
  };
}

export const SUSPENDED_MESSAGE =
  "Your account has been suspended. Please contact Brown's Local Food Market Customer Support for assistance.";
