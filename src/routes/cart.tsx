import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHS } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart — BROWN Foods Market" }] }),
});

type Row = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price_ghs: number;
    image_url: string | null;
    unit: string;
  } | null;
};

function CartPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    enabled: !!user,
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, product:products(id,name,slug,price_ghs,image_url,unit)")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-spice" />
        <h1 className="mt-4 font-display text-3xl font-bold">Your cart awaits</h1>
        <p className="mt-2 text-muted-foreground">Sign in to start shopping authentic Ghanaian foodstuffs.</p>
        <Button asChild size="lg" variant="hero" className="mt-6">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) {
      await supabase.from("cart_items").delete().eq("id", id);
    } else {
      await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["cart"] });
  };

  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] });
    toast.success("Removed from cart");
  };

  const subtotal = items?.reduce((s, i) => s + (i.product ? Number(i.product.price_ghs) * i.quantity : 0), 0) ?? 0;
  const delivery = subtotal > 0 ? 25 : 0;
  const total = subtotal + delivery;

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse the market and start adding fresh foodstuffs.</p>
        <Button asChild size="lg" variant="hero" className="mt-6">
          <Link to="/shop">Shop now</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-bold md:text-4xl">Your cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.map((row) => row.product && (
            <div key={row.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
              <Link to="/products/$slug" params={{ slug: row.product.slug }} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {row.product.image_url && <img src={row.product.image_url} alt={row.product.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to="/products/$slug" params={{ slug: row.product.slug }} className="font-semibold hover:text-spice">{row.product.name}</Link>
                    <div className="text-xs text-muted-foreground">per {row.product.unit}</div>
                  </div>
                  <button onClick={() => remove(row.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 rounded-full border border-border">
                    <button onClick={() => updateQty(row.id, row.quantity - 1)} className="grid h-8 w-8 place-items-center hover:bg-secondary rounded-l-full">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{row.quantity}</span>
                    <button onClick={() => updateQty(row.id, row.quantity + 1)} className="grid h-8 w-8 place-items-center hover:bg-secondary rounded-r-full">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="font-display text-lg font-bold">{formatGHS(Number(row.product.price_ghs) * row.quantity)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatGHS(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatGHS(delivery)}</dd></div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-xl font-bold">{formatGHS(total)}</dd>
            </div>
          </dl>
          <Button asChild size="lg" variant="hero" className="mt-6 w-full">
            <Link to="/checkout">Proceed to checkout</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Mobile Money, cards & cash on delivery</p>
        </aside>
      </div>
    </div>
  );
}
