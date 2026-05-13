import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Payment provider webhooks for MTN MoMo, Telecel Cash and AirtelTigo Money.
 *
 * Public route (no auth) — secured by HMAC-SHA256 signature verification.
 * Configure these provider webhook URLs in each MoMo dashboard:
 *   POST  https://<your-domain>/api/webhooks/payments/mtn
 *   POST  https://<your-domain>/api/webhooks/payments/telecel
 *   POST  https://<your-domain>/api/webhooks/payments/airteltigo
 *
 * Header: x-payment-signature: hex(HMAC_SHA256(<PROVIDER>_WEBHOOK_SECRET, raw_body))
 *
 * Body (normalized):
 * {
 *   "event_id": "evt_123",            // unique per event (idempotency)
 *   "reference": "BFM-ABCD1234",      // payments.reference
 *   "status": "success" | "failed" | "pending",
 *   "transaction_id": "MTN_TX_999"    // optional
 * }
 */

const PROVIDERS = { mtn: "MTN_WEBHOOK_SECRET", telecel: "TELECEL_WEBHOOK_SECRET", airteltigo: "AIRTELTIGO_WEBHOOK_SECRET" } as const;
type Provider = keyof typeof PROVIDERS;

const payloadSchema = z.object({
  event_id: z.string().trim().min(1).max(200),
  reference: z.string().trim().min(1).max(200),
  status: z.enum(["success", "failed", "pending", "paid"]),
  transaction_id: z.string().trim().max(200).optional(),
});

function verify(secret: string, body: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/webhooks/payments/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider as Provider;
        const secretName = PROVIDERS[provider];
        if (!secretName) return new Response("Unknown provider", { status: 404 });

        const secret = process.env[secretName];
        if (!secret) return new Response("Webhook secret not configured", { status: 503 });

        const raw = await request.text();
        const sig = request.headers.get("x-payment-signature");
        if (!verify(secret, raw, sig)) return new Response("Invalid signature", { status: 401 });

        let json: unknown;
        try { json = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
        const parsed = payloadSchema.safeParse(json);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });
        const { event_id, reference, status } = parsed.data;

        // Idempotent insert (unique on provider+event_id)
        const { error: logErr } = await supabaseAdmin
          .from("payment_webhook_events")
          .insert({ provider, event_id, reference, status, payload: parsed.data })
          .select("id")
          .single();
        // Duplicate event => already processed
        if (logErr && logErr.code === "23505") return Response.json({ ok: true, duplicate: true });
        if (logErr) return new Response("Log failed", { status: 500 });

        // Map normalized status -> internal payment_status / order_status
        const paymentStatus = status === "success" || status === "paid" ? "paid" : status === "failed" ? "failed" : "processing";
        const orderStatus = paymentStatus === "paid" ? "confirmed" : paymentStatus === "failed" ? "cancelled" : null;

        const { data: payment, error: payErr } = await supabaseAdmin
          .from("payments")
          .update({ status: paymentStatus, updated_at: new Date().toISOString() })
          .eq("reference", reference)
          .eq("provider", provider)
          .select("order_id")
          .maybeSingle();

        if (payErr || !payment) return new Response("Reference not found", { status: 404 });

        const orderUpdate: Record<string, unknown> = { payment_status: paymentStatus, updated_at: new Date().toISOString() };
        if (orderStatus) orderUpdate.status = orderStatus;
        await supabaseAdmin.from("orders").update(orderUpdate).eq("id", payment.order_id);

        return Response.json({ ok: true, reference, status: paymentStatus });
      },
    },
  },
});
