alter table public.credit_transactions
  add column if not exists reference_id text;

create table if not exists public.naesinddak_materials (
  id text primary key,
  title text not null,
  description text not null,
  detail_description text,
  subject text not null,
  subject_detail text not null,
  unit text not null,
  category text not null,
  problem_count_label text not null,
  set_count_label text not null,
  estimated_minutes_label text not null,
  status text not null check (status in ('public', 'private')),
  price_ddak integer not null check (price_ddak >= 0),
  tags jsonb not null default '[]'::jsonb,
  included_topics jsonb not null default '[]'::jsonb,
  source_basis jsonb not null default '[]'::jsonb,
  file_paths jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesinddak_material_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id text not null references public.naesinddak_materials(id) on delete cascade,
  paid_ddak integer not null check (paid_ddak >= 0),
  purchased_at timestamptz not null default now(),
  unique (user_id, material_id)
);

create index if not exists naesinddak_materials_status_subject_idx
  on public.naesinddak_materials(status, subject_detail);

create index if not exists naesinddak_material_purchases_user_id_idx
  on public.naesinddak_material_purchases(user_id, purchased_at desc);

create or replace function public.purchase_naesinddak_material(
  p_user_id uuid,
  p_material_id text
)
returns table (
  success boolean,
  already_owned boolean,
  remaining_ddak integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.naesinddak_materials%rowtype;
  v_next_balance integer;
begin
  select *
  into v_material
  from public.naesinddak_materials
  where id = p_material_id
    and status = 'public';

  if not found then
    return query
    select false, false, 0, '자료를 찾을 수 없습니다.'::text;
    return;
  end if;

  if exists (
    select 1
    from public.naesinddak_material_purchases
    where user_id = p_user_id
      and material_id = p_material_id
  ) then
    return query
    select
      true,
      true,
      coalesce((select credits from public.user_profiles where id = p_user_id), 0)::integer,
      '이미 구매한 자료입니다.'::text;
    return;
  end if;

  update public.user_profiles as up
  set credits = up.credits - v_material.price_ddak
  where up.id = p_user_id
    and up.credits >= v_material.price_ddak
  returning up.credits into v_next_balance;

  if v_next_balance is null then
    return query
    select
      false,
      false,
      coalesce((select credits from public.user_profiles where id = p_user_id), 0)::integer,
      '딱이 부족합니다.'::text;
    return;
  end if;

  insert into public.naesinddak_material_purchases (
    user_id,
    material_id,
    paid_ddak
  )
  values (
    p_user_id,
    p_material_id,
    v_material.price_ddak
  );

  insert into public.credit_transactions (
    user_id,
    type,
    amount,
    balance_after,
    reason,
    reference_id
  )
  values (
    p_user_id,
    'naesinddak_material_purchase',
    -v_material.price_ddak,
    v_next_balance,
    v_material.title || ' 구매',
    p_material_id
  );

  return query
  select true, false, v_next_balance::integer, '구매가 완료되었습니다.'::text;
exception
  when unique_violation then
    return query
    select
      true,
      true,
      coalesce((select credits from public.user_profiles where id = p_user_id), 0)::integer,
      '이미 구매한 자료입니다.'::text;
end;
$$;

alter table public.naesinddak_materials enable row level security;
alter table public.naesinddak_material_purchases enable row level security;

drop policy if exists "public can read public naesinddak materials" on public.naesinddak_materials;
create policy "public can read public naesinddak materials"
on public.naesinddak_materials
for select
using (status = 'public');

drop policy if exists "admins manage naesinddak materials" on public.naesinddak_materials;
create policy "admins manage naesinddak materials"
on public.naesinddak_materials
for all
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  )
)
with check (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  )
);

drop policy if exists "users read own naesinddak purchases" on public.naesinddak_material_purchases;
create policy "users read own naesinddak purchases"
on public.naesinddak_material_purchases
for select
using (user_id = auth.uid());

drop policy if exists "admins read naesinddak purchases" on public.naesinddak_material_purchases;
create policy "admins read naesinddak purchases"
on public.naesinddak_material_purchases
for select
using (
  exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  )
);

revoke all on function public.purchase_naesinddak_material(uuid, text) from public;
grant execute on function public.purchase_naesinddak_material(uuid, text) to service_role;

insert into public.naesinddak_materials (
  id,
  title,
  description,
  detail_description,
  subject,
  subject_detail,
  unit,
  category,
  problem_count_label,
  set_count_label,
  estimated_minutes_label,
  status,
  price_ddak,
  tags,
  included_topics,
  source_basis,
  file_paths,
  featured
)
values (
  'calculus-ch05-derivative-applications',
  '수학(미적분) 05. 도함수의 활용 내신 대비 변형 문제 세트',
  '함수의 증가와 감소, 극대·극소, 그래프의 개형, 방정식과 부등식, 속도와 가속도 유형을 수능특강 흐름에 맞춰 구성한 자체 변형 문제 세트입니다.',
  '수능특강 미적분 05단원 도함수의 활용의 핵심 유형을 바탕으로 시작한 자체 변형 문제 세트입니다. 예제·유제, Level 1, Level 2, Level 3, 수능 기출문제 변형 흐름으로 구성되어 학교 시험 대비와 단원별 복습에 활용할 수 있습니다.',
  '수학',
  '미적분',
  '05. 도함수의 활용',
  '수능특강 내신 대비 변형',
  '?? 문항',
  '1세트',
  '50분',
  'public',
  1000,
  '["수학(미적분 영역)", "예상기출", "도함수의 활용", "자체 변형"]'::jsonb,
  '["함수의 증가와 감소", "극대와 극소", "함수의 그래프", "방정식과 부등식에의 활용", "속도와 가속도", "수능 기출문제 변형"]'::jsonb,
  '["수능특강 핵심 개념", "예제·유제 유형", "Level 1~3 흐름", "수능 기출문제 변형"]'::jsonb,
  '{
    "problemPdf": "calculus/chapter-05/calculus-ch05-problems.pdf",
    "problemDocx": "calculus/chapter-05/calculus-ch05-problems.docx",
    "solutionPdf": "calculus/chapter-05/calculus-ch05-solutions.pdf",
    "solutionDocx": "calculus/chapter-05/calculus-ch05-solutions.docx"
  }'::jsonb,
  true
)
on conflict (id)
do update set
  title = excluded.title,
  description = excluded.description,
  detail_description = excluded.detail_description,
  subject = excluded.subject,
  subject_detail = excluded.subject_detail,
  unit = excluded.unit,
  category = excluded.category,
  problem_count_label = excluded.problem_count_label,
  set_count_label = excluded.set_count_label,
  estimated_minutes_label = excluded.estimated_minutes_label,
  status = excluded.status,
  price_ddak = excluded.price_ddak,
  tags = excluded.tags,
  included_topics = excluded.included_topics,
  source_basis = excluded.source_basis,
  file_paths = excluded.file_paths,
  featured = excluded.featured,
  updated_at = now();

insert into public.naesinddak_materials (
  id,
  title,
  description,
  detail_description,
  subject,
  subject_detail,
  unit,
  category,
  problem_count_label,
  set_count_label,
  estimated_minutes_label,
  status,
  price_ddak,
  tags,
  included_topics,
  source_basis,
  file_paths,
  featured
)
values (
  'calculus-ch06-integration-methods',
  '수학(미적분) 06. 여러 가지 적분법 내신 대비 변형 문제 세트',
  '여러 가지 함수의 적분, 치환적분법, 부분적분법 유형을 수능특강 흐름에 맞춰 구성한 자체 변형 문제 세트입니다.',
  '수능특강 미적분 06단원 여러 가지 적분법의 핵심 유형을 바탕으로 제작한 자체 변형 문제 세트입니다. 학교 시험 대비와 단원별 복습에 활용할 수 있도록 개념 흐름과 풀이 구조를 반영했습니다.',
  '수학',
  '미적분',
  '06. 여러 가지 적분법',
  '수능특강 내신 대비 변형',
  '?? 문항',
  '1세트',
  '50분',
  'public',
  1000,
  '["수학(미적분 영역)", "예상기출", "여러 가지 적분법", "자체 변형"]'::jsonb,
  '["여러 가지 함수의 적분", "치환적분법", "부분적분법", "적분 계산 전략", "수능형 변형"]'::jsonb,
  '["수능특강 핵심 개념", "적분법 기본 유형", "치환적분·부분적분 유형", "수능형 변형 흐름"]'::jsonb,
  '{
    "problemPdf": "calculus/chapter-06/calculus-ch06-problems.pdf",
    "solutionPdf": "calculus/chapter-06/calculus-ch06-solutions.pdf"
  }'::jsonb,
  true
)
on conflict (id)
do update set
  title = excluded.title,
  description = excluded.description,
  detail_description = excluded.detail_description,
  subject = excluded.subject,
  subject_detail = excluded.subject_detail,
  unit = excluded.unit,
  category = excluded.category,
  problem_count_label = excluded.problem_count_label,
  set_count_label = excluded.set_count_label,
  estimated_minutes_label = excluded.estimated_minutes_label,
  status = excluded.status,
  price_ddak = excluded.price_ddak,
  tags = excluded.tags,
  included_topics = excluded.included_topics,
  source_basis = excluded.source_basis,
  file_paths = excluded.file_paths,
  featured = excluded.featured,
  updated_at = now();
