import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    // Default landing is dashboard; staff without dashboard access will be
    // redirected to /admin/orders by the parent layout.
    throw redirect({ to: "/admin/dashboard" });
  },
});
