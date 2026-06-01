-- SQL Migration: CampusOS Memory Setup
-- Run this in your Supabase SQL Editor

-- 1. Create Student Cognitive Memory profile table
create table if not exists public.student_memory (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  preferred_study_time text default 'evening' not null,
  weak_areas jsonb default '[]'::jsonb not null, -- Array of identified weak topics
  strong_areas jsonb default '[]'::jsonb not null, -- Array of mastered topics
  average_focus_duration integer default 45 not null, -- focus stamina in minutes
  cognitive_profile jsonb default '{"learningStyle": "Active Recall", "repetitionScale": "Medium"}'::jsonb not null, -- structured details
  recent_topics_studied jsonb default '[]'::jsonb not null, -- list of recently covered subjects
  last_sync_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Student Memory log table to preserve event historical timeline
create table if not exists public.memory_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text check (event_type in ('notes_upload', 'quiz_completed', 'revision_done', 'study_habit', 'goal_reached')) not null,
  details jsonb not null, -- context of event (e.g. subject, grade, duration)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security
alter table public.student_memory enable row level security;
alter table public.memory_logs enable row level security;

-- 4. Create RLS Policies for student_memory
drop policy if exists "Users can manage their own student memory" on public.student_memory;
create policy "Users can manage their own student memory"
  on public.student_memory for all
  using (auth.uid() = user_id);

-- 5. Create RLS Policies for memory_logs
drop policy if exists "Users can manage their own memory logs" on public.memory_logs;
create policy "Users can manage their own memory logs"
  on public.memory_logs for all
  using (auth.uid() = user_id);
