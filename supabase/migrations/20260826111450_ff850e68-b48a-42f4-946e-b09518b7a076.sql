CREATE TABLE public.role_benchmarks (
  slug text PRIMARY KEY,
  cohort jsonb NOT NULL,
  benchmark jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_benchmarks TO service_role;
ALTER TABLE public.role_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_slug text NOT NULL,
  role_label text NOT NULL,
  github_username text NOT NULL,
  readiness integer NOT NULL DEFAULT 0,
  roadmap jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roadmaps TO authenticated;
GRANT ALL ON public.user_roadmaps TO service_role;
ALTER TABLE public.user_roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roadmaps"
  ON public.user_roadmaps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own roadmaps"
  ON public.user_roadmaps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps"
  ON public.user_roadmaps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps"
  ON public.user_roadmaps FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX user_roadmaps_user_created_idx ON public.user_roadmaps (user_id, created_at DESC);