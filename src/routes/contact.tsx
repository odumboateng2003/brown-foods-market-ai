import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

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

const ITEMS = [
  { icon: Mail, label: "Email", value: "support@brownfoodsmarket.com", href: "mailto:support@brownfoodsmarket.com" },
  { icon: Phone, label: "Phone", value: "+233 24 000 0000", href: "tel:+233240000000" },
  { icon: MessageCircle, label: "WhatsApp", value: "+233 24 000 0000", href: "https://wa.me/233240000000" },
  { icon: MapPin, label: "Office", value: "Accra, Greater Accra Region, Ghana" },
];

function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">Contact us</h1>
      <p className="mt-4 text-muted-foreground">
        We'd love to hear from you. Reach out for orders, partnerships, or
        general questions — our team typically responds within one business day.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ITEMS.map((it) => {
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

      <p className="mt-10 text-sm text-muted-foreground">
        Business hours: Monday – Saturday, 8:00 – 18:00 GMT.
      </p>
    </div>
  );
}
