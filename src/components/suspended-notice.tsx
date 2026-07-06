import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUSPENDED_MESSAGE } from "@/hooks/use-customer-status";

export function SuspendedNotice() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="mt-4 font-display text-2xl font-bold">Account suspended</h1>
      <p className="mt-2 text-muted-foreground">{SUSPENDED_MESSAGE}</p>
      <Button asChild variant="hero" className="mt-6">
        <Link to="/contact">Contact support</Link>
      </Button>
    </div>
  );
}
