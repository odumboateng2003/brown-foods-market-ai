import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Send, RotateCcw, Eye, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  type ContentKey,
  type ContentMap,
  useEditableContent,
  saveDraft,
  publishContent,
  resetDraftToPublished,
  DEFAULT_CONTENT,
} from "@/lib/site-content";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/content")({
  component: AdminContent,
});

const TABS: { key: ContentKey; label: string }[] = [
  { key: "home_hero", label: "Homepage" },
  { key: "home_features", label: "Home Features" },
  { key: "about", label: "About" },
  { key: "contact", label: "Contact" },
  { key: "privacy", label: "Privacy" },
  { key: "terms", label: "Terms" },
  { key: "footer", label: "Footer" },
  { key: "business_info", label: "Business" },
  { key: "delivery_info", label: "Delivery" },
];

function AdminContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Website Content</h1>
        <p className="text-muted-foreground">
          Edit pages, business info and footer. Save as draft, preview, then publish to the live site.
        </p>
      </div>

      <Tabs defaultValue="home_hero">
        <TabsList className="flex w-full flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            <ContentEditor contentKey={t.key} />
          </TabsContent>
        ))}
      </Tabs>

      <FaqEditor />
    </div>
  );
}

/* ------------------------- Generic editor wrapper ------------------------- */

function ContentEditor({ contentKey }: { contentKey: ContentKey }) {
  const { data, isLoading } = useEditableContent(contentKey);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ContentMap[ContentKey] | null>(null);
  const [busy, setBusy] = useState<null | "save" | "publish" | "reset">(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (data?.draft) setDraft(data.draft);
  }, [data?.draft]);

  if (isLoading || !draft) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["site_content"] });

  const onSave = async () => {
    setBusy("save");
    try {
      await saveDraft(contentKey, draft as never);
      toast.success("Draft saved.");
      await invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onPublish = async () => {
    setBusy("publish");
    try {
      await publishContent(contentKey, draft as never);
      toast.success("Published to live site.");
      await invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onReset = async () => {
    setBusy("reset");
    try {
      await resetDraftToPublished(contentKey);
      toast.success("Draft reset to published version.");
      await invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onResetDefault = () => {
    setDraft(DEFAULT_CONTENT[contentKey]);
    toast.info("Restored built-in defaults. Click Save Draft to keep them.");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <EditorFields
        contentKey={contentKey}
        value={draft}
        onChange={(v) => setDraft(v)}
      />

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button onClick={onSave} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Draft
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
        <Button variant="ghost" onClick={onResetDefault} disabled={!!busy}>
          Restore defaults
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {data?.published_at ? `Last published ${new Date(data.published_at).toLocaleString()}` : "Not yet published"}
        </div>
      </div>

      {showPreview && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/30 p-6">
          <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Live preview</div>
          <ContentPreview contentKey={contentKey} value={draft} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Fields per key ----------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function EditorFields({
  contentKey,
  value,
  onChange,
}: {
  contentKey: ContentKey;
  value: ContentMap[ContentKey];
  onChange: (v: ContentMap[ContentKey]) => void;
}) {
  const set = (patch: Record<string, unknown>) =>
    onChange({ ...(value as object), ...patch } as ContentMap[ContentKey]);

  if (contentKey === "home_hero") {
    const v = value as ContentMap["home_hero"];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Eyebrow"><Input value={v.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></Field>
        <Field label="CTA primary"><Input value={v.cta_primary} onChange={(e) => set({ cta_primary: e.target.value })} /></Field>
        <Field label="Title"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Highlight word"><Input value={v.highlight} onChange={(e) => set({ highlight: e.target.value })} /></Field>
        <Field label="CTA secondary"><Input value={v.cta_secondary} onChange={(e) => set({ cta_secondary: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label="Subtitle">
            <Textarea rows={3} value={v.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
          </Field>
        </div>
      </div>
    );
  }


  if (contentKey === "home_features") {
    const v = value as ContentMap["home_features"];
    const items = v.items ?? [];
    const setItems = (next: typeof items) => set({ items: next });
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          These cards appear on the homepage hero. Use <code>{"{location}"}</code> in the title to auto-insert the business city from the Business tab.
        </p>
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <Label className="text-xs">Icon</Label>
                <select
                  value={it.icon}
                  onChange={(e) => { const n = [...items]; n[i] = { ...it, icon: e.target.value }; setItems(n); }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {["truck","shield","sparkles","leaf","utensils","wheat","fish","flame","star"].map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="sm:col-span-7">
                <Label className="text-xs">Title</Label>
                <Input value={it.title} onChange={(e) => { const n = [...items]; n[i] = { ...it, title: e.target.value }; setItems(n); }} />
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={it.visible} onChange={(e) => { const n = [...items]; n[i] = { ...it, visible: e.target.checked }; setItems(n); }} />
                  Visible
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Field label="Description">
              <Textarea rows={2} value={it.description} onChange={(e) => { const n = [...items]; n[i] = { ...it, description: e.target.value }; setItems(n); }} />
            </Field>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { icon: "sparkles", title: "New feature", description: "", visible: true, sort_order: items.length }])}>
          <Plus className="mr-1 h-4 w-4" /> Add feature
        </Button>
      </div>
    );
  }

  if (contentKey === "about") {
    const v = value as ContentMap["about"];
    return (
      <div className="space-y-4">
        <Field label="Page title"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Intro"><Textarea rows={3} value={v.intro} onChange={(e) => set({ intro: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mission heading"><Input value={v.mission_heading} onChange={(e) => set({ mission_heading: e.target.value })} /></Field>
          <Field label="What-we-do heading"><Input value={v.what_we_do_heading} onChange={(e) => set({ what_we_do_heading: e.target.value })} /></Field>
        </div>
        <Field label="Mission body"><Textarea rows={4} value={v.mission_body} onChange={(e) => set({ mission_body: e.target.value })} /></Field>
        <Field label="What we do (one per line)">
          <Textarea
            rows={5}
            value={v.what_we_do_items.join("\n")}
            onChange={(e) => set({ what_we_do_items: e.target.value.split("\n").filter(Boolean) })}
          />
        </Field>
        <Field label="Closing heading"><Input value={v.outro_heading} onChange={(e) => set({ outro_heading: e.target.value })} /></Field>
        <Field label="Closing body"><Textarea rows={4} value={v.outro_body} onChange={(e) => set({ outro_body: e.target.value })} /></Field>
      </div>
    );
  }

  if (contentKey === "contact") {
    const v = value as ContentMap["contact"];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Intro"><Textarea rows={3} value={v.intro} onChange={(e) => set({ intro: e.target.value })} /></Field></div>
        <Field label="Email"><Input value={v.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="WhatsApp"><Input value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
        <Field label="Office address"><Input value={v.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Business hours"><Input value={v.hours} onChange={(e) => set({ hours: e.target.value })} /></Field></div>
      </div>
    );
  }

  if (contentKey === "privacy" || contentKey === "terms") {
    const v = value as ContentMap["privacy"];
    return (
      <div className="space-y-4">
        <Field label="Page title"><Input value={v.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Body (separate paragraphs with blank lines; lines starting with `-` become bullets)">
          <Textarea rows={20} value={v.body} onChange={(e) => set({ body: e.target.value })} />
        </Field>
      </div>
    );
  }

  if (contentKey === "footer") {
    const v = value as ContentMap["footer"];
    return (
      <div className="space-y-4">
        <Field label="Tagline"><Textarea rows={3} value={v.tagline} onChange={(e) => set({ tagline: e.target.value })} /></Field>
        <Field label="Development notice (leave empty to hide)"><Input value={v.dev_notice} onChange={(e) => set({ dev_notice: e.target.value })} /></Field>
      </div>
    );
  }

  if (contentKey === "business_info") {
    const v = value as ContentMap["business_info"];
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name"><Input value={v.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Email"><Input value={v.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="WhatsApp"><Input value={v.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><Input value={v.address} onChange={(e) => set({ address: e.target.value })} /></Field></div>
        <Field label="Facebook URL"><Input value={v.facebook} onChange={(e) => set({ facebook: e.target.value })} /></Field>
        <Field label="Instagram URL"><Input value={v.instagram} onChange={(e) => set({ instagram: e.target.value })} /></Field>
        <Field label="Twitter / X URL"><Input value={v.twitter} onChange={(e) => set({ twitter: e.target.value })} /></Field>
        <Field label="TikTok URL"><Input value={v.tiktok} onChange={(e) => set({ tiktok: e.target.value })} /></Field>
      </div>
    );
  }

  if (contentKey === "delivery_info") {
    const v = value as ContentMap["delivery_info"];
    return (
      <div className="space-y-4">
        <Field label="Intro"><Textarea rows={3} value={v.intro} onChange={(e) => set({ intro: e.target.value })} /></Field>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regions</Label>
          {v.regions.map((r, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <Input className="col-span-5" placeholder="Region" value={r.name} onChange={(e) => {
                const next = [...v.regions]; next[i] = { ...r, name: e.target.value }; set({ regions: next });
              }} />
              <Input className="col-span-3" type="number" placeholder="Fee" value={r.fee_ghs} onChange={(e) => {
                const next = [...v.regions]; next[i] = { ...r, fee_ghs: Number(e.target.value) }; set({ regions: next });
              }} />
              <Input className="col-span-3" placeholder="ETA" value={r.eta} onChange={(e) => {
                const next = [...v.regions]; next[i] = { ...r, eta: e.target.value }; set({ regions: next });
              }} />
              <Button variant="ghost" size="icon" onClick={() => {
                const next = v.regions.filter((_, j) => j !== i); set({ regions: next });
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ regions: [...v.regions, { name: "", fee_ghs: 0, eta: "" }] })}>
            <Plus className="mr-1 h-4 w-4" /> Add region
          </Button>
        </div>
        <Field label="Notes"><Textarea rows={3} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
      </div>
    );
  }

  return null;
}

/* ------------------------------- Preview ------------------------------- */

function ContentPreview({ contentKey, value }: { contentKey: ContentKey; value: ContentMap[ContentKey] }) {
  if (contentKey === "home_hero") {
    const v = value as ContentMap["home_hero"];
    return (
      <div>
        <div className="text-xs font-semibold text-spice">{v.eyebrow}</div>
        <h1 className="mt-2 font-display text-3xl font-bold">{v.title} <span className="text-spice">{v.highlight}</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">{v.subtitle}</p>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="rounded bg-spice px-3 py-1 text-spice-foreground">{v.cta_primary}</span>
          <span className="rounded border border-border px-3 py-1">{v.cta_secondary}</span>
        </div>
      </div>
    );
  }
  if (contentKey === "privacy" || contentKey === "terms") {
    const v = value as ContentMap["privacy"];
    return (
      <div>
        <h2 className="font-display text-xl font-bold">{v.title}</h2>
        <div className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-foreground">{v.body}</div>
      </div>
    );
  }
  return <pre className="overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(value, null, 2)}</pre>;
}

/* --------------------------------- FAQ --------------------------------- */

type FaqRow = { id: string; question: string; answer: string; sort_order: number; is_published: boolean };

function FaqEditor() {
  const qc = useQueryClient();
  const [items, setItems] = useState<FaqRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_faqs").select("*").order("sort_order");
      setItems((data ?? []) as FaqRow[]);
      setLoading(false);
    })();
  }, []);

  const add = () => setItems((p) => [...p, { id: `new-${Date.now()}`, question: "", answer: "", sort_order: p.length, is_published: true }]);
  const update = (id: string, patch: Partial<FaqRow>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const remove = async (id: string) => {
    if (!id.startsWith("new-")) {
      await supabase.from("site_faqs").delete().eq("id", id);
    }
    setItems((p) => p.filter((i) => i.id !== id));
    qc.invalidateQueries({ queryKey: ["site_faqs"] });
  };
  const saveAll = async () => {
    const toUpsert = items.map((i, idx) => {
      const base = { question: i.question, answer: i.answer, sort_order: idx, is_published: i.is_published };
      return i.id.startsWith("new-") ? base : { id: i.id, ...base };
    });
    const { error } = await supabase.from("site_faqs").upsert(toUpsert as never);
    if (error) { toast.error(error.message); return; }
    toast.success("FAQ saved.");
    const { data } = await supabase.from("site_faqs").select("*").order("sort_order");
    setItems((data ?? []) as FaqRow[]);
    qc.invalidateQueries({ queryKey: ["site_faqs"] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">FAQ</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={add}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          <Button size="sm" onClick={saveAll}><Save className="mr-1 h-4 w-4" /> Save FAQ</Button>
        </div>
      </div>
      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No FAQs yet. Click Add to create one.</p>}
          {items.map((f) => (
            <div key={f.id} className="rounded-lg border border-border p-3">
              <div className="flex gap-2">
                <Input className="flex-1" placeholder="Question" value={f.question} onChange={(e) => update(f.id, { question: e.target.value })} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={f.is_published} onChange={(e) => update(f.id, { is_published: e.target.checked })} />
                  Published
                </label>
                <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea className="mt-2" rows={2} placeholder="Answer" value={f.answer} onChange={(e) => update(f.id, { answer: e.target.value })} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
