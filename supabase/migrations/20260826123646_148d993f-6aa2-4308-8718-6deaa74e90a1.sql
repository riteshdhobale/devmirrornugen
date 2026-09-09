create type public.plan_tier as enum ('free', 'pro', 'recruiter');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_paddle_id on public.subscriptions(paddle_subscription_id);

grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  to service_role
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table public.user_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month_key text not null,
  comparisons_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create index idx_user_usage_user_month on public.user_usage(user_id, month_key);

grant select, insert, update on public.user_usage to authenticated;
grant all on public.user_usage to service_role;

alter table public.user_usage enable row level security;

create policy "Users can view own usage"
  on public.user_usage for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can manage own usage"
  on public.user_usage for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.has_active_subscription(
  user_uuid uuid,
  check_env text default 'live'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
    and environment = check_env
    and (
      (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
      or (status = 'canceled' and current_period_end > now())
    )
  );
$$;

create or replace function public.has_plan(
  user_uuid uuid,
  plan_name text,
  check_env text default 'live'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
    and environment = check_env
    and product_id = plan_name
    and (
      (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
      or (status = 'canceled' and current_period_end > now())
    )
  );
$$;

create or replace function public.get_user_plan(
  user_uuid uuid,
  check_env text default 'live'
)
returns public.plan_tier
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.has_plan(user_uuid, 'recruiter_plan', check_env) then 'recruiter'::public.plan_tier
    when public.has_plan(user_uuid, 'pro_plan', check_env) then 'pro'::public.plan_tier
    else 'free'::public.plan_tier
  end;
$$;

create or replace function public.get_comparison_usage(
  user_uuid uuid
)
returns table (comparisons_used integer, comparisons_limit integer)
language sql
stable
security definer
set search_path = public
as $$
  with month as (
    select to_char(now(), 'YYYY-MM') as month_key
  ),
  usage as (
    select coalesce(
      (select comparisons_used from public.user_usage
       where user_id = user_uuid and month_key = (select month_key from month)),
      0
    ) as used
  ),
  plan as (
    select public.get_user_plan(user_uuid, coalesce(nullif(current_setting('app.check_env', true), ''), 'live')) as tier
  )
  select
    usage.used,
    case when plan.tier = 'free' then 3 else 999999 end
  from usage, plan;
$$;

create or replace function public.increment_comparison_usage(
  user_uuid uuid
)
returns table (comparisons_used integer, comparisons_limit integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := to_char(now(), 'YYYY-MM');
  v_tier public.plan_tier;
  v_used integer;
  v_limit integer;
begin
  select public.get_user_plan(user_uuid, coalesce(nullif(current_setting('app.check_env', true), ''), 'live')) into v_tier;
  v_limit := case when v_tier = 'free' then 3 else 999999 end;

  insert into public.user_usage (user_id, month_key, comparisons_used)
  values (user_uuid, v_month, 1)
  on conflict (user_id, month_key)
  do update set comparisons_used = user_usage.comparisons_used + 1, updated_at = now()
  returning comparisons_used into v_used;

  return query select v_used as comparisons_used, v_limit as comparisons_limit, (v_used <= v_limit) as allowed;
end;
$$;