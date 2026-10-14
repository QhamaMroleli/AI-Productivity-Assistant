import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Microscope, Loader2, Download, Pencil, Eye, Info, FileText } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CopyButton, EmptyState, ErrorBox, LoadingBlock, PageHeader, Section, ToolDisclaimer } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { runResearch } from "@/lib/ai.functions";
import type { ResearchResult } from "@/lib/prompts";
import { downloadText, errorMessage, saveRecord } from "@/lib/records";
import { researchToMarkdown } from "@/lib/format";
import { useInvalidate } from "@/hooks/use-data";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research Assistant — WorkFlow AI" },
      { name: "description", content: "Get structured overviews, findings and recommendations on unfamiliar topics." },
      { property: "og:title", content: "Research Assistant — WorkFlow AI" },
      { property: "og:description", content: "Structured research briefs for informed decisions." },
    ],
  }),
  component: () => (
    <AppShell>
      <ResearchPage />
    </AppShell>
  ),
});

const DEPTHS = ["Quick Overview", "Detailed Analysis", "Executive Brief"] as const;

function ResearchPage() {
  const run = useServerFn(runResearch);
  const invalidate = useInvalidate();
  const [topic, setTopic] = useState("");
  const [material, setMaterial] = useState("");
  const [depth, setDepth] = useState<(typeof DEPTHS)[number]>("Quick Overview");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (loading) return;
    if (topic.trim().length < 3) return setError("Enter a research topic or question.");
    setLoading(true);
    setError("");
    try {
      const res = await run({ data: { topic, material, depth } });
      setResult(res);
      const md = researchToMarkdown(res, topic);
      setText(md);
      setEditing(false);
      await saveRecord("research", topic, { topic, depth, hasMaterial: !!material }, { ...res, markdown: md });
      invalidate("records");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up">
      <PageHeader icon={<Microscope className="h-5 w-5" />} title="AI Research Assistant" description="Understand unfamiliar topics and make informed decisions." />
      <ToolDisclaimer />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <form className="card-surface space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="r-topic">Research topic or question *</Label>
            <Input id="r-topic" required maxLength={500} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Should our team adopt a four-day work week?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-depth">Research depth</Label>
            <Select value={depth} onValueChange={(v) => setDepth(v as (typeof DEPTHS)[number])}>
              <SelectTrigger id="r-depth"><SelectValue /></SelectTrigger>
              <SelectContent>{DEPTHS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-mat">Article or document text (optional)</Label>
            <Textarea id="r-mat" rows={10} maxLength={30000} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Paste an article, report or notes to ground the analysis…" />
          </div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Microscope className="h-4 w-4" />} Generate research
          </Button>
        </form>

        <section aria-live="polite" className="space-y-3">
          {error && <ErrorBox message={error} onRetry={submit} />}
          {loading ? (
            <LoadingBlock label="Researching your topic…" />
          ) : result ? (
            <div className="card-surface space-y-5 p-5">
              <div className="flex gap-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                No live web search is connected. This brief is based on the AI model's general knowledge and the material you provided — no sources are cited. Verify key facts independently.
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={text} />
                <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                  {editing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} {editing ? "View structured" : "Edit"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadText("research-brief.md", text)}><Download className="h-4 w-4" /> Export .md</Button>
              </div>
              {editing ? (
                <Textarea aria-label="Edit research" rows={24} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs leading-relaxed" />
              ) : (
                <>
                  <section><h3 className="mb-2 text-sm font-semibold">Topic overview</h3><p className="text-sm leading-relaxed">{result.overview}</p></section>
                  {result.from_user_material.length > 0 && (
                    <section className="rounded-lg border bg-muted/50 p-4">
                      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-4 w-4" /> From your material</h3>
                      <ul className="list-disc space-y-1 pl-5 text-sm">{result.from_user_material.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </section>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet">AI interpretation</p>
                  <Section title="Key findings" items={result.key_findings} />
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Important concepts</h3>
                    <dl className="space-y-2 text-sm">{result.concepts.map((c, i) => <div key={i}><dt className="font-medium">{c.term}</dt><dd className="text-muted-foreground">{c.explanation}</dd></div>)}</dl>
                  </section>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Section title="Opportunities" items={result.opportunities} />
                    <Section title="Challenges" items={result.challenges} />
                  </div>
                  <Section title="Practical insights" items={result.practical_insights} />
                  <Section title="Recommendations" items={result.recommendations} />
                  <Section title="Follow-up questions" items={result.follow_up_questions} />
                  <section><h3 className="mb-2 text-sm font-semibold">Limitations</h3><p className="text-sm text-muted-foreground">{result.limitations}</p></section>
                </>
              )}
            </div>
          ) : (
            <EmptyState icon={<Microscope className="h-5 w-5" />} title="Your research brief will appear here">
              Enter a topic, choose a depth and optionally paste source text for grounded analysis.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
