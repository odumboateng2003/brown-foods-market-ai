import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  Users,
  ArrowLeft,
  FileText,
  Wallet,
  UserCog,
  Palette,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — BROWN Foods Market" }] }),
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact: boolean;
  superOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, exact: false },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/categories", label: "Categories", icon: Tag, exact: false },
  { to: "/admin/users", label: "Customers", icon: Users, exact: false },
  { to: "/admin/finance", label: "Finance", icon: Wallet, exact: false, superOnly: true },
  { to: "/admin/content", label: "Website Content", icon: FileText, exact: false, superOnly: true },
  { to: "/admin/branding", label: "Branding", icon: Palette, exact: false, superOnly: true },
  { to: "/admin/staff", label: "Staff Management", icon: UserCog, exact: false, superOnly: true },
];

const SUPER_ONLY_PATHS = ["/admin/finance", "/admin/content", "/admin/branding", "/admin/staff"];

function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, isAdminStaff, hasAdminAccess, loading: roleLoading } = useRoles();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) navigate({ to: "/login" });
  }, [user, authLoading, roleLoading, navigate]);

  // Block Admin Staff from Super-Admin-only pages
  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (isSuperAdmin || !isAdminStaff) return;
    if (SUPER_ONLY_PATHS.some((p) => loc.pathname === p || loc.pathname.startsWith(p + "/"))) {
      navigate({ to: "/admin/dashboard" });
    }
  }, [loc.pathname, isSuperAdmin, isAdminStaff, authLoading, roleLoading, user, navigate]);

  if (authLoading || roleLoading) {
    return <div className="p-20 text-center text-muted-foreground">Loading admin…</div>;
  }
  if (!user) return null;
  if (!user.email_confirmed_at) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-muted-foreground">Confirm your email address to access the admin dashboard.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-spice hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    );
  }
  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-muted-foreground">You don't have access to the admin area.</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-spice hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => (n.superOnly ? isSuperAdmin : true));

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="mb-3 px-3 pt-2">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Admin
          </div>
          <div className="mt-1 text-xs font-semibold text-spice">
            {isSuperAdmin ? "Super Admin" : "Admin Staff"}
          </div>
        </div>
        <nav className="space-y-1">
          {visibleNav.map((n) => {
            const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-spice text-spice-foreground" : "text-foreground/80 hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
