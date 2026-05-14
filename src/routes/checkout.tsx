import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHS } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — BROWN Foods Market" }] }),
});

const PROVIDERS = [
  { id: "mtn", label: "MTN Mobile Money", color: "bg-yellow-400 text-black", hint: "MoMo" },
  { id: "telecel", label: "Telecel Cash", color: "bg-red-600 text-white", hint: "Telecel" },
  { id: "airteltigo", label: "AirtelTigo Money", color: "bg-blue-600 text-white", hint: "AT Money" },
] as const;
type Provider = (typeof PROVIDERS)[number]["id"];

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(0|\+233)\d{9}$/, "Use a Ghana phone, e.g. 0241234567"),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  notes: z.string().max(500).optional().or(z.literal("")),
  momo_phone: z.string().trim().regex(/^(0|\+233)\d{9}$/, "Use a Ghana phone, e.g. 0241234567"),
});

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<Provider>("mtn");
  const [submitting, setSubmitting] = useState(false);

  const { data: items } = useQuery({
    enabled: !!user,
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, product:products(id,name,price_ghs,unit)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  const subtotal =
    items?.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s, i: any) => s + (i.product ? Number(i.product.price_ghs) * i.quantity : 0),
      0,
    ) ?? 0;
  const delivery = subtotal > 0 ? 25 : 0;
  const total = subtotal + delivery;

  if (!items || items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
        <Button asChild variant="hero" className="mt-6"><Link to="/shop">Shop now</Link></Button>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    toast.info("Payments are currently unavailable while the platform is under development.");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 font-display text-3xl font-bold md:text-4xl">Checkout</h1>
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Payments are currently unavailable</strong> while the platform is under
        development. You can browse the checkout flow, but no real Mobile Money charges will be made.
      </div>
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl font-bold">Delivery details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required defaultValue={user.user_metadata?.full_name ?? ""} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required placeholder="0241234567" />
              </div>
              <div>
                <Label htmlFor="city">City / Town</Label>
                <Input id="city" name="city" required placeholder="Accra" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" required placeholder="House / street / landmark" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="region">Region</Label>
                <Input id="region" name="region" required placeholder="Greater Accra" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Delivery notes (optional)</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 font-display text-xl font-bold">Payment method</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition",
                    provider === p.id ? "border-spice bg-spice/5" : "border-border hover:border-spice/40",
                  )}
                >
                  <div className={cn("mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold", p.color)}>
                    {p.hint}
                  </div>
                  <div className="text-sm font-semibold">{p.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="momo_phone">Mobile Money number</Label>
              <Input id="momo_phone" name="momo_phone" required placeholder="0241234567" />
              <p className="mt-2 text-xs text-muted-foreground">
                You'll receive a prompt on this number to authorize {formatGHS(total)}.
              </p>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (i: any) =>
                i.product && (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {i.product.name} × {i.quantity}
                    </span>
                    <span>{formatGHS(Number(i.product.price_ghs) * i.quantity)}</span>
                  </li>
                ),
            )}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatGHS(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatGHS(delivery)}</dd></div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-xl font-bold">{formatGHS(total)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" variant="hero" className="mt-6 w-full" disabled>
            Payments unavailable (dev mode)
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Live checkout will be enabled by the admin before launch.
          </p>
        </aside>
      </form>
    </div>
  );
}
