-- Create study plans table
create table if not exists public.study_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null,
  exam_date date not null,
  daily_hours numeric(3,1) not null,
  roadmap jsonb not null, -- Stores structured JSON milestones, tasks, and revision dates
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.study_plans enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own study plans" on public.study_plans;
create policy "Users can manage their own study plans"
  on public.study_plans for all
  using (auth.uid() = user_id);
