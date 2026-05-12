import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Search, User as UserIcon, LogOut, Menu, Package, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    const load = async () => {
      const { count } = await supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setCount(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("cart-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/shop", search: { q: q || undefined } as never });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-bold text-spice-foreground shadow-warm">
            B
          </span>
          <div className="hidden sm:block">
            <div className="font-display text-lg font-bold leading-none text-foreground">BROWN</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Foods Market</div>
          </div>
        </Link>

        <form onSubmit={onSearch} className="relative ml-2 hidden flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jollof rice, palm oil, plantain…"
            className="h-10 rounded-full border-border bg-secondary/60 pl-10"
          />
        </form>

        <nav className="ml-auto flex items-center gap-1">
          <Link to="/shop" className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary md:inline-block">
            Shop
          </Link>
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label="Cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-spice px-1 text-[10px] font-bold text-spice-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><UserIcon className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/cart" })}>
                  <ShoppingCart className="mr-2 h-4 w-4" /> My Cart
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="spice" size="sm" className="hidden md:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
          )}

          <Button asChild variant="ghost" size="icon" className="md:hidden">
            <Link to="/shop" aria-label="Menu"><Menu className="h-5 w-5" /></Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
