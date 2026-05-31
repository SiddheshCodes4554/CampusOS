-- Create revision_plans table to store visual diagnostic data, checklists, recall cards, mock tests, and completion state
create table if not exists public.revision_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject_name text not null,
  duration_days integer not null, -- 1, 3, 7, or 30 days plan duration
  concepts jsonb not null, -- Array of critical definitions, cheat sheet formulas, etc.
  weak_topics jsonb not null, -- Array of identified weak areas and AI recommendations
  checklist jsonb not null, -- Day-by-day checkable study checklist
  flashcards jsonb not null, -- Custom generated active recall flashcards
  mock_test jsonb not null, -- Custom generated self-grading mock assessment paper
  checklist_state jsonb default '{}'::jsonb, -- Mappings of checklist items checked (item_id -> boolean)
  mock_test_answers jsonb default '{}'::jsonb, -- Mappings of mock questions self-graded (question_id -> boolean)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.revision_plans enable row level security;

-- Add RLS Policy
drop policy if exists "Users can manage their own revision plans" on public.revision_plans;
create policy "Users can manage their own revision plans"
  on public.revision_plans for all
  using (user_id = auth.uid());
