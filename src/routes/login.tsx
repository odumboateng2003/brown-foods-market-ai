import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — BROWN Foods Market" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          toast.success("Account created — check your email to verify before signing in.");
        } else {
          toast.success("Account created!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/confirm/i.test(error.message) || /verified/i.test(error.message)) {
            toast.error("Please verify your email first. Check your inbox for the confirmation link.");
          } else throw error;
        } else {
          toast.success("Welcome back!");
          navigate({ to: "/" });
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
      <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-warm">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-bold text-spice-foreground">B</span>
          <span className="font-display text-lg font-bold">BROWN Foods Market</span>
        </Link>
        <h1 className="font-display text-3xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to continue shopping." : "Join thousands enjoying authentic Ghanaian foodstuffs."}
        </p>

        <Button onClick={google} disabled={busy} variant="outline" size="lg" className="mt-6 w-full">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 16.7 6.61L19.5 3.8A11 11 0 0 0 1.18 8.05z"/><path fill="#34A853" d="M16.04 18.01A7.08 7.08 0 0 1 5.27 14.24l-4.1 3.16A11 11 0 0 0 19.5 20.2z"/><path fill="#4A90E2" d="M19.5 20.2c2.32-2.16 3.65-5.34 3.65-9.07 0-1.05-.18-2.18-.45-3.13H12v6.26h6.45c-.32 1.5-1.16 2.65-2.41 3.45z"/><path fill="#FBBC05" d="M5.27 14.24a6.6 6.6 0 0 1 0-4.48L1.18 6.6a11 11 0 0 0 0 10.8z"/></svg>
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Akosua Mensah" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
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
