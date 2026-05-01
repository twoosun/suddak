create table if not exists public.exam_builder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'analyzed', 'generating', 'completed', 'published', 'failed')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  current_step text not null default 'upload',
  analysis jsonb,
  blueprint jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_builder_reference_files (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.exam_builder_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  original_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  storage_bucket text not null default 'exam-builder',
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.naesin_exam_sets (
  id uuid primary key default gen_random_uuid(),
  builder_job_id uuid references public.exam_builder_jobs(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  subject text not null,
  source_range text,
  reference_summary text,
  total_problems integer not null default 0,
  multiple_choice_count integer not null default 0,
  written_count integer not null default 0,
  total_score numeric(6, 1) not null default 0,
  overall_difficulty text,
  overall_transform_strength text,
  exam_minutes integer not null default 50,
  analysis jsonb,
  blueprint jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.naesin_exam_files (
  id uuid primary key default gen_random_uuid(),
  exam_set_id uuid not null references public.naesin_exam_sets(id) on delete cascade,
  file_role text not null check (file_role in ('exam', 'solution', 'analysis')),
  format text not null check (format in ('DOCX', 'PDF')),
  storage_bucket text not null default 'exam-builder',
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (exam_set_id, file_role, format)
);

create index if not exists exam_builder_jobs_user_id_idx
  on public.exam_builder_jobs(user_id, created_at desc);

create index if not exists exam_builder_reference_files_job_id_idx
  on public.exam_builder_reference_files(job_id);

create index if not exists naesin_exam_sets_published_idx
  on public.naesin_exam_sets(is_published, created_at desc);

create index if not exists naesin_exam_files_exam_set_id_idx
  on public.naesin_exam_files(exam_set_id);

insert into storage.buckets (id, name, public)
values ('exam-builder', 'exam-builder', false)
on conflict (id) do nothing;

alter table public.exam_builder_jobs enable row level security;
alter table public.exam_builder_reference_files enable row level security;
alter table public.naesin_exam_sets enable row level security;
alter table public.naesin_exam_files enable row level security;

drop policy if exists "admins manage exam builder jobs" on public.exam_builder_jobs;
create policy "admins manage exam builder jobs"
  on public.exam_builder_jobs
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

drop policy if exists "admins manage exam builder reference files" on public.exam_builder_reference_files;
create policy "admins manage exam builder reference files"
  on public.exam_builder_reference_files
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

drop policy if exists "published naesin exam sets are readable" on public.naesin_exam_sets;
create policy "published naesin exam sets are readable"
  on public.naesin_exam_sets
  for select
  using (
    is_published = true
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "admins manage naesin exam sets" on public.naesin_exam_sets;
create policy "admins manage naesin exam sets"
  on public.naesin_exam_sets
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

drop policy if exists "published naesin exam files are readable" on public.naesin_exam_files;
create policy "published naesin exam files are readable"
  on public.naesin_exam_files
  for select
  using (
    exists (
      select 1 from public.naesin_exam_sets
      where id = exam_set_id
        and (
          is_published = true
          or exists (
            select 1 from public.user_profiles
            where id = auth.uid() and is_admin = true
          )
        )
    )
  );

drop policy if exists "admins manage naesin exam files" on public.naesin_exam_files;
create policy "admins manage naesin exam files"
  on public.naesin_exam_files
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
