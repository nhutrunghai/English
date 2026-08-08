create table if not exists public.voca_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.voca_words
  add column if not exists folder_id uuid references public.voca_folders(id) on delete set null;

create index if not exists voca_folders_owner_created_idx on public.voca_folders(owner_id, created_at desc);
create index if not exists voca_words_owner_folder_idx on public.voca_words(owner_id, folder_id);

alter table public.voca_folders enable row level security;
drop policy if exists "Users manage own voca folders" on public.voca_folders;
create policy "Users manage own voca folders" on public.voca_folders for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
