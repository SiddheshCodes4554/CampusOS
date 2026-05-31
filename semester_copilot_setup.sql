-- SQL Migration: Semester plans setup
-- Run this in your Supabase SQL Editor

create table if not exists public.semester_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_name text not null,
  subject_code varchar(15),
  units jsonb not null, -- Stores units, topics list, and weightages
  marks_distribution jsonb not null, -- Stores grade weights (exams, projects, labs)
  practicals jsonb default '[]'::jsonb, -- Stores laboratory components
  roadmaps jsonb not null, -- Stores semester, weekly, daily, revision roadmaps
  exam_prep jsonb not null, -- Stores internal and final exam preps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.semester_plans enable row level security;

-- Create RLS Policies
create policy "Users can manage their own semester plans"
  on public.semester_plans for all
  using (auth.uid() = user_id);
