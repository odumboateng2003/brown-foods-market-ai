import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeGhanaPhone } from "./phone";

/**
 * Public server function: given a Ghana phone number, return the associated
 * account's login email (if any). Used by the flexible login field so
 * customers can sign in with phone + password.
 *
 * Returns { email: string | null }. Never throws for "not found" — that's
 * a normal outcome. Errors only for invalid input or server errors.
 */
export const lookupEmailByPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: z.string().min(3).max(32) }).parse(input))
  .handler(async ({ data }): Promise<{ email: string | null }> => {
    const canonical = normalizeGhanaPhone(data.phone);
    if (!canonical) return { email: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", canonical)
      .maybeSingle();
    if (error || !profile) return { email: null };
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (userErr || !userRes?.user) return { email: null };
    return { email: userRes.user.email ?? null };
  });

/** Check whether an account (by email) is suspended. Called after failed login to explain why. */
export const checkAccountSuspension = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }): Promise<{ suspended: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const u = (usersList?.users ?? []).find((x) => x.email?.toLowerCase() === data.email.toLowerCase());
    if (!u) return { suspended: false };
    if ((u as { banned_until?: string }).banned_until) return { suspended: true };
    const { data: profile } = await supabaseAdmin.from("profiles").select("deleted_at").eq("id", u.id).maybeSingle();
    return { suspended: !!profile?.deleted_at };
  });

/** Public: check whether a phone is already registered (for signup pre-check). */
export const phoneAlreadyRegistered = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: z.string().min(3).max(32) }).parse(input))
  .handler(async ({ data }): Promise<{ exists: boolean }> => {
    const canonical = normalizeGhanaPhone(data.phone);
    if (!canonical) return { exists: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", canonical)
      .maybeSingle();
    return { exists: !!profile };
  });
