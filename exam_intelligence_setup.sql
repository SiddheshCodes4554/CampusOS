-- Create exam_predictions table to store visual diagnostic data and checklist state
create table if not exists public.exam_predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_name text not null,
  analysis jsonb not null, -- Stores the JSON structure of chapters, heatmap topics, and questions
  readiness_checklist jsonb default '{}'::jsonb, -- Stores key-value mappings of prep checklist states (topicName -> boolean)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.exam_predictions enable row level security;

-- Add RLS Policy
drop policy if exists "Users can manage their own predictions" on public.exam_predictions;
create policy "Users can manage their own predictions"
  on public.exam_predictions for all
  using (user_id = auth.uid());
