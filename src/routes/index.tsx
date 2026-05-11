import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-market.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

type Category = { id: string; name: string; slug: string; icon: string | null };

function Home() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,icon")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,price_ghs,image_url,unit,stock")
        .eq("is_featured", true)
        .limit(8);
      if (error) throw error;
      return data as Product[];
    },
  });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-spice/20 bg-spice/10 px-3 py-1 text-xs font-medium text-spice">
              <Sparkles className="h-3.5 w-3.5" /> Fresh from Ghanaian farms
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-foreground text-balance md:text-6xl">
              The taste of <span className="bg-gradient-warm bg-clip-text text-transparent">home</span>, delivered.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              From Pona yam and scotch bonnet to smoked tilapia and red palm oil — authentic Ghanaian foodstuffs, sourced fresh and delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="xl" variant="hero">
                <Link to="/shop">Shop the market <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/shop">Browse categories</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-xs">
              {[
                { icon: Truck, label: "Same-day delivery in Accra" },
                { icon: ShieldCheck, label: "Trusted local farmers" },
                { icon: Sparkles, label: "Always fresh, always real" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-start gap-1.5">
                  <f.icon className="h-4 w-4 text-spice" />
                  <span className="text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-warm opacity-20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-warm">
              <img
                src={heroImg}
                alt="Vibrant Ghanaian foodstuffs flat-lay"
                width={1920}
                height={1080}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-warm md:block">
              <div className="text-xs text-muted-foreground">Today's pick</div>
              <div className="font-display text-lg font-bold">Jollof essentials</div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Shop by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">Everything you need for your kitchen, in one market.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug } as never}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-spice/40 hover:shadow-warm"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-cream text-2xl transition group-hover:scale-110">
                {c.icon ?? "🍲"}
              </span>
              <span className="text-xs font-medium text-foreground">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Trending in the market</h2>
            <p className="mt-1 text-sm text-muted-foreground">Hand-picked favourites flying off our shelves.</p>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link to="/shop">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* PROMO */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-warm p-8 text-spice-foreground md:p-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-5xl">Free delivery on your first order</h2>
              <p className="mt-3 max-w-md text-spice-foreground/85">
                Sign up today and we'll deliver your first basket of fresh foodstuffs anywhere in Greater Accra — on the house.
              </p>
              <Button asChild size="xl" variant="gold" className="mt-6">
                <Link to="/login">Create your account</Link>
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="ml-auto grid w-fit grid-cols-3 gap-2 text-5xl">
                {["🍚","🍠","🍅","🌶️","🐟","🫗"].map((e) => (
                  <span key={e} className="grid h-20 w-20 place-items-center rounded-2xl bg-spice-foreground/10 backdrop-blur">{e}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
