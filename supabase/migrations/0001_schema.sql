-- Liftline — core schema, row level security and triggers.
-- Run in the Supabase SQL editor (or `supabase db push`) before 0002_storage.sql.

-- gen_random_uuid() is built into Postgres 13+; no extension needed.

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  full_name text not null default '',
  email text not null default '',
  business_name text,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  email text not null,
  goal text not null default '',
  status text not null default 'invited' check (status in ('invited', 'active', 'paused')),
  check_in_day int not null default 0 check (check_in_day between 0 and 6),
  start_weight numeric,
  target_weight numeric,
  height_cm numeric,
  preferences text not null default '',
  notification_prefs jsonb not null default '{"messages": true, "check_in_reminders": true, "plan_updates": true}',
  units text not null default 'kg' check (units in ('kg', 'lb')),
  last_activity_at timestamptz,
  created_at timestamptz not null default now()
);
create index clients_coach_idx on public.clients (coach_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  email text not null,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  days jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  description text not null default '',
  days jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_plans_client_idx on public.workout_plans (client_id);

create table public.nutrition_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  calories int not null default 0,
  protein int not null default 0,
  carbs int not null default 0,
  fat int not null default 0,
  meals jsonb not null default '[]',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  calories int not null default 0,
  protein int not null default 0,
  carbs int not null default 0,
  fat int not null default 0,
  meals jsonb not null default '[]',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nutrition_plans_client_idx on public.nutrition_plans (client_id);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  day_id text,
  day_name text not null default '',
  date date not null,
  completed boolean not null default false,
  notes text not null default '',
  entries jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index workout_logs_client_idx on public.workout_logs (client_id, date);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snacks')),
  name text not null,
  calories int not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now()
);
create index food_entries_client_idx on public.food_entries (client_id, date);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  weight numeric,
  waist numeric,
  chest numeric,
  hips numeric,
  arm numeric,
  thigh numeric,
  created_at timestamptz not null default now()
);
create index body_metrics_client_idx on public.body_metrics (client_id, date);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  pose text not null check (pose in ('front', 'side', 'back')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  target numeric not null default 1,
  unit text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  week_of date not null,
  weight numeric,
  progress_rating int not null check (progress_rating between 1 and 5),
  energy int not null check (energy between 1 and 5),
  hunger int not null check (hunger between 1 and 5),
  sleep_quality int not null check (sleep_quality between 1 and 5),
  sleep_hours numeric,
  adherence int not null check (adherence between 0 and 100),
  wins text not null default '',
  challenges text not null default '',
  questions text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  coach_feedback text,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now()
);
create index check_ins_coach_idx on public.check_ins (coach_id, status);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null check (sender_role in ('coach', 'client')),
  body text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_client_idx on public.messages (client_id, created_at);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, client_id)
);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  author_role text not null check (author_role in ('coach', 'client')),
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Access helpers (security definer so they can be used inside policies
-- without recursive RLS evaluation)
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_coach_of(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clients where id = cid and coach_id = auth.uid());
$$;

create or replace function public.is_client_self(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clients where id = cid and user_id = auth.uid());
$$;

create or replace function public.can_access_client(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from clients
    where id = cid and (coach_id = auth.uid() or user_id = auth.uid())
  );
$$;

create or replace function public.is_group_coach(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = gid and coach_id = auth.uid());
$$;

create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members gm join clients c on c.id = gm.client_id
    where gm.group_id = gid and c.user_id = auth.uid()
  );
$$;

create or replace function public.my_coach_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coach_id from clients where user_id = auth.uid() limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- Row level security
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.invites enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_plans enable row level security;
alter table public.nutrition_templates enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.workout_logs enable row level security;
alter table public.food_entries enable row level security;
alter table public.body_metrics enable row level security;
alter table public.progress_photos enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.check_ins enable row level security;
alter table public.messages enable row level security;
alter table public.coach_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;

-- profiles: yourself, your coach, and (for coaches) your clients' accounts
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or id = public.my_coach_id()
  or exists (select 1 from public.clients c where c.user_id = profiles.id and c.coach_id = auth.uid())
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- clients
create policy clients_coach_all on public.clients for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy clients_self_select on public.clients for select to authenticated
  using (user_id = auth.uid());
create policy clients_self_update on public.clients for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- invites (acceptance goes through accept_invite())
create policy invites_coach_all on public.invites for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.is_coach_of(client_id));

-- templates: private to their coach
create policy wt_coach_all on public.workout_templates for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy nt_coach_all on public.nutrition_templates for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- plans: coach writes, client reads
create policy wp_coach_all on public.workout_plans for all to authenticated
  using (public.is_coach_of(client_id))
  with check (coach_id = auth.uid() and public.is_coach_of(client_id));
create policy wp_client_select on public.workout_plans for select to authenticated
  using (public.is_client_self(client_id));
create policy np_coach_all on public.nutrition_plans for all to authenticated
  using (public.is_coach_of(client_id))
  with check (coach_id = auth.uid() and public.is_coach_of(client_id));
create policy np_client_select on public.nutrition_plans for select to authenticated
  using (public.is_client_self(client_id));

-- client-owned logs: client writes, coach reads
create policy wl_client_all on public.workout_logs for all to authenticated
  using (public.is_client_self(client_id)) with check (public.is_client_self(client_id));
create policy wl_coach_select on public.workout_logs for select to authenticated
  using (public.is_coach_of(client_id));

create policy fe_client_all on public.food_entries for all to authenticated
  using (public.is_client_self(client_id)) with check (public.is_client_self(client_id));
create policy fe_coach_select on public.food_entries for select to authenticated
  using (public.is_coach_of(client_id));

create policy bm_client_all on public.body_metrics for all to authenticated
  using (public.is_client_self(client_id)) with check (public.is_client_self(client_id));
create policy bm_coach_select on public.body_metrics for select to authenticated
  using (public.is_coach_of(client_id));

create policy pp_client_all on public.progress_photos for all to authenticated
  using (public.is_client_self(client_id)) with check (public.is_client_self(client_id));
create policy pp_coach_select on public.progress_photos for select to authenticated
  using (public.is_coach_of(client_id));

-- habits: coach assigns, client reads; client logs
create policy habits_coach_all on public.habits for all to authenticated
  using (public.is_coach_of(client_id))
  with check (coach_id = auth.uid() and public.is_coach_of(client_id));
create policy habits_client_select on public.habits for select to authenticated
  using (public.is_client_self(client_id));

create policy hl_client_all on public.habit_logs for all to authenticated
  using (public.is_client_self(client_id))
  with check (
    public.is_client_self(client_id)
    and exists (select 1 from public.habits h where h.id = habit_id and h.client_id = habit_logs.client_id)
  );
create policy hl_coach_select on public.habit_logs for select to authenticated
  using (public.is_coach_of(client_id));

-- check-ins: client submits, coach reviews
create policy ci_client_select on public.check_ins for select to authenticated
  using (public.is_client_self(client_id));
create policy ci_client_insert on public.check_ins for insert to authenticated
  with check (
    public.is_client_self(client_id)
    and coach_id = (select c.coach_id from public.clients c where c.id = client_id)
    and status = 'submitted' and coach_feedback is null
  );
create policy ci_client_update on public.check_ins for update to authenticated
  using (public.is_client_self(client_id) and status = 'submitted')
  with check (public.is_client_self(client_id));
create policy ci_coach_select on public.check_ins for select to authenticated
  using (public.is_coach_of(client_id));
create policy ci_coach_update on public.check_ins for update to authenticated
  using (public.is_coach_of(client_id)) with check (public.is_coach_of(client_id));

-- messages: private to the coach/client pair
create policy msg_select on public.messages for select to authenticated
  using (public.can_access_client(client_id));
create policy msg_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (sender_role = 'coach' and public.is_coach_of(client_id))
      or (sender_role = 'client' and public.is_client_self(client_id))
    )
  );
create policy msg_mark_read on public.messages for update to authenticated
  using (public.can_access_client(client_id) and sender_id <> auth.uid())
  with check (public.can_access_client(client_id));

-- coach notes: coach only
create policy notes_coach_all on public.coach_notes for all to authenticated
  using (public.is_coach_of(client_id))
  with check (coach_id = auth.uid() and public.is_coach_of(client_id));

-- notifications: recipient only (rows are created by triggers below)
create policy notif_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- community groups
create policy groups_coach_all on public.groups for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy groups_member_select on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy gm_coach_all on public.group_members for all to authenticated
  using (public.is_group_coach(group_id))
  with check (public.is_group_coach(group_id) and public.is_coach_of(client_id));
create policy gm_member_select on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy gp_select on public.group_posts for select to authenticated
  using (public.is_group_coach(group_id) or public.is_group_member(group_id));
create policy gp_insert on public.group_posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.is_group_coach(group_id) or public.is_group_member(group_id))
  );
create policy gp_delete on public.group_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_group_coach(group_id));

-- ─────────────────────────────────────────────────────────────
-- Column guards: RLS is row-level, so these triggers stop each side from
-- editing fields that belong to the other.
-- ─────────────────────────────────────────────────────────────

create or replace function public.guard_client_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and old.user_id = auth.uid() and old.coach_id <> auth.uid() then
    if new.coach_id <> old.coach_id or new.user_id is distinct from old.user_id
       or new.status <> old.status or new.email <> old.email
       or new.check_in_day <> old.check_in_day then
      raise exception 'Clients can only edit their own goals, preferences and settings';
    end if;
  end if;
  return new;
end $$;
create trigger clients_guard before update on public.clients
  for each row execute function public.guard_client_update();

create or replace function public.guard_profile_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role <> old.role or new.email <> old.email then
    raise exception 'Role and email cannot be changed here';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_check_in_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if public.is_client_self(old.client_id) then
    if new.coach_feedback is distinct from old.coach_feedback
       or new.status <> old.status or new.reviewed_at is distinct from old.reviewed_at
       or new.coach_id <> old.coach_id or new.client_id <> old.client_id then
      raise exception 'Clients cannot change review fields';
    end if;
  elsif public.is_coach_of(old.client_id) then
    if new.weight is distinct from old.weight or new.progress_rating <> old.progress_rating
       or new.energy <> old.energy or new.hunger <> old.hunger
       or new.sleep_quality <> old.sleep_quality or new.sleep_hours is distinct from old.sleep_hours
       or new.adherence <> old.adherence or new.wins <> old.wins
       or new.challenges <> old.challenges or new.questions <> old.questions
       or new.client_id <> old.client_id or new.week_of <> old.week_of then
      raise exception 'Coaches can only add feedback to a check-in';
    end if;
  end if;
  return new;
end $$;
create trigger check_ins_guard before update on public.check_ins
  for each row execute function public.guard_check_in_update();

create or replace function public.guard_message_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.body <> old.body or new.sender_id <> old.sender_id
     or new.client_id <> old.client_id or new.sender_role <> old.sender_role then
    raise exception 'Messages cannot be edited';
  end if;
  return new;
end $$;
create trigger messages_guard before update on public.messages
  for each row execute function public.guard_message_update();

-- ─────────────────────────────────────────────────────────────
-- Profiles on signup, invite acceptance
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email, business_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'client' then 'client' else 'coach' end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'business_name'
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Public lookup for the onboarding screen: only exposes names for a valid token.
create or replace function public.get_invite(invite_token text)
returns table (client_name text, email text, coach_name text, business_name text, expired boolean, accepted boolean)
language sql stable security definer set search_path = public as $$
  select c.full_name, i.email, p.full_name, p.business_name,
         i.expires_at < now(), i.accepted_at is not null
  from invites i
  join clients c on c.id = i.client_id
  join profiles p on p.id = i.coach_id
  where i.token = invite_token;
$$;
grant execute on function public.get_invite(text) to anon, authenticated;

create or replace function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  me profiles%rowtype;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Not signed in'; end if;
  if me.role <> 'client' then raise exception 'Only client accounts can accept an invite'; end if;

  select * into inv from invites where token = invite_token for update;
  if inv.id is null then raise exception 'Invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'Invite already used'; end if;
  if inv.expires_at < now() then raise exception 'Invite expired'; end if;
  if lower(inv.email) <> lower(me.email) then
    raise exception 'Sign up with the email address the invite was sent to';
  end if;
  if exists (select 1 from clients where user_id = me.id) then
    raise exception 'This account is already linked to a coach';
  end if;

  update clients set user_id = me.id, status = 'active', last_activity_at = now()
    where id = inv.client_id;
  update invites set accepted_at = now() where id = inv.id;

  insert into notifications (user_id, kind, title, body, link)
  values (inv.coach_id, 'system', me.full_name || ' joined', 'Your invite was accepted.',
          '/coach/clients/' || inv.client_id);
  return inv.client_id;
end $$;
grant execute on function public.accept_invite(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Activity + notification triggers
-- ─────────────────────────────────────────────────────────────

create or replace function public.touch_client_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update clients set last_activity_at = now() where id = new.client_id;
  return new;
end $$;

create trigger wl_activity after insert or update on public.workout_logs
  for each row execute function public.touch_client_activity();
create trigger fe_activity after insert on public.food_entries
  for each row execute function public.touch_client_activity();
create trigger bm_activity after insert on public.body_metrics
  for each row execute function public.touch_client_activity();
create trigger hl_activity after insert or update on public.habit_logs
  for each row execute function public.touch_client_activity();
create trigger pp_activity after insert on public.progress_photos
  for each row execute function public.touch_client_activity();

create or replace function public.notify_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c clients%rowtype;
begin
  select * into c from clients where id = new.client_id;
  if new.sender_role = 'client' then
    update clients set last_activity_at = now() where id = c.id;
    insert into notifications (user_id, kind, title, body, link)
    values (c.coach_id, 'message', 'Message from ' || c.full_name, left(new.body, 140),
            '/coach/messages?client=' || c.id);
  elsif c.user_id is not null and coalesce((c.notification_prefs ->> 'messages')::boolean, true) then
    insert into notifications (user_id, kind, title, body, link)
    values (c.user_id, 'message', 'New message from your coach', left(new.body, 140), '/app/messages');
  end if;
  return new;
end $$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

create or replace function public.notify_check_in() returns trigger
language plpgsql security definer set search_path = public as $$
declare c clients%rowtype;
begin
  select * into c from clients where id = new.client_id;
  if tg_op = 'INSERT' then
    update clients set last_activity_at = now() where id = c.id;
    insert into notifications (user_id, kind, title, body, link)
    values (c.coach_id, 'check_in', c.full_name || ' submitted a check-in',
            'Week of ' || to_char(new.week_of, 'Mon DD'), '/coach/check-ins?id=' || new.id);
  elsif new.coach_feedback is distinct from old.coach_feedback and new.coach_feedback is not null
        and c.user_id is not null then
    insert into notifications (user_id, kind, title, body, link)
    values (c.user_id, 'feedback', 'Your coach reviewed your check-in', left(new.coach_feedback, 140),
            '/app/check-in');
  end if;
  return new;
end $$;
create trigger check_ins_notify after insert or update on public.check_ins
  for each row execute function public.notify_check_in();

create or replace function public.notify_plan() returns trigger
language plpgsql security definer set search_path = public as $$
declare c clients%rowtype;
begin
  if not new.active then return new; end if;
  select * into c from clients where id = new.client_id;
  if c.user_id is not null and coalesce((c.notification_prefs ->> 'plan_updates')::boolean, true) then
    insert into notifications (user_id, kind, title, body, link)
    values (c.user_id, 'plan',
            case when tg_table_name = 'workout_plans' then 'Workout plan updated' else 'Nutrition plan updated' end,
            new.name, case when tg_table_name = 'workout_plans' then '/app/workout' else '/app/food' end);
  end if;
  return new;
end $$;
create trigger workout_plans_notify after insert or update on public.workout_plans
  for each row execute function public.notify_plan();
create trigger nutrition_plans_notify after insert or update on public.nutrition_plans
  for each row execute function public.notify_plan();

create or replace function public.notify_group_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.author_role = 'coach' then
    insert into notifications (user_id, kind, title, body, link)
    select c.user_id, 'group', 'New post in ' || g.name, left(new.body, 140), '/app/community?group=' || g.id
    from group_members gm
    join clients c on c.id = gm.client_id
    join groups g on g.id = gm.group_id
    where gm.group_id = new.group_id and c.user_id is not null;
  end if;
  return new;
end $$;
create trigger group_posts_notify after insert on public.group_posts
  for each row execute function public.notify_group_post();
