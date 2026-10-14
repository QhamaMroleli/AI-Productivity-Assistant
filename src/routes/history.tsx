import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { History as HistoryIcon, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ConfirmButton, CopyButton, EmptyState, PageHeader } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, useRecords } from "@/hooks/use-data";
import { KIND_LABEL, type AiRecord, type RecordKind } from "@/lib/records";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — WorkFlow AI" },
      { name: "description", content: "Review, copy and delete your saved emails, summaries, schedules, research and chats." },
      { property: "og:title", content: "History — WorkFlow AI" },
      { property: "og:description", content: "Your saved AI work." },
    ],
  }),
  component: () => (
    <AppShell>
      <HistoryPage />
    </AppShell>
  ),
});

function recordText(r: AiRecord): string {
  const o = (r.output ?? {}) as Record<string, unknown>;
  if (typeof o.markdown === "string") return o.markdown;
  if (r.kind === "email") return `Subject: ${o.subject ?? ""}\n\n${o.body ?? ""}`;
  if (r.kind === "chat" && Array.isArray(o.messages))
    return (o.messages as { role: string; content: string }[]).map((m) => `${m.role === "user" ? "You" : "WorkFlow AI"}:\n${m.content}`).join("\n\n");
  if (r.kind === "plan" && Array.isArray(o.blocks))
    return (o.blocks as { day: string; start: string; end: string; label: string }[]).map((b) => `${b.day} ${b.start}–${b.end}  ${b.label}`).join("\n");
  return JSON.stringify(o, null, 2);
}

function HistoryPage() {
  const [filter, setFilter] = useState<RecordKind | "all">("all");
  const records = useRecords();
  const invalidate = useInvalidate();
  const [view, setView] = useState<AiRecord | null>(null);
  const list = (records.data ?? []).filter((r) => filter === "all" || r.kind === filter);

  async function remove(id: string) {
    const { error } = await supabase.from("ai_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidate("records");
  }

  return (
    <div className="fade-up">
      <PageHeader icon={<HistoryIcon className="h-5 w-5" />} title="History" description="Everything you've generated is private to your account. Review, copy or delete it anytime." />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as RecordKind | "all")} className="mb-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {(Object.keys(KIND_LABEL) as RecordKind[]).map((k) => <TabsTrigger key={k} value={k}>{KIND_LABEL[k]}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {records.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Loading history…</p>
      ) : list.length === 0 ? (
        <EmptyState icon={<HistoryIcon className="h-5 w-5" />} title="Nothing saved yet">Results from the AI tools are saved here automatically.</EmptyState>
      ) : (
        <ul className="card-surface divide-y">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{KIND_LABEL[r.kind]} · {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView(r)}><Eye className="h-4 w-4" /> View</Button>
              <ConfirmButton title="Delete this item?" description="This permanently removes it from your history." onConfirm={() => remove(r.id)}>
                <Button variant="ghost" size="icon" aria-label={`Delete ${r.title}`}><Trash2 className="h-4 w-4" /></Button>
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.title}</DialogTitle>
                <DialogDescription>{KIND_LABEL[view.kind]} · {format(new Date(view.created_at), "d MMM yyyy, HH:mm")}</DialogDescription>
              </DialogHeader>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-sans text-sm leading-relaxed">{recordText(view)}</pre>
              <div><CopyButton text={recordText(view)} /></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
