import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format, isPast } from "date-fns";
import { CalendarClock, Loader2, Plus, Trash2, Pencil, Coffee, AlertTriangle, Flame, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ConfirmButton, EmptyState, ErrorBox, LoadingBlock, PageHeader, ToolDisclaimer } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, useTasks } from "@/hooks/use-data";
import { planSchedule } from "@/lib/ai.functions";
import type { ScheduleResult } from "@/lib/prompts";
import { errorMessage, saveRecord, type Task } from "@/lib/records";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — WorkFlow AI" },
      { name: "description", content: "Rank your tasks and get a realistic daily or weekly schedule with breaks." },
      { property: "og:title", content: "AI Task Planner — WorkFlow AI" },
      { property: "og:description", content: "Rank tasks and get a realistic schedule." },
    ],
  }),
  component: () => (
    <AppShell>
      <PlannerPage />
    </AppShell>
  ),
});

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  high: "bg-destructive-soft text-destructive",
  medium: "bg-warning-soft text-warning",
  low: "bg-success-soft text-success",
};

type Draft = { title: string; description: string; priority: Task["priority"]; duration: string; deadline: string; start: string };
const EMPTY: Draft = { title: "", description: "", priority: "medium", duration: "60", deadline: "", start: "" };

function toDraft(t: Task): Draft {
  return {
    title: t.title,
    description: t.description ?? "",
    priority: t.priority,
    duration: String(t.duration_minutes),
    deadline: t.deadline ? format(new Date(t.deadline), "yyyy-MM-dd'T'HH:mm") : "",
    start: t.start_time ?? "",
  };
}

function PlannerPage() {
  const tasks = useTasks();
  const invalidate = useInvalidate();
  const plan = useServerFn(planSchedule);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [breaks, setBreaks] = useState("15-minute break every 90 minutes, 45-minute lunch around 12:30");
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const list = tasks.data ?? [];
  const open = list.filter((t) => !t.completed);
  const byId = new Map(list.map((t) => [t.id, t]));

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) { toast.error("Task title is required"); return; }
    const duration = Math.min(1440, Math.max(5, parseInt(draft.duration) || 60));
    const row = {
      title: title.slice(0, 200),
      description: draft.description.trim().slice(0, 1000) || null,
      priority: draft.priority,
      duration_minutes: duration,
      deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
      start_time: draft.start || null,
    };
    setSaving(true);
    const { error } = editId
      ? await supabase.from("tasks").update({ ...row, updated_at: new Date().toISOString() }).eq("id", editId)
      : await supabase.from("tasks").insert(row);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Task updated" : "Task added");
    setDraft(EMPTY);
    setEditId(null);
    invalidate("tasks");
  }

  async function toggle(t: Task, completed: boolean) {
    const { error } = await supabase.from("tasks").update({ completed }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    invalidate("tasks");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task deleted");
    invalidate("tasks");
  }

  async function generate() {
    if (loading) return;
    if (!open.length) { setError("Add at least one open task first."); return; }
    setLoading(true);
    setError("");
    try {
      const data = {
        mode,
        now: format(new Date(), "yyyy-MM-dd HH:mm (EEEE)"),
        workStart,
        workEnd,
        breaks,
        tasks: open.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          duration_minutes: t.duration_minutes,
          deadline: t.deadline ? format(new Date(t.deadline), "yyyy-MM-dd HH:mm") : null,
          start_time: t.start_time,
        })),
      };
      const res = await plan({ data });
      setSchedule(res);
      await saveRecord("plan", `${mode === "daily" ? "Daily" : "Weekly"} schedule · ${format(new Date(), "d MMM")}`, data, res);
      invalidate("records");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const days = schedule ? Array.from(new Set(schedule.blocks.map((b) => b.day))) : [];

  return (
    <div className="fade-up">
      <PageHeader icon={<CalendarClock className="h-5 w-5" />} title="AI Task Planner & Scheduler" description="Add your tasks, set your hours, and get a prioritized, realistic plan. Plans are suggestions only — no calendar events are created." />
      <ToolDisclaimer />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-6">
          <form onSubmit={saveTask} className="card-surface space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editId ? "Edit task" : "Add a task"}</h2>
              {editId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditId(null); setDraft(EMPTY); }}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-title">Task title *</Label>
              <Input id="t-title" required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea id="t-desc" rows={2} maxLength={1000} placeholder="Include dependencies, e.g. “after the client approves the draft”" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-pri">Priority</Label>
                <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v as Task["priority"] })}>
                  <SelectTrigger id="t-pri"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-dur">Duration (minutes)</Label>
                <Input id="t-dur" type="number" min={5} max={1440} step={5} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-dl">Deadline</Label>
                <Input id="t-dl" type="datetime-local" value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-start">Start time (optional)</Label>
                <Input id="t-start" type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {editId ? "Save task" : "Add task"}
            </Button>
          </form>

          <section className="card-surface p-5" aria-labelledby="tasks-h">
            <h2 id="tasks-h" className="mb-3 font-semibold">Your tasks <span className="text-sm font-normal text-muted-foreground">({open.length} open)</span></h2>
            {tasks.isLoading ? (
              <p className="text-sm text-muted-foreground" role="status">Loading tasks…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet. Add your first task above.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((t) => {
                  const overdue = !t.completed && t.deadline && isPast(new Date(t.deadline));
                  return (
                    <li key={t.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox className="mt-0.5" aria-label={`Mark "${t.title}" complete`} checked={t.completed} onCheckedChange={(v) => toggle(t, !!v)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium", t.completed && "text-muted-foreground line-through")}>{t.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={cn("rounded px-1.5 py-0.5 font-medium capitalize", PRIORITY_STYLE[t.priority])}>{t.priority}</span>
                          <span className="text-muted-foreground">{t.duration_minutes} min</span>
                          {t.deadline && <span className={cn(overdue ? "font-medium text-destructive" : "text-muted-foreground")}>{overdue ? "Overdue · " : "Due "}{format(new Date(t.deadline), "d MMM, HH:mm")}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${t.title}`} onClick={() => { setEditId(t.id); setDraft(toDraft(t)); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmButton title="Delete this task?" description={`“${t.title}” will be permanently deleted.`} onConfirm={() => remove(t.id)}>
                        <Button variant="ghost" size="icon" aria-label={`Delete ${t.title}`}><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card-surface space-y-4 p-5" aria-labelledby="prefs-h">
            <h2 id="prefs-h" className="font-semibold">Schedule preferences</h2>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "daily" | "weekly")}>
              <TabsList><TabsTrigger value="daily">Daily</TabsTrigger><TabsTrigger value="weekly">Weekly</TabsTrigger></TabsList>
            </Tabs>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="ws">Work starts</Label><Input id="ws" type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="we">Work ends</Label><Input id="we" type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="br">Break preferences</Label>
              <Input id="br" maxLength={500} value={breaks} onChange={(e) => setBreaks(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={loading || !open.length} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Generate schedule
            </Button>
          </section>

          <div aria-live="polite" className="space-y-4">
            {error && <ErrorBox message={error} onRetry={generate} />}
            {loading ? (
              <LoadingBlock label="Prioritizing tasks and building your schedule…" />
            ) : schedule ? (
              <>
                {(schedule.urgent.length > 0 || schedule.conflicts.length > 0) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {schedule.urgent.length > 0 && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive-soft p-4 text-sm">
                        <p className="mb-1 flex items-center gap-1.5 font-semibold text-destructive"><Flame className="h-4 w-4" /> Urgent / overdue</p>
                        <ul className="list-disc pl-5">{schedule.urgent.map((u, i) => <li key={i}>{u}</li>)}</ul>
                      </div>
                    )}
                    {schedule.conflicts.length > 0 && (
                      <div className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm">
                        <p className="mb-1 flex items-center gap-1.5 font-semibold text-warning"><AlertTriangle className="h-4 w-4" /> Conflicts</p>
                        <ul className="list-disc pl-5">{schedule.conflicts.map((u, i) => <li key={i}>{u}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
                {days.map((day) => (
                  <section key={day} className="card-surface p-5">
                    <h3 className="mb-3 font-semibold">{(() => { try { return format(new Date(day + "T00:00"), "EEEE, d MMMM"); } catch { return day; } })()}</h3>
                    <ol className="space-y-2">
                      {schedule.blocks.filter((b) => b.day === day).map((b, i) => {
                        const task = b.task_id ? byId.get(b.task_id) : undefined;
                        if (b.kind === "break") {
                          return (
                            <li key={i} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                              <span className="w-24 shrink-0 tabular-nums">{b.start}–{b.end}</span>
                              <Coffee className="h-4 w-4" aria-hidden /> {b.label}
                            </li>
                          );
                        }
                        return (
                          <li key={i} className={cn("flex items-center gap-3 rounded-lg border-l-4 border bg-card px-3 py-2.5 text-sm", task?.priority === "high" ? "border-l-destructive" : task?.priority === "low" ? "border-l-success" : "border-l-warning")}>
                            <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{b.start}–{b.end}</span>
                            {task && <Checkbox aria-label={`Mark "${task.title}" complete`} checked={task.completed} onCheckedChange={(v) => toggle(task, !!v)} />}
                            <span className={cn("flex-1 font-medium", task?.completed && "text-muted-foreground line-through")}>{task?.title ?? b.label}</span>
                            {task && <span className={cn("hidden rounded px-1.5 py-0.5 text-xs font-medium capitalize sm:inline", PRIORITY_STYLE[task.priority])}>{task.priority}</span>}
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
                {schedule.ranking.length > 0 && (
                  <section className="card-surface p-5">
                    <h3 className="mb-3 font-semibold">Why this order</h3>
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                      {schedule.ranking.map((r, i) => <li key={i}><span className="font-medium">{byId.get(r.task_id)?.title ?? r.title}</span> — {r.reason}</li>)}
                    </ol>
                    {schedule.notes.length > 0 && <ul className="mt-4 space-y-1 text-sm text-muted-foreground">{schedule.notes.map((n, i) => <li key={i}>💡 {n}</li>)}</ul>}
                  </section>
                )}
              </>
            ) : (
              <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No schedule yet">
                Add tasks with priorities and deadlines, then press Generate schedule.
              </EmptyState>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
