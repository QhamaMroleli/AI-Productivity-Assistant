import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Loader2, RefreshCw, Eraser, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { CopyButton, EmptyState, ErrorBox, LoadingBlock, PageHeader, ToolDisclaimer } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateEmail } from "@/lib/ai.functions";
import { errorMessage, saveRecord, updateRecordOutput } from "@/lib/records";
import { useInvalidate } from "@/hooks/use-data";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Smart Email Generator — WorkFlow AI" },
      { name: "description", content: "Generate clear, context-aware professional emails in your chosen tone." },
      { property: "og:title", content: "Smart Email Generator — WorkFlow AI" },
      { property: "og:description", content: "Generate clear, context-aware professional emails." },
    ],
  }),
  component: () => (
    <AppShell>
      <EmailPage />
    </AppShell>
  ),
});

const TONES = ["Formal", "Friendly", "Persuasive", "Professional", "Apologetic"] as const;
const TYPES = ["Business inquiry", "Follow-up", "Meeting request", "Job application", "Complaint", "Thank-you email", "Custom"];
const EMPTY = { recipient: "", subject: "", purpose: "", keyPoints: "", tone: "Professional" as (typeof TONES)[number], emailType: "Follow-up" };

function EmailPage() {
  const gen = useServerFn(generateEmail);
  const invalidate = useInvalidate();
  const [form, setForm] = useState(EMPTY);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function run() {
    if (loading) return;
    if (form.purpose.trim().length < 3) {
      setError("Describe the purpose of the email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await gen({ data: form });
      setSubject(res.subject);
      setBody(res.body);
      const id = await saveRecord("email", res.subject, form, res);
      setRecordId(id);
      invalidate("records");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveEdits() {
    if (!recordId) return;
    try {
      await updateRecordOutput(recordId, { subject, body }, subject);
      invalidate("records");
      toast.success("Edits saved to history");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const full = subject ? `Subject: ${subject}\n\n${body}` : body;

  return (
    <div className="fade-up">
      <PageHeader icon={<Mail className="h-5 w-5" />} title="Smart Email Generator" description="Describe what you need — WorkFlow AI drafts it. Always review before sending; nothing is sent automatically." />
      <ToolDisclaimer />
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="card-surface space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="recipient">Recipient</Label>
              <Input id="recipient" placeholder="e.g. Ms. Naidoo, Hiring Manager" value={form.recipient} onChange={(e) => set("recipient")(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Email subject</Label>
              <Input id="subject" placeholder="Optional — AI can suggest one" value={form.subject} onChange={(e) => set("subject")(e.target.value)} maxLength={300} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tone">Tone</Label>
              <Select value={form.tone} onValueChange={set("tone")}>
                <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
                <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Email type</Label>
              <Select value={form.emailType} onValueChange={set("emailType")}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="purpose">Purpose of the email *</Label>
            <Textarea id="purpose" rows={3} required placeholder="e.g. Follow up on last week's proposal and ask for feedback" value={form.purpose} onChange={(e) => set("purpose")(e.target.value)} maxLength={3000} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="points">Key points to include</Label>
            <Textarea id="points" rows={4} placeholder={"One per line, e.g.\n- Proposal sent on 3 October\n- Happy to adjust the timeline"} value={form.keyPoints} onChange={(e) => set("keyPoints")(e.target.value)} maxLength={4000} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Generate email
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setForm(EMPTY); setSubject(""); setBody(""); setRecordId(null); setError(""); }}>
              <Eraser className="h-4 w-4" /> Clear form
            </Button>
          </div>
        </form>

        <section aria-live="polite" className="space-y-3">
          {error && <ErrorBox message={error} onRetry={run} />}
          {loading ? (
            <LoadingBlock label="Drafting your email…" />
          ) : body ? (
            <div className="card-surface space-y-3 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="out-subject">Subject</Label>
                <Input id="out-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="out-body">Email (editable)</Label>
                <Textarea id="out-body" rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="leading-relaxed" />
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={full} />
                <Button variant="outline" size="sm" onClick={run}><RefreshCw className="h-4 w-4" /> Regenerate</Button>
                <Button variant="outline" size="sm" onClick={saveEdits} disabled={!recordId}><Save className="h-4 w-4" /> Save edits</Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={<Mail className="h-5 w-5" />} title="Your draft will appear here">
              Fill in the purpose and key points, choose a tone, then press Generate email.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
