import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthCloseButton } from "@/components/auth-close-button";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Forgot password — BROWN Foods Market" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent — check your inbox.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-200px)] max-w-md place-items-center px-4 py-10">
      <div className="relative w-full rounded-3xl border border-border bg-card p-8 shadow-warm">
        <AuthCloseButton />
        <h1 className="font-display text-3xl font-bold">Forgot password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we'll send you a secure reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl bg-spice/5 p-4 text-sm">
            If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
            The link is valid for one hour.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it? <Link to="/login" className="font-semibold text-spice hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
