import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Mail,
  NotebookPen,
  CalendarClock,
  Microscope,
  MessagesSquare,
  History,
  Settings,
  Menu,
  Workflow,
  LogOut,
  Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DISCLAIMER } from "./shared";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Smart Email Generator", icon: Mail },
  { to: "/meetings", label: "Meeting Summarizer", icon: NotebookPen },
  { to: "/planner", label: "AI Task Planner", icon: CalendarClock },
  { to: "/research", label: "Research Assistant", icon: Microscope },
  { to: "/chat", label: "AI Workplace Chat", icon: MessagesSquare },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 py-1" aria-label="WorkFlow AI home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Workflow className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-base font-bold tracking-tight">
        WorkFlow <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand />
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto border-t pt-4">
        <p className="truncate px-3 text-xs text-muted-foreground" title={user?.email ?? ""}>
          {user?.email}
        </p>
        <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar lg:block">
        <SidebarBody />
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <Button variant="ghost" size="icon" aria-label="Open navigation menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-10">
        <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold">Responsible AI:</strong> {DISCLAIMER}
        </p>
      </footer>
    </div>
  );
}
