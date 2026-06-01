-- SQL Migration: Academic Analytics Setup
-- Run this in your Supabase SQL Editor

-- 1. Create Study Sessions log table
create table if not exists public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null,
  duration_minutes integer not null, -- study session length in minutes
  focus_rating integer check (focus_rating >= 1 and focus_rating <= 5) not null, -- subjective scale 1-5
  study_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Academic Goals tracker table
create table if not exists public.academic_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null, -- e.g., "Complete 15 hours of OS"
  category text check (category in ('study_hours', 'topic_coverage', 'knowledge_growth', 'quiz_performance', 'revision_progress')) not null,
  target_value numeric(6,2) not null,
  current_value numeric(6,2) default 0.00 not null,
  deadline_date date not null,
  completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security
alter table public.study_sessions enable row level security;
alter table public.academic_goals enable row level security;

-- 4. Create RLS Policies for study_sessions
drop policy if exists "Users can manage their own study sessions" on public.study_sessions;
create policy "Users can manage their own study sessions"
  on public.study_sessions for all
  using (auth.uid() = user_id);

-- 5. Create RLS Policies for academic_goals
drop policy if exists "Users can manage their own academic goals" on public.academic_goals;
create policy "Users can manage their own academic goals"
  on public.academic_goals for all
  using (auth.uid() = user_id);
