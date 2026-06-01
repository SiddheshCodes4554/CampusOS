-- Create notes table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  ai_summary text,
  sources text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create quizzes table
create table if not exists public.note_quizzes (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  questions jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create flashcards table
create table if not exists public.note_flashcards (
  id uuid default gen_random_uuid() primary key,
  note_id uuid references public.notes(id) on delete cascade not null,
  front text not null,
  back text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.notes enable row level security;
alter table public.note_quizzes enable row level security;
alter table public.note_flashcards enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own notes" on public.notes;
create policy "Users can manage their own notes" 
  on public.notes for all 
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their own quizzes" on public.note_quizzes;
create policy "Users can manage their own quizzes" 
  on public.note_quizzes for all 
  using (exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid()));

drop policy if exists "Users can manage their own flashcards" on public.note_flashcards;
create policy "Users can manage their own flashcards" 
  on public.note_flashcards for all 
  using (exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid()));
