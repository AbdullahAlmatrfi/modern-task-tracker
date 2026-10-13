-- Dayflow schema. Paste this whole file into Supabase > SQL Editor > Run.
-- Safe to run more than once.

create table if not exists public.tasks (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,
  title       text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  start_time  text check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  lane        text check (char_length(lane) <= 40),
  priority    boolean not null default false,
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

create index if not exists tasks_user_day_idx     on public.tasks (user_id, day);
create index if not exists tasks_user_updated_idx on public.tasks (user_id, updated_at);

-- Each person can only ever see and change their own rows.
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

-- Goals: a title, a start day, and a target day. The app draws a line between them.
create table if not exists public.goals (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  start_day   date not null,
  target_day  date not null check (target_day > start_day),
  lane        text check (char_length(lane) <= 40),
  reached_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

create index if not exists goals_user_updated_idx on public.goals (user_id, updated_at);

alter table public.goals enable row level security;

drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);
