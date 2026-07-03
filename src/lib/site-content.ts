import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ----------------------------- Content shapes ----------------------------- */

export type HomeHero = {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  cta_primary: string;
  cta_secondary: string;
};

export type AboutContent = {
  title: string;
  intro: string;
  mission_heading: string;
  mission_body: string;
  what_we_do_heading: string;
  what_we_do_items: string[];
  outro_heading: string;
  outro_body: string;
};

export type ContactContent = {
  title: string;
  intro: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
};

export type LongPage = { title: string; body: string };

export type FooterContent = {
  tagline: string;
  dev_notice: string;
};

export type BusinessInfo = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
};

export type DeliveryInfo = {
  intro: string;
  regions: { name: string; fee_ghs: number; eta: string }[];
  notes: string;
};

export type BrandingContent = {
  business_name: string;
  website_name: string;
  tagline: string;
  description: string;
  copyright_text: string;
  footer_text: string;
  business_address: string;
  contact_email: string;
  phone_primary: string;
  phone_secondary: string;

  favicon_url: string;
  logo_header_url: string;
  logo_footer_url: string;
  logo_mobile_url: string;
  logo_light_url: string;
  logo_dark_url: string;

  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  tiktok_url: string;
  linkedin_url: string;
  whatsapp_url: string;
  youtube_url: string;

  site_title: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image_url: string;

  primary_color: string;
  secondary_color: string;
  accent_color: string;
  button_radius: "sharp" | "rounded" | "pill";
};

export type WhatsAppContent = {
  enabled: boolean;
  phone_number: string; // digits only with country code, e.g. 233240000000
  button_text: string;
  tooltip_text: string;
  business_name: string;
  greeting_text: string;
  welcome_message: string; // template for staff/preview — NEVER auto-inserted into the customer message box
  default_message: string; // legacy field, kept for backward compatibility (no longer used to prefill)
  business_hours: string;
  auto_reply_text: string; // reserved for future WhatsApp API auto-reply integration
  quick_replies: string[]; // one-tap message options — only sent if the customer taps one
};

export type HomeMediaContent = {
  promo_title: string;
  promo_body: string;
  promo_cta: string;
  promo_tile_images: string[]; // up to 6 image URLs replacing emoji tiles
};

export type ContentMap = {
  home_hero: HomeHero;
  home_media: HomeMediaContent;
  about: AboutContent;
  contact: ContactContent;
  privacy: LongPage;
  terms: LongPage;
  footer: FooterContent;
  business_info: BusinessInfo;
  delivery_info: DeliveryInfo;
  branding: BrandingContent;
  whatsapp: WhatsAppContent;
};


export type ContentKey = keyof ContentMap;

/* ----------------------------- Defaults ----------------------------- */

export const DEFAULT_CONTENT: ContentMap = {
  home_hero: {
    eyebrow: "Fresh from Ghanaian farms",
    title: "The taste of",
    highlight: "home",
    subtitle:
      "From Pona yam and scotch bonnet to smoked tilapia and red palm oil — authentic Ghanaian foodstuffs, sourced fresh and delivered to your door.",
    cta_primary: "Shop the market",
    cta_secondary: "Browse categories",
  },
  home_media: {
    promo_title: "Free delivery on your first order",
    promo_body:
      "Sign up today and we'll deliver your first basket of fresh foodstuffs anywhere in Greater Accra — on the house.",
    promo_cta: "Create your account",
    promo_tile_images: [],
  },
  about: {
    title: "About BROWN Foods Market",
    intro:
      "We are a Ghanaian-owned food marketplace built to make authentic local foodstuffs easier to buy, anywhere in the country.",
    mission_heading: "Our mission",
    mission_body:
      "From Pona yam in Techiman to fresh tilapia from Lake Volta, we partner directly with farmers, fishermen and producers to bring quality Ghanaian foodstuffs to your home at fair prices.",
    what_we_do_heading: "What we do",
    what_we_do_items: [
      "Source produce from trusted local suppliers.",
      "Quality-check every order before it leaves the warehouse.",
      "Deliver across Greater Accra, Ashanti and beyond.",
      "Support customers in English, Twi and Ga.",
    ],
    outro_heading: "Built for Ghana, scaling across Africa",
    outro_body:
      "Our team is working to bring you the best marketplace experience for Ghanaian foodstuffs. Browse the catalogue, create an account, and explore everything we have to offer.",
  },
  contact: {
    title: "Contact us",
    intro:
      "We'd love to hear from you. Reach out for orders, partnerships, or general questions — our team typically responds within one business day.",
    email: "support@brownfoodsmarket.com",
    phone: "+233 24 000 0000",
    whatsapp: "+233 24 000 0000",
    address: "Accra, Greater Accra Region, Ghana",
    hours: "Monday – Saturday, 8:00 – 18:00 GMT.",
  },
  privacy: {
    title: "Privacy Policy",
    body: `1. Information we collect
We collect information you provide when you create an account, place an order, or contact support — including your name, email, phone number, delivery address, and order history.

2. How we use your information
- To process and deliver your orders.
- To communicate order status, receipts, and customer support.
- To improve our products, services, and recommendations.
- To comply with Ghanaian legal and tax obligations.

3. Payment information
We use secure payment processing. When live payments are enabled, your payment details are handled by licensed Mobile Money providers and are never stored on our servers.

4. Sharing
We do not sell your personal data.

5. Security
We use industry-standard encryption, role-based access controls, and secure authentication to protect your account.

6. Your rights
You may request access, correction, or deletion of your personal data at any time.

7. Contact
Questions about this policy? Reach us at privacy@brownfoodsmarket.com.`,
  },
  terms: {
    title: "Terms & Conditions",
    body: `1. Acceptance of terms
By using BROWN Foods Market, you agree to these Terms & Conditions and our Privacy Policy.

2. Orders & pricing
Prices are listed in Ghana Cedis (GHS) and may change without notice.

3. Accounts
You are responsible for keeping your login credentials confidential and for all activity under your account.

4. Orders & pricing
Prices are listed in Ghana Cedis (GHS) and may change without notice.

5. Delivery
Delivery times depend on your location and product availability.

6. Returns
Perishable items cannot be returned once delivered. Damaged or incorrect items must be reported within 24 hours of delivery.

7. Limitation of liability
To the fullest extent permitted by Ghanaian law, BROWN Foods Market is not liable for indirect, incidental, or consequential damages arising from your use of the platform.

8. Governing law
These terms are governed by the laws of the Republic of Ghana.

9. Contact
Questions? Email support@brownfoodsmarket.com.`,
  },
  footer: {
    tagline:
      "Authentic Ghanaian foodstuffs, delivered to your door. From Pona yam to scotch bonnet — sourced from trusted local farmers.",
    dev_notice: "",
  },
  business_info: {
    name: "BROWN Foods Market",
    email: "support@brownfoodsmarket.com",
    phone: "+233 24 000 0000",
    whatsapp: "+233 24 000 0000",
    address: "Accra, Greater Accra Region, Ghana",
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
  },
  delivery_info: {
    intro: "We deliver fresh foodstuffs across Ghana.",
    regions: [
      { name: "Greater Accra", fee_ghs: 20, eta: "Same day" },
      { name: "Ashanti", fee_ghs: 35, eta: "1-2 days" },
      { name: "Other regions", fee_ghs: 50, eta: "2-4 days" },
    ],
    notes: "Free delivery on orders over GHS 300 within Greater Accra.",
  },
  branding: {
    business_name: "BROWN Foods Market",
    website_name: "BROWN Foods Market",
    tagline: "Authentic Ghanaian foodstuffs, delivered to your door.",
    description:
      "Shop premium Ghanaian foodstuffs online. Rice, yam, plantain, palm oil, fresh fish and more — delivered across Ghana.",
    copyright_text: "",
    footer_text: "",
    business_address: "Accra, Greater Accra Region, Ghana",
    contact_email: "support@brownfoodsmarket.com",
    phone_primary: "+233 24 000 0000",
    phone_secondary: "",

    favicon_url: "",
    logo_header_url: "",
    logo_footer_url: "",
    logo_mobile_url: "",
    logo_light_url: "",
    logo_dark_url: "",

    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
    tiktok_url: "",
    linkedin_url: "",
    whatsapp_url: "",
    youtube_url: "",

    site_title: "BROWN Foods Market — Authentic Ghanaian foodstuffs delivered",
    meta_title: "BROWN Foods Market — Authentic Ghanaian foodstuffs delivered",
    meta_description:
      "Shop premium Ghanaian foodstuffs online. Rice, yam, plantain, palm oil, fresh fish and more — delivered across Ghana.",
    meta_keywords: "Ghanaian food, foodstuffs, Accra, palm oil, yam, plantain, fish",
    og_title: "BROWN Foods Market — Authentic Ghanaian foodstuffs delivered",
    og_description:
      "Shop premium Ghanaian foodstuffs online. Rice, yam, plantain, palm oil, fresh fish and more — delivered across Ghana.",
    og_image_url: "",

    primary_color: "#c2410c",
    secondary_color: "#f5f5f4",
    accent_color: "#facc15",
    button_radius: "rounded",
  },
  whatsapp: {
    enabled: true,
    phone_number: "233240000000",
    button_text: "WhatsApp Support",
    tooltip_text: "Need help? Chat with us on WhatsApp",
    business_name: "Brown's Local Food Market",
    greeting_text: "Hi there 👋",
    welcome_message:
      "Welcome to Brown's Local Food Market.\n\nThank you for contacting us. How may we assist you today?",
    default_message: "",
    quick_replies: [
      "I have a question about my order",
      "I need help choosing a product",
      "What are your delivery options?",
    ],
  },
};





/* ----------------------------- Hooks ----------------------------- */

function mergeWithDefault<K extends ContentKey>(
  key: K,
  value: unknown,
): ContentMap[K] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(DEFAULT_CONTENT[key] as object), ...(value as object) } as ContentMap[K];
  }
  return DEFAULT_CONTENT[key];
}

/** Read the published version of a content key (public-safe). */
export function usePublishedContent<K extends ContentKey>(key: K) {
  return useQuery({
    queryKey: ["site_content", "published", key],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_content")
        .select("published_content")
        .eq("key", key)
        .maybeSingle();
      return mergeWithDefault(key, data?.published_content);
    },
    staleTime: 60_000,
  });
}

/** Sync-style helper: returns published value or default while loading. */
export function usePublishedOrDefault<K extends ContentKey>(key: K): ContentMap[K] {
  const { data } = usePublishedContent(key);
  return (data as ContentMap[K] | undefined) ?? DEFAULT_CONTENT[key];
}

/** Admin: read draft + published for editing. */
export function useEditableContent<K extends ContentKey>(key: K) {
  return useQuery({
    queryKey: ["site_content", "editable", key],
    queryFn: async () => {
      const { data: rows, error } = await (supabase.rpc as any)("get_admin_site_content", { _key: key });
      const data = ((rows ?? []) as Array<{
        draft_content: unknown;
        published_content: unknown;
        published_at: string | null;
        updated_at: string | null;
      }>)[0];
      if (error) throw error;
      return {
        draft: mergeWithDefault(key, data?.draft_content),
        published: data?.published_content
          ? mergeWithDefault(key, data.published_content)
          : null,
        published_at: data?.published_at ?? null,
        updated_at: data?.updated_at ?? null,
      };
    },
  });
}

export async function saveDraft<K extends ContentKey>(
  key: K,
  draft: ContentMap[K],
) {
  const { error } = await supabase
    .from("site_content")
    .upsert(
      { key, draft_content: draft as never },
      { onConflict: "key" },
    );
  if (error) throw error;
}

export async function publishContent<K extends ContentKey>(
  key: K,
  draft: ContentMap[K],
) {
  const { error } = await supabase
    .from("site_content")
    .upsert(
      {
        key,
        draft_content: draft as never,
        published_content: draft as never,
        published_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  if (error) throw error;
}

export async function resetDraftToPublished<K extends ContentKey>(key: K) {
  const { data } = await supabase
    .from("site_content")
    .select("published_content")
    .eq("key", key)
    .maybeSingle();
  const published = data?.published_content ?? DEFAULT_CONTENT[key];
  const { error } = await supabase
    .from("site_content")
    .upsert(
      { key, draft_content: published as never },
      { onConflict: "key" },
    );
  if (error) throw error;
}
