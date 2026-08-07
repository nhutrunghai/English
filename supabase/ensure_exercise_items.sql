create table if not exists public.exercise_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null default 'default',
  type text not null default 'VOCAB',
  instruction text not null default '',
  question text not null default '',
  answer text not null default '',
  options jsonb not null default '[]'::jsonb,
  image_b64 text not null default '',
  date_learned text not null default '',
  created_at timestamptz not null default now()
);

alter table public.exercise_items add column if not exists image_b64 text not null default '';
alter table public.exercise_items add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.exercise_items add column if not exists date_learned text not null default '';
alter table public.exercise_items enable row level security;

drop policy if exists "users manage own exercises" on public.exercise_items;
create policy "users manage own exercises"
  on public.exercise_items for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists exercise_items_owner_list_idx on public.exercise_items(owner_id, list_id);
