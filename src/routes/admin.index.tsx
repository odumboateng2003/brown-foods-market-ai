import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ShoppingBag, Package, Users, BadgeCent, AlertTriangle, Truck, CheckCircle2, XCircle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

const LOW_STOCK_THRESHOLD = 5;

function StatCard({
  icon: Icon, label, value, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 text-spice" />
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#8b5cf6",
  out_for_delivery: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [orders, products, profiles, items] = await Promise.all([
        supabase.from("orders").select("id,total_ghs,status,payment_status,created_at,full_name").order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,stock,price_ghs"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("order_items").select("product_name,quantity,unit_price_ghs"),
      ]);
      return {
        orders: orders.data ?? [],
        products: products.data ?? [],
        items: items.data ?? [],
        userCount: profiles.count ?? 0,
      };
    },
  });

  const stats = useMemo(() => {
    const orders = data?.orders ?? [];
    const items = data?.items ?? [];
    const products = data?.products ?? [];

    const paid = orders.filter((o) => o.payment_status === "paid");
    const revenue = paid.reduce((s, o) => s + Number(o.total_ghs), 0);
    const pendingDeliveries = orders.filter((o) => ["confirmed", "processing", "out_for_delivery"].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === "delivered").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    const lowStock = products.filter((p) => Number(p.stock) <= LOW_STOCK_THRESHOLD).length;
    const inventoryUnits = products.reduce((s, p) => s + Number(p.stock), 0);

    // Daily sales last 14 days
    const days: { date: string; revenue: number; orders: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ date: d.toISOString().slice(5, 10), revenue: 0, orders: 0 });
    }
    paid.forEach((o) => {
      const d = new Date(o.created_at);
      const key = d.toISOString().slice(5, 10);
      const bucket = days.find((x) => x.date === key);
      if (bucket) {
        bucket.revenue += Number(o.total_ghs);
        bucket.orders += 1;
      }
    });

    // Status pie
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1; });
    const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Top products
    const productAgg: Record<string, { name: string; qty: number; revenue: number }> = {};
    items.forEach((it) => {
      const k = it.product_name;
      productAgg[k] ??= { name: k, qty: 0, revenue: 0 };
      productAgg[k].qty += Number(it.quantity);
      productAgg[k].revenue += Number(it.quantity) * Number(it.unit_price_ghs);
    });
    const topProducts = Object.values(productAgg).sort((a, b) => b.qty - a.qty).slice(0, 6);

    return {
      revenue, paid: paid.length, pendingDeliveries, completed, cancelled,
      lowStock, inventoryUnits, days, statusPie, topProducts,
    };
  }, [data]);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics dashboard</h1>
        <p className="text-muted-foreground">Live performance across orders, revenue, and inventory.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BadgeCent} label="Revenue (paid)" value={formatGHS(stats.revenue)} hint={`${stats.paid} paid orders`} />
        <StatCard icon={ShoppingBag} label="Total orders" value={String(data?.orders.length ?? 0)} hint={`${stats.completed} delivered`} />
        <StatCard icon={Users} label="Customers" value={String(data?.userCount ?? 0)} />
        <StatCard icon={Package} label="Products" value={String(data?.products.length ?? 0)} hint={`${stats.inventoryUnits} units in stock`} />
        <StatCard icon={Truck} label="Pending deliveries" value={String(stats.pendingDeliveries)} />
        <StatCard icon={CheckCircle2} label="Completed" value={String(stats.completed)} />
        <StatCard icon={XCircle} label="Cancelled" value={String(stats.cancelled)} />
        <StatCard icon={AlertTriangle} label="Low stock items" value={String(stats.lowStock)} hint={`≤ ${LOW_STOCK_THRESHOLD} units`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-bold">Revenue — last 14 days</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatGHS(v)} />
                <Bar dataKey="revenue" fill="#c2410c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-bold">Order status</h2>
          <div className="h-64 w-full">
            {stats.statusPie.length === 0 ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.statusPie} dataKey="value" nameKey="name" outerRadius={80} label={(d) => d.name}>
                    {stats.statusPie.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "#94a3b8"} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold">Most purchased items</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip />
                <Bar dataKey="qty" fill="#0d9488" radius={[0, 6, 6, 0]} name="Units sold" />
              </BarChart>
            </ResponsiveContainer>
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
