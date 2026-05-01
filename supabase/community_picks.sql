alter table public.community_posts
  add column if not exists pick_count integer not null default 0,
  add column if not exists is_pick_post boolean not null default false;

alter table public.community_posts
  drop constraint if exists community_posts_pick_count_nonnegative;

alter table public.community_posts
  add constraint community_posts_pick_count_nonnegative check (pick_count >= 0);

create table if not exists public.community_post_picks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists community_post_picks_post_id_idx
  on public.community_post_picks(post_id);

create index if not exists community_post_picks_user_id_idx
  on public.community_post_picks(user_id);

create index if not exists community_posts_pick_filter_idx
  on public.community_posts(is_pick_post, created_at desc);

update public.community_posts as posts
set
  pick_count = coalesce(picks.pick_count, 0),
  is_pick_post = coalesce(picks.pick_count, 0) >= 5
from (
  select post_id, count(*)::integer as pick_count
  from public.community_post_picks
  group by post_id
) as picks
where posts.id = picks.post_id;

update public.community_posts
set pick_count = 0, is_pick_post = false
where id not in (
  select distinct post_id
  from public.community_post_picks
);

create or replace function public.toggle_community_post_pick(
  p_post_id uuid,
  p_user_id uuid
)
returns table (
  picked boolean,
  pick_count integer,
  is_pick_post boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_picked boolean;
  v_pick_count integer;
  v_is_pick_post boolean;
begin
  perform 1
  from public.community_posts
  where id = p_post_id
  for update;

  if not found then
    raise exception 'post_not_found';
  end if;

  if exists (
    select 1
    from public.community_post_picks
    where post_id = p_post_id
      and user_id = p_user_id
  ) then
    delete from public.community_post_picks
    where post_id = p_post_id
      and user_id = p_user_id;

    update public.community_posts
    set
      pick_count = greatest(pick_count - 1, 0),
      is_pick_post = greatest(pick_count - 1, 0) >= 5
    where id = p_post_id
    returning community_posts.pick_count, community_posts.is_pick_post
    into v_pick_count, v_is_pick_post;

    v_picked := false;
  else
    insert into public.community_post_picks(post_id, user_id)
    values (p_post_id, p_user_id);

    update public.community_posts
    set
      pick_count = pick_count + 1,
      is_pick_post = pick_count + 1 >= 5
    where id = p_post_id
    returning community_posts.pick_count, community_posts.is_pick_post
    into v_pick_count, v_is_pick_post;

    v_picked := true;
  end if;

  return query select v_picked, v_pick_count, v_is_pick_post;
end;
$$;

grant execute on function public.toggle_community_post_pick(uuid, uuid) to authenticated;
grant execute on function public.toggle_community_post_pick(uuid, uuid) to service_role;
