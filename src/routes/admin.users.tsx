import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  Search, Mail, Phone, ShoppingBag, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert, KeyRound,
  Ban, CheckCircle2, MoreHorizontal, Trash2, RotateCcw, FileText, Activity, UserX, Users, TrendingUp, ShoppingCart, CalendarDays,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useRoles } from "@/hooks/use-role";
import { formatGHS } from "@/lib/format";
import {
  listCustomers,
  getCustomerOrders,
  getCustomerActivity,
  sendCustomerPasswordReset,
  setCustomerBanned,
  softDeleteCustomer,
  restoreCustomer,
  hardDeleteCustomer,
  wipeAllCustomers,
  updateCustomerNotes,
  bulkCustomerAction,
  type CustomerRow,
  type CustomerOrder,
  type ActivityEvent,
} from "@/lib/customers.functions";

export const Route = createFileRoute("/admin/users")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Admin" }] }),
});

type Bucket = "today" | "this_week" | "this_month" | "older";
const BUCKET_LABEL: Record<Bucket, string> = {
  today: "Registered Today",
  this_week: "Registered This Week",
  this_month: "Registered This Month",
  older: "Older Customers",
};

function bucketFor(iso: string): Bucket {
  const created = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (created >= startOfToday) return "today";
  const weekAgo = new Date(startOfToday); weekAgo.setDate(weekAgo.getDate() - 7);
  if (created >= weekAgo) return "this_week";
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (created >= monthStart) return "this_month";
  return "older";
}

type Filter = "all" | "active" | "suspended" | "deleted" | "with_orders" | "without_orders" | "top_spenders";

function CustomersPage() {
  const { isSuperAdmin, hasAdminAccess, loading } = useRoles();
  const listFn = useServerFn(listCustomers);
  const resetFn = useServerFn(sendCustomerPasswordReset);
  const banFn = useServerFn(setCustomerBanned);
  const softDelFn = useServerFn(softDeleteCustomer);
  const restoreFn = useServerFn(restoreCustomer);
  const hardDelFn = useServerFn(hardDeleteCustomer);
  const wipeFn = useServerFn(wipeAllCustomers);
  const notesFn = useServerFn(updateCustomerNotes);
  const bulkFn = useServerFn(bulkCustomerAction);
  const getOrders = useServerFn(getCustomerOrders);
  const getActivity = useServerFn(getCustomerActivity);
  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listFn(),
    enabled: hasAdminAccess,
  });

  // Mutations
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-customers"] });
  const resetMut = useMutation({
    mutationFn: (email: string) => resetFn({ data: { email } }),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e) => toast.error((e as Error).message),
  });
  const banMut = useMutation({
    mutationFn: ({ user_id, banned }: { user_id: string; banned: boolean }) => banFn({ data: { user_id, banned } }),
    onSuccess: (_d, v) => { toast.success(v.banned ? "Account suspended" : "Account activated"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const softDelMut = useMutation({
    mutationFn: (user_id: string) => softDelFn({ data: { user_id } }),
    onSuccess: () => { toast.success("Customer soft-deleted"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const restoreMut = useMutation({
    mutationFn: (user_id: string) => restoreFn({ data: { user_id } }),
    onSuccess: () => { toast.success("Customer restored"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const hardDelMut = useMutation({
    mutationFn: (user_id: string) => hardDelFn({ data: { user_id, confirm: "PERMANENTLY DELETE" } }),
    onSuccess: () => { toast.success("Customer permanently deleted"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const wipeMut = useMutation({
    mutationFn: () => wipeFn({ data: { confirm: "WIPE ALL CUSTOMERS" } }),
    onSuccess: (d) => { toast.success(`${d.deleted} customer accounts deleted`); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const notesMut = useMutation({
    mutationFn: ({ user_id, notes }: { user_id: string; notes: string }) => notesFn({ data: { user_id, notes } }),
    onSuccess: () => { toast.success("Notes saved"); refetch(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const bulkMut = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: "suspend" | "reactivate" | "soft_delete" }) =>
      bulkFn({ data: { user_ids: ids, action } }),
    onSuccess: (d) => { toast.success(`Done: ${d.ok} succeeded, ${d.failed} failed`); refetch(); setSelected(new Set()); },
    onError: (e) => toast.error((e as Error).message),
  });

  // UI state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<CustomerRow | null>(null);
  const [activityCustomer, setActivityCustomer] = useState<CustomerRow | null>(null);
  const [notesCustomer, setNotesCustomer] = useState<CustomerRow | null>(null);
  const [notesText, setNotesText] = useState("");
  const [hardDeleteTarget, setHardDeleteTarget] = useState<CustomerRow | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Record<Bucket, boolean>>({
    today: true, this_week: true, this_month: true, older: false,
  });

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filter === "active" && (c.banned || c.deleted_at)) return false;
      if (filter === "suspended" && !c.banned && !c.deleted_at) return false;
      if (filter === "deleted" && !c.deleted_at) return false;
      if (filter === "with_orders" && c.orders_count === 0) return false;
      if (filter === "without_orders" && c.orders_count > 0) return false;
      if (!q) return true;
      return (
        c.email.toLowerCase().includes(q) ||
        (c.full_name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.customer_code ?? "").toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      if (filter === "top_spenders") return b.total_spent_ghs - a.total_spent_ghs;
      return a.created_at < b.created_at ? 1 : -1;
    });
  }, [customers, search, filter]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, CustomerRow[]> = { today: [], this_week: [], this_month: [], older: [] };
    filtered.forEach((c) => g[bucketFor(c.created_at)].push(c));
    return g;
  }, [filtered]);

  // Summary stats
  const summary = useMemo(() => {
    const active = customers.filter((c) => !c.banned && !c.deleted_at);
    const suspended = customers.filter((c) => c.banned || c.deleted_at);
    const newToday = customers.filter((c) => bucketFor(c.created_at) === "today");
    const newThisWeek = customers.filter((c) => ["today", "this_week"].includes(bucketFor(c.created_at)));
    const newThisMonth = customers.filter((c) => bucketFor(c.created_at) !== "older");
    const withOrders = customers.filter((c) => c.orders_count > 0);
    const totalSpent = customers.reduce((s, c) => s + c.total_spent_ghs, 0);
    const avgSpent = withOrders.length ? totalSpent / withOrders.length : 0;
    return {
      total: customers.length,
      active: active.length,
      suspended: suspended.length,
      newToday: newToday.length,
      newThisWeek: newThisWeek.length,
      newThisMonth: newThisMonth.length,
      withOrders: withOrders.length,
      withoutOrders: customers.length - withOrders.length,
      totalSpent,
      avgSpent,
    };
  }, [customers]);

  // Select helpers
  const allFilteredIds = useMemo(() => filtered.map((c) => c.user_id), [filtered]);
  const toggleAll = () => {
    if (selected.size === allFilteredIds.length) setSelected(new Set());
    else setSelected(new Set(allFilteredIds));
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!hasAdminAccess) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h1 className="font-display text-2xl font-bold">Admins only</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">All registered customers and their order history.</p>
        </div>
        {isSuperAdmin && (
          <Button variant="destructive" size="sm" onClick={() => setWipeOpen(true)}>
            <UserX className="mr-1 h-4 w-4" /> Wipe all customers
          </Button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" icon={<Users className="h-4 w-4" />} value={summary.total} />
        <StatCard label="Active" icon={<ShieldCheck className="h-4 w-4 text-green-600" />} value={summary.active} />
        <StatCard label="Suspended" icon={<ShieldAlert className="h-4 w-4 text-destructive" />} value={summary.suspended} />
        <StatCard label="Today" icon={<CalendarDays className="h-4 w-4" />} value={summary.newToday} />
        <StatCard label="This Week" icon={<CalendarDays className="h-4 w-4" />} value={summary.newThisWeek} />
        <StatCard label="This Month" icon={<CalendarDays className="h-4 w-4" />} value={summary.newThisMonth} />
        <StatCard label="With Orders" icon={<ShoppingCart className="h-4 w-4" />} value={summary.withOrders} />
        <StatCard label="Without Orders" icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} value={summary.withoutOrders} />
        <StatCard label="Lifetime Revenue" icon={<TrendingUp className="h-4 w-4" />} value={formatGHS(summary.totalSpent)} />
        <StatCard label="Avg Spending" icon={<TrendingUp className="h-4 w-4" />} value={formatGHS(summary.avgSpent)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, name, email, phone…" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deleted">Soft-deleted</SelectItem>
            <SelectItem value="with_orders">With orders</SelectItem>
            <SelectItem value="without_orders">Without orders</SelectItem>
            <SelectItem value="top_spenders">Top spenders</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && isSuperAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">Bulk actions ({selected.size})</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Apply to {selected.size} customers</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => bulkMut.mutate({ ids: [...selected], action: "suspend" })}>
                <Ban className="mr-2 h-4 w-4" /> Suspend
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkMut.mutate({ ids: [...selected], action: "reactivate" })}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Reactivate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => bulkMut.mutate({ ids: [...selected], action: "soft_delete" })}>
                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Soft-delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground">Loading customers…</div>
      ) : (
        <div className="space-y-3">
          {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
            <Collapsible key={b} open={open[b]} onOpenChange={(o) => setOpen((s) => ({ ...s, [b]: o }))}>
              <div className="rounded-2xl border border-border bg-card shadow-card">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    {open[b] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-display text-base font-bold">{BUCKET_LABEL[b]}</span>
                    <Badge variant="secondary" className="ml-2">{grouped[b].length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {grouped[b].length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-muted-foreground">No customers in this group.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            {isSuperAdmin && (
                              <th className="px-2 py-2">
                                <Checkbox checked={selected.size === allFilteredIds.length && allFilteredIds.length > 0} onCheckedChange={toggleAll} />
                              </th>
                            )}
                            <th className="px-4 py-2">Customer ID</th>
                            <th>Customer</th>
                            <th>Contact</th>
                            <th>Status</th>
                            <th>Orders</th>
                            <th>Spent</th>
                            <th>Last sign-in</th>
                            <th className="pr-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grouped[b].map((c) => (
                            <tr key={c.user_id} className="border-t border-border">
                              {isSuperAdmin && (
                                <td className="px-2 py-2">
                                  <Checkbox checked={selected.has(c.user_id)} onCheckedChange={() => toggle(c.user_id)} />
                                </td>
                              )}
                              <td className="px-4 py-2 font-mono text-xs">{c.customer_code ?? "—"}</td>
                              <td>
                                <div className="font-medium">{c.full_name ?? "—"}</div>
                                <div className="text-xs text-muted-foreground">Joined {new Date(c.created_at).toLocaleDateString()}</div>
                              </td>
                              <td>
                                <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{c.email}</div>
                                {c.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>}
                              </td>
                              <td>
                                {c.deleted_at ? (
                                  <Badge variant="destructive"><Trash2 className="mr-1 h-3 w-3" />Deleted</Badge>
                                ) : c.banned ? (
                                  <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3" />Suspended</Badge>
                                ) : c.email_confirmed ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><ShieldCheck className="mr-1 h-3 w-3" />Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Unverified</Badge>
                                )}
                              </td>
                              <td className="tabular-nums">{c.orders_count}</td>
                              <td className="tabular-nums">{formatGHS(c.total_spent_ghs)}</td>
                              <td className="text-xs text-muted-foreground">{c.last_sign_in_at ? new Date(c.last_sign_in_at).toLocaleString() : "Never"}</td>
                              <td className="pr-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => setViewing(c)}><ShoppingBag className="mr-1 h-3 w-3" />Orders</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setActivityCustomer(c)}><Activity className="mr-1 h-3 w-3" />Activity</Button>
                                  {isSuperAdmin && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Account controls</DropdownMenuLabel>
                                        <DropdownMenuItem disabled={!c.email || resetMut.isPending} onClick={() => resetMut.mutate(c.email)}>
                                          <KeyRound className="mr-2 h-4 w-4" />Password reset
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setNotesCustomer(c); setNotesText(c.admin_notes ?? ""); }}>
                                          <FileText className="mr-2 h-4 w-4" />Notes
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {c.banned || c.deleted_at ? (
                                          <DropdownMenuItem disabled={restoreMut.isPending} onClick={() => restoreMut.mutate(c.user_id)}>
                                            <RotateCcw className="mr-2 h-4 w-4 text-green-600" />Restore
                                          </DropdownMenuItem>
                                        ) : (
                                          <>
                                            <DropdownMenuItem disabled={banMut.isPending} onClick={() => { if (confirm("Suspend this customer? They won't be able to sign in or shop.")) banMut.mutate({ user_id: c.user_id, banned: true }); }}>
                                              <Ban className="mr-2 h-4 w-4 text-destructive" />Suspend
                                            </DropdownMenuItem>
                                            <DropdownMenuItem disabled={softDelMut.isPending} onClick={() => { if (confirm("Soft-delete this customer? They won't be able to sign in.")) softDelMut.mutate(c.user_id); }}>
                                              <Trash2 className="mr-2 h-4 w-4 text-destructive" />Soft-delete
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => setHardDeleteTarget(c)}>
                                          <UserX className="mr-2 h-4 w-4" />Permanently delete…
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CustomerOrdersDialog customer={viewing} onClose={() => setViewing(null)} getOrders={getOrders} />
      <ActivityDialog customer={activityCustomer} onClose={() => setActivityCustomer(null)} getActivity={getActivity} />
      <NotesDialog customer={notesCustomer} notes={notesText} setNotes={setNotesText} onSave={() => { if (notesCustomer) notesMut.mutate({ user_id: notesCustomer.user_id, notes: notesText }); setNotesCustomer(null); }} onClose={() => setNotesCustomer(null)} />
      <HardDeleteDialog target={hardDeleteTarget} onConfirm={() => { if (hardDeleteTarget) hardDelMut.mutate(hardDeleteTarget.user_id); setHardDeleteTarget(null); }} onClose={() => setHardDeleteTarget(null)} />
      <WipeDialog open={wipeOpen} onConfirm={() => { wipeMut.mutate(); setWipeOpen(false); }} onClose={() => setWipeOpen(false)} />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-display text-lg font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function CustomerOrdersDialog({ customer, onClose, getOrders }: { customer: CustomerRow | null; onClose: () => void; getOrders: ReturnType<typeof useServerFn<typeof getCustomerOrders>> }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", customer?.user_id],
    queryFn: () => getOrders({ data: { user_id: customer!.user_id } }),
    enabled: !!customer,
  });
  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer?.full_name ?? customer?.email}</DialogTitle>
          <DialogDescription>{customer?.customer_code ? <span className="font-mono">{customer.customer_code} • </span> : null}{customer?.email}{customer?.phone ? ` • ${customer.phone}` : ""}</DialogDescription>
        </DialogHeader>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading orders…</p> : orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Order</th><th>Date</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {orders.map((o: CustomerOrder) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td><Badge variant="secondary" className="text-[10px] uppercase">{o.status}</Badge></td>
                  <td><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{o.payment_status}</span></td>
                  <td className="text-right tabular-nums">{formatGHS(o.total_ghs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityDialog({ customer, onClose, getActivity }: { customer: CustomerRow | null; onClose: () => void; getActivity: ReturnType<typeof useServerFn<typeof getCustomerActivity>> }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["customer-activity", customer?.user_id],
    queryFn: () => getActivity({ data: { user_id: customer!.user_id } }),
    enabled: !!customer,
  });
  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity — {customer?.full_name ?? customer?.email}</DialogTitle>
        </DialogHeader>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">No activity recorded.</p> : (
          <ul className="space-y-2">
            {events.map((e: ActivityEvent, i: number) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(e.when).toLocaleString()}</span>
                <span>{e.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotesDialog({ customer, notes, setNotes, onSave, onClose }: { customer: CustomerRow | null; notes: string; setNotes: (v: string) => void; onSave: () => void; onClose: () => void }) {
  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Admin Notes — {customer?.full_name ?? customer?.email}</DialogTitle></DialogHeader>
        <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about this customer…" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="hero" onClick={onSave}>Save notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HardDeleteDialog({ target, onConfirm, onClose }: { target: CustomerRow | null; onConfirm: () => void; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {target?.full_name ?? target?.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The account will be removed from auth. Orders, receipts, and analytics remain.
            <br /><br />
            Type <span className="font-mono font-bold">DELETE</span> to confirm:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setTyped(""); onClose(); }}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={typed !== "DELETE"} onClick={() => { setTyped(""); onConfirm(); }}>Delete forever</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WipeDialog({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Wipe ALL customer accounts?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete every non-staff auth user. Orders and receipts remain but become orphaned. Staff accounts are preserved.
            <br /><br />
            Type <span className="font-mono font-bold">WIPE</span> to confirm:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="WIPE" />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setTyped(""); onClose(); }}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={typed !== "WIPE"} className="bg-destructive" onClick={() => { setTyped(""); onConfirm(); }}>Wipe all customers</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
