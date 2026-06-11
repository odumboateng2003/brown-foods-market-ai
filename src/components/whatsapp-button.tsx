import { usePublishedOrDefault } from "@/lib/site-content";

export function WhatsAppButton() {
  const cfg = usePublishedOrDefault("whatsapp");
  if (!cfg.enabled) return null;

  const digits = (cfg.phone_number || "").replace(/\D/g, "");
  if (!digits) return null;

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(cfg.default_message || "")}`;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={cfg.button_text || "Chat on WhatsApp"}
        className="group relative inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-3 text-white shadow-lg shadow-[#25D366]/30 transition hover:scale-105 hover:bg-[#1ebe5d] sm:px-4"
      >
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/40" />
        <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0 fill-current" aria-hidden="true">
          <path d="M19.11 17.21c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM16.04 4C9.95 4 5 8.95 5 15.04c0 1.95.51 3.85 1.48 5.53L5 28l7.61-2c1.62.88 3.45 1.35 5.34 1.35h.01c6.09 0 11.04-4.95 11.04-11.04S22.13 4 16.04 4zm0 20.18c-1.68 0-3.32-.45-4.76-1.31l-.34-.2-3.95 1.03 1.05-3.85-.22-.39a8.96 8.96 0 0 1-1.39-4.82c0-4.95 4.03-8.98 8.99-8.98 2.4 0 4.66.94 6.35 2.64a8.93 8.93 0 0 1 2.64 6.35c0 4.96-4.04 8.98-8.99 8.98z" />
        </svg>
        <span className="hidden text-sm font-semibold sm:inline">
          {cfg.button_text || "WhatsApp Support"}
        </span>

        <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {cfg.tooltip_text || "Need help? Chat with us on WhatsApp"}
        </span>
      </a>
    </div>
  );
}
