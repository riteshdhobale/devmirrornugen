-- analyses is a server-managed cache: only the service role (which bypasses RLS)
-- may write. Make that restriction explicit so scanners and humans can verify it.

REVOKE INSERT, UPDATE, DELETE ON public.analyses FROM anon, authenticated;

CREATE POLICY "Analyses are written by the service role only (insert)"
  ON public.analyses FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "Analyses are written by the service role only (update)"
  ON public.analyses FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Analyses are written by the service role only (delete)"
  ON public.analyses FOR DELETE TO anon, authenticated USING (false);