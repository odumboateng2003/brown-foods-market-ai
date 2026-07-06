import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthCloseButton } from "@/components/auth-close-button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { lookupEmailByPhone, phoneAlreadyRegistered, checkAccountSuspension } from "@/lib/auth.functions";
import { looksLikeEmail, normalizeGhanaPhone, syntheticEmailForPhone } from "@/lib/phone";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — BROWN Foods Market" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const lookupEmail = useServerFn(lookupEmailByPhone);
  const checkPhone = useServerFn(phoneAlreadyRegistered);
  const checkSuspended = useServerFn(checkAccountSuspension);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // Sign in fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  // Sign up fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // optional
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || rolesLoading) return;
    // If signed-in customer has no phone, nudge them to /account to add it.
    if (!isAdmin) {
      supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data?.phone) {
            toast.message("Please add your phone number to your profile.");
            navigate({ to: "/account" });
          } else {
            navigate({ to: "/" });
          }
        });
    } else {
      navigate({ to: "/admin/dashboard" });
    }
  }, [user, isAdmin, rolesLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const canonicalPhone = normalizeGhanaPhone(phone);
        if (!canonicalPhone) {
          toast.error("Enter a valid Ghana phone, e.g. 0241234567");
          setBusy(false);
          return;
        }
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setBusy(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setBusy(false);
          return;
        }
        const trimmedEmail = email.trim();
        if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
          toast.error("Enter a valid email address or leave it blank");
          setBusy(false);
          return;
        }
        // Pre-check phone uniqueness for a friendly error.
        const { exists } = await checkPhone({ data: { phone: canonicalPhone } });
        if (exists) {
          toast.error("This phone number is already registered. Try signing in instead.");
          setBusy(false);
          return;
        }
        const signupEmail = trimmedEmail || syntheticEmailForPhone(canonicalPhone);
        const { data, error } = await supabase.auth.signUp({
          email: signupEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name, phone: canonicalPhone },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created — welcome!");
        } else {
          // Auto-confirm should be on; if not, still allow sign-in attempt.
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: signupEmail,
            password,
          });
          if (signInErr) {
            toast.success("Account created. Please sign in.");
            setMode("signin");
            setIdentifier(trimmedEmail || canonicalPhone);
          } else {
            toast.success("Account created — welcome!");
          }
        }
      } else {
        // Sign in: identifier may be email or phone
        const raw = identifier.trim();
        let loginEmail = raw;
        if (!looksLikeEmail(raw)) {
          const canonical = normalizeGhanaPhone(raw);
          if (!canonical) {
            toast.error("Enter your email address or Ghana phone (e.g. 0241234567)");
            setBusy(false);
            return;
          }
          const { email: foundEmail } = await lookupEmail({ data: { phone: canonical } });
          if (!foundEmail) {
            toast.error("No account found for that phone number.");
            setBusy(false);
            return;
          }
          loginEmail = foundEmail;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (error) {
          // Check if the account is suspended so we can show the right message.
          let suspended = false;
          try {
            const res = await checkSuspended({ data: { email: loginEmail } });
            suspended = res.suspended;
          } catch { /* ignore */ }
          if (suspended || /banned|suspend/i.test(error.message)) {
            toast.error("Your account has been suspended. Please contact Brown's Local Food Market Customer Support for assistance.");
          } else if (/confirm/i.test(error.message) || /verified/i.test(error.message)) {
            toast.error("Please verify your email first. Check your inbox for the confirmation link.");
          } else {
            toast.error("Invalid credentials. Please check and try again.");
          }
        } else {
          toast.success("Welcome back!");
          // redirect handled by useEffect once roles resolve
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message);
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-200px)] max-w-md place-items-center px-4 py-10">
      <div className="relative w-full rounded-3xl border border-border bg-card p-8 shadow-warm">
        <AuthCloseButton />
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-bold text-spice-foreground">B</span>
          <span className="font-display text-lg font-bold">BROWN Foods Market</span>
        </Link>
        <h1 className="font-display text-3xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in with your email or phone number."
            : "Register with your phone number to start shopping."}
        </p>

        <Button onClick={google} disabled={busy} variant="outline" size="lg" className="mt-6 w-full">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 16.7 6.61L19.5 3.8A11 11 0 0 0 1.18 8.05z"/><path fill="#34A853" d="M16.04 18.01A7.08 7.08 0 0 1 5.27 14.24l-4.1 3.16A11 11 0 0 0 19.5 20.2z"/><path fill="#4A90E2" d="M19.5 20.2c2.32-2.16 3.65-5.34 3.65-9.07 0-1.05-.18-2.18-.45-3.13H12v6.26h6.45c-.32 1.5-1.16 2.65-2.41 3.45z"/><path fill="#FBBC05" d="M5.27 14.24a6.6 6.6 0 0 1 0-4.48L1.18 6.6a11 11 0 0 0 0 10.8z"/></svg>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Akosua Mensah" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0241234567" required />
                <p className="text-xs text-muted-foreground">Your phone number is your primary login.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <PasswordInput id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Email or Phone Number</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or 0241234567"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
              </div>
            </>
          )}
          <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          {mode === "signin" && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-spice hover:underline">
                Forgot password?
              </Link>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to BROWN?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-spice hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
