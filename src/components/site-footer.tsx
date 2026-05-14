import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-bold text-spice-foreground">B</span>
              <span className="font-display text-xl font-bold">BROWN Foods Market</span>
            </div>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Authentic Ghanaian foodstuffs, delivered to your door. From Pona yam to scotch bonnet — sourced from trusted local farmers.
            </p>
            <p className="mt-4 max-w-md text-xs text-amber-700">
              Platform under development. Live payments are temporarily unavailable.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shop" className="hover:text-foreground">All products</Link></li>
              <li><Link to="/cart" className="hover:text-foreground">Cart</Link></li>
              <li><Link to="/orders" className="hover:text-foreground">My orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About us</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link></li>
              <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} BROWN Foods Market. Made with love in Accra.
        </p>
      </div>
    </footer>
  );
}
