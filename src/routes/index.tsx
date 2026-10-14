import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Circle, Mail, NotebookPen, ArrowRight, Lightbulb, Settings, Activity } from "lucide-react";
import { AppShell, NAV } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/shared";
import { useRecords, useTasks } from "@/hooks/use-data";
import { KIND_LABEL } from "@/lib/records";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — WorkFlow AI" },
      { name: "description", content: "Your WorkFlow AI dashboard: productivity overview, quick actions and recent activity." },
      { property: "og:title", content: "Dashboard — WorkFlow AI" },
      { property: "og:description", content: "Your AI-powered workspace for smarter, faster work." },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

const TOOL_DESC: Record<string, string> = {
  "/email": "Draft clear, on-tone professional emails in seconds.",
  "/meetings": "Turn raw notes into decisions and action items.",
  "/planner": "Prioritize tasks and get a realistic schedule.",
  "/research": "Understand unfamiliar topics with structured briefs.",
  "/chat": "Ask anything about your work, get concise help.",
};

function Dashboard() {
  const tasks = useTasks();
  const records = useRecords();
  const t = tasks.data ?? [];
  const r = records.data ?? [];
  const done = t.filter((x) => x.completed).length;
  const remaining = t.length - done;
  const now = Date.now();
  const overdue = t.filter((x) => !x.completed && x.deadline && new Date(x.deadline).getTime() < now);
  const highOpen = t.filter((x) => !x.completed && x.priority === "high");

  const stats = [
    { label: "Tasks completed", value: done, icon: CheckCircle2, tone: "text-success bg-success-soft" },
    { label: "Tasks remaining", value: remaining, icon: Circle, tone: "text-primary bg-accent" },
    { label: "Emails generated", value: r.filter((x) => x.kind === "email").length, icon: Mail, tone: "text-violet bg-violet-soft" },
    { label: "Meetings summarized", value: r.filter((x) => x.kind === "meeting").length, icon: NotebookPen, tone: "text-warning bg-warning-soft" },
  ];

  const insights: string[] = [];
  if (t.length) insights.push(`You've completed ${Math.round((done / t.length) * 100)}% of your ${t.length} saved tasks.`);
  if (overdue.length) insights.push(`${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue — consider tackling ${overdue.length > 1 ? "them" : "it"} first.`);
  if (highOpen.length) insights.push(`${highOpen.length} high-priority task${highOpen.length > 1 ? "s remain" : " remains"} open.`);
  if (remaining > 0 && !r.some((x) => x.kind === "plan")) insights.push("Try the AI Task Planner to turn your open tasks into a schedule.");

  return (
    <div className="space-y-8 fade-up">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Good day! Ready to get more done?</h1>
          <p className="mt-1 text-muted-foreground">Your AI-powered workspace for smarter, faster work.</p>
        </div>
        <Button asChild variant="outline" size="icon" aria-label="Settings">
          <Link to="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      <section aria-labelledby="overview">
        <h2 id="overview" className="sr-only">Productivity overview</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="card-surface p-4">
              <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-2xl font-bold tabular-nums">{tasks.isLoading || records.isLoading ? "–" : value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="quick">
        <h2 id="quick" className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.filter((n) => TOOL_DESC[n.to]).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="card-surface card-interactive group flex flex-col gap-3 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{TOOL_DESC[to]}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-lg font-semibold">Recent activity</h2>
          {r.length === 0 && t.length === 0 ? (
            <EmptyState icon={<Activity className="h-5 w-5" />} title="No activity yet">
              Generate an email, summarize a meeting or add a task — your work will show up here.
            </EmptyState>
          ) : (
            <ul className="card-surface divide-y">
              {[...r.slice(0, 5).map((x) => ({ id: x.id, label: x.title, kind: KIND_LABEL[x.kind], at: x.created_at, to: "/history" as const })),
                ...t.slice(0, 3).map((x) => ({ id: x.id, label: x.title, kind: x.completed ? "Task · done" : "Task", at: x.created_at, to: "/planner" as const }))]
                .sort((a, b) => b.at.localeCompare(a.at))
                .slice(0, 6)
                .map((x) => (
                  <li key={x.id}>
                    <Link to={x.to} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{x.label}</p>
                        <p className="text-xs text-muted-foreground">{x.kind}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(x.at), { addSuffix: true })}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="insights">
          <h2 id="insights" className="mb-3 text-lg font-semibold">Productivity insights</h2>
          {insights.length === 0 ? (
            <EmptyState icon={<Lightbulb className="h-5 w-5" />} title="Insights appear as you work">
              Add a few tasks in the AI Task Planner and we'll highlight progress, overdue items and priorities based on your real data.
            </EmptyState>
          ) : (
            <ul className="card-surface space-y-3 p-5">
              {insights.map((s) => (
                <li key={s} className="flex gap-2 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
