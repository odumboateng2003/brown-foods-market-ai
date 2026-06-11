import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search, Mail, Phone, ShoppingBag, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRoles } from "@/hooks/use-role";
import { formatGHS } from "@/lib/format";
import {
  listCustomers,
  getCustomerOrders,
  type CustomerRow,
  type CustomerOrder,
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

function CustomersPage() {
  const { hasAdminAccess, loading } = useRoles();
  const listFn = useServerFn(listCustomers);
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => listFn(),
    enabled: hasAdminAccess,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "banned" | "unverified">("all");
  const [viewing, setViewing] = useState<CustomerRow | null>(null);
  const [open, setOpen] = useState<Record<Bucket, boolean>>({
    today: true, this_week: true, this_month: true, older: false,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (status === "active" && (c.banned || !c.email_confirmed)) return false;
      if (status === "banned" && !c.banned) return false;
      if (status === "unverified" && c.email_confirmed) return false;
      if (!q) return true;
      return (
        c.email.toLowerCase().includes(q) ||
        (c.full_name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.customer_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, search, status]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, CustomerRow[]> = { today: [], this_week: [], this_month: [], older: [] };
    filtered.forEach((c) => g[bucketFor(c.created_at)].push(c));
    return g;
  }, [filtered]);

  const summary = useMemo(() => {
    const totalSpent = customers.reduce((s, c) => s + c.total_spent_ghs, 0);
    const newToday = customers.filter((c) => bucketFor(c.created_at) === "today").length;
    const newThisWeek = customers.filter((c) => ["today", "this_week"].includes(bucketFor(c.created_at))).length;
    return { total: customers.length, newToday, newThisWeek, totalSpent };
  }, [customers]);

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
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total customers" value={String(summary.total)} />
        <SummaryCard label="New today" value={String(summary.newToday)} />
        <SummaryCard label="New this week" value={String(summary.newThisWeek)} />
        <SummaryCard label="Lifetime spend" value={formatGHS(summary.totalSpent)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unverified">Unverified email</SelectItem>
            <SelectItem value="banned">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                            <th className="px-4 py-2">Customer</th>
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
                              <td className="px-4 py-2">
                                <div className="font-medium">{c.full_name ?? "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                  Joined {new Date(c.created_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td>
                                <div className="text-xs"><Mail className="mr-1 inline h-3 w-3" />{c.email}</div>
                                {c.phone && <div className="text-xs text-muted-foreground"><Phone className="mr-1 inline h-3 w-3" />{c.phone}</div>}
                              </td>
                              <td>
                                {c.banned ? (
                                  <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3" />Suspended</Badge>
                                ) : c.email_confirmed ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><ShieldCheck className="mr-1 h-3 w-3" />Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Unverified</Badge>
                                )}
                              </td>
                              <td className="tabular-nums">{c.orders_count}</td>
                              <td className="tabular-nums">{formatGHS(c.total_spent_ghs)}</td>
                              <td className="text-xs text-muted-foreground">
                                {c.last_sign_in_at ? new Date(c.last_sign_in_at).toLocaleString() : "Never"}
                              </td>
                              <td className="pr-4 text-right">
                                <Button size="sm" variant="ghost" onClick={() => setViewing(c)}>
                                  <ShoppingBag className="mr-1 h-3 w-3" /> Orders
                                </Button>
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

      <CustomerOrdersDialog customer={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function CustomerOrdersDialog({ customer, onClose }: { customer: CustomerRow | null; onClose: () => void }) {
  const getOrders = useServerFn(getCustomerOrders);
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
          <DialogDescription>
            {customer?.email} {customer?.phone ? `• ${customer.phone}` : ""}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Order</th><th>Date</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {orders.map((o: CustomerOrder) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td><Badge variant="secondary" className="text-[10px] uppercase">{o.status}</Badge></td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {o.payment_status}
                    </span>
                  </td>
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
