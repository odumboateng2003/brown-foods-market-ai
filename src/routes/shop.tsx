import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ProductCard, type Product } from "@/components/product-card";
import { supabase } from "@/integrations/supabase/client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: (s) => searchSchema.parse(s),
  component: Shop,
  head: () => ({
    meta: [
      { title: "Shop — BROWN Foods Market" },
      { name: "description", content: "Browse all Ghanaian foodstuffs available at BROWN Foods Market." },
    ],
  }),
});

type Category = { id: string; name: string; slug: string; icon: string | null };

function Shop() {
  const { category, q } = Route.useSearch();

  const { data: categories } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name,slug,icon").order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category, q],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id,name,slug,price_ghs,image_url,unit,stock,categories!inner(slug)")
        .order("created_at", { ascending: false });
      if (category) query = query.eq("categories.slug", category);
      if (q) query = query.ilike("name", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const activeCat = categories?.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Breadcrumbs
        items={[
          { label: "Shop", to: activeCat ? "/shop" : undefined },
          ...(activeCat ? [{ label: activeCat.name }] : []),
          ...(q && !activeCat ? [{ label: `Search: ${q}` }] : []),
        ]}
      />
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {activeCat ? activeCat.name : q ? `Results for "${q}"` : "All products"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {products?.length ?? 0} items available
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          to="/shop"
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition",
            !category ? "border-spice bg-spice text-spice-foreground" : "border-border bg-card hover:border-spice/40",
          )}
        >
          All
        </Link>
        {categories?.map((c) => (
          <Link
            key={c.id}
            to="/shop"
            search={{ category: c.slug } as never}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              category === c.slug
                ? "border-spice bg-spice text-spice-foreground"
                : "border-border bg-card hover:border-spice/40",
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">No products found.</div>
      )}
    </div>
  );
}
