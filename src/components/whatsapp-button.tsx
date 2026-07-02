import { useEffect, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { usePublishedOrDefault } from "@/lib/site-content";

export function WhatsAppButton() {
  const cfg = usePublishedOrDefault("whatsapp");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!cfg.enabled) return null;
  const digits = (cfg.phone_number || "").replace(/\D/g, "");
  if (!digits) return null;

  const startChat = (msg?: string) => {
    const text = msg || cfg.default_message || "";
    const href = text
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${digits}`;
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3">
      {open && (
        <div className="w-[320px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in-up">
          <div className="flex items-center justify-between gap-2 bg-[#075E54] px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{cfg.business_name || "Brown's Local Food Market"}</div>
              <div className="truncate text-[11px] text-white/80">Typically replies within minutes</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="max-h-[240px] space-y-2 overflow-y-auto bg-[#ECE5DD] p-4"
            style={{ backgroundImage: "radial-gradient(#00000008 1px, transparent 1px)", backgroundSize: "16px 16px" }}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#075E54]/70">
              {cfg.greeting_text || "Hi there 👋"}
            </div>
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm text-foreground shadow-sm">
              <div className="whitespace-pre-line">
                {cfg.welcome_message ||
                  "Welcome to Brown's Local Food Market.\nThank you for contacting us. How may we assist you today?"}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border bg-card p-3">
            {(cfg.quick_replies ?? []).slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => startChat(q)}
                className="w-full rounded-full border border-[#25D366]/40 bg-[#25D366]/5 px-3 py-1.5 text-left text-xs font-medium text-[#075E54] hover:bg-[#25D366]/10"
              >
                {q}
              </button>
            ))}
            <button
              onClick={() => startChat()}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-sm font-semibold text-white shadow hover:bg-[#1ebe5d]"
            >
              <Send className="h-4 w-4" /> Start chat on WhatsApp
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={cfg.button_text || "Chat on WhatsApp"}
        className="group relative inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-3 text-white shadow-lg shadow-[#25D366]/30 transition hover:scale-105 hover:bg-[#1ebe5d] sm:px-4"
      >
        {!open && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40" />}
        <MessageCircle className="h-6 w-6 shrink-0" />
        <span className="hidden text-sm font-semibold sm:inline">
          {cfg.button_text || "WhatsApp Support"}
        </span>
        {!open && (
          <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {cfg.tooltip_text || "Need help? Chat with us on WhatsApp"}
          </span>
        )}
      </button>
    </div>
  );
}
