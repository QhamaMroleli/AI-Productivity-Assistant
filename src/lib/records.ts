import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type RecordKind = "email" | "meeting" | "research" | "plan" | "chat";

export type AiRecord = {
  id: string;
  kind: RecordKind;
  title: string;
  input: Json;
  output: Json;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  duration_minutes: number;
  deadline: string | null;
  start_time: string | null;
  completed: boolean;
  created_at: string;
};

export async function saveRecord(kind: RecordKind, title: string, input: unknown, output: unknown) {
  const { data, error } = await supabase
    .from("ai_records")
    .insert({ kind, title: title.slice(0, 200) || "Untitled", input: input as Json, output: output as Json })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateRecordOutput(id: string, output: unknown, title?: string) {
  const patch: { output: Json; title?: string } = { output: output as Json };
  if (title) patch.title = title.slice(0, 200);
  const { error } = await supabase.from("ai_records").update(patch).eq("id", id);
  if (error) throw error;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    try {
      const parsed = JSON.parse(e.message);
      if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
    } catch {
      /* not zod json */
    }
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const KIND_LABEL: Record<RecordKind, string> = {
  email: "Email",
  meeting: "Meeting summary",
  research: "Research",
  plan: "Schedule",
  chat: "Chat",
};
