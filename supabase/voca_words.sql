create table if not exists public.voca_words (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  meaning text not null default '',
  ipa text not null default '',
  example text not null default '',
  note text not null default '',
  review_count integer not null default 0,
  lapse_count integer not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  interval_days integer not null default 0,
  ease_factor numeric(3,2) not null default 2.50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voca_words enable row level security;

drop policy if exists "users manage own voca words" on public.voca_words;
create policy "users manage own voca words"
  on public.voca_words
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists voca_words_owner_created_idx on public.voca_words(owner_id, created_at desc);
create index if not exists voca_words_owner_word_idx on public.voca_words(owner_id, lower(word));
create index if not exists voca_words_owner_next_review_idx on public.voca_words(owner_id, next_review_at);
