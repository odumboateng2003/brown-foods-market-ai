import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Truck, ShieldCheck, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatGHS } from "@/lib/format";
import { toast } from "sonner";
import { StockBadge } from "@/components/stock-badge";
import { Breadcrumbs } from "@/components/breadcrumbs";


export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,description,price_ghs,sale_price_ghs,image_url,unit,stock,is_active,is_featured,category_id,created_at, categories(name,slug)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!product) return <div className="p-20 text-center">Product not found.</div>;

  const outOfStock = (product.stock ?? 0) <= 0;

  const addToCart = async () => {
    if (outOfStock) {
      toast.error("This item is out of stock");
      return;
    }
    if (!user) {
      toast("Sign in to add items");
      navigate({ to: "/login" });
      return;
    }
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
    }
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Breadcrumbs
        items={[
          { label: "Shop", to: "/shop" },
          ...(product.categories
            ? [{ label: product.categories.name, to: "/shop", search: { category: product.categories.slug } }]
            : []),
          { label: product.name },
        ]}
      />
      <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-secondary shadow-card">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="grid aspect-square w-full place-items-center text-muted-foreground"><ImageIcon className="h-16 w-16" /></div>
          )}
        </div>

        <div className="flex flex-col">
          {product.categories && (
            <Link
              to="/shop"
              search={{ category: product.categories.slug } as never}
              className="text-xs font-semibold uppercase tracking-wider text-spice"
            >
              {product.categories.name}
            </Link>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{product.name}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold">{formatGHS(product.price_ghs)}</span>
            <span className="text-sm text-muted-foreground">per {product.unit}</span>
          </div>
          <div className="mt-3">
            <StockBadge stock={product.stock ?? 0} size="md" />
          </div>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="xl" variant="hero" onClick={addToCart} disabled={outOfStock}>
              <ShoppingCart className="mr-1 h-5 w-5" /> {outOfStock ? "Out of stock" : "Add to cart"}
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link to="/cart">View cart</Link>
            </Button>
          </div>


          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 h-5 w-5 text-spice" />
              <div>
                <div className="font-semibold">Same-day delivery</div>
                <div className="text-xs text-muted-foreground">Across Greater Accra</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-spice" />
              <div>
                <div className="font-semibold">Quality guaranteed</div>
                <div className="text-xs text-muted-foreground">Or your money back</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
