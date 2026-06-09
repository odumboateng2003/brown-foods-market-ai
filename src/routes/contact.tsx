import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";
import { usePublishedOrDefault } from "@/lib/site-content";
import { BackToStore } from "@/components/back-to-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const items = [
    { icon: Mail, label: "Email", value: v.email, href: v.email ? `mailto:${v.email}` : undefined },
    { icon: Phone, label: "Phone", value: v.phone, href: v.phone ? `tel:${v.phone.replace(/\s+/g, "")}` : undefined },
    { icon: MessageCircle, label: "WhatsApp", value: v.whatsapp, href: v.whatsapp ? `https://wa.me/${v.whatsapp.replace(/[^\d]/g, "")}` : undefined },
    { icon: MapPin, label: "Office", value: v.address, href: undefined as string | undefined },
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    // Open the user's email client with the prefilled message; CMS-editable address
    const subject = encodeURIComponent(`Website enquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${v.email}?subject=${subject}&body=${body}`;
    toast.success("Opening your email app…");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <BackToStore className="mb-6" />
      <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">{v.title}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{v.intro}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it) => {
              const Icon = it.icon;
              const inner = (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{it.label}</div>
                    <div className="font-semibold text-foreground">{it.value}</div>
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
          <p className="mt-6 text-sm text-muted-foreground">Business hours: {v.hours}</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          <h2 className="font-display text-2xl font-bold text-foreground">Send us a message</h2>
          <p className="mt-1 text-sm text-muted-foreground">We typically respond within one business day.</p>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" placeholder="Ama Mensah" />
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="message">How can we help?</Label>
              <Textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5" placeholder="Tell us a bit about your enquiry…" />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full">
              <Send className="mr-2 h-4 w-4" /> Send message
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
