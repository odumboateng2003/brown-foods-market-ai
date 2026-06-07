import { useEffect } from "react";
import { usePublishedOrDefault } from "@/lib/site-content";

/**
 * Mounts client-side and reflects the Branding CMS values into:
 * - <link rel="icon"> (favicon)
 * - <meta name|property="..."> (meta description, keywords, OG)
 * - <html> CSS variables for primary/secondary/accent + button radius
 *
 * Safe to render once near the app root.
 */
export function BrandingEffect() {
  const b = usePublishedOrDefault("branding");

  useEffect(() => {
    if (typeof document === "undefined") return;

    // ---------- Favicon ----------
    if (b.favicon_url) {
      // Remove existing icon links to avoid stacking
      document.querySelectorAll('link[rel~="icon"]').forEach((n) => n.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      const ext = b.favicon_url.split(".").pop()?.toLowerCase();
      link.type =
        ext === "svg" ? "image/svg+xml"
        : ext === "png" ? "image/png"
        : ext === "webp" ? "image/webp"
        : ext === "ico" ? "image/x-icon"
        : "";
      link.href = b.favicon_url;
      document.head.appendChild(link);

      const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (apple) apple.href = b.favicon_url;
      else {
        const a = document.createElement("link");
        a.rel = "apple-touch-icon";
        a.href = b.favicon_url;
        document.head.appendChild(a);
      }
    }

    // ---------- Meta tags ----------
    const setMeta = (selector: string, attr: "name" | "property", key: string, value: string) => {
      if (!value) return;
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = value;
    };

    if (b.meta_title || b.site_title) {
      document.title = b.meta_title || b.site_title;
    }
    setMeta('meta[name="description"]', "name", "description", b.meta_description);
    setMeta('meta[name="keywords"]', "name", "keywords", b.meta_keywords);
    setMeta('meta[property="og:title"]', "property", "og:title", b.og_title);
    setMeta('meta[property="og:description"]', "property", "og:description", b.og_description);
    setMeta('meta[property="og:image"]', "property", "og:image", b.og_image_url);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", b.og_title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", b.og_description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", b.og_image_url);

    // ---------- Theme tokens ----------
    const root = document.documentElement;
    if (b.primary_color) root.style.setProperty("--primary", b.primary_color);
    if (b.secondary_color) root.style.setProperty("--secondary", b.secondary_color);
    if (b.accent_color) root.style.setProperty("--accent", b.accent_color);
    if (b.primary_color) root.style.setProperty("--spice", b.primary_color);

    const radius =
      b.button_radius === "sharp" ? "0.25rem"
      : b.button_radius === "pill" ? "9999px"
      : "0.625rem";
    root.style.setProperty("--radius", radius);
  }, [b]);

  return null;
}
