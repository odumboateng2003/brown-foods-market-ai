import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({ component: AdminUsers });

type Row = {
  id: string;
  full_name: string | null;
  created_at: string;
  roles: string[];
};

function AdminUsers() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      });
      return (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
      }));
    },
  });

  const setRole = async (userId: string, role: "admin" | "staff", grant: boolean) => {
    if (grant) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    }
    toast.success("Role updated");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage roles and access.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-2">User</th><th>Roles</th><th>Joined</th><th className="text-right pr-4">Actions</th></tr>
          </thead>
          <tbody>
            {data?.map((u) => {
              const isAdmin = u.roles.includes("admin");
              const isStaff = u.roles.includes("staff");
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.full_name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{u.id.slice(0, 8)}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">customer</span>}
                      {u.roles.map((r) => (
                        <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r === "admin" ? "bg-spice text-spice-foreground" : "bg-secondary"}`}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="pr-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setRole(u.id, "staff", !isStaff)}>
                      {isStaff ? <ShieldOff className="mr-1 h-4 w-4" /> : <Shield className="mr-1 h-4 w-4" />}
                      {isStaff ? "Revoke staff" : "Make staff"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRole(u.id, "admin", !isAdmin)}>
                      {isAdmin ? <ShieldOff className="mr-1 h-4 w-4" /> : <Shield className="mr-1 h-4 w-4" />}
                      {isAdmin ? "Revoke admin" : "Make admin"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
