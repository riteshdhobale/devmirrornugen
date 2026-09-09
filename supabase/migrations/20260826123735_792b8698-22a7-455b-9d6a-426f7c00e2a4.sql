drop function if exists public.increment_comparison_usage(uuid);
drop function if exists public.get_comparison_usage(uuid);
drop function if exists public.get_user_plan(uuid, text);
drop function if exists public.has_plan(uuid, text, text);
drop function if exists public.has_active_subscription(uuid, text);