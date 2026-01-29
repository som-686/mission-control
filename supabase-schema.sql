-- Mission Control Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Documents table
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled',
  content jsonb default '{}',
  folder text,
  tags text[] default '{}',
  is_favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kanban columns
create table public.kanban_columns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  position integer not null default 0,
  color text default '#6366f1',
  created_at timestamptz default now()
);

-- Kanban cards
create table public.kanban_cards (
  id uuid default uuid_generate_v4() primary key,
  column_id uuid references public.kanban_columns(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text default '',
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  labels text[] default '{}',
  position integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User settings
create table public.user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  google_calendar_token jsonb,
  gmail_token jsonb,
  stock_watchlist text[] default '{NIFTY 50,SENSEX,BANKNIFTY,USD/INR}',
  news_topics text[] default '{Technology,Geopolitics,Stock Market,India}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table public.documents enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.user_settings enable row level security;

-- RLS Policies: Users can only access their own data

-- Documents policies
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can create own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- Kanban columns policies
create policy "Users can view own columns"
  on public.kanban_columns for select
  using (auth.uid() = user_id);

create policy "Users can create own columns"
  on public.kanban_columns for insert
  with check (auth.uid() = user_id);

create policy "Users can update own columns"
  on public.kanban_columns for update
  using (auth.uid() = user_id);

create policy "Users can delete own columns"
  on public.kanban_columns for delete
  using (auth.uid() = user_id);

-- Kanban cards policies
create policy "Users can view own cards"
  on public.kanban_cards for select
  using (auth.uid() = user_id);

create policy "Users can create own cards"
  on public.kanban_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cards"
  on public.kanban_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete own cards"
  on public.kanban_cards for delete
  using (auth.uid() = user_id);

-- User settings policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Function to auto-create default kanban columns for new users
create or replace function public.create_default_kanban_columns()
returns trigger as $$
begin
  insert into public.kanban_columns (user_id, title, position, color) values
    (new.id, 'Backlog', 0, '#6366f1'),
    (new.id, 'In Progress', 1, '#f59e0b'),
    (new.id, 'Review', 2, '#8b5cf6'),
    (new.id, 'Done', 3, '#10b981');
  
  insert into public.user_settings (user_id) values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create defaults on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_default_kanban_columns();

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

create trigger kanban_cards_updated_at
  before update on public.kanban_cards
  for each row execute function public.handle_updated_at();

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();
