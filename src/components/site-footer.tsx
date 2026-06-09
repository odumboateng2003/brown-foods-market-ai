import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Music2, Linkedin, Youtube, MessageCircle, Phone, Mail, MapPin, Clock } from "lucide-react";
import { usePublishedOrDefault } from "@/lib/site-content";

export function SiteFooter() {
  const f = usePublishedOrDefault("footer");
  const b = usePublishedOrDefault("business_info");
  const br = usePublishedOrDefault("branding");
  const c = usePublishedOrDefault("contact");

  const socials = [
    { url: br.facebook_url || b.facebook, icon: Facebook, label: "Facebook" },
    { url: br.instagram_url || b.instagram, icon: Instagram, label: "Instagram" },
    { url: br.twitter_url || b.twitter, icon: Twitter, label: "Twitter" },
    { url: br.tiktok_url || b.tiktok, icon: Music2, label: "TikTok" },
    { url: br.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { url: br.youtube_url, icon: Youtube, label: "YouTube" },
    { url: br.whatsapp_url, icon: MessageCircle, label: "WhatsApp" },
  ].filter((s) => s.url);

  const businessName = br.business_name || b.name;
  const address = br.business_address || b.address || c.address;
  const email = br.contact_email || b.email || c.email;
  const phone = br.phone_primary || b.phone || c.phone;
  const hours = c.hours;
  const copyright =
    br.copyright_text ||
    `© ${new Date().getFullYear()} ${businessName}. All rights reserved.`;

  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand + tagline + socials */}
          <div>
            <div className="flex items-center gap-2">
              {br.logo_footer_url ? (
                <img src={br.logo_footer_url} alt={businessName} className="h-12 w-auto object-contain" />
              ) : (
                <>
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-foreground/10 font-display text-lg font-bold">B</span>
                  <span className="font-display text-xl font-bold uppercase tracking-wide">{businessName}</span>
                </>
              )}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/75">{br.tagline || f.tagline}</p>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socials.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.label}
                      className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground transition hover:bg-primary-foreground hover:text-primary"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/80">
              <li><Link to="/" className="transition hover:text-primary-foreground">Home</Link></li>
              <li><Link to="/shop" className="transition hover:text-primary-foreground">Shop</Link></li>
              <li><Link to="/shop" className="transition hover:text-primary-foreground">Categories</Link></li>
              <li><Link to="/about" className="transition hover:text-primary-foreground">About Us</Link></li>
              <li><Link to="/contact" className="transition hover:text-primary-foreground">Contact Us</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold">Customer Service</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/80">
              <li><Link to="/orders" className="transition hover:text-primary-foreground">My Account</Link></li>
              <li><Link to="/orders" className="transition hover:text-primary-foreground">Track Order</Link></li>
              <li><Link to="/contact" className="transition hover:text-primary-foreground">FAQs</Link></li>
              <li><Link to="/contact" className="transition hover:text-primary-foreground">Delivery Information</Link></li>
              <li><Link to="/terms" className="transition hover:text-primary-foreground">Returns &amp; Refunds</Link></li>
              <li><Link to="/privacy" className="transition hover:text-primary-foreground">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold">Contact Us</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              {phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="transition hover:text-primary-foreground">{phone}</a>
                </li>
              )}
              {email && (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <a href={`mailto:${email}`} className="break-all transition hover:text-primary-foreground">{email}</a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{address}</span>
                </li>
              )}
              {hours && (
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>{hours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-primary-foreground/15 pt-6 text-center text-xs text-primary-foreground/70">
          {copyright}
        </p>
      </div>
    </footer>
  );
}
