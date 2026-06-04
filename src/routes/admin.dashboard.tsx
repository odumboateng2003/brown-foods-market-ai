import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  ShoppingBag, Package, Users, BadgeCent, AlertTriangle, Truck, CheckCircle2,
  XCircle, TrendingUp, DollarSign, Boxes,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  RadialBarChart, RadialBar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";
import { useRoles } from "@/hooks/use-role";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminOverview });

const LOW_STOCK_THRESHOLD = 5;

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  out_for_delivery: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const PIE_PALETTE = ["#c2410c", "#0d9488", "#8b5cf6", "#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

function StatCard({
  icon: Icon, label, value, hint, tone = "spice",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  tone?: "spice" | "green" | "blue" | "amber" | "rose";
}) {
  const toneClasses: Record<string, string> = {
    spice: "text-spice bg-spice/10",
    green: "text-green-600 bg-green-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    rose: "text-rose-600 bg-rose-500/10",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-warm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`grid h-9 w-9 place-items-center rounded-full ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function AdminOverview() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useRoles();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [orders, products, profiles, items, txns] = await Promise.all([
        supabase.from("orders").select("id,total_ghs,status,payment_status,created_at,full_name").order("created_at", { ascending: false }),
        supabase.rpc("get_admin_products"),
        supabase.from("profiles").select("id,created_at"),
        supabase.from("order_items").select("product_name,product_id,quantity,unit_price_ghs"),
        supabase.from("finance_transactions").select("type,amount_ghs,created_at"),
      ]);
      return {
        orders: orders.data ?? [],
        products: products.data ?? [],
        items: items.data ?? [],
        txns: txns.data ?? [],
        profiles: (profiles.data ?? []) as Array<{ id: string; created_at: string }>,
        userCount: profiles.data?.length ?? 0,
      };
    },
  });

  // Realtime updates
  useEffect(() => {
    const ch = supabase
      .channel("admin-analytics-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["admin-analytics"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => qc.invalidateQueries({ queryKey: ["admin-analytics"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => qc.invalidateQueries({ queryKey: ["admin-analytics"] }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const items = data?.items ?? [];
    const products = data?.products ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const paid = orders.filter((o) => o.payment_status === "paid");
    const revenue = paid.reduce((s, o) => s + Number(o.total_ghs), 0);
    const pendingDeliveries = orders.filter((o) => ["confirmed", "processing", "out_for_delivery"].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const lowStock = products.filter((p) => Number(p.stock) <= LOW_STOCK_THRESHOLD && Number(p.stock) > 0).length;
    const outOfStock = products.filter((p) => Number(p.stock) === 0).length;
    const inventoryUnits = products.reduce((s, p) => s + Number(p.stock), 0);
    const inventoryValue = products.reduce((s, p) => s + Number(p.stock) * Number(p.cost_price_ghs ?? 0), 0);

    // Profit (sold items only)
    let totalCost = 0;
    let totalSold = 0;
    items.forEach((it) => {
      const p = it.product_id ? productMap.get(it.product_id) : null;
      const cost = p ? Number(p.cost_price_ghs ?? 0) : 0;
      totalCost += cost * Number(it.quantity);
      totalSold += Number(it.quantity) * Number(it.unit_price_ghs);
    });
    const grossProfit = totalSold - totalCost;
    const margin = totalSold > 0 ? Math.round((grossProfit / totalSold) * 100) : 0;

    // Status pie
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1; });
    const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Payment pie
    const payCounts: Record<string, number> = {};
    orders.forEach((o) => { payCounts[o.payment_status] = (payCounts[o.payment_status] ?? 0) + 1; });
    const paymentPie = Object.entries(payCounts).map(([name, value]) => ({ name, value }));

    // Top products
    const productAgg: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach((it) => {
      const k = it.product_name;
      productAgg[k] ??= { name: k, qty: 0, revenue: 0 };
      productAgg[k].qty += Number(it.quantity);
      productAgg[k].revenue += Number(it.quantity) * Number(it.unit_price_ghs);
    });
    const topProducts = Object.values(productAgg).sort((a, b) => b.qty - a.qty).slice(0, 6);

    // Stock health (radial)
    const stockHealth = products.length > 0
      ? Math.round(((products.length - outOfStock - lowStock) / products.length) * 100)
      : 100;

    return {
      revenue, paid: paid.length, pendingDeliveries, completed, cancelled,
      lowStock, outOfStock, inventoryUnits, inventoryValue,
      grossProfit, totalCost, totalSold, margin,
      statusPie, paymentPie, topProducts, stockHealth,
    };
  }, [data]);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics dashboard</h1>
          <p className="text-muted-foreground">Live performance across orders, revenue, profit & inventory.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" /> Live
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BadgeCent} label="Revenue (paid)" value={formatGHS(stats.revenue)} hint={`${stats.paid} paid orders`} tone="green" />
        <StatCard icon={TrendingUp} label="Gross profit" value={formatGHS(stats.grossProfit)} hint={`${stats.margin}% margin`} tone="spice" />
        <StatCard icon={DollarSign} label="Total cost" value={formatGHS(stats.totalCost)} hint="Cost of goods sold" tone="rose" />
        <StatCard icon={Boxes} label="Inventory value" value={formatGHS(stats.inventoryValue)} hint={`${stats.inventoryUnits} units in stock`} tone="blue" />
        <StatCard icon={ShoppingBag} label="Total orders" value={String(data?.orders.length ?? 0)} hint={`${stats.completed} delivered`} tone="spice" />
        <StatCard icon={Users} label="Customers" value={String(data?.userCount ?? 0)} tone="blue" />
        <StatCard icon={Truck} label="Pending deliveries" value={String(stats.pendingDeliveries)} tone="amber" />
        <StatCard icon={AlertTriangle} label="Low / out of stock" value={`${stats.lowStock} / ${stats.outOfStock}`} hint={`≤ ${LOW_STOCK_THRESHOLD} units low`} tone="rose" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-2 font-display text-lg font-bold">Order status</h2>
          <p className="mb-4 text-xs text-muted-foreground">Live breakdown of all orders.</p>
          <div className="h-64 w-full">
            {stats.statusPie.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3} animationDuration={800}>
                    {stats.statusPie.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "#94a3b8"} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-2 font-display text-lg font-bold">Payment status</h2>
          <p className="mb-4 text-xs text-muted-foreground">Paid vs outstanding orders.</p>
          <div className="h-64 w-full">
            {stats.paymentPie.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.paymentPie} dataKey="value" nameKey="name" outerRadius={85} animationDuration={800} label={(d) => `${d.name}: ${d.value}`}>
                    {stats.paymentPie.map((s, i) => <Cell key={s.name} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-2 font-display text-lg font-bold">Stock health</h2>
          <p className="mb-4 text-xs text-muted-foreground">% of products well-stocked.</p>
          <div className="relative h-64 w-full">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "Stock", value: stats.stockHealth, fill: stats.stockHealth >= 70 ? "#10b981" : stats.stockHealth >= 40 ? "#f59e0b" : "#ef4444" }]} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={12} animationDuration={1000} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-display text-4xl font-bold tabular-nums">{stats.stockHealth}%</div>
                <div className="text-xs text-muted-foreground">healthy</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Most purchased products</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.topProducts} dataKey="qty" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={2} animationDuration={1000}>
                    {stats.topProducts.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} units`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{p.qty} units</div>
                    <div className="text-xs text-muted-foreground">{formatGHS(p.revenue)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Recent orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Order</th><th>Customer</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {(data?.orders ?? []).slice(0, 8).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2 font-mono">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td>{o.full_name}</td>
                  <td><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{o.status}</span></td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="text-right font-semibold">{formatGHS(o.total_ghs)}</td>
                </tr>
              ))}
              {(data?.orders.length ?? 0) === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
