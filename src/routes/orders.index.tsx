import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders/")({
  component: OrdersList,
  head: () => ({ meta: [{ title: "My orders — BROWN Foods Market" }] }),
});

function OrdersList() {
  const { user, loading } = useAuth();
  const { data: orders } = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total_ghs,status,payment_status,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to view your orders</h1>
        <Button asChild variant="hero" className="mt-6"><Link to="/login">Sign in</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 font-display text-3xl font-bold">My orders</h1>
      {orders?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          You haven't placed any orders yet. <Link to="/shop" className="text-spice underline">Start shopping</Link>.
        </div>
      )}
      <div className="space-y-3">
        {orders?.map((o) => (
          <Link
            key={o.id}
            to="/orders/$orderId"
            params={{ orderId: o.id }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:border-spice"
          >
            <div>
              <div className="font-mono text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
                o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700",
              )}>{o.payment_status}</span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase">{o.status}</span>
              <span className="font-display text-lg font-bold">{formatGHS(o.total_ghs)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
