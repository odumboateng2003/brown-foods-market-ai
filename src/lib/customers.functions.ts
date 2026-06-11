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

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerRow[]> => {
    await assertAdminOrStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Collect every user_id with admin OR staff role — hide them from the
    // customer list so normal admins can't see Super Admin accounts.
    const { data: staffRoles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["admin", "staff"]);
    if (rolesErr) throw new Error(rolesErr.message);
    const staffIds = new Set((staffRoles ?? []).map((r) => r.user_id));

    const { data: usersList, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });
    if (usersErr) throw new Error(usersErr.message);

    const customers = (usersList?.users ?? []).filter((u) => !staffIds.has(u.id));
    const customerIds = customers.map((u) => u.id);

    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name").in("id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin
        .from("orders")
        .select("user_id,total_ghs,payment_status")
        .in("user_id", customerIds.length ? customerIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const nameByUser = new Map<string, string | null>();
    (profiles ?? []).forEach((p) => nameByUser.set(p.id, p.full_name ?? null));

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
      return {
        user_id: u.id,
        email: u.email ?? "",
        full_name: nameByUser.get(u.id) ?? meta.full_name ?? null,
        phone: u.phone ?? meta.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed: !!u.email_confirmed_at,
        banned: !!(u as { banned_until?: string }).banned_until,
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
