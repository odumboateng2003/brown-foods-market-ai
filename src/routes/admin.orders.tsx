import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Search, CalendarIcon, X,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

const STATUSES = ["pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"] as const;

type OrderRow = {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  total_ghs: number;
  status: string;
  payment_status: string;
  created_at: string;
};

type Bucket = "today" | "yesterday" | "this_week" | "this_month" | "previous";
const BUCKET_LABEL: Record<Bucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  previous: "Previous Months",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function bucketFor(iso: string): Bucket {
  const created = new Date(iso);
  const today = startOfDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  if (created >= today) return "today";
  if (created >= yesterday) return "yesterday";
  if (created >= weekAgo) return "this_week";
  if (created >= monthStart) return "this_month";
  return "previous";
}

function AdminOrders() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery<OrderRow[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,full_name,phone,city,total_ghs,status,payment_status,created_at")
        .order("created_at", { ascending: false });
      return (data ?? []) as OrderRow[];
    },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [date, setDate] = useState<Date | undefined>();
  const [open, setOpen] = useState<Record<Bucket, boolean>>({
    today: true, yesterday: true, this_week: true, this_month: false, previous: false,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
      if (date) {
        const day = startOfDay(new Date(o.created_at));
        if (day.getTime() !== startOfDay(date).getTime()) return false;
      }
      if (!q) return true;
      const idMatch = o.id.toLowerCase().includes(q.replace(/^#/, ""));
      const nameMatch = o.full_name.toLowerCase().includes(q);
      const phoneMatch = o.phone.toLowerCase().includes(q);
      return idMatch || nameMatch || phoneMatch;
    });
  }, [orders, search, statusFilter, paymentFilter, date]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, OrderRow[]> = {
      today: [], yesterday: [], this_week: [], this_month: [], previous: [],
    };
    filtered.forEach((o) => g[bucketFor(o.created_at)].push(o));
    return g;
  }, [filtered]);

  const summary = useMemo(() => {
    const total = orders.length;
    const today = orders.filter((o) => bucketFor(o.created_at) === "today").length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    return { total, today, pending, delivered };
  }, [orders]);

  const updateStatus = async (id: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and fulfill customer orders.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total orders" value={String(summary.total)} />
        <SummaryCard label="Today" value={String(summary.today)} />
        <SummaryCard label="Pending" value={String(summary.pending)} tone="amber" />
        <SummaryCard label="Delivered" value={String(summary.delivered)} tone="green" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, phone…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {date && (
          <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>
            <X className="mr-1 h-3 w-3" /> Clear date
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => {
          const list = grouped[b];
          const counts = {
            total: list.length,
            pending: list.filter((o) => o.status === "pending").length,
            delivered: list.filter((o) => o.status === "delivered").length,
            cancelled: list.filter((o) => o.status === "cancelled").length,
          };
          return (
            <Collapsible key={b} open={open[b]} onOpenChange={(o) => setOpen((s) => ({ ...s, [b]: o }))}>
              <div className="rounded-2xl border border-border bg-card shadow-card">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    {open[b] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-display text-base font-bold">{BUCKET_LABEL[b]}</span>
                    <Badge variant="secondary" className="ml-2">{counts.total}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] uppercase">
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-bold text-amber-700">{counts.pending} pending</span>
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-bold text-green-700">{counts.delivered} done</span>
                    <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-bold text-rose-700">{counts.cancelled} cancelled</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {list.length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-muted-foreground">No orders in this group.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                          <tr><th className="px-4 py-2">Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr>
                        </thead>
                        <tbody>
                          {list.map((o) => (
                            <tr key={o.id} className="border-t border-border">
                              <td className="px-4 py-2 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                              <td>
                                <div className="font-medium">{o.full_name}</div>
                                <div className="text-xs text-muted-foreground">{o.phone} • {o.city}</div>
                              </td>
                              <td>{formatGHS(o.total_ghs)}</td>
                              <td>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                  {o.payment_status}
                                </span>
                              </td>
                              <td>
                                <select
                                  value={o.status}
                                  onChange={(e) => updateStatus(o.id, e.target.value)}
                                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                                >
                                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = "spice" }: { label: string; value: string; tone?: "spice" | "amber" | "green" }) {
  const toneClass = tone === "amber" ? "text-amber-700" : tone === "green" ? "text-green-700" : "text-spice";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
