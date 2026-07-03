import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; to?: string; search?: Record<string, unknown> };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-6 flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
        <Home className="h-3.5 w-3.5" /> Home
      </Link>
      {items.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          {c.to && i < items.length - 1 ? (
            <Link to={c.to} search={c.search as never} className="hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
