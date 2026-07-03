import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Send, RotateCcw, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useEditableContent,
  saveDraft,
  publishContent,
  resetDraftToPublished,
  DEFAULT_CONTENT,
  type WhatsAppContent,
} from "@/lib/site-content";

export const Route = createFileRoute("/admin/whatsapp")({
  component: AdminWhatsApp,
});

function AdminWhatsApp() {
  const { data, isLoading } = useEditableContent("whatsapp");
  const qc = useQueryClient();
  const [draft, setDraft] = useState<WhatsAppContent | null>(null);
  const [busy, setBusy] = useState<null | "save" | "publish" | "reset">(null);

  useEffect(() => {
    if (data?.draft) setDraft(data.draft as WhatsAppContent);
  }, [data?.draft]);

  if (isLoading || !draft) return <div className="text-sm text-muted-foreground">Loading WhatsApp settings…</div>;

  const set = (patch: Partial<WhatsAppContent>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const invalidate = () => qc.invalidateQueries({ queryKey: ["site_content"] });

  const onSave = async () => {
    setBusy("save");
    try { await saveDraft("whatsapp", draft); toast.success("Draft saved."); await invalidate(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const onPublish = async () => {
    setBusy("publish");
    try { await publishContent("whatsapp", draft); toast.success("WhatsApp settings published live."); await invalidate(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const onReset = async () => {
    setBusy("reset");
    try { await resetDraftToPublished("whatsapp"); toast.success("Draft reset to published."); await invalidate(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const setReply = (i: number, v: string) => {
    const arr = [...(draft.quick_replies ?? [])];
    arr[i] = v;
    set({ quick_replies: arr });
  };
  const addReply = () => set({ quick_replies: [...(draft.quick_replies ?? []), ""] });
  const removeReply = (i: number) => set({ quick_replies: (draft.quick_replies ?? []).filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">WhatsApp Settings</h1>
        <p className="text-muted-foreground">
          Customer taps the button → sees a welcome message from your business → picks a quick reply or starts a chat.
          Updates go live everywhere as soon as you publish.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">Enable WhatsApp button</Label>
            <p className="text-sm text-muted-foreground">When off, the floating button is hidden across the site.</p>
          </div>
          <Switch checked={draft.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </div>

      <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-card md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>WhatsApp number (with country code, digits only)</Label>
          <Input inputMode="tel" placeholder="233240000000" value={draft.phone_number}
            onChange={(e) => set({ phone_number: e.target.value.replace(/[^\d+]/g, "") })} />
          <p className="text-xs text-muted-foreground">E.g. <code>233240000000</code> for +233 24 000 0000.</p>
        </div>

        <div className="space-y-2">
          <Label>Business name (shown in chat header)</Label>
          <Input value={draft.business_name} onChange={(e) => set({ business_name: e.target.value })} placeholder="Brown's Local Food Market" />
        </div>

        <div className="space-y-2">
          <Label>Greeting text (small header line)</Label>
          <Input value={draft.greeting_text} onChange={(e) => set({ greeting_text: e.target.value })} placeholder="Hi there 👋" />
        </div>

        <div className="space-y-2">
          <Label>Button text</Label>
          <Input value={draft.button_text} onChange={(e) => set({ button_text: e.target.value })} placeholder="WhatsApp Support" />
        </div>

        <div className="space-y-2">
          <Label>Tooltip text</Label>
          <Input value={draft.tooltip_text} onChange={(e) => set({ tooltip_text: e.target.value })} placeholder="Need help? Chat with us on WhatsApp" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Welcome message template (staff reference only — never auto-sent)</Label>
          <Textarea rows={4} value={draft.welcome_message} onChange={(e) => set({ welcome_message: e.target.value })}
            placeholder="Welcome to Brown's Local Food Market. How may we assist you today?" />
          <p className="text-xs text-muted-foreground">
            This is a guide for your support staff to greet customers. It is <strong>never</strong> inserted into
            the customer's WhatsApp message box — when a customer taps the button, WhatsApp opens with an empty
            message so they type their own question.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Business hours</Label>
          <Input value={draft.business_hours ?? ""} onChange={(e) => set({ business_hours: e.target.value })}
            placeholder="Monday – Saturday, 8:00 – 18:00 GMT" />
        </div>

        <div className="space-y-2">
          <Label>Auto-reply text (future WhatsApp API integration)</Label>
          <Input value={draft.auto_reply_text ?? ""} onChange={(e) => set({ auto_reply_text: e.target.value })}
            placeholder="Thanks for reaching out! We'll reply shortly." />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Quick replies (one-tap options)</Label>
            <Button size="sm" variant="outline" onClick={addReply}><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </div>
          <div className="space-y-2">
            {(draft.quick_replies ?? []).map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input value={q} onChange={(e) => setReply(i, e.target.value)} placeholder="e.g. I have a question about my order" />
                <Button size="icon" variant="ghost" onClick={() => removeReply(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <Label className="text-base font-semibold">Live preview</Label>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
            <MessageCircle className="h-5 w-5" />
            {draft.button_text || "WhatsApp Support"}
          </span>
          <span className="text-sm text-muted-foreground">Opens on the bottom-left of every page.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={busy !== null} variant="outline">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
        </Button>
        <Button onClick={onPublish} disabled={busy !== null} variant="spice">
          {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish live
        </Button>
        <Button onClick={onReset} disabled={busy !== null} variant="ghost">
          {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reset changes
        </Button>
        <Button
          onClick={() => { setDraft(DEFAULT_CONTENT.whatsapp); toast.info("Restored defaults. Click Save to keep them."); }}
          disabled={busy !== null} variant="ghost"
        >
          Restore defaults
        </Button>
      </div>
    </div>
  );
}
