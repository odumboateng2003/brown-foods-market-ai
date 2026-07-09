import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { AuthCloseButton } from "@/components/auth-close-button";
import { toast } from "sonner";
import { resetCustomerPasswordByPhone } from "@/lib/auth.functions";
import { normalizeGhanaPhone } from "@/lib/phone";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — BROWN Foods Market" }] }),
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const resetByPhone = useServerFn(resetCustomerPasswordByPhone);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const canonical = normalizeGhanaPhone(phone);
    if (!canonical) {
      toast.error("Enter a valid Ghana phone number, e.g. 0241234567.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password is too weak — use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await resetByPhone({ data: { phone: canonical, newPassword: password } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Password updated. Please sign in with your new password.");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error((err as Error).message || "Could not reset your password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-200px)] max-w-md place-items-center px-4 py-10">
      <div className="relative w-full rounded-3xl border border-border bg-card p-8 shadow-warm">
        <AuthCloseButton />
        <h1 className="font-display text-3xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your registered phone number and choose a new password.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0241234567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput
              id="confirm"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full">
            {busy ? "Updating…" : "Reset password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-spice hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Staff accounts: please contact an administrator to reset your password.
        </p>
      </div>
    </div>
  );
}
