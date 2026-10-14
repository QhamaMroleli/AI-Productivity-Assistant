import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { AiRecord, RecordKind, Task } from "@/lib/records";

export function useTasks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useRecords(kind?: RecordKind) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["records", user?.id, kind ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("ai_records").select("*").order("created_at", { ascending: false }).limit(200);
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return data as AiRecord[];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (key: "tasks" | "records") => qc.invalidateQueries({ queryKey: [key] });
}
