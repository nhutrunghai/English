create table if not exists public.exercise_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null,
  type text not null default 'VOCAB',
  instruction text not null default '',
  question text not null default '',
  answer text not null default '',
  options jsonb not null default '[]'::jsonb,
  image_b64 text not null default '',
  list_name text not null default '',
  date_learned text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  study_date date not null default current_date,
  minutes integer not null default 25,
  created_at timestamptz not null default now()
);

alter table public.exercise_items enable row level security;
alter table public.pomodoro_sessions enable row level security;

drop policy if exists "users manage own exercises" on public.exercise_items;
create policy "users manage own exercises"
  on public.exercise_items
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "users manage own pomodoro" on public.pomodoro_sessions;
create policy "users manage own pomodoro"
  on public.pomodoro_sessions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists exercise_items_owner_list_idx on public.exercise_items(owner_id, list_id);
create index if not exists pomodoro_sessions_owner_date_idx on public.pomodoro_sessions(owner_id, study_date);

create table if not exists public.streak_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null default current_date,
  time_slot text not null default '',
  subject text not null default '',
  duration_hours numeric(3,1) not null default 0.0,
  status text not null default 'todo', -- todo, doing, done
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.streak_tasks enable row level security;

drop policy if exists "users manage own streak tasks" on public.streak_tasks;
create policy "users manage own streak tasks"
  on public.streak_tasks
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists streak_tasks_owner_date_idx on public.streak_tasks(owner_id, study_date);




create table if not exists public.streak_day_notes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  study_date date not null,
  weekday text not null default '',
  total_hours text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  primary key(owner_id, study_date)
);

alter table public.streak_day_notes enable row level security;

drop policy if exists "users manage own streak day notes" on public.streak_day_notes;
create policy "users manage own streak day notes"
  on public.streak_day_notes
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);


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



create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  mode text not null default 'markdown' check (mode in ('markdown', 'plain')),
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "users manage own notes" on public.notes;
create policy "users manage own notes"
  on public.notes
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists notes_owner_updated_idx on public.notes(owner_id, updated_at desc);
create index if not exists notes_owner_title_idx on public.notes(owner_id, lower(title));
