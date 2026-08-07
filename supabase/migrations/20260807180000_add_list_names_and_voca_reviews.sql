alter table public.exercise_items add column if not exists list_name text not null default '';

alter table public.voca_words add column if not exists review_count integer not null default 0;
alter table public.voca_words add column if not exists lapse_count integer not null default 0;
alter table public.voca_words add column if not exists last_reviewed_at timestamptz;
alter table public.voca_words add column if not exists next_review_at timestamptz;
alter table public.voca_words add column if not exists interval_days integer not null default 0;
alter table public.voca_words add column if not exists ease_factor numeric(3,2) not null default 2.50;

create index if not exists voca_words_owner_next_review_idx on public.voca_words(owner_id, next_review_at);
