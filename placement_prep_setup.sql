-- Create placement scores table
create table if not exists public.placement_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('aptitude', 'dsa', 'hr', 'interview_simulator')) not null,
  topic text not null, -- e.g., 'Quantitative Aptitude', 'Binary Tree', 'HR Behavioral', 'Frontend SWE Simulation'
  score numeric(5,2) not null,
  total_questions integer, -- optional, e.g. for quiz types
  details jsonb, -- stores detailed feedback, dialog transcripts, or response criteria breakdowns
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.placement_scores enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own placement scores" on public.placement_scores;
create policy "Users can manage their own placement scores"
  on public.placement_scores for all
  using (auth.uid() = user_id);
