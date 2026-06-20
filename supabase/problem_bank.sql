create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  problem_code text unique not null,
  base_problem_code text not null,
  variant_code text,
  code_system text not null check (code_system in ('kice', 'school_exam', 'ebs', 'internal')),
  source text not null,
  source_type text not null check (source_type in ('suneung', 'mock', 'school_exam', 'ebs_special', 'ebs_complete')),
  exam_year integer,
  exam_month integer check (exam_month is null or (exam_month >= 1 and exam_month <= 12)),
  problem_number integer check (problem_number is null or (problem_number >= 1 and problem_number <= 99)),
  subject text not null,
  unit text,
  level text,
  original_ref text,
  ebs_original_code text,
  internal_code text,
  question_type text not null,
  question_latex text not null,
  choices_json jsonb,
  answer_json jsonb not null,
  solution_latex text,
  difficulty integer check (difficulty is null or (difficulty >= 0 and difficulty <= 10)),
  variant_strength integer check (variant_strength is null or (variant_strength >= 1 and variant_strength <= 5)),
  tags text[],
  has_graph boolean not null default false,
  graph_json jsonb,
  layout_json jsonb,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  price_dak integer not null default 0 check (price_dak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint problems_ebs_code_consistency check (
    code_system <> 'ebs'
    or ebs_original_code is null
    or base_problem_code = ebs_original_code
  )
);

create table if not exists public.problem_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  source text not null,
  source_type text not null check (source_type in ('suneung', 'mock', 'school_exam', 'ebs_special', 'ebs_complete')),
  subject text not null,
  year integer,
  unit text,
  problem_count_text text,
  price_dak integer not null default 0 check (price_dak >= 0),
  problem_pdf_url text,
  solution_pdf_url text,
  docx_url text,
  thumbnail_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problem_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.problem_sets(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (set_id, problem_id),
  unique (set_id, order_index)
);

create table if not exists public.exam_templates (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  template_name text not null,
  subject text,
  layout_type text,
  page_size text not null default 'A4',
  column_count integer not null default 2 check (column_count > 0),
  margin_json jsonb,
  header_json jsonb,
  footer_json jsonb,
  font_json jsonb,
  divider_json jsonb,
  problem_box_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_name, template_name)
);

create table if not exists public.generated_exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  school_name text,
  template_id uuid references public.exam_templates(id) on delete set null,
  subject text not null,
  range_text text,
  source_filter_json jsonb,
  difficulty_policy_json jsonb,
  problem_ids_json jsonb not null,
  pdf_url text,
  docx_url text,
  solution_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.problems
  add column if not exists problem_code text,
  add column if not exists base_problem_code text,
  add column if not exists variant_code text,
  add column if not exists code_system text,
  add column if not exists source text,
  add column if not exists source_type text,
  add column if not exists exam_year integer,
  add column if not exists exam_month integer,
  add column if not exists problem_number integer,
  add column if not exists subject text,
  add column if not exists unit text,
  add column if not exists level text,
  add column if not exists original_ref text,
  add column if not exists ebs_original_code text,
  add column if not exists internal_code text,
  add column if not exists question_type text,
  add column if not exists question_latex text,
  add column if not exists choices_json jsonb,
  add column if not exists answer_json jsonb,
  add column if not exists solution_latex text,
  add column if not exists difficulty integer,
  add column if not exists variant_strength integer,
  add column if not exists tags text[],
  add column if not exists has_graph boolean default false,
  add column if not exists graph_json jsonb,
  add column if not exists layout_json jsonb,
  add column if not exists visibility text default 'private',
  add column if not exists price_dak integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.problem_sets
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists source text,
  add column if not exists source_type text,
  add column if not exists subject text,
  add column if not exists year integer,
  add column if not exists unit text,
  add column if not exists problem_count_text text,
  add column if not exists price_dak integer default 0,
  add column if not exists problem_pdf_url text,
  add column if not exists solution_pdf_url text,
  add column if not exists docx_url text,
  add column if not exists thumbnail_url text,
  add column if not exists visibility text default 'private',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.problem_set_items
  add column if not exists set_id uuid references public.problem_sets(id) on delete cascade,
  add column if not exists problem_id uuid references public.problems(id) on delete cascade,
  add column if not exists order_index integer,
  add column if not exists created_at timestamptz default now();

alter table public.exam_templates
  add column if not exists school_name text,
  add column if not exists template_name text,
  add column if not exists subject text,
  add column if not exists layout_type text,
  add column if not exists page_size text default 'A4',
  add column if not exists column_count integer default 2,
  add column if not exists margin_json jsonb,
  add column if not exists header_json jsonb,
  add column if not exists footer_json jsonb,
  add column if not exists font_json jsonb,
  add column if not exists divider_json jsonb,
  add column if not exists problem_box_json jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.generated_exams
  add column if not exists title text,
  add column if not exists school_name text,
  add column if not exists template_id uuid references public.exam_templates(id) on delete set null,
  add column if not exists subject text,
  add column if not exists range_text text,
  add column if not exists source_filter_json jsonb,
  add column if not exists difficulty_policy_json jsonb,
  add column if not exists problem_ids_json jsonb,
  add column if not exists pdf_url text,
  add column if not exists docx_url text,
  add column if not exists solution_pdf_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists problems_base_problem_code_idx
  on public.problems(base_problem_code);

create unique index if not exists problems_problem_code_key
  on public.problems(problem_code);

create index if not exists problems_source_type_exam_idx
  on public.problems(source_type, exam_year, exam_month, problem_number);

create index if not exists problems_subject_unit_idx
  on public.problems(subject, unit);

create index if not exists problems_tags_idx
  on public.problems using gin(tags);

create index if not exists problem_sets_source_type_idx
  on public.problem_sets(source_type, year);

create index if not exists problem_sets_subject_unit_idx
  on public.problem_sets(subject, unit);

create index if not exists problem_set_items_set_id_idx
  on public.problem_set_items(set_id, order_index);

create index if not exists problem_set_items_problem_id_idx
  on public.problem_set_items(problem_id);

create unique index if not exists problem_set_items_set_id_problem_id_key
  on public.problem_set_items(set_id, problem_id);

create unique index if not exists problem_set_items_set_id_order_index_key
  on public.problem_set_items(set_id, order_index);

create index if not exists exam_templates_school_subject_idx
  on public.exam_templates(school_name, subject);

create unique index if not exists exam_templates_school_name_template_name_key
  on public.exam_templates(school_name, template_name);

create index if not exists generated_exams_subject_created_at_idx
  on public.generated_exams(subject, created_at desc);

create or replace function public.touch_problem_bank_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_problems_updated_at on public.problems;
create trigger touch_problems_updated_at
  before update on public.problems
  for each row execute function public.touch_problem_bank_updated_at();

drop trigger if exists touch_problem_sets_updated_at on public.problem_sets;
create trigger touch_problem_sets_updated_at
  before update on public.problem_sets
  for each row execute function public.touch_problem_bank_updated_at();

drop trigger if exists touch_exam_templates_updated_at on public.exam_templates;
create trigger touch_exam_templates_updated_at
  before update on public.exam_templates
  for each row execute function public.touch_problem_bank_updated_at();

drop trigger if exists touch_generated_exams_updated_at on public.generated_exams;
create trigger touch_generated_exams_updated_at
  before update on public.generated_exams
  for each row execute function public.touch_problem_bank_updated_at();

alter table public.problems enable row level security;
alter table public.problem_sets enable row level security;
alter table public.problem_set_items enable row level security;
alter table public.exam_templates enable row level security;
alter table public.generated_exams enable row level security;

drop policy if exists "public can read public problems" on public.problems;
create policy "public can read public problems"
  on public.problems
  for select
  using (visibility = 'public');

drop policy if exists "admins manage problems" on public.problems;
create policy "admins manage problems"
  on public.problems
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

drop policy if exists "public can read public problem sets" on public.problem_sets;
create policy "public can read public problem sets"
  on public.problem_sets
  for select
  using (visibility = 'public');

drop policy if exists "admins manage problem sets" on public.problem_sets;
create policy "admins manage problem sets"
  on public.problem_sets
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

drop policy if exists "public can read public problem set items" on public.problem_set_items;
create policy "public can read public problem set items"
  on public.problem_set_items
  for select
  using (
    exists (
      select 1 from public.problem_sets
      where id = set_id and visibility = 'public'
    )
  );

drop policy if exists "admins manage problem set items" on public.problem_set_items;
create policy "admins manage problem set items"
  on public.problem_set_items
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

drop policy if exists "admins manage exam templates" on public.exam_templates;
create policy "admins manage exam templates"
  on public.exam_templates
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

drop policy if exists "admins manage generated exams" on public.generated_exams;
create policy "admins manage generated exams"
  on public.generated_exams
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

insert into storage.buckets (id, name, public)
values
  ('problem-bank', 'problem-bank', false),
  ('problem-sets', 'problem-sets', false),
  ('problem-set-files', 'problem-set-files', false),
  ('generated-exams', 'generated-exams', false),
  ('thumbnails', 'thumbnails', false)
on conflict (id) do nothing;

insert into public.problems (
  problem_code,
  base_problem_code,
  variant_code,
  code_system,
  source,
  source_type,
  exam_year,
  subject,
  unit,
  level,
  original_ref,
  ebs_original_code,
  question_type,
  question_latex,
  choices_json,
  answer_json,
  solution_latex,
  difficulty,
  variant_strength,
  tags,
  has_graph,
  graph_json,
  visibility
)
values (
  '26xxx-xxxxA',
  '26xxx-xxxx',
  'A',
  'ebs',
  '2027 수능특강 미적분',
  'ebs_special',
  2027,
  '미적분',
  '07. 정적분의 활용',
  'Level 2',
  '07단원 Level 2 6번',
  '26xxx-xxxx',
  'multiple_choice',
  '테스트용 변형문항 LaTeX',
  '["선택지 1", "선택지 2", "선택지 3", "선택지 4", "선택지 5"]'::jsonb,
  '{"answer": 3}'::jsonb,
  '테스트용 해설 LaTeX',
  7,
  3,
  array['정적분', '넓이', '그래프'],
  true,
  '{"type": "function_graph", "description": "원문과 유사한 흑백 그래프. 교점과 넓이 영역 표시."}'::jsonb,
  'private'
)
on conflict (problem_code)
do update set
  source = excluded.source,
  source_type = excluded.source_type,
  subject = excluded.subject,
  unit = excluded.unit,
  level = excluded.level,
  original_ref = excluded.original_ref,
  ebs_original_code = excluded.ebs_original_code,
  question_latex = excluded.question_latex,
  choices_json = excluded.choices_json,
  answer_json = excluded.answer_json,
  solution_latex = excluded.solution_latex,
  difficulty = excluded.difficulty,
  variant_strength = excluded.variant_strength,
  tags = excluded.tags,
  has_graph = excluded.has_graph,
  graph_json = excluded.graph_json,
  updated_at = now();

insert into public.problem_sets (
  title,
  description,
  source,
  source_type,
  subject,
  year,
  unit,
  problem_count_text,
  price_dak,
  visibility
)
select
  '2027 수능특강 미적분 07단원 테스트 세트',
  '문제은행 연결 테스트용 세트입니다.',
  '2027 수능특강 미적분',
  'ebs_special',
  '미적분',
  2027,
  '07. 정적분의 활용',
  '1문항',
  0,
  'private'
where not exists (
  select 1
  from public.problem_sets
  where title = '2027 수능특강 미적분 07단원 테스트 세트'
);

insert into public.problem_set_items (
  set_id,
  problem_id,
  order_index
)
select
  ps.id,
  p.id,
  0
from public.problem_sets ps
cross join public.problems p
where ps.title = '2027 수능특강 미적분 07단원 테스트 세트'
  and p.problem_code = '26xxx-xxxxA'
  and not exists (
    select 1
    from public.problem_set_items psi
    where psi.set_id = ps.id
      and psi.problem_id = p.id
  );

insert into public.exam_templates (
  school_name,
  template_name,
  subject,
  layout_type,
  page_size,
  column_count,
  margin_json,
  header_json,
  footer_json,
  font_json,
  divider_json,
  problem_box_json
)
values (
  '송도고',
  '송도고 지필평가지 기본형',
  '수학',
  'songdo_two_column',
  'A4',
  2,
  '{"top": 18, "right": 14, "bottom": 16, "left": 14}'::jsonb,
  '{"enabled": true, "title": "지필평가지", "showSchoolName": true}'::jsonb,
  '{"enabled": true, "pageNumber": true}'::jsonb,
  '{"family": "Noto Serif KR", "bodySize": 10, "questionSize": 10}'::jsonb,
  '{"enabled": true, "orientation": "vertical", "width": 0.5}'::jsonb,
  '{"gap": 8, "autoFit": true, "allowGraph": true}'::jsonb
)
on conflict (school_name, template_name)
do update set
  subject = excluded.subject,
  layout_type = excluded.layout_type,
  page_size = excluded.page_size,
  column_count = excluded.column_count,
  margin_json = excluded.margin_json,
  header_json = excluded.header_json,
  footer_json = excluded.footer_json,
  font_json = excluded.font_json,
  divider_json = excluded.divider_json,
  problem_box_json = excluded.problem_box_json,
  updated_at = now();
