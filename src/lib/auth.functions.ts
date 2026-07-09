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

/**
 * Customer password reset by phone number.
 *
 * Security posture (interim, pre-SMS-OTP):
 * - Only resets accounts that are pure customers (no staff/admin role).
 * - Refuses suspended accounts (banned_until set or profiles.deleted_at set).
 * - Password is hashed by Supabase Auth; never stored or returned.
 * - Structured so an OTP-verification step can be inserted before the
 *   password write without changing the client contract.
 */
export const resetCustomerPasswordByPhone = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        phone: z.string().min(3).max(32),
        newPassword: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true }
      | { ok: false; code: "not_found" | "suspended" | "staff" | "weak" | "error"; message: string }
    > => {
      const canonical = normalizeGhanaPhone(data.phone);
      if (!canonical) {
        return { ok: false, code: "not_found", message: "Phone number not found." };
      }
      if (data.newPassword.length < 8) {
        return { ok: false, code: "weak", message: "Password must be at least 8 characters." };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, deleted_at")
        .eq("phone", canonical)
        .maybeSingle();
      if (!profile) {
        return { ok: false, code: "not_found", message: "Phone number not found." };
      }
      if (profile.deleted_at) {
        return {
          ok: false,
          code: "suspended",
          message:
            "This account has been suspended. Please contact Brown's Local Food Market Customer Support for assistance.",
        };
      }

      // Block staff/admin accounts — they use email-based reset.
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id);
      if ((roles ?? []).some((r) => r.role === "admin" || r.role === "staff")) {
        return {
          ok: false,
          code: "staff",
          message: "Staff accounts must reset their password via email. Contact an administrator.",
        };
      }

      // Confirm the auth user exists and isn't banned.
      const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (userErr || !userRes?.user) {
        return { ok: false, code: "not_found", message: "Phone number not found." };
      }
      if ((userRes.user as { banned_until?: string }).banned_until) {
        return {
          ok: false,
          code: "suspended",
          message:
            "This account has been suspended. Please contact Brown's Local Food Market Customer Support for assistance.",
        };
      }

      // TODO(SMS-OTP): verify a prior OTP challenge here before updating the password.
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        password: data.newPassword,
      });
      if (updateErr) {
        return { ok: false, code: "error", message: "Could not update password. Please try again." };
      }
      return { ok: true };
    },
  );
