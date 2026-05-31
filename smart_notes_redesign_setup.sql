-- Create note_generations table to store AI assets and citations linked to notes
create table if not exists public.note_generations (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null, -- 'summary', 'flashcards', 'quiz', 'mcqs', 'viva', 'interview'
  content jsonb not null, -- Stores the JSON payload of the generated items
  citations jsonb, -- Stores the JSON payload of the citations list
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.note_generations enable row level security;

-- Add RLS Policy
drop policy if exists "Users can manage their own generations" on public.note_generations;
create policy "Users can manage their own generations"
  on public.note_generations for all
  using (user_id = auth.uid());
