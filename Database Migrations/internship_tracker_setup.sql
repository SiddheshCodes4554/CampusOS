-- Create internship applications table
create table if not exists public.internship_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_name text not null,
  role text not null,
  status text check (status in ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')) default 'applied' not null,
  applied_date date default current_date not null,
  follow_up_date date,
  notes text,
  salary text,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.internship_applications enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own applications" on public.internship_applications;
create policy "Users can manage their own applications"
  on public.internship_applications for all
  using (auth.uid() = user_id);
