import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: fetch AI settings (used by chat widget for greeting/enabled/prompts). */
export const getPublicAiSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_settings")
      .select("enabled,greeting,suggested_prompts,business_hours,fallback_response,retention_days")
      .eq("id", 1)
      .maybeSingle();
    return data ?? {
      enabled: true,
      greeting: "Hello, I'm Akosua, your Brown's Local Food Market assistant.",
      suggested_prompts: [],
      business_hours: "",
      fallback_response: "",
      retention_days: 7,
    };
  });

async function assertSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (!data || data.length === 0) throw new Error("Forbidden: super admin only");
}

export const updateAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      enabled: z.boolean().optional(),
      retention_days: z.number().int().min(1).max(365).optional(),
      personality: z.string().max(4000).optional(),
      greeting: z.string().max(1000).optional(),
      business_hours: z.string().max(400).optional(),
      fallback_response: z.string().max(1000).optional(),
      suggested_prompts: z.array(z.string().max(200)).max(12).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .rpc("update_ai_settings" as any, { _patch: data as any });
    if (error) throw new Error(error.message);
    return row;
  });

export const getFullAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("ai_settings").select("*").eq("id", 1).maybeSingle();
    return data;
  });

/* ---------- Conversations ---------- */

export const listMyConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id,title,created_at,last_active_at")
      .order("last_active_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const getConversationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversation_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs } = await supabase
      .from("ai_messages")
      .select("id,role,parts,text_content,created_at")
      .eq("conversation_id", data.conversation_id)
      .order("created_at");
    return msgs ?? [];
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ conversation_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("ai_conversations").delete().eq("id", data.conversation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllMyConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("ai_conversations").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Admin analytics ---------- */

export const getAiUsageStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabaseAdmin.rpc("ai_usage_stats" as any);
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? { total_conversations: 0, total_users: 0, msgs_today: 0, msgs_7d: 0, msgs_30d: 0 };
  });

export const getAiTopQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await supabaseAdmin.rpc("ai_top_questions" as any, { _limit: data.limit });
    return (rows ?? []) as { question: string; count: number }[];
  });

export const getAiDailyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("ai_messages")
      .select("created_at")
      .eq("role", "user")
      .gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString())
      .limit(5000);
    const bucket = new Map<string, number>();
    (data ?? []).forEach((m) => {
      const d = new Date(m.created_at).toISOString().slice(0, 10);
      bucket.set(d, (bucket.get(d) ?? 0) + 1);
    });
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      days.push({ date: d, count: bucket.get(d) ?? 0 });
    }
    return days;
  });

export const runAiRetentionCleanup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabaseAdmin.rpc("cleanup_old_ai_conversations" as any);
    return { deleted: (data as number) ?? 0 };
  });
