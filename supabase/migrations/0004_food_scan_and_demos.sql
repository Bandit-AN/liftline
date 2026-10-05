-- Food photo scanning + exercise demonstrations.

-- ── Food entries: extra nutrients and scan metadata ──────────────────────
alter table public.food_entries
  add column if not exists fiber numeric,
  add column if not exists sugar numeric,
  add column if not exists sodium numeric,               -- milligrams
  add column if not exists portion text,
  add column if not exists source text not null default 'manual',
  add column if not exists estimated boolean not null default false,
  add column if not exists meal_group uuid;

alter table public.food_entries drop constraint if exists food_entries_source_check;
alter table public.food_entries add constraint food_entries_source_check check (source in ('manual', 'scan'));

-- One row per AI scan request; written only by the analyze-food function
-- (service role). Used for rate limiting and support.
create table if not exists public.food_scans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ok boolean not null default true,
  item_count int not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists food_scans_client_idx on public.food_scans (client_id, created_at desc);
alter table public.food_scans enable row level security;
drop policy if exists food_scans_self_select on public.food_scans;
create policy food_scans_self_select on public.food_scans for select to authenticated
  using (public.can_access_client(client_id));

-- ── Coach-created exercise demonstrations ────────────────────────────────
create table if not exists public.exercise_demos (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  equipment text not null default '',
  media_path text,
  media_type text check (media_type in ('video', 'image')),
  steps jsonb not null default '[]',
  breathing text not null default '',
  mistakes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exercise_demos_coach_idx on public.exercise_demos (coach_id);
alter table public.exercise_demos enable row level security;

drop policy if exists demos_coach_all on public.exercise_demos;
create policy demos_coach_all on public.exercise_demos for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists demos_client_select on public.exercise_demos;
create policy demos_client_select on public.exercise_demos for select to authenticated
  using (coach_id = public.my_coach_id());

-- Private media bucket. Paths are "<coach_id>/<file>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', false, 52428800,
        array['video/mp4', 'video/webm', 'video/quicktime', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "exercise media: coach and their clients can read" on storage.objects;
create policy "exercise media: coach and their clients can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exercise-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.my_coach_id()::text
    )
  );

drop policy if exists "exercise media: coach uploads to own folder" on storage.objects;
create policy "exercise media: coach uploads to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exercise-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
  );

drop policy if exists "exercise media: coach deletes own files" on storage.objects;
create policy "exercise media: coach deletes own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-media' and (storage.foldername(name))[1] = auth.uid()::text);
