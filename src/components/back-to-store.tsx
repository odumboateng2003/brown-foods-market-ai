import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Back to Store" button used on About / Contact / Privacy / Terms / FAQ pages.
 * Returns users to the main store (homepage).
 */
export function BackToStore({ className }: { className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <Link to="/">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Store
      </Link>
    </Button>
  );
}
