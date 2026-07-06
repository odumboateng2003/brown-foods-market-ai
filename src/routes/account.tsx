import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCustomerStatus } from "@/hooks/use-customer-status";
import { SuspendedNotice } from "@/components/suspended-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatGHS } from "@/lib/format";
import { normalizeGhanaPhone, isSyntheticEmail } from "@/lib/phone";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "My Account — BROWN Foods Market" }] }),
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^(0|\+233)\d{9}$/, "Use a Ghana phone, e.g. 0241234567"),
});

function AccountPage() {
  const { user, loading } = useAuth();
  const { suspended } = useCustomerStatus();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: profile, refetch } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone,customer_code,created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    enabled: !!user,
    queryKey: ["my-order-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("total_ghs,payment_status")
        .eq("user_id", user!.id);
      const all = data ?? [];
      const spent = all
        .filter((o) => o.payment_status === "paid")
        .reduce((s, o) => s + Number(o.total_ghs), 0);
      return { count: all.length, spent };
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  if (loading || !user) {
    return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (suspended) return <SuspendedNotice />;


  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const canonical = normalizeGhanaPhone(phone);
    if (!canonical) {
      toast.error("Use a Ghana phone, e.g. 0241234567");
      return;
    }
    const parsed = profileSchema.safeParse({ full_name: fullName, phone: canonical });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: parsed.data.full_name, phone: parsed.data.phone })
        .eq("id", user.id);
      if (error) {
        if (/duplicate|unique/i.test(error.message)) {
          throw new Error("That phone number is already linked to another account.");
        }
        throw error;
      }
      toast.success("Profile updated");
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const verified = !!user.email_confirmed_at;
  const missingPhone = !profile?.phone;
  const hasSyntheticEmail = isSyntheticEmail(user.email);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Breadcrumbs items={[{ label: "My Account" }]} />
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to store
      </Link>
      <h1 className="font-display text-3xl font-bold md:text-4xl">My Account</h1>
      <p className="mt-1 text-muted-foreground">Manage your profile and view your account summary.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display text-xl font-bold">Profile details</h2>

          {missingPhone && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Add your phone number</div>
                <p className="mt-0.5 text-amber-800">
                  Please add your phone number below. It unlocks phone-based sign-in and helps us reach
                  you about your orders and deliveries.
                </p>
              </div>
            </div>
          )}

          {hasSyntheticEmail && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              You signed up with your phone number. You can add a personal email anytime — ask an
              admin to update it, or continue using phone + password to sign in.
            </div>
          )}


          <div className="grid gap-1.5">
            <Label>Customer ID</Label>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-secondary/40 px-3 py-2 font-mono text-sm">
                {profile?.customer_code ?? "—"}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                <BadgeCheck className="mr-1 h-3 w-3" /> Permanent
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your unique Customer ID. Use it on every order and inquiry.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email ?? ""} disabled />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0241234567"
              required
            />
          </div>

          <Button type="submit" variant="hero" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="text-xs uppercase text-muted-foreground">Account status</div>
            <div className="mt-2">
              {verified ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <ShieldAlert className="mr-1 h-3 w-3" /> Unverified email
                </Badge>
              )}
            </div>
          </div>

          <SummaryRow label="Registration date" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"} />
          <SummaryRow label="Last login" value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"} />
          <SummaryRow label="Total orders" value={String(stats?.count ?? 0)} />
          <SummaryRow label="Total spent" value={formatGHS(stats?.spent ?? 0)} />

          <Link
            to="/orders"
            className="block rounded-2xl border border-border bg-card p-5 text-center text-sm font-semibold text-spice shadow-card hover:bg-secondary/40"
          >
            View my orders →
          </Link>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
