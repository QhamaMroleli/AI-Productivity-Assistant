import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { NotebookPen, Loader2, Download, Pencil, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { CopyButton, EmptyState, ErrorBox, LoadingBlock, PageHeader, Section, ToolDisclaimer } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { summarizeMeeting } from "@/lib/ai.functions";
import type { MeetingResult } from "@/lib/prompts";
import { downloadText, errorMessage, saveRecord, updateRecordOutput } from "@/lib/records";
import { meetingToMarkdown } from "@/lib/format";
import { useInvalidate } from "@/hooks/use-data";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Summarizer — WorkFlow AI" },
      { name: "description", content: "Turn meeting notes into summaries, decisions, action items and open questions." },
      { property: "og:title", content: "Meeting Summarizer — WorkFlow AI" },
      { property: "og:description", content: "Turn meeting notes into structured summaries." },
    ],
  }),
  component: () => (
    <AppShell>
      <MeetingsPage />
    </AppShell>
  ),
});

const EMPTY = { title: "", date: "", participants: "", notes: "" };

function MeetingsPage() {
  const run = useServerFn(summarizeMeeting);
  const invalidate = useInvalidate();
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (loading) return;
    if (form.notes.trim().length < 20) { setError("Paste at least a few lines of meeting notes."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await run({ data: form });
      setResult(res);
      const md = meetingToMarkdown(res, form);
      setText(md);
      setEditing(false);
      setChecked({});
      setRecordId(await saveRecord("meeting", form.title || "Meeting summary", form, { ...res, markdown: md }));
      invalidate("records");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveEdits() {
    if (!recordId || !result) return;
    try {
      await updateRecordOutput(recordId, { ...result, markdown: text });
      toast.success("Edits saved to history");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="fade-up">
      <PageHeader icon={<NotebookPen className="h-5 w-5" />} title="Meeting Notes Summarizer" description="Paste a transcript or rough notes. Missing owners or deadlines are marked “Not specified” — never guessed." />
      <ToolDisclaimer />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <form className="card-surface space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="m-title">Meeting title</Label>
            <Input id="m-title" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q4 marketing sync" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-date">Meeting date</Label>
              <Input id="m-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-people">Participants</Label>
              <Input id="m-people" value={form.participants} maxLength={1000} onChange={(e) => setForm({ ...form, participants: e.target.value })} placeholder="Comma separated" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-notes">Meeting notes *</Label>
            <Textarea id="m-notes" rows={14} required maxLength={30000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Paste the transcript, minutes or rough notes here…" />
            <p className="text-xs text-muted-foreground">{form.notes.length.toLocaleString()} / 30,000 characters</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <NotebookPen className="h-4 w-4" />} Summarize meeting
          </Button>
        </form>

        <section aria-live="polite" className="space-y-3">
          {error && <ErrorBox message={error} onRetry={submit} />}
          {loading ? (
            <LoadingBlock label="Reading your notes and extracting decisions…" />
          ) : result ? (
            <div className="card-surface space-y-5 p-5">
              <div className="flex flex-wrap gap-2">
                <CopyButton text={text} />
                <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                  {editing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} {editing ? "View structured" : "Edit"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadText(`${form.title || "meeting-summary"}.md`, text)}>
                  <Download className="h-4 w-4" /> Export .md
                </Button>
                {editing && <Button size="sm" variant="outline" onClick={saveEdits}><Save className="h-4 w-4" /> Save edits</Button>}
              </div>
              {editing ? (
                <Textarea aria-label="Edit summary" rows={22} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs leading-relaxed" />
              ) : (
                <>
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Executive summary</h3>
                    <p className="text-sm leading-relaxed">{result.executive_summary}</p>
                  </section>
                  <Section title="Key discussion points" items={result.key_points} />
                  <Section title="Decisions made" items={result.decisions} empty="No explicit decisions recorded" />
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Action items</h3>
                    {result.action_items.length ? (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted text-left text-xs text-muted-foreground">
                            <tr><th className="w-10 p-2"><span className="sr-only">Done</span></th><th className="p-2">Task</th><th className="p-2">Owner</th><th className="p-2">Deadline</th></tr>
                          </thead>
                          <tbody>
                            {result.action_items.map((a, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2"><Checkbox aria-label={`Mark "${a.task}" done`} checked={!!checked[i]} onCheckedChange={(v) => setChecked({ ...checked, [i]: !!v })} /></td>
                                <td className={`p-2 ${checked[i] ? "text-muted-foreground line-through" : ""}`}>{a.task}</td>
                                <td className={`p-2 ${a.owner === "Not specified" ? "italic text-muted-foreground" : ""}`}>{a.owner}</td>
                                <td className={`p-2 ${a.deadline === "Not specified" ? "italic text-muted-foreground" : ""}`}>{a.deadline}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="text-sm italic text-muted-foreground">Not specified</p>}
                  </section>
                  <Section title="Unresolved questions" items={result.unresolved_questions} empty="None identified" />
                </>
              )}
            </div>
          ) : (
            <EmptyState icon={<NotebookPen className="h-5 w-5" />} title="Your summary will appear here">
              Paste your notes and press Summarize meeting to get decisions, action items and open questions.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
