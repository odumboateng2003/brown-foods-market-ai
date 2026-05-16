import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { usePublishedOrDefault } from "@/lib/site-content";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact us — BROWN Foods Market" },
      { name: "description", content: "Get in touch with BROWN Foods Market. Email, phone and WhatsApp support for customers across Ghana." },
      { property: "og:title", content: "Contact BROWN Foods Market" },
      { property: "og:description", content: "Email, phone and WhatsApp support for Ghanaian customers." },
    ],
  }),
});

function ContactPage() {
  const v = usePublishedOrDefault("contact");
  const items = [
    { icon: Mail, label: "Email", value: v.email, href: v.email ? `mailto:${v.email}` : undefined },
    { icon: Phone, label: "Phone", value: v.phone, href: v.phone ? `tel:${v.phone.replace(/\s+/g, "")}` : undefined },
    { icon: MessageCircle, label: "WhatsApp", value: v.whatsapp, href: v.whatsapp ? `https://wa.me/${v.whatsapp.replace(/[^\d]/g, "")}` : undefined },
    { icon: MapPin, label: "Office", value: v.address, href: undefined as string | undefined },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{v.title}</h1>
      <p className="mt-4 text-muted-foreground">{v.intro}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          const inner = (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-spice/50">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-spice/10 text-spice">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">{it.label}</div>
                <div className="font-semibold">{it.value}</div>
              </div>
            </div>
          );
          return it.href ? (
            <a key={it.label} href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{inner}</a>
          ) : (
            <div key={it.label}>{inner}</div>
          );
        })}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">Business hours: {v.hours}</p>
    </div>
  );
}
