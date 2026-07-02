import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Search, ShoppingCart, ChevronDown, ChevronRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRoles } from "@/hooks/use-role";
import { formatGHS } from "@/lib/format";
import { listCarts, type CartRow } from "@/lib/carts.functions";

export const Route = createFileRoute("/admin/carts")({
  component: AdminCartsPage,
  head: () => ({ meta: [{ title: "Cart Management — Admin" }] }),
});

const STATUS_LABEL: Record<CartRow["status"], string> = {
  active: "Active",
  abandoned: "Abandoned",
  converted: "Converted",
};

function AdminCartsPage() {
  const { hasAdminAccess, loading } = useRoles();
  const listFn = useServerFn(listCarts);
  const { data: carts = [], isLoading } = useQuery({
    queryKey: ["admin-carts"],
    queryFn: () => listFn(),
    enabled: hasAdminAccess,
    refetchInterval: 60_000,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | CartRow["status"]>("all");
  const [product, setProduct] = useState("");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pq = product.trim().toLowerCase();
    const now = Date.now();
    return carts.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (pq && !c.lines.some((l) => l.product_name.toLowerCase().includes(pq))) return false;
      if (q) {
        const hit =
          c.email.toLowerCase().includes(q) ||
          (c.customer_name ?? "").toLowerCase().includes(q) ||
          (c.customer_code ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (range !== "all") {
        const t = new Date(c.last_updated_at).getTime();
        const window = range === "today" ? 24 * 3600e3 : range === "week" ? 7 * 24 * 3600e3 : 30 * 24 * 3600e3;
        if (now - t > window) return false;
      }
      return true;
    });
  }, [carts, search, product, status, range]);

  const summary = useMemo(() => {
    const active = carts.filter((c) => c.status === "active").length;
    const abandoned = carts.filter((c) => c.status === "abandoned").length;
    const converted = carts.filter((c) => c.status === "converted").length;
    const totalValue = carts.reduce((s, c) => s + c.total_value_ghs, 0);
    return { total: carts.length, active, abandoned, converted, totalValue };
  }, [carts]);

  if (loading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!hasAdminAccess) return <div className="p-10 text-center">Admins only</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Cart Management</h1>
        <p className="text-muted-foreground">See every customer's shopping cart — including items sitting there before checkout.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total carts" value={String(summary.total)} />
        <SummaryCard label="Active" value={String(summary.active)} tone="ok" />
        <SummaryCard label="Abandoned" value={String(summary.abandoned)} tone="warn" />
        <SummaryCard label="Converted" value={String(summary.converted)} tone="info" />
        <SummaryCard label="Cart value in play" value={formatGHS(summary.totalValue)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, email, phone, ID…" className="pl-9" />
        </div>
        <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Filter by product name" className="w-56" />
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any time</SelectItem>
            <SelectItem value="today">Updated today</SelectItem>
            <SelectItem value="week">Updated this week</SelectItem>
            <SelectItem value="month">Updated this month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-muted-foreground">Loading carts…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No carts match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const isOpen = openMap[c.user_id] ?? false;
            return (
              <Collapsible key={c.user_id} open={isOpen} onOpenChange={(o) => setOpenMap((s) => ({ ...s, [c.user_id]: o }))}>
                <div className="rounded-2xl border border-border bg-card shadow-card">
                  <CollapsibleTrigger className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-left">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{c.customer_name ?? c.email}</span>
                        {c.customer_code && <span className="font-mono text-xs text-muted-foreground">{c.customer_code}</span>}
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.email}{c.phone ? ` • ${c.phone}` : ""} • Last update {new Date(c.last_updated_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="tabular-nums font-semibold text-foreground">{c.items_count} items</div>
                      <div className="tabular-nums">{c.total_qty} units</div>
                    </div>
                    <div className="text-right font-display text-lg font-bold tabular-nums">{formatGHS(c.total_value_ghs)}</div>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2">Product</th>
                            <th className="text-right">Unit price</th>
                            <th className="text-right">Qty</th>
                            <th className="pr-4 text-right">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.lines.map((l) => (
                            <tr key={l.product_id} className="border-t border-border">
                              <td className="px-4 py-2">{l.product_name}</td>
                              <td className="text-right tabular-nums">{formatGHS(l.unit_price_ghs)}</td>
                              <td className="text-right tabular-nums">{l.quantity}</td>
                              <td className="pr-4 text-right font-semibold tabular-nums">{formatGHS(l.line_total_ghs)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        First item added {new Date(c.first_added_at).toLocaleString()}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CartRow["status"] }) {
  if (status === "active") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><Clock className="mr-1 h-3 w-3" />{STATUS_LABEL.active}</Badge>;
  if (status === "converted") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><CheckCircle2 className="mr-1 h-3 w-3" />{STATUS_LABEL.converted}</Badge>;
  return <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />{STATUS_LABEL.abandoned}</Badge>;
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "info" }) {
  const cls = tone === "ok" ? "text-green-600" : tone === "warn" ? "text-amber-600" : tone === "info" ? "text-blue-600" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
