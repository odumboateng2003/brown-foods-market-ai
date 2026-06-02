import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, KeyRound, Mail, Trash2, ShieldCheck, ShieldX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/use-role";
import {
  createStaff,
  deleteStaff,
  listStaff,
  listStaffActivity,
  sendStaffPasswordResetEmail,
  setStaffPassword,
  updateStaff,
  type StaffRow,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/admin/staff")({
  component: StaffManagement,
  head: () => ({ meta: [{ title: "Staff Management — Admin" }] }),
});

function StaffManagement() {
  const { isSuperAdmin, loading } = useRoles();
  const qc = useQueryClient();

  const listStaffFn = useServerFn(listStaff);
  const listActivityFn = useServerFn(listStaffActivity);
  const createFn = useServerFn(createStaff);
  const updateFn = useServerFn(updateStaff);
  const deleteFn = useServerFn(deleteStaff);
  const setPwFn = useServerFn(setStaffPassword);
  const sendResetFn = useServerFn(sendStaffPasswordResetEmail);

  const { data: staff = [] } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => listStaffFn(),
    enabled: isSuperAdmin,
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["admin-staff-activity"],
    queryFn: () => listActivityFn(),
    enabled: isSuperAdmin,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "staff">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<StaffRow | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-staff"] });
    qc.invalidateQueries({ queryKey: ["admin-staff-activity"] });
  };

  const createMut = useMutation({
    mutationFn: (input: { email: string; password: string; full_name: string; phone?: string; role: "admin" | "staff" }) =>
      createFn({ data: input }),
    onSuccess: () => {
      toast.success("Staff account created");
      setCreateOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (input: { user_id: string; full_name?: string; phone?: string | null; role?: "admin" | "staff"; status?: "active" | "suspended" | "disabled" }) =>
      updateFn({ data: input }),
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Staff account deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwMut = useMutation({
    mutationFn: (input: { user_id: string; new_password: string }) => setPwFn({ data: input }),
    onSuccess: () => {
      toast.success("Password updated");
      setPwTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendResetMut = useMutation({
    mutationFn: (email: string) =>
      sendResetFn({ data: { email, redirect_to: `${window.location.origin}/reset-password` } }),
    onSuccess: () => toast.success("Reset email sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h1 className="font-display text-2xl font-bold">Super Admin only</h1>
        <p className="mt-2 text-muted-foreground">You don't have permission to manage staff.</p>
      </div>
    );
  }

  const filtered = staff.filter((s) => {
    if (roleFilter !== "all" && s.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.full_name ?? "").toLowerCase().includes(q) ||
      (s.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">Create and manage Super Admins and Admin Staff (workers).</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New staff account
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone…"
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Super Admin</SelectItem>
            <SelectItem value="staff">Admin Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last sign in</th>
              <th className="pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.user_id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                  {s.phone && <div className="text-xs text-muted-foreground">{s.phone}</div>}
                </td>
                <td>
                  <Select
                    value={s.role}
                    onValueChange={(v) =>
                      updateMut.mutate({ user_id: s.user_id, role: v as "admin" | "staff" })
                    }
                  >
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Super Admin</SelectItem>
                      <SelectItem value="staff">Admin Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  <Select
                    value={s.status}
                    onValueChange={(v) =>
                      updateMut.mutate({
                        user_id: s.user_id,
                        status: v as "active" | "suspended" | "disabled",
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="text-xs text-muted-foreground">
                  {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : "Never"}
                </td>
                <td className="pr-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPwTarget(s)} title="Set password">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendResetMut.mutate(s.email)}
                      title="Send reset email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateMut.mutate({
                          user_id: s.user_id,
                          status: s.status === "active" ? "suspended" : "active",
                        })
                      }
                      title={s.status === "active" ? "Suspend" : "Activate"}
                    >
                      {s.status === "active" ? (
                        <ShieldX className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete ${s.email}? This cannot be undone.`)) {
                          deleteMut.mutate(s.user_id);
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No staff accounts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Activity log</h2>
        <p className="text-sm text-muted-foreground">Last 100 staff management actions.</p>
        <div className="mt-4 max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">When</th><th>Actor</th><th>Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-2 text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="text-xs">{a.actor_email ?? a.target_user_id?.slice(0, 8) ?? "—"}</td>
                  <td className="text-xs font-medium">{a.action}</td>
                  <td className="font-mono text-[11px] text-muted-foreground">{a.details}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No activity yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(v) => createMut.mutate(v)}
        loading={createMut.isPending}
      />
      <PasswordDialog
        target={pwTarget}
        onClose={() => setPwTarget(null)}
        onSubmit={(pw) => pwTarget && pwMut.mutate({ user_id: pwTarget.user_id, new_password: pw })}
        loading={pwMut.isPending}
      />
    </div>
  );
}

function CreateDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: { email: string; password: string; full_name: string; phone?: string; role: "admin" | "staff" }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "", role: "staff" as "admin" | "staff" });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create staff account</DialogTitle>
          <DialogDescription>The new account can sign in immediately with the password you set.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "admin" | "staff" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Admin Staff (worker)</SelectItem>
                <SelectItem value="admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={loading || !form.email || form.password.length < 8 || !form.full_name}
            onClick={() => onSubmit({ ...form, phone: form.phone || undefined })}
          >
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  target,
  onClose,
  onSubmit,
  loading,
}: {
  target: StaffRow | null;
  onClose: () => void;
  onSubmit: (pw: string) => void;
  loading: boolean;
}) {
  const [pw, setPw] = useState("");
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>For {target?.email}. Minimum 8 characters.</DialogDescription>
        </DialogHeader>
        <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={loading || pw.length < 8} onClick={() => onSubmit(pw)}>Update password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
