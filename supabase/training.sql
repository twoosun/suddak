create table if not exists public.training_upload_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  subject text,
  problem_file_url text,
  solution_file_url text,
  status text default 'uploaded',
  detected_problem_count integer default 0,
  matched_problem_count integer default 0,
  analyzed_item_count integer default 0,
  approved_problem_count integer default 0,
  estimated_reward integer default 0,
  final_reward integer default 0,
  reward_paid boolean default false,
  ai_model text,
  prompt_version text,
  analysis_error text,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.training_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.training_upload_sets(id) on delete cascade,
  problem_number text,
  problem_text text,
  solution_text text,
  answer text,
  subject text,
  unit text,
  difficulty numeric,
  core_concepts text[],
  key_idea text,
  solution_strategy text,
  trap_point text,
  common_mistake text,
  variation_points text[],
  similar_problem_seed text,
  abstraction_summary text,
  solver_hint text,
  generation_instruction text,
  quality_grade text,
  confidence numeric,
  review_status text default 'pending',
  reward_amount integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.problem_idea_seeds (
  id uuid primary key default gen_random_uuid(),
  source_item_id uuid references public.training_items(id) on delete set null,
  source_set_id uuid references public.training_upload_sets(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  subject text,
  unit text,
  difficulty numeric,
  core_concepts text[],
  key_idea text not null,
  solution_strategy text,
  trap_point text,
  common_mistake text,
  variation_points text[],
  similar_problem_seed text,
  abstraction_summary text,
  solver_hint text,
  generation_instruction text,
  quality_score numeric default 0,
  use_for_generation boolean default true,
  use_for_solving boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount integer not null,
  type text not null,
  reason text,
  related_set_id uuid,
  related_item_id uuid,
  created_at timestamptz default now()
);

alter table public.credit_transactions
  add column if not exists related_set_id uuid,
  add column if not exists related_item_id uuid;

create index if not exists training_upload_sets_user_id_created_at_idx
  on public.training_upload_sets(user_id, created_at desc);

create index if not exists training_items_set_id_idx
  on public.training_items(set_id);

create index if not exists training_items_review_status_idx
  on public.training_items(review_status);

create unique index if not exists problem_idea_seeds_source_item_id_key
  on public.problem_idea_seeds(source_item_id);

create index if not exists problem_idea_seeds_generation_idx
  on public.problem_idea_seeds(subject, unit)
  where use_for_generation = true;

create index if not exists problem_idea_seeds_solving_idx
  on public.problem_idea_seeds(subject, unit)
  where use_for_solving = true;

alter table public.training_upload_sets enable row level security;
alter table public.training_items enable row level security;
alter table public.problem_idea_seeds enable row level security;

drop policy if exists "users select own training upload sets" on public.training_upload_sets;
create policy "users select own training upload sets"
  on public.training_upload_sets
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "users insert own training upload sets" on public.training_upload_sets;
create policy "users insert own training upload sets"
  on public.training_upload_sets
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "admins update training upload sets" on public.training_upload_sets;
create policy "admins update training upload sets"
  on public.training_upload_sets
  for update
  to authenticated
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

drop policy if exists "users select own training items" on public.training_items;
create policy "users select own training items"
  on public.training_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.training_upload_sets tus
      where tus.id = training_items.set_id and tus.user_id = auth.uid()
    )
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "admins manage training items" on public.training_items;
create policy "admins manage training items"
  on public.training_items
  for all
  to authenticated
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

drop policy if exists "users select public problem idea seeds" on public.problem_idea_seeds;
create policy "users select public problem idea seeds"
  on public.problem_idea_seeds
  for select
  to authenticated
  using (
    use_for_generation = true
    or use_for_solving = true
    or created_by = auth.uid()
    or exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "users insert own private problem idea seeds" on public.problem_idea_seeds;
create policy "users insert own private problem idea seeds"
  on public.problem_idea_seeds
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and use_for_generation = false
    and use_for_solving = false
  );

drop policy if exists "admins manage problem idea seeds" on public.problem_idea_seeds;
create policy "admins manage problem idea seeds"
  on public.problem_idea_seeds
  for all
  to authenticated
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
values ('training-uploads', 'training-uploads', false)
on conflict (id) do update set public = false;

drop policy if exists "users upload own training files" on storage.objects;
create policy "users upload own training files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'training-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users read own training files" on storage.objects;
create policy "users read own training files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'training-uploads'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.user_profiles
        where id = auth.uid() and is_admin = true
      )
    )
  );
