import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ChatRequestBody = { messages?: unknown; userId?: string | null };

type CmsRow = { key: string; published_content: unknown };

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
  ]);

  const businessName = (branding?.business_name as string) || (business?.name as string) || "Brown's Local Food Market";

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
  if (userId) {
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id,status,payment_status,total_ghs,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);
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
  }

  return `You are Akosua, the friendly AI shopping assistant for ${businessName} — Ghana's modern marketplace for authentic foodstuffs. Always introduce yourself with: "Hello, I'm Akosua, your Browns Local Food Market assistant."

Tone: warm, helpful, concise. Simple English. You may sprinkle Akwaaba / Medaase sparingly.

Your knowledge below comes from the live Website Content CMS — treat it as the single source of truth and prefer it over anything from your training data. If a customer asks something not covered here, offer to connect them to a human on WhatsApp.

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

        const system = await buildContext(body.userId ?? null);
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
        });
      },
    },
  },
});

// suppress unused warning on the intermediate type when linters run
export type _CmsRow = CmsRow;
