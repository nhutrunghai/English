create table if not exists public.exercise_folders (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.exercise_items
  add column if not exists folder_id text references public.exercise_folders(id) on delete set null;

create index if not exists exercise_folders_owner_created_idx
  on public.exercise_folders(owner_id, created_at desc);
create index if not exists exercise_items_owner_folder_idx
  on public.exercise_items(owner_id, folder_id);

alter table public.exercise_folders enable row level security;

drop policy if exists "Users manage own exercise folders" on public.exercise_folders;
create policy "Users manage own exercise folders"
  on public.exercise_folders for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
