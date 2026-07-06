import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CustomerRow = {
  user_id: string;
  customer_code: string | null;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  banned: boolean;
  deleted_at: string | null;
  admin_notes: string | null;
  orders_count: number;
  total_spent_ghs: number;
};

async function assertAdminOrStaff(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "staff"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: admin or staff only");
  return data.some((r) => r.role === "admin");
}

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: super admin only");
}

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerRow[]> => {
    await assertAdminOrStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: staffRoles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["admin", "staff"]);
    if (rolesErr) throw new Error(rolesErr.message);
    const staffIds = new Set((staffRoles ?? []).map((r) => r.user_id));

    const { data: usersList, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw new Error(usersErr.message);

    const customers = (usersList?.users ?? []).filter((u) => !staffIds.has(u.id));
    const customerIds = customers.map((u) => u.id);

    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,phone,customer_code,deleted_at,admin_notes")
        .in("id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("orders").select("user_id,total_ghs,payment_status")
        .in("user_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const profileByUser = new Map<string, { full_name: string | null; phone: string | null; customer_code: string | null; deleted_at: string | null; admin_notes: string | null }>();
    (profiles ?? []).forEach((p) => profileByUser.set(p.id, {
      full_name: p.full_name ?? null,
      phone: p.phone ?? null,
      customer_code: p.customer_code ?? null,
      deleted_at: (p as { deleted_at?: string | null }).deleted_at ?? null,
      admin_notes: (p as { admin_notes?: string | null }).admin_notes ?? null,
    }));

    const aggByUser = new Map<string, { count: number; spent: number }>();
    (orders ?? []).forEach((o) => {
      const agg = aggByUser.get(o.user_id) ?? { count: 0, spent: 0 };
      agg.count += 1;
      if (o.payment_status === "paid") agg.spent += Number(o.total_ghs);
      aggByUser.set(o.user_id, agg);
    });

    return customers.map((u) => {
      const meta = (u.user_metadata ?? {}) as { full_name?: string; phone?: string };
      const agg = aggByUser.get(u.id) ?? { count: 0, spent: 0 };
      const prof = profileByUser.get(u.id);
      return {
        user_id: u.id,
        customer_code: prof?.customer_code ?? null,
        email: u.email ?? "",
        full_name: prof?.full_name ?? meta.full_name ?? null,
        phone: prof?.phone ?? u.phone ?? meta.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed: !!u.email_confirmed_at,
        banned: !!(u as { banned_until?: string }).banned_until,
        deleted_at: prof?.deleted_at ?? null,
        admin_notes: prof?.admin_notes ?? null,
        orders_count: agg.count,
        total_spent_ghs: agg.spent,
      } satisfies CustomerRow;
    }).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  });

export type CustomerOrder = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  total_ghs: number;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  region: string;
};

const customerDetailSchema = z.object({ user_id: z.string().uuid() });

export const getCustomerOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => customerDetailSchema.parse(input))
  .handler(async ({ data, context }): Promise<CustomerOrder[]> => {
    await assertAdminOrStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id,created_at,status,payment_status,total_ghs,full_name,phone,address,city,region")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (orders ?? []) as CustomerOrder[];
  });

/* -------- Activity timeline (derived from existing data) -------- */

export type ActivityEvent = {
  when: string;
  kind: "registered" | "signed_in" | "order_placed" | "order_cancelled" | "cart_updated" | "profile_updated";
  detail: string;
};

export const getCustomerActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => customerDetailSchema.parse(input))
  .handler(async ({ data, context }): Promise<ActivityEvent[]> => {
    await assertAdminOrStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.user_id;

    const [{ data: userRes }, { data: profile }, { data: orders }, { data: cart }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(uid),
      supabaseAdmin.from("profiles").select("created_at,updated_at").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("orders").select("id,created_at,status,total_ghs").eq("user_id", uid).order("created_at", { ascending: false }),
      supabaseAdmin.from("cart_items").select("updated_at,quantity,products(name)").eq("user_id", uid).order("updated_at", { ascending: false }).limit(20),
    ]);

    const events: ActivityEvent[] = [];
    const u = userRes?.user;
    if (u) {
      events.push({ when: u.created_at, kind: "registered", detail: "Account created" });
      if (u.last_sign_in_at) events.push({ when: u.last_sign_in_at, kind: "signed_in", detail: "Signed in" });
    }
    if (profile?.updated_at && profile.updated_at !== profile.created_at) {
      events.push({ when: profile.updated_at, kind: "profile_updated", detail: "Updated profile" });
    }
    (orders ?? []).forEach((o) => {
      const cancelled = /cancel/i.test(o.status);
      events.push({
        when: o.created_at,
        kind: cancelled ? "order_cancelled" : "order_placed",
        detail: `${cancelled ? "Cancelled" : "Placed"} order #${o.id.slice(0, 8).toUpperCase()} — GH₵${Number(o.total_ghs).toFixed(2)}`,
      });
    });
    (cart ?? []).forEach((c) => {
      const name = (c as unknown as { products: { name: string } | null }).products?.name ?? "product";
      events.push({ when: c.updated_at, kind: "cart_updated", detail: `Cart: ${name} × ${c.quantity}` });
    });

    return events.sort((a, b) => (a.when < b.when ? 1 : -1));
  });

/* -------- Customer account admin controls (Super Admin only) -------- */

export const sendCustomerPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo =
      (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || "") + "/reset-password";
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCustomerBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid(), banned: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.banned ? "876000h" : "none",
    } as unknown as { ban_duration: string });
    if (error) throw new Error(error.message);
    // Mirror to profile flag so client-side guards work
    await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: data.banned ? new Date().toISOString() : null })
      .eq("id", data.user_id);
    return { ok: true };
  });

/** Soft-delete: mark profile deleted + ban auth so they can't sign in. */
export const softDeleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: "876000h",
    } as unknown as { ban_duration: string });
    if (banErr) throw new Error(banErr.message);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: "none",
    } as unknown as { ban_duration: string });
    if (banErr) throw new Error(banErr.message);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanent delete — auth user removed. Orders and receipts remain (user_id preserved as-is). */
export const hardDeleteCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid(), confirm: z.literal("PERMANENTLY DELETE") }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Guard: never delete a staff/admin
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.user_id);
    if ((roles ?? []).some((r) => r.role === "admin" || r.role === "staff")) {
      throw new Error("Cannot delete a staff or admin account here.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** One-time bulk wipe: deletes every non-staff auth user. Preserves orders/receipts. */
export const wipeAllCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ confirm: z.literal("WIPE ALL CUSTOMERS") }).parse(input))
  .handler(async ({ context }): Promise<{ deleted: number }> => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staffRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["admin", "staff"]);
    const staffIds = new Set((staffRoles ?? []).map((r) => r.user_id));

    const { data: usersList, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw new Error(usersErr.message);

    let deleted = 0;
    for (const u of usersList?.users ?? []) {
      if (staffIds.has(u.id)) continue;
      const { error } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (!error) deleted += 1;
    }
    return { deleted };
  });

export const updateCustomerNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid(), notes: z.string().max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ admin_notes: data.notes })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Bulk actions (Super Admin) -------- */

export const bulkCustomerAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_ids: z.array(z.string().uuid()).min(1).max(500),
      action: z.enum(["suspend", "reactivate", "soft_delete"]),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: number; failed: number }> => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Never touch staff
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", data.user_ids);
    const staffIds = new Set((roles ?? []).filter((r) => r.role === "admin" || r.role === "staff").map((r) => r.user_id));
    const targets = data.user_ids.filter((id) => !staffIds.has(id));

    let ok = 0, failed = 0;
    for (const id of targets) {
      try {
        if (data.action === "reactivate") {
          await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "none" } as unknown as { ban_duration: string });
          await supabaseAdmin.from("profiles").update({ deleted_at: null }).eq("id", id);
        } else {
          await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "876000h" } as unknown as { ban_duration: string });
          await supabaseAdmin
            .from("profiles")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        }
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    return { ok, failed };
  });

/** Client-side guard helper: is the signed-in user's own account suspended/deleted. */
export const getMyAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ suspended: boolean; deleted_at: string | null }> => {
    const { supabase } = context;
    const { data } = await supabase.from("profiles").select("deleted_at").eq("id", context.userId).maybeSingle();
    return { suspended: !!data?.deleted_at, deleted_at: data?.deleted_at ?? null };
  });
