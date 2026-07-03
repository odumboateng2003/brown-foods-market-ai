import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";

/** X close button for authentication pages. Returns to previous page if available, else Home. */
export function AuthCloseButton() {
  const navigate = useNavigate();
  const onClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/" });
    }
  };
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-secondary hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
