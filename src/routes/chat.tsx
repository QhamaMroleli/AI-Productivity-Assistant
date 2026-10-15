import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessagesSquare, Send, Trash2, Loader2, Workflow, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ConfirmButton, CopyButton, ErrorBox, PageHeader } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatReply } from "@/lib/ai.functions";
import { errorMessage, saveRecord, updateRecordOutput } from "@/lib/records";
import { useInvalidate } from "@/hooks/use-data";
import { DISCLAIMER } from "@/components/app/shared";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Workplace Chat — WorkFlow AI" },
      { name: "description", content: "Chat with an AI workplace assistant for writing, planning and problem-solving." },
      { property: "og:title", content: "AI Workplace Chat — WorkFlow AI" },
      { property: "og:description", content: "Your AI workplace assistant." },
    ],
  }),
  component: () => (
    <AppShell>
      <ChatPage />
    </AppShell>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = [
  "Help me plan my workday.",
  "Write a professional follow-up email.",
  "Summarize these meeting notes.",
  "Help me prioritize my workload.",
  "Create a project action plan.",
];

function ChatPage() {
  const reply = useServerFn(chatReply);
  const invalidate = useInvalidate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(history: Msg[]) {
    setLoading(true);
    setError("");
    try {
      const { text } = await reply({ data: { messages: history.slice(-40) } });
      const next = [...history, { role: "assistant" as const, content: text }];
      setMessages(next);
      const title = (history[0]?.content ?? "Chat").slice(0, 80);
      if (recordId) await updateRecordOutput(recordId, { messages: next });
      else setRecordId(await saveRecord("chat", title, {}, { messages: next }));
      invalidate("records");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content: content.slice(0, 8000) }];
    setMessages(next);
    setInput("");
    ask(next);
  }

  return (
    <div className="fade-up flex flex-col">
      <PageHeader
        icon={<MessagesSquare className="h-5 w-5" />}
        title="AI Workplace Chat"
        description="Draft, brainstorm, plan and problem-solve. Conversations are saved to your History."
        actions={
          messages.length > 0 && (
            <ConfirmButton title="Clear this conversation?" description="The chat window will be cleared. A saved copy stays in History until you delete it there." confirmLabel="Clear" onConfirm={() => { setMessages([]); setRecordId(null); setError(""); }}>
              <Button variant="outline" size="sm"><Trash2 className="h-4 w-4" /> Clear conversation</Button>
            </ConfirmButton>
          )
        }
      />

      <div className="card-surface flex min-h-[60vh] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" role="log" aria-live="polite" aria-label="Conversation">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Workflow className="h-6 w-6" aria-hidden /></span>
              <p className="font-semibold">How can I help you work smarter today?</p>
              <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden><Workflow className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <span className="sr-only">Assistant:</span>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  <div className="mt-2"><CopyButton text={m.content} label="Copy response" /></div>
                </div>
              </div>
            ),
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" /> WorkFlow AI is thinking…
            </div>
          )}
          {error && (
            <ErrorBox message={error} onRetry={messages.at(-1)?.role === "user" ? () => ask(messages) : undefined} />
          )}
          <div ref={endRef} />
        </div>
        <form className="border-t p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <Textarea
              id="chat-input"
              rows={2}
              maxLength={8000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask WorkFlow AI… (Enter to send, Shift+Enter for new line)"
              className="min-h-[52px] resize-none"
            />
            <Button type="submit" size="icon" className="h-[52px] w-[52px] shrink-0" disabled={loading || !input.trim()} aria-label="Send message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><RotateCcw className="h-3 w-3" aria-hidden /> {DISCLAIMER.split(". ")[0]}.</p>
        </form>
      </div>
    </div>
  );
}
