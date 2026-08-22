create table if not exists public.interview_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question text not null default '',
  answer text not null default '',
  note text not null default '',
  tags text[] not null default '{}'::text[],
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_items enable row level security;

drop policy if exists "users manage own interview items" on public.interview_items;
create policy "users manage own interview items"
  on public.interview_items for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists interview_items_owner_updated_idx on public.interview_items(owner_id, updated_at desc);
create index if not exists interview_items_owner_reviewed_idx on public.interview_items(owner_id, reviewed);
