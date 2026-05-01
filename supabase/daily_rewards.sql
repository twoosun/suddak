alter table public.user_profiles
  add column if not exists credits integer;

update public.user_profiles
set credits = 0
where credits is null;

alter table public.user_profiles
  alter column credits set default 0;

alter table public.user_profiles
  alter column credits set not null;

create table if not exists public.daily_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null,
  amount integer not null,
  reward_type text not null default 'daily',
  created_at timestamptz not null default now(),
  constraint daily_rewards_user_id_reward_date_key unique (user_id, reward_date)
);

create index if not exists daily_rewards_user_id_created_at_idx
  on public.daily_rewards(user_id, created_at desc);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  amount integer not null,
  balance_after integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_created_at_idx
  on public.credit_transactions(user_id, created_at desc);

create or replace function public.spend_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text default 'SPEND',
  p_reason text default ''
)
returns table (
  ok boolean,
  credits integer,
  amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.user_profiles as up
  set credits = up.credits - p_amount
  where up.id = p_user_id
    and up.credits >= p_amount
  returning up.credits into v_next_balance;

  if v_next_balance is null then
    return query
    select
      false::boolean,
      coalesce(
        (
          select up.credits
          from public.user_profiles as up
          where up.id = p_user_id
        ),
        0
      )::integer,
      p_amount::integer;
    return;
  end if;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    reason
  )
  values (
    p_user_id,
    p_type,
    -p_amount,
    v_next_balance,
    p_reason
  );

  return query
  select true::boolean, v_next_balance::integer, p_amount::integer;
end;
$$;

create or replace function public.grant_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text default 'GRANT',
  p_reason text default ''
)
returns table (
  ok boolean,
  credits integer,
  amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.user_profiles as up
  set credits = up.credits + p_amount
  where up.id = p_user_id
  returning up.credits into v_next_balance;

  if v_next_balance is null then
    raise exception 'user profile not found for %', p_user_id;
  end if;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    reason
  )
  values (
    p_user_id,
    p_type,
    p_amount,
    v_next_balance,
    p_reason
  );

  return query
  select true::boolean, v_next_balance::integer, p_amount::integer;
end;
$$;

create or replace function public.claim_daily_reward(
  p_user_id uuid,
  p_reward_date date,
  p_amount integer,
  p_reward_type text default 'daily'
)
returns table (
  ok boolean,
  credits integer,
  amount integer,
  reward_type text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_balance integer;
begin
  insert into public.daily_rewards (
    user_id,
    reward_date,
    amount,
    reward_type
  )
  values (
    p_user_id,
    p_reward_date,
    p_amount,
    p_reward_type
  );

  update public.user_profiles as up
  set credits = up.credits + p_amount
  where up.id = p_user_id
  returning up.credits into v_next_balance;

  if v_next_balance is null then
    raise exception 'user profile not found for %', p_user_id;
  end if;

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    reason
  )
  values (
    p_user_id,
    'DAILY_REWARD',
    p_amount,
    v_next_balance,
    'daily_reward:' || p_reward_type
  );

  return query
  select true::boolean, v_next_balance::integer, p_amount::integer, p_reward_type::text;
exception
  when unique_violation then
    return query
    select
      false::boolean,
      coalesce(
        (
          select up.credits
          from public.user_profiles as up
          where up.id = p_user_id
        ),
        0
      )::integer,
      p_amount::integer,
      p_reward_type::text;
end;
$$;
