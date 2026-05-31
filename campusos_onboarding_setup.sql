-- SQL Migration: CampusOS Onboarding Setup
-- Run this in your Supabase SQL Editor

-- 1. Alter public.profiles to add onboarding details
alter table public.profiles 
  add column if not exists onboarding_completed boolean default false not null,
  add column if not exists onboarding_data jsonb default '{}'::jsonb not null;

-- 2. Create memory_logs event_type check constraints update (in case needed)
-- We ensure the event types cover notes ingestions, quiz checks, etc.
alter table public.memory_logs drop constraint if exists memory_logs_event_type_check;
alter table public.memory_logs add constraint memory_logs_event_type_check 
  check (event_type in ('notes_upload', 'quiz_completed', 'revision_done', 'study_habit', 'goal_reached', 'onboarding_sync'));
