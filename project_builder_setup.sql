-- Create student projects table
create table if not exists public.student_projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_role text not null,
  skill_level text not null,
  interests text not null,
  title text not null,
  description text not null,
  features text[] not null,
  tech_stack text[] not null,
  architecture text not null, -- Stores file structure layout or structure diagram
  roadmap jsonb not null, -- Stores roadmap phases and tasks
  prd text not null, -- Stores the generated Product Requirement Document (PRD) markdown
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.student_projects enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own projects" on public.student_projects;
create policy "Users can manage their own projects"
  on public.student_projects for all
  using (auth.uid() = user_id);
