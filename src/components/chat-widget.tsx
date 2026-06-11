import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What's good for jollof tonight?",
  "Show me palm oil options",
  "How long does delivery take?",
  "What's my order status?",
];

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ userId: user?.id ?? null }),
    }),
  ).current;

  const { messages, sendMessage, status } = useChat({ transport });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open shopping assistant"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-warm text-spice-foreground shadow-warm transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-warm px-4 py-3 text-spice-foreground">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-bold leading-tight">Akosua AI Assistant</div>
              <div className="text-xs opacity-90">Your Browns Local Food Market assistant</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-secondary/60 p-3 text-sm">
                  Hello, I'm Akosua, your Browns Local Food Market assistant. Ask me what to cook tonight, find ingredients, or check your order status.
                </div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-left text-xs hover:border-spice hover:bg-spice/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-spice text-spice-foreground"
                      : "mr-auto bg-secondary/60",
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-a:text-spice prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{text || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{text}</span>
                  )}
                </div>
              );
            })}

            {status === "submitted" && (
              <div className="mr-auto flex gap-1 rounded-2xl bg-secondary/60 px-3 py-2">
                <span className="h-2 w-2 animate-bounce rounded-full bg-spice [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-spice [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-spice" />
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Akua…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-spice"
            />
            <Button type="submit" size="icon" variant="spice" disabled={isBusy}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
