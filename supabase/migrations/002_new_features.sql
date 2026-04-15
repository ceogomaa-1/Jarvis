-- ============================================================
-- JARVIS COMMAND CENTER — New Features Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- DAY SCORES TABLE
-- ============================================================
create table if not exists day_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  score int not null check (score >= 1 and score <= 10),
  note text,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table day_scores enable row level security;

create policy "Users can manage their own day scores"
  on day_scores for all using (auth.uid() = user_id);

create index if not exists day_scores_user_date_idx on day_scores(user_id, date desc);

-- ============================================================
-- FINANCE PROFILE TABLE (one row per user)
-- ============================================================
create table if not exists finance_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  income numeric default 0,
  income_frequency text default 'biweekly' check (income_frequency in ('weekly', 'biweekly', 'monthly')),
  expenses jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table finance_profile enable row level security;

create policy "Users can manage their own finance profile"
  on finance_profile for all using (auth.uid() = user_id);

-- ============================================================
-- FINANCE GOALS TABLE
-- ============================================================
create table if not exists finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null default 0,
  current_saved numeric default 0,
  deadline date,
  created_at timestamptz default now()
);

alter table finance_goals enable row level security;

create policy "Users can manage their own finance goals"
  on finance_goals for all using (auth.uid() = user_id);

create index if not exists finance_goals_user_idx on finance_goals(user_id);

-- ============================================================
-- FINANCE CONVERSATIONS TABLE
-- ============================================================
create table if not exists finance_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  messages jsonb default '[]',
  created_at timestamptz default now()
);

alter table finance_conversations enable row level security;

create policy "Users can manage their own finance conversations"
  on finance_conversations for all using (auth.uid() = user_id);

create index if not exists finance_conversations_user_idx on finance_conversations(user_id, created_at desc);

-- ============================================================
-- EMAIL FILTERS TABLE (upserted per user, keywords as jsonb)
-- ============================================================
create table if not exists email_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  keywords jsonb default '["invoice","meeting","urgent","client","deployment","payment","contract","project"]',
  filter_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table email_filters enable row level security;

create policy "Users can manage their own email filters"
  on email_filters for all using (auth.uid() = user_id);
