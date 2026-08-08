create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_owner_created_idx
  on public.ai_usage_events(owner_id, created_at desc);

alter table public.ai_usage_events enable row level security;

drop policy if exists "Users read own AI usage events" on public.ai_usage_events;
create policy "Users read own AI usage events"
  on public.ai_usage_events for select using (auth.uid() = owner_id);

drop policy if exists "Users insert own AI usage events" on public.ai_usage_events;
create policy "Users insert own AI usage events"
  on public.ai_usage_events for insert with check (auth.uid() = owner_id);
