-- Create resume reports table
create table if not exists public.resume_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  score integer not null,
  report_data jsonb not null, -- Stores suggestions, missing skills, and career paths
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.resume_reports enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own resume reports" on public.resume_reports;
create policy "Users can manage their own resume reports"
  on public.resume_reports for all
  using (auth.uid() = user_id);
