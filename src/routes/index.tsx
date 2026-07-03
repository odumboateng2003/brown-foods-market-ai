import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Sparkles, ImageIcon, Leaf, Utensils, Wheat, Fish, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, type Product } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { usePublishedOrDefault } from "@/lib/site-content";
import heroImg from "@/assets/hero-basket.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

type Category = { id: string; name: string; slug: string; icon: string | null; image_url: string | null };

function Home() {
  const hero = usePublishedOrDefault("home_hero");
  const media = usePublishedOrDefault("home_media");
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,icon,image_url")
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
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
          <div className="relative z-10 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> {hero.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[1.02] tracking-tight text-foreground text-balance md:text-7xl">
              {hero.title}{" "}
              <span className="block text-primary">{hero.highlight}.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              {hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-fade-in-up animate-delay-200">
              <Button asChild size="xl" variant="hero">
                <Link to="/shop">
                  {hero.cta_primary} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/shop">{hero.cta_secondary}</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-xs animate-fade-in animate-delay-300">
              {[
                { icon: Truck, label: "Same-day delivery in Accra" },
                { icon: ShieldCheck, label: "Trusted local farmers" },
                { icon: Sparkles, label: "Always fresh, always real" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-start gap-1.5">
                  <f.icon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-in animate-delay-100">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-warm opacity-10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-warm">
              <img
                src={heroImg}
                alt="Fresh local foodstuffs in a wicker basket"
                width={1280}
                height={1024}
                className="aspect-[5/4] w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-warm md:block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Today's pick</div>
              <div className="font-display text-lg font-bold text-primary">Jollof essentials</div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Shop by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">Everything you need for your kitchen, in one market.</p>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex">
            <Link to="/shop">All categories <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug } as never}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm"
            >
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-secondary transition group-hover:scale-110">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
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
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">Trending in the market</h2>
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
        <div className="overflow-hidden rounded-3xl bg-gradient-warm p-8 text-primary-foreground md:p-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-5xl">{media.promo_title}</h2>
              <p className="mt-3 max-w-md text-primary-foreground/85">{media.promo_body}</p>
              <Button asChild size="xl" variant="gold" className="mt-6">
                <Link to="/login">{media.promo_cta}</Link>
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="ml-auto grid w-fit grid-cols-3 gap-2">
                {(() => {
                  const tiles = (media.promo_tile_images ?? []).filter(Boolean).slice(0, 6);
                  if (tiles.length > 0) {
                    return tiles.map((src, i) => (
                      <span key={i} className="h-20 w-20 overflow-hidden rounded-2xl bg-primary-foreground/10 backdrop-blur">
                        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </span>
                    ));
                  }
                  const icons = [Wheat, Leaf, Utensils, Flame, Fish, Sparkles];
                  return icons.map((Icon, i) => (
                    <span key={i} className="grid h-20 w-20 place-items-center rounded-2xl bg-primary-foreground/10 text-primary-foreground backdrop-blur">
                      <Icon className="h-8 w-8" />
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
