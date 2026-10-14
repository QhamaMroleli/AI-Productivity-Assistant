import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Workflow, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISCLAIMER } from "@/components/app/shared";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — WorkFlow AI" },
      { name: "description", content: "Sign in or create a WorkFlow AI account to access your private AI workspace." },
      { property: "og:title", content: "Sign in — WorkFlow AI" },
      { property: "og:description", content: "Sign in or create a WorkFlow AI account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) setError(result.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Workflow className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">WorkFlow AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your AI-powered workspace for smarter, faster work.</p>
        </div>
        <div className="card-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{mode === "signin" ? "Sign in" : "Create your account"}</h2>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to WorkFlow AI?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </div>
  );
}
