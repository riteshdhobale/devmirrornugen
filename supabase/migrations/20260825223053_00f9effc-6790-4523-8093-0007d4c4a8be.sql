CREATE POLICY "No direct client access to connection keys"
ON public.app_user_connections
FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);