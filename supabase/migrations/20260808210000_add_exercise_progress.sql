create table if not exists public.exercise_progress (
  owner_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null,
  completed_at timestamptz not null default now(),
  score integer not null default 0,
  total integer not null default 0,
  primary key (owner_id, list_id)
);

alter table public.exercise_progress enable row level security;
drop policy if exists "Users manage own exercise progress" on public.exercise_progress;
create policy "Users manage own exercise progress" on public.exercise_progress for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
