ALTER TABLE public.user_usage
  ADD COLUMN IF NOT EXISTS analyses_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS candidates_used integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS user_usage_user_month_key ON public.user_usage (user_id, month_key);