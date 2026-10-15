import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, LogOut, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { ConfirmButton, DISCLAIMER, PageHeader } from "@/components/app/shared";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useInvalidate } from "@/hooks/use-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — WorkFlow AI" },
      { name: "description", content: "Manage your WorkFlow AI account, privacy and saved data." },
      { property: "og:title", content: "Settings — WorkFlow AI" },
      { property: "og:description", content: "Account, privacy and data settings." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

function SettingsPage() {
  const { user } = useAuth();
  const invalidate = useInvalidate();

  async function wipe() {
    const a = await supabase.from("ai_records").delete().eq("user_id", user!.id);
    const b = await supabase.from("tasks").delete().eq("user_id", user!.id);
    if (a.error || b.error) { toast.error((a.error ?? b.error)!.message); return; }
    invalidate("records");
    invalidate("tasks");
    toast.success("All your saved data was deleted");
  }

  return (
    <div className="fade-up max-w-3xl space-y-6">
      <PageHeader icon={<SettingsIcon className="h-5 w-5" />} title="Settings" description="Account, privacy and your data." />
      <section className="card-surface p-5">
        <h2 className="font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{user?.email}</span></p>
        <Button variant="outline" className="mt-4" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /> Sign out</Button>
      </section>
      <section className="card-surface p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Lock className="h-4 w-4 text-primary" /> Privacy</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Your tasks and AI results are stored in your private account. Access rules ensure only you can read, change or delete them.</li>
          <li>Text you submit is sent to an AI model over a secure server connection to generate results. API keys never reach your browser.</li>
          <li>We only store what you create: your email address, tasks and generated results. You can delete any item in History, or everything below.</li>
          <li>WorkFlow AI never sends emails or creates calendar events on your behalf.</li>
        </ul>
        <p className="mt-4 rounded-lg bg-violet-soft p-3 text-xs leading-relaxed text-secondary-foreground">{DISCLAIMER}</p>
      </section>
      <section className="card-surface border-destructive/30 p-5">
        <h2 className="font-semibold text-destructive">Delete all my data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Permanently remove all tasks, emails, summaries, schedules, research and chats.</p>
        <ConfirmButton title="Delete all your data?" description="This permanently deletes every task and saved AI result. This cannot be undone." confirmLabel="Delete everything" onConfirm={wipe}>
          <Button variant="destructive" className="mt-4"><Trash2 className="h-4 w-4" /> Delete all data</Button>
        </ConfirmButton>
      </section>
    </div>
  );
}
