import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders/$orderId")({
  component: OrderPage,
  head: () => ({ meta: [{ title: "Order — BROWN Foods Market" }] }),
});

const STATUS_STEPS = [
  { id: "pending", label: "Placed", icon: Clock },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { id: "processing", label: "Packed", icon: Package },
  { id: "out_for_delivery", label: "On the way", icon: Truck },
  { id: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

function OrderPage() {
  const { orderId } = Route.useParams();
  const { user, loading } = useAuth();

  const { data } = useQuery({
    enabled: !!user,
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: profile } = order
        ? await supabase
            .from("profiles")
            .select("customer_code,full_name,phone")
            .eq("id", order.user_id)
            .maybeSingle()
        : { data: null };
      return { order, items: items ?? [], payment, profile };
    },
    refetchInterval: 4000,
  });

  if (loading || !data?.order) return <div className="p-20 text-center text-muted-foreground">Loading order…</div>;

  const { order, items, payment } = data;
  const stepIdx = STATUS_STEPS.findIndex((s) => s.id === order.status);
  const isCancelled = order.status === "cancelled";
  const isPaid = order.payment_status === "paid";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl bg-gradient-warm p-6 text-spice-foreground shadow-warm md:p-8">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <CheckCircle2 className="h-4 w-4" /> Order placed
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
          Medaase, {order.full_name.split(" ")[0]}!
        </h1>
        <p className="mt-2 max-w-lg opacity-90">
          Order <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span> — total {formatGHS(order.total_ghs)}.
        </p>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-bold">Payment</h2>
        {payment ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">via {payment.provider.toUpperCase()} • {payment.phone}</div>
              <div className="font-mono text-sm">Ref: {payment.reference}</div>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold uppercase",
                isPaid ? "bg-green-100 text-green-700" :
                order.payment_status === "failed" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700 animate-pulse",
              )}
            >
              {order.payment_status}
            </span>
          </div>
        ) : <p className="text-muted-foreground">No payment recorded.</p>}
        {!isPaid && !isCancelled && (
          <p className="mt-3 text-xs text-muted-foreground">
            Authorize the prompt on your phone. This page updates automatically.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-6 font-display text-xl font-bold">Order tracking</h2>
        {isCancelled ? (
          <div className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> This order was cancelled.</div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {STATUS_STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i <= stepIdx;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-full border-2",
                      active ? "border-spice bg-spice text-spice-foreground" : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-bold">Items</h2>
        <ul className="space-y-2 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span>{it.product_name} × {it.quantity}</span>
              <span>{formatGHS(Number(it.unit_price_ghs) * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatGHS(order.subtotal_ghs)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatGHS(order.delivery_fee_ghs)}</dd></div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base">
            <dt className="font-semibold">Total</dt><dd className="font-bold">{formatGHS(order.total_ghs)}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="spice"><Link to="/shop">Continue shopping</Link></Button>
        <Button asChild variant="outline"><Link to="/orders">My orders</Link></Button>
      </div>
    </div>
  );
}
