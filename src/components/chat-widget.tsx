import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Sparkles, History, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  getPublicAiSettings,
  listMyConversations,
  getConversationMessages,
  deleteConversation as deleteConvoFn,
  deleteAllMyConversations,
} from "@/lib/ai.functions";

const GUEST_STORAGE_KEY = "brownfoods_guest_chat_v1";

type StoredMessage = { id: string; role: string; parts: { type: string; text?: string }[] };

export function ChatWidget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const settingsFn = useServerFn(getPublicAiSettings);
  const listConvos = useServerFn(listMyConversations);
  const getConvoMsgs = useServerFn(getConversationMessages);
  const deleteConvo = useServerFn(deleteConvoFn);
  const clearAll = useServerFn(deleteAllMyConversations);

  const { data: settings } = useQuery({
    queryKey: ["ai", "settings"],
    queryFn: () => settingsFn(),
    staleTime: 60_000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["ai", "conversations", user?.id ?? "guest"],
    queryFn: () => (user ? listConvos() : Promise.resolve([])),
    enabled: !!user,
  });

  // Refs so the transport (created once) always sees the current values
  const userIdRef = useRef<string | null>(user?.id ?? null);
  const conversationIdRef = useRef<string | null>(null);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        userId: userIdRef.current,
        conversationId: conversationIdRef.current,
      }),
      fetch: async (url, init) => {
        const res = await fetch(url as string, init);
        const cid = res.headers.get("x-conversation-id");
        if (cid && !conversationIdRef.current) {
          conversationIdRef.current = cid;
          setConversationId(cid);
        }
        return res;
      },
    }),
  ).current;

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    onFinish: () => {
      if (userIdRef.current) {
        void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
      }
    },
  });

  // -------- GUEST: sessionStorage persistence for this browser tab only --------
  useEffect(() => {
    if (user) return;
    try {
      const raw = sessionStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredMessage[];
        if (Array.isArray(stored) && stored.length) {
          setMessages(stored as never);
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user) return;
    try {
      sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(messages));
    } catch { /* ignore */ }
  }, [messages, user]);

  // Clear guest history when signing in — start a fresh conversation
  useEffect(() => {
    if (user) {
      sessionStorage.removeItem(GUEST_STORAGE_KEY);
      setMessages([]);
      setConversationId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load most recent conversation on open for authenticated users
  useEffect(() => {
    if (!open || !user || conversationId || messages.length > 0) return;
    const first = conversations[0];
    if (first) {
      setConversationId(first.id);
      void getConvoMsgs({ data: { conversation_id: first.id } }).then((rows) => {
        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role as "user" | "assistant",
            parts: (Array.isArray(r.parts) ? r.parts : [{ type: "text", text: r.text_content ?? "" }]) as never,
          })) as never,
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, conversations.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    void sendMessage({ text: trimmed });
    setInput("");
    if (user) void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setHistoryOpen(false);
    if (!user) sessionStorage.removeItem(GUEST_STORAGE_KEY);
  };

  const openConversation = async (id: string) => {
    setConversationId(id);
    const rows = await getConvoMsgs({ data: { conversation_id: id } });
    setMessages(
      rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: (Array.isArray(r.parts) ? r.parts : [{ type: "text", text: r.text_content ?? "" }]) as never,
      })) as never,
    );
    setHistoryOpen(false);
  };

  const removeConversation = async (id: string) => {
    await deleteConvo({ data: { conversation_id: id } });
    if (id === conversationId) startNewChat();
    void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
  };

  const clearAllConversations = async () => {
    if (!confirm("Delete all your saved conversations?")) return;
    await clearAll();
    startNewChat();
    void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
  };

  // If admin disables AI, hide the widget entirely
  if (settings && settings.enabled === false) return null;

  const suggestions = (settings?.suggested_prompts as string[] | undefined) ?? [];
  const greeting = settings?.greeting ?? "Hello, I'm Akosua, your Brown's Local Food Market assistant.";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Akosua AI Assistant"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-warm text-spice-foreground shadow-warm transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-gradient-warm px-3 py-3 text-spice-foreground">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold leading-tight truncate">Akosua AI Assistant</div>
              <div className="text-xs opacity-90 truncate">
                {user ? "Signed in — history saved" : "Guest chat — clears when you leave"}
              </div>
            </div>
            <button
              onClick={startNewChat}
              className="rounded-md p-1.5 hover:bg-white/10"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            {user && (
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className={cn("rounded-md p-1.5 hover:bg-white/10", historyOpen && "bg-white/20")}
                title="Conversation history"
              >
                <History className="h-4 w-4" />
              </button>
            )}
          </div>

          {historyOpen && user ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Previous conversations</div>
                {conversations.length > 0 && (
                  <button onClick={clearAllConversations} className="text-xs text-destructive hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground">No previous chats yet.</p>
              )}
              {conversations.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2 hover:border-spice">
                  <button onClick={() => openConversation(c.id)} className="flex-1 min-w-0 text-left">
                    <div className="truncate text-sm font-medium">{c.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.last_active_at).toLocaleString()}</div>
                  </button>
                  <button onClick={() => removeConversation(c.id)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-secondary/60 p-3 text-sm">{greeting}</div>
                    {suggestions.length > 0 && (
                      <div className="grid gap-2">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => submit(s)}
                            className="rounded-full border border-border px-3 py-1.5 text-left text-xs hover:border-spice hover:bg-spice/5"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "ml-auto bg-spice text-spice-foreground"
                        : "bg-secondary/60",
                    )}
                  >
                    {m.parts?.map((p, i) =>
                      p.type === "text" ? (
                        <div key={i} className="prose prose-sm max-w-none [&>*]:my-1">
                          <ReactMarkdown>{p.text ?? ""}</ReactMarkdown>
                        </div>
                      ) : null,
                    )}
                  </div>
                ))}
                {isBusy && <div className="text-xs text-muted-foreground">Akosua is typing…</div>}
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); submit(input); }}
                className="flex items-end gap-2 border-t border-border p-3"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
                  placeholder="Ask Akosua…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-spice/40"
                />
                <Button type="submit" size="icon" disabled={isBusy || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
