CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  duration_minutes integer NOT NULL DEFAULT 60,
  deadline timestamptz,
  start_time text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks select" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tasks update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tasks delete" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL,
  title text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_records TO authenticated;
GRANT ALL ON public.ai_records TO service_role;
ALTER TABLE public.ai_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own records select" ON public.ai_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own records insert" ON public.ai_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own records update" ON public.ai_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own records delete" ON public.ai_records FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ai_records_user_kind ON public.ai_records(user_id, kind, created_at DESC);
CREATE INDEX tasks_user ON public.tasks(user_id, created_at DESC);