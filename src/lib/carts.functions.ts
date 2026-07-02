import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CartLine = {
  product_id: string;
  product_name: string;
  product_slug: string;
  quantity: number;
  unit_price_ghs: number;
  line_total_ghs: number;
};

export type CartRow = {
  user_id: string;
  customer_code: string | null;
  customer_name: string | null;
  email: string;
  phone: string | null;
  items_count: number;
  total_qty: number;
  total_value_ghs: number;
  first_added_at: string;
  last_updated_at: string;
  status: "active" | "abandoned" | "converted";
  lines: CartLine[];
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
}

const ACTIVE_MS = 24 * 60 * 60 * 1000; // 1 day => active
const ABANDONED_MS = 30 * 24 * 60 * 60 * 1000; // 30 days => filter out entirely

export const listCarts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CartRow[]> => {
    await assertAdminOrStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cutoff = new Date(Date.now() - ABANDONED_MS).toISOString();
    const { data: items, error } = await supabaseAdmin
      .from("cart_items")
      .select("user_id, product_id, quantity, created_at, updated_at, products(name, slug, price_ghs, sale_price_ghs)")
      .gte("updated_at", cutoff);
    if (error) throw new Error(error.message);
    if (!items?.length) return [];

    const userIds = Array.from(new Set(items.map((i) => i.user_id)));

    const [{ data: profiles }, { data: usersList }, { data: orders }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,full_name,phone,customer_code").in("id", userIds),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin
        .from("orders")
        .select("user_id, created_at, status")
        .in("user_id", userIds)
        .order("created_at", { ascending: false }),
    ]);

    const emailByUser = new Map<string, string>();
    (usersList?.users ?? []).forEach((u) => emailByUser.set(u.id, u.email ?? ""));
    const profByUser = new Map<string, { full_name: string | null; phone: string | null; customer_code: string | null }>();
    (profiles ?? []).forEach((p) => profByUser.set(p.id, {
      full_name: p.full_name ?? null, phone: p.phone ?? null, customer_code: p.customer_code ?? null,
    }));
    const latestOrderByUser = new Map<string, { created_at: string; status: string }>();
    (orders ?? []).forEach((o) => {
      if (!latestOrderByUser.has(o.user_id)) latestOrderByUser.set(o.user_id, o);
    });

    const byUser = new Map<string, {
      user_id: string; lines: CartLine[]; first: string; last: string;
    }>();

    items.forEach((it) => {
      const row = byUser.get(it.user_id) ?? { user_id: it.user_id, lines: [], first: it.created_at, last: it.updated_at };
      const prod = (it as unknown as { products: { name: string; slug: string; price_ghs: number; sale_price_ghs: number | null } | null }).products;
      const price = Number(prod?.sale_price_ghs ?? prod?.price_ghs ?? 0);
      const line: CartLine = {
        product_id: it.product_id,
        product_name: prod?.name ?? "Unknown",
        product_slug: prod?.slug ?? "",
        quantity: it.quantity,
        unit_price_ghs: price,
        line_total_ghs: price * it.quantity,
      };
      row.lines.push(line);
      if (it.created_at < row.first) row.first = it.created_at;
      if (it.updated_at > row.last) row.last = it.updated_at;
      byUser.set(it.user_id, row);
    });

    const rows: CartRow[] = Array.from(byUser.values()).map((r) => {
      const prof = profByUser.get(r.user_id);
      const lastUpdatedMs = new Date(r.last).getTime();
      const recentOrder = latestOrderByUser.get(r.user_id);
      const converted = recentOrder && new Date(recentOrder.created_at).getTime() > lastUpdatedMs;
      const status: CartRow["status"] = converted
        ? "converted"
        : Date.now() - lastUpdatedMs <= ACTIVE_MS
        ? "active"
        : "abandoned";
      return {
        user_id: r.user_id,
        customer_code: prof?.customer_code ?? null,
        customer_name: prof?.full_name ?? null,
        email: emailByUser.get(r.user_id) ?? "",
        phone: prof?.phone ?? null,
        items_count: r.lines.length,
        total_qty: r.lines.reduce((s, l) => s + l.quantity, 0),
        total_value_ghs: r.lines.reduce((s, l) => s + l.line_total_ghs, 0),
        first_added_at: r.first,
        last_updated_at: r.last,
        status,
        lines: r.lines.sort((a, b) => a.product_name.localeCompare(b.product_name)),
      };
    });

    return rows.sort((a, b) => (a.last_updated_at < b.last_updated_at ? 1 : -1));
  });
