-- ============================================================
-- JARVIS COMMAND CENTER — Supabase Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable Row Level Security on all tables
-- (auth.users is managed by Supabase Auth)

-- ============================================================
-- TASKS TABLE
-- ============================================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  priority text default 'normal' check (priority in ('critical', 'high', 'normal')),
  due_date timestamptz,
  completed boolean default false,
  position integer default 0,
  created_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "Users can only see their own tasks"
  on tasks for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on tasks for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on tasks for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on tasks for delete using (auth.uid() = user_id);

-- Index for faster queries
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists tasks_due_date_idx on tasks(due_date);

-- ============================================================
-- NOTES TABLE
-- ============================================================
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'Untitled Note',
  content jsonb default '{}',  -- TipTap JSON format
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table notes enable row level security;

create policy "Users can only see their own notes"
  on notes for select using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on notes for insert with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on notes for update using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on notes for delete using (auth.uid() = user_id);

create index if not exists notes_user_id_idx on notes(user_id);
create index if not exists notes_updated_at_idx on notes(updated_at desc);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_notes_updated_at
  before update on notes
  for each row execute function update_updated_at_column();

-- ============================================================
-- PORTFOLIO ITEMS TABLE
-- ============================================================
create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  ticker text not null,
  type text default 'stock' check (type in ('stock', 'crypto', 'manual')),
  name text,
  quantity numeric default 0,
  manual_value numeric,  -- For manual/bank entries
  created_at timestamptz default now()
);

alter table portfolio_items enable row level security;

create policy "Users can only see their own portfolio"
  on portfolio_items for select using (auth.uid() = user_id);

create policy "Users can insert their own portfolio items"
  on portfolio_items for insert with check (auth.uid() = user_id);

create policy "Users can update their own portfolio items"
  on portfolio_items for update using (auth.uid() = user_id);

create policy "Users can delete their own portfolio items"
  on portfolio_items for delete using (auth.uid() = user_id);

create index if not exists portfolio_user_id_idx on portfolio_items(user_id);

-- ============================================================
-- NET WORTH SNAPSHOTS TABLE
-- ============================================================
create table if not exists net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  total_value numeric not null,
  snapshot_date date default current_date,
  created_at timestamptz default now()
);

alter table net_worth_snapshots enable row level security;

create policy "Users can only see their own net worth data"
  on net_worth_snapshots for select using (auth.uid() = user_id);

create policy "Users can insert their own net worth snapshots"
  on net_worth_snapshots for insert with check (auth.uid() = user_id);

create policy "Users can delete their own net worth snapshots"
  on net_worth_snapshots for delete using (auth.uid() = user_id);

create index if not exists networth_user_date_idx on net_worth_snapshots(user_id, snapshot_date desc);

-- ============================================================
-- EMAIL FILTER KEYWORDS TABLE
-- ============================================================
create table if not exists email_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  keyword text not null,
  created_at timestamptz default now()
);

alter table email_filters enable row level security;

create policy "Users can only see their own email filters"
  on email_filters for select using (auth.uid() = user_id);

create policy "Users can insert their own email filters"
  on email_filters for insert with check (auth.uid() = user_id);

create policy "Users can delete their own email filters"
  on email_filters for delete using (auth.uid() = user_id);

create index if not exists email_filters_user_id_idx on email_filters(user_id);

-- ============================================================
-- SEED DEFAULT EMAIL FILTER KEYWORDS
-- (Will be applied per user on first login via app logic)
-- ============================================================
-- Default keywords: 'invoice', 'meeting', 'urgent', 'client', 'payment'
