import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "staff" | "customer";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isSuperAdmin = roles.includes("admin");
  const isAdminStaff = roles.includes("staff");

  return {
    roles,
    loading: loading || authLoading,
    isSuperAdmin,
    isAdminStaff,
    // Backward-compat aliases
    isAdmin: isSuperAdmin,
    isStaff: isSuperAdmin || isAdminStaff,
    // Combined: anyone with admin-area access
    hasAdminAccess: isSuperAdmin || isAdminStaff,
  };
}
