import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: Super Admin only");
}

type JsonDetails = Record<string, string | number | boolean | null | undefined>;

async function logActivity(
  actorId: string,
  actorEmail: string | undefined,
  action: string,
  targetUserId: string | null,
  details: JsonDetails = {},
) {
  await supabaseAdmin.from("staff_activity_logs").insert({
    actor_id: actorId,
    actor_email: actorEmail ?? null,
    target_user_id: targetUserId,
    action,
    details: details as never,
  });
}

export type StaffRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: "active" | "suspended" | "disabled";
  role: "admin" | "staff";
  created_at: string;
  last_sign_in_at: string | null;
};

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffRow[]> => {
    await assertSuperAdmin(context.userId);

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabaseAdmin.from("staff_profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id,role").in("role", ["admin", "staff"]),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    const roleByUser = new Map<string, "admin" | "staff">();
    for (const r of roles ?? []) {
      const current = roleByUser.get(r.user_id);
      if (r.role === "admin" || !current) roleByUser.set(r.user_id, r.role as "admin" | "staff");
    }

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const lastSignInByUser = new Map<string, string | null>();
    for (const u of usersList?.users ?? []) {
      lastSignInByUser.set(u.id, u.last_sign_in_at ?? null);
    }

    return (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      phone: p.phone,
      status: p.status as StaffRow["status"],
      role: roleByUser.get(p.user_id) ?? "staff",
      created_at: p.created_at,
      last_sign_in_at: lastSignInByUser.get(p.user_id) ?? null,
    }));
  });

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  full_name: z.string().min(1).max(120),
  phone: z.string().max(40).optional().nullable(),
  role: z.enum(["admin", "staff"]),
});

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createStaffSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const userId = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.full_name });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).in("role", ["admin", "staff"]);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
    await supabaseAdmin.from("staff_profiles").upsert(
      {
        user_id: userId,
        email: data.email,
        full_name: data.full_name,
        phone: data.phone ?? null,
        status: "active",
        created_by: context.userId,
      },
      { onConflict: "user_id" },
    );

    await logActivity(context.userId, context.claims?.email as string | undefined, "staff.create", userId, {
      email: data.email,
      role: data.role,
    });
    return { user_id: userId };
  });

const updateStaffSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).nullable().optional(),
  role: z.enum(["admin", "staff"]).optional(),
  status: z.enum(["active", "suspended", "disabled"]).optional(),
});

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateStaffSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);

    const updates: { full_name?: string; phone?: string | null; status?: "active" | "suspended" | "disabled" } = {};
    if (data.full_name !== undefined) updates.full_name = data.full_name;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.status !== undefined) updates.status = data.status;
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin
        .from("staff_profiles")
        .update(updates)
        .eq("user_id", data.user_id);
      if (error) throw new Error(error.message);
    }

    if (data.role) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .in("role", ["admin", "staff"]);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    }

    if (data.status === "suspended" || data.status === "disabled") {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "8760h" });
    } else if (data.status === "active") {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: "none" });
    }

    await logActivity(
      context.userId,
      context.claims?.email as string | undefined,
      "staff.update",
      data.user_id,
      { ...updates, role: data.role } as JsonDetails,
    );
    return { ok: true };
  });

const resetPasswordSchema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(8).max(72),
});

export const setStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => resetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    await logActivity(context.userId, context.claims?.email as string | undefined, "staff.password_reset", data.user_id);
    return { ok: true };
  });

const sendResetSchema = z.object({ email: z.string().email(), redirect_to: z.string().url() });

export const sendStaffPasswordResetEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sendResetSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirect_to,
    });
    if (error) throw new Error(error.message);
    await logActivity(context.userId, context.claims?.email as string | undefined, "staff.reset_email", null, {
      email: data.email,
    });
    return { ok: true };
  });

const deleteSchema = z.object({ user_id: z.string().uuid() });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("staff_profiles").delete().eq("user_id", data.user_id);
    await logActivity(context.userId, context.claims?.email as string | undefined, "staff.delete", data.user_id);
    return { ok: true };
  });

export type ActivityLogRow = {
  id: string;
  actor_email: string | null;
  target_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export const listStaffActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityLogRow[]> => {
    await assertSuperAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("staff_activity_logs")
      .select("id,actor_email,target_user_id,action,details,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivityLogRow[];
  });
