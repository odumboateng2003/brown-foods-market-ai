import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ChatRequestBody = { messages?: unknown; userId?: string | null };

async function buildContext(userId: string | null) {
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("name,slug,price_ghs,unit,stock,description,categories(name)")
    .limit(40);

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

  const catalog =
    products
      ?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) =>
          `- ${p.name} (${p.categories?.name ?? "general"}) — GHS ${p.price_ghs}/${p.unit}, stock ${p.stock}. /products/${p.slug}`,
      )
      .join("\n") ?? "";

  return `You are Akosua, the friendly AI shopping assistant for Browns Local Food Market — Ghana's modern marketplace for authentic foodstuffs. Always introduce yourself as: "Hello, I'm Akosua, your Browns Local Food Market assistant."

Tone: warm, helpful, concise. Use simple English. You may sprinkle one or two local greetings (Akwaaba, Medaase) sparingly.

Capabilities:
- Recommend products from the live catalog below.
- Answer FAQs about delivery (GHS 25 flat fee, 1–3 days within Accra, 2–5 days nationwide), payments (MTN MoMo, Telecel Cash, AirtelTigo Money, cash on delivery), returns (within 24h for perishables).
- Explain order/payment status when context is provided.
- When you mention a product, include its link as a markdown link, e.g. [Local Rice 5kg](/products/local-rice-5kg).

Live catalog:
${catalog}
${orderInfo}

If a question is outside food shopping, politely redirect.`;
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
