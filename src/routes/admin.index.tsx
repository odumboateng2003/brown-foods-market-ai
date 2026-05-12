import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Package, Users, BadgeCent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 text-spice" />
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function AdminOverview() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, products, profiles, paid] = await Promise.all([
        supabase.from("orders").select("id,total_ghs,status,payment_status,created_at,full_name").order("created_at", { ascending: false }).limit(8),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_ghs").eq("payment_status", "paid"),
      ]);
      const revenue = (paid.data ?? []).reduce((s, o) => s + Number(o.total_ghs), 0);
      return {
        recent: orders.data ?? [],
        productCount: products.count ?? 0,
        userCount: profiles.count ?? 0,
        orderCount: orders.data?.length ?? 0,
        revenue,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's your store at a glance.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BadgeCent} label="Revenue (paid)" value={formatGHS(data?.revenue ?? 0)} />
        <StatCard icon={ShoppingBag} label="Recent orders" value={String(data?.orderCount ?? 0)} />
        <StatCard icon={Package} label="Products" value={String(data?.productCount ?? 0)} />
        <StatCard icon={Users} label="Customers" value={String(data?.userCount ?? 0)} />
      </div>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-bold">Recent orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Order</th><th>Customer</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {data?.recent.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="py-2 font-mono">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td>{o.full_name}</td>
                  <td><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{o.status}</span></td>
                  <td><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{o.payment_status}</span></td>
                  <td className="text-right font-semibold">{formatGHS(o.total_ghs)}</td>
                </tr>
              ))}
              {data?.recent.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
