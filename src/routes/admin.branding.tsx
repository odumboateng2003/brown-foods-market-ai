import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Save, Send, RotateCcw, Eye, Loader2, Upload, Trash2,
  Facebook, Instagram, Twitter, Linkedin, Youtube, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useEditableContent,
  saveDraft,
  publishContent,
  resetDraftToPublished,
  DEFAULT_CONTENT,
  type BrandingContent,
} from "@/lib/site-content";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/branding")({
  component: AdminBranding,
});

const ACCEPTED_IMAGES = ".png,.jpg,.jpeg,.webp,.svg";
const ACCEPTED_FAVICON = ".ico,.png,.svg,.webp";

function AdminBranding() {
  const { data, isLoading } = useEditableContent("branding");
  const qc = useQueryClient();
  const [draft, setDraft] = useState<BrandingContent | null>(null);
  const [busy, setBusy] = useState<null | "save" | "publish" | "reset">(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (data?.draft) setDraft(data.draft as BrandingContent);
  }, [data?.draft]);

  if (isLoading || !draft) {
    return <div className="text-sm text-muted-foreground">Loading branding…</div>;
  }

  const set = (patch: Partial<BrandingContent>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["site_content"] });

  const onSave = async () => {
    setBusy("save");
    try { await saveDraft("branding", draft); toast.success("Draft saved."); await invalidate(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const onPublish = async () => {
    setBusy("publish");
    try { await publishContent("branding", draft); toast.success("Branding published live."); await invalidate(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const onReset = async () => {
    setBusy("reset");
    try { await resetDraftToPublished("branding"); toast.success("Draft reset to published."); await invalidate(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const onRestoreDefaults = () => {
    setDraft(DEFAULT_CONTENT.branding);
    toast.info("Restored defaults. Click Save to keep them.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Branding & Site Identity</h1>
        <p className="text-muted-foreground">
          Manage favicon, logos, brand colors, SEO, and social profiles. Changes go live after publishing.
        </p>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="logos">Logos & Favicon</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="preview">Social Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-6">
          <Section title="Business identity">
            <Grid2>
              <Field label="Business name"><Input value={draft.business_name} onChange={(e) => set({ business_name: e.target.value })} /></Field>
              <Field label="Website name"><Input value={draft.website_name} onChange={(e) => set({ website_name: e.target.value })} /></Field>
              <Field label="Tagline"><Input value={draft.tagline} onChange={(e) => set({ tagline: e.target.value })} /></Field>
              <Field label="Contact email"><Input value={draft.contact_email} onChange={(e) => set({ contact_email: e.target.value })} /></Field>
              <Field label="Primary phone"><Input value={draft.phone_primary} onChange={(e) => set({ phone_primary: e.target.value })} /></Field>
              <Field label="Secondary phone"><Input value={draft.phone_secondary} onChange={(e) => set({ phone_secondary: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Business address"><Input value={draft.business_address} onChange={(e) => set({ business_address: e.target.value })} /></Field></div>
              <div className="sm:col-span-2"><Field label="Description"><Textarea rows={3} value={draft.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
              <Field label="Copyright text (e.g. © 2026 BROWN)"><Input value={draft.copyright_text} onChange={(e) => set({ copyright_text: e.target.value })} placeholder="Leave blank to auto-generate" /></Field>
              <Field label="Footer text"><Input value={draft.footer_text} onChange={(e) => set({ footer_text: e.target.value })} /></Field>
            </Grid2>
          </Section>
        </TabsContent>

        <TabsContent value="logos" className="mt-6 space-y-4">
          <Section title="Favicon">
            <p className="mb-3 text-xs text-muted-foreground">
              Appears in browser tabs, bookmarks, and mobile shortcuts. Supports .ico, .png, .svg, .webp.
            </p>
            <ImageUploader
              label="Favicon"
              value={draft.favicon_url}
              onChange={(url) => set({ favicon_url: url })}
              accept={ACCEPTED_FAVICON}
              previewClass="h-16 w-16"
            />
          </Section>

          <Section title="Logos">
            <Grid2>
              <ImageUploader label="Header logo" value={draft.logo_header_url} onChange={(url) => set({ logo_header_url: url })} accept={ACCEPTED_IMAGES} />
              <ImageUploader label="Footer logo" value={draft.logo_footer_url} onChange={(url) => set({ logo_footer_url: url })} accept={ACCEPTED_IMAGES} />
              <ImageUploader label="Mobile logo" value={draft.logo_mobile_url} onChange={(url) => set({ logo_mobile_url: url })} accept={ACCEPTED_IMAGES} />
              <ImageUploader label="Light-mode logo" value={draft.logo_light_url} onChange={(url) => set({ logo_light_url: url })} accept={ACCEPTED_IMAGES} />
              <ImageUploader label="Dark-mode logo" value={draft.logo_dark_url} onChange={(url) => set({ logo_dark_url: url })} accept={ACCEPTED_IMAGES} />
            </Grid2>
          </Section>
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <Section title="Social media links">
            <Grid2>
              <Field label="Facebook URL"><Input value={draft.facebook_url} onChange={(e) => set({ facebook_url: e.target.value })} placeholder="https://facebook.com/..." /></Field>
              <Field label="Instagram URL"><Input value={draft.instagram_url} onChange={(e) => set({ instagram_url: e.target.value })} placeholder="https://instagram.com/..." /></Field>
              <Field label="X (Twitter) URL"><Input value={draft.twitter_url} onChange={(e) => set({ twitter_url: e.target.value })} placeholder="https://x.com/..." /></Field>
              <Field label="TikTok URL"><Input value={draft.tiktok_url} onChange={(e) => set({ tiktok_url: e.target.value })} placeholder="https://tiktok.com/@..." /></Field>
              <Field label="LinkedIn URL"><Input value={draft.linkedin_url} onChange={(e) => set({ linkedin_url: e.target.value })} placeholder="https://linkedin.com/company/..." /></Field>
              <Field label="YouTube URL"><Input value={draft.youtube_url} onChange={(e) => set({ youtube_url: e.target.value })} placeholder="https://youtube.com/@..." /></Field>
              <Field label="WhatsApp link"><Input value={draft.whatsapp_url} onChange={(e) => set({ whatsapp_url: e.target.value })} placeholder="https://wa.me/233..." /></Field>
            </Grid2>
          </Section>
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <Section title="Search engine optimisation">
            <div className="space-y-4">
              <Field label="Site title"><Input value={draft.site_title} onChange={(e) => set({ site_title: e.target.value })} /></Field>
              <Grid2>
                <Field label="Meta title"><Input value={draft.meta_title} onChange={(e) => set({ meta_title: e.target.value })} /></Field>
                <Field label="Meta keywords"><Input value={draft.meta_keywords} onChange={(e) => set({ meta_keywords: e.target.value })} placeholder="comma, separated, keywords" /></Field>
              </Grid2>
              <Field label="Meta description"><Textarea rows={3} value={draft.meta_description} onChange={(e) => set({ meta_description: e.target.value })} /></Field>
              <Grid2>
                <Field label="Open Graph title"><Input value={draft.og_title} onChange={(e) => set({ og_title: e.target.value })} /></Field>
                <Field label="Open Graph description"><Input value={draft.og_description} onChange={(e) => set({ og_description: e.target.value })} /></Field>
              </Grid2>
              <ImageUploader label="Open Graph / share image (1200×630 recommended)" value={draft.og_image_url} onChange={(url) => set({ og_image_url: url })} accept={ACCEPTED_IMAGES} previewClass="aspect-[1200/630] w-full max-w-md" />
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <Section title="Brand colours & styling">
            <Grid2>
              <ColorField label="Primary color" value={draft.primary_color} onChange={(v) => set({ primary_color: v })} />
              <ColorField label="Secondary color" value={draft.secondary_color} onChange={(v) => set({ secondary_color: v })} />
              <ColorField label="Accent color" value={draft.accent_color} onChange={(v) => set({ accent_color: v })} />
              <Field label="Button corner style">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.button_radius}
                  onChange={(e) => set({ button_radius: e.target.value as BrandingContent["button_radius"] })}
                >
                  <option value="sharp">Sharp</option>
                  <option value="rounded">Rounded</option>
                  <option value="pill">Pill</option>
                </select>
              </Field>
            </Grid2>
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Live theme preview</div>
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: draft.primary_color }}>Primary</button>
                <button className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: draft.secondary_color, color: "#111" }}>Secondary</button>
                <button className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: draft.accent_color, color: "#111" }}>Accent</button>
              </div>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <SocialPreview b={draft} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-border bg-background/95 py-4 backdrop-blur">
        <Button onClick={onSave} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
        <Button variant="hero" onClick={onPublish} disabled={!!busy}>
          {busy === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Publish Changes
        </Button>
        <Button variant="outline" onClick={() => setShowPreview((v) => !v)}>
          <Eye className="mr-2 h-4 w-4" /> {showPreview ? "Hide preview" : "Preview"}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={!!busy}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to Published
        </Button>
        <Button variant="ghost" onClick={onRestoreDefaults} disabled={!!busy}>Restore defaults</Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {data?.published_at ? `Last published ${new Date(data.published_at).toLocaleString()}` : "Not yet published"}
        </div>
      </div>

      {showPreview && <SocialPreview b={draft} />}
    </div>
  );
}

/* ----------------------------- Helpers ----------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#c2410c" />
      </div>
    </Field>
  );
}

function ImageUploader({
  label, value, onChange, accept, previewClass = "h-20 w-20",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept: string;
  previewClass?: string;
}) {
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `branding/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("site-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("site-media").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success(`${label} uploaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-start gap-3">
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40 ${previewClass}`}>
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">No image</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Image URL or upload below" />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }}
              />
              <span className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Upload"}
              </span>
            </label>
            {value && (
              <Button variant="ghost" size="sm" onClick={() => onChange("")}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </Field>
  );
}

/* ------------------------------ Social preview ------------------------------ */

function SocialPreview({ b }: { b: BrandingContent }) {
  const title = b.og_title || b.meta_title || b.site_title;
  const desc = b.og_description || b.meta_description;
  const img = b.og_image_url;
  const domain = "brownfoodsmarket.com";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-lg font-semibold">How your link looks when shared</h3>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Facebook / LinkedIn style */}
          <Preview label="Facebook / LinkedIn">
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              {img ? <img src={img} alt="" className="aspect-[1200/630] w-full object-cover" /> : <div className="grid aspect-[1200/630] w-full place-items-center bg-secondary text-xs text-muted-foreground">No OG image</div>}
              <div className="space-y-1 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{domain}</div>
                <div className="line-clamp-2 text-sm font-semibold">{title}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
          </Preview>

          {/* X / Twitter */}
          <Preview label="X (Twitter)">
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              {img ? <img src={img} alt="" className="aspect-[1200/630] w-full object-cover" /> : <div className="grid aspect-[1200/630] w-full place-items-center bg-secondary text-xs text-muted-foreground">No image</div>}
              <div className="space-y-1 p-3">
                <div className="text-[10px] text-muted-foreground">{domain}</div>
                <div className="line-clamp-2 text-sm font-semibold">{title}</div>
              </div>
            </div>
          </Preview>

          {/* WhatsApp */}
          <Preview label="WhatsApp">
            <div className="max-w-sm overflow-hidden rounded-lg border border-border bg-[#dcf8c6] p-2">
              <div className="overflow-hidden rounded bg-white">
                {img ? <img src={img} alt="" className="aspect-[1200/630] w-full object-cover" /> : <div className="grid aspect-[1200/630] w-full place-items-center bg-secondary text-xs text-muted-foreground">No image</div>}
                <div className="space-y-0.5 p-2">
                  <div className="line-clamp-1 text-xs font-semibold text-foreground">{title}</div>
                  <div className="line-clamp-2 text-[11px] text-muted-foreground">{desc}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{domain}</div>
                </div>
              </div>
            </div>
          </Preview>

          {/* Connected socials summary */}
          <Preview label="Connected social profiles">
            <ul className="space-y-2 text-sm">
              <SocialRow icon={Facebook} label="Facebook" url={b.facebook_url} />
              <SocialRow icon={Instagram} label="Instagram" url={b.instagram_url} />
              <SocialRow icon={Twitter} label="X / Twitter" url={b.twitter_url} />
              <SocialRow icon={Linkedin} label="LinkedIn" url={b.linkedin_url} />
              <SocialRow icon={Youtube} label="YouTube" url={b.youtube_url} />
              <SocialRow icon={MessageCircle} label="WhatsApp" url={b.whatsapp_url} />
            </ul>
          </Preview>
        </div>
      </div>
    </div>
  );
}

function Preview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
function SocialRow({ icon: Icon, label, url }: { icon: typeof Facebook; label: string; url: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">{label}:</span>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="truncate text-spice hover:underline">{url}</a>
      ) : (
        <span className="text-muted-foreground">Not set</span>
      )}
    </li>
  );
}
