-- Create user API limits table for rate limiting
create table if not exists public.user_api_limits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.user_api_limits enable row level security;

-- Add RLS Policies
drop policy if exists "Users can manage their own limits" on public.user_api_limits;
create policy "Users can manage their own limits"
  on public.user_api_limits for all
  using (auth.uid() = user_id);
