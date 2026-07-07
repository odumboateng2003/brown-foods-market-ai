import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ChatRequestBody = { messages?: unknown; userId?: string | null; conversationId?: string | null };

async function readCms(key: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseAdmin
    .from("site_content")
    .select("published_content")
    .eq("key", key)
    .maybeSingle();
  return (data?.published_content as Record<string, unknown> | undefined) ?? null;
}

async function buildContext(userId: string | null) {
  const [
    productsRes,
    categoriesRes,
    faqsRes,
    contact,
    business,
    delivery,
    about,
    branding,
    whatsapp,
    aiSettingsRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("name,slug,price_ghs,sale_price_ghs,unit,stock,is_featured,is_active,description,categories(name)")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .limit(60),
    supabaseAdmin.from("categories").select("name,slug,description").order("sort_order"),
    supabaseAdmin.from("site_faqs").select("question,answer").eq("is_published", true).order("sort_order").limit(30),
    readCms("contact"),
    readCms("business_info"),
    readCms("delivery_info"),
    readCms("about"),
    readCms("branding"),
    readCms("whatsapp"),
    supabaseAdmin.from("ai_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const businessName = (branding?.business_name as string) || (business?.name as string) || "Brown's Local Food Market";
  const aiSettings = aiSettingsRes.data;

  const catalog =
    (productsRes.data ?? [])
      .map((p) => {
        const cat = (p as unknown as { categories?: { name?: string } }).categories?.name ?? "general";
        const price = p.sale_price_ghs ? `GHS ${p.sale_price_ghs} (was ${p.price_ghs})` : `GHS ${p.price_ghs}`;
        const stockLabel = (p.stock ?? 0) <= 0 ? "OUT OF STOCK" : (p.stock ?? 0) <= 10 ? `only ${p.stock} left` : "in stock";
        const featured = p.is_featured ? " ★ featured" : "";
        return `- ${p.name} (${cat}) — ${price} per ${p.unit}, ${stockLabel}${featured}. /products/${p.slug}`;
      })
      .join("\n") ?? "";

  const cats =
    (categoriesRes.data ?? [])
      .map((c) => `- ${c.name}${c.description ? ` — ${c.description}` : ""} (/shop?category=${c.slug})`)
      .join("\n") ?? "";

  const faqs =
    (faqsRes.data ?? [])
      .map((f, i) => `Q${i + 1}. ${f.question}\nA${i + 1}. ${f.answer}`)
      .join("\n\n") ?? "";

  const contactBlock = contact
    ? `Email: ${contact.email ?? "-"}\nPhone: ${contact.phone ?? "-"}\nWhatsApp: ${contact.whatsapp ?? "-"}\nAddress: ${contact.address ?? "-"}\nHours: ${contact.hours ?? "-"}`
    : "";

  const deliveryBlock = delivery
    ? `${delivery.intro ?? ""}\nRegions:\n${((delivery.regions as { name: string; fee_ghs: number; eta: string }[]) ?? [])
        .map((r) => `- ${r.name}: GHS ${r.fee_ghs} • ${r.eta}`)
        .join("\n")}\nNotes: ${delivery.notes ?? ""}`
    : "";

  const socials = branding
    ? [
        branding.facebook_url && `Facebook: ${branding.facebook_url}`,
        branding.instagram_url && `Instagram: ${branding.instagram_url}`,
        branding.tiktok_url && `TikTok: ${branding.tiktok_url}`,
        branding.twitter_url && `Twitter/X: ${branding.twitter_url}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const whatsappNote = whatsapp?.phone_number ? `Customers can also reach us on WhatsApp at +${(whatsapp.phone_number as string).replace(/\D/g, "")}.` : "";

  let orderInfo = "";
  let personalization = "";
  if (userId) {
    const [ordersRes, profileRes] = await Promise.all([
      supabaseAdmin.from("orders").select("id,status,payment_status,total_ghs,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      supabaseAdmin.from("profiles").select("full_name,city,region").eq("id", userId).maybeSingle(),
    ]);
    const orders = ordersRes.data;
    if (orders?.length) {
      orderInfo =
        "\n\nRecent orders for this customer:\n" +
        orders
          .map(
            (o) =>
              `- Order ${o.id.slice(0, 8)} • status: ${o.status} • payment: ${o.payment_status} • GHS ${o.total_ghs} • placed ${new Date(o.created_at).toLocaleDateString()}`,
          )
          .join("\n");
    }
    const profile = profileRes.data as { full_name?: string | null; city?: string | null; region?: string | null } | null;
    if (profile?.full_name) {
      const firstName = profile.full_name.split(" ")[0];
      personalization = `\n\nThe customer's name is ${firstName}. Greet them by name on the first reply of this session. Preferred delivery area: ${profile.city ?? profile.region ?? "unknown"}.`;
    }
  }

  const personality = aiSettings?.personality ??
    `You are Akosua, the friendly AI shopping assistant for ${businessName}.`;
  const fallback = aiSettings?.fallback_response ?? "";
  const hours = aiSettings?.business_hours ?? "";

  return `${personality}

Your knowledge below comes from the live Website Content CMS — treat it as the single source of truth and prefer it over anything from your training data. NEVER quote prices, stock, promotions, delivery fees or policies from prior conversation memory — always read them from the sections below. If a customer asks something not covered here, use this fallback: "${fallback}"

Business hours: ${hours}
${personalization}

=== ABOUT THE BUSINESS ===
${about?.intro ?? ""}
${about?.mission_body ?? ""}

=== CONTACT ===
${contactBlock}
${whatsappNote}

=== SOCIAL LINKS ===
${socials}

=== DELIVERY ===
${deliveryBlock}

=== CATEGORIES ===
${cats}

=== LIVE PRODUCT CATALOG ===
${catalog}

=== FAQ ===
${faqs}
${orderInfo}

Rules:
- Recommend products only from the catalog above and include their link, e.g. [Local Rice 5kg](/products/local-rice-5kg).
- When quoting prices, always use GHS.
- If an item is OUT OF STOCK, say so clearly and suggest an alternative.
- If asked about business hours, contact, delivery, returns, or policies, quote the values above.
- If a question is outside food shopping and our business, politely redirect.`;
}

/** Extract plain text from a UIMessage (parts array). */
function messageText(m: UIMessage): string {
  const parts = (m as unknown as { parts?: { type: string; text?: string }[] }).parts ?? [];
  return parts.filter((p) => p.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n").slice(0, 4000);
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Kill switch
        const { data: aiSettings } = await supabaseAdmin
          .from("ai_settings").select("enabled,fallback_response").eq("id", 1).maybeSingle();
        if (aiSettings && aiSettings.enabled === false) {
          return new Response(aiSettings.fallback_response ?? "The AI assistant is temporarily disabled. Please try again later.", { status: 503 });
        }

        const userId = body.userId ?? null;
        const messages = body.messages as UIMessage[];
        const latest = messages[messages.length - 1];

        // Persist the latest user message + conversation record (auth users only)
        let conversationId = body.conversationId ?? null;
        if (userId && latest && latest.role === "user") {
          if (!conversationId) {
            const { data: convo } = await supabaseAdmin
              .from("ai_conversations")
              .insert({ user_id: userId, title: messageText(latest).slice(0, 80) || "New chat" })
              .select("id")
              .single();
            conversationId = convo?.id ?? null;
          }
          if (conversationId) {
            await supabaseAdmin.from("ai_messages").insert({
              conversation_id: conversationId,
              user_id: userId,
              role: "user",
              parts: (latest as unknown as { parts: unknown }).parts as never,
              text_content: messageText(latest),
            });
          }
        }

        const system = await buildContext(userId);
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(messages),
          onFinish: async ({ text }) => {
            if (userId && conversationId && text) {
              await supabaseAdmin.from("ai_messages").insert({
                conversation_id: conversationId,
                user_id: userId,
                role: "assistant",
                parts: [{ type: "text", text }] as never,
                text_content: text.slice(0, 4000),
              });
            }
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          headers: conversationId ? { "x-conversation-id": conversationId } : undefined,
        });
      },
    },
  },
});
