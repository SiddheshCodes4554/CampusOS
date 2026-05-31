-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  university text,
  major text,
  graduation_year integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Create onboarding trigger function to sync auth.users with public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, university, major, graduation_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Student'),
    coalesce(new.raw_user_meta_data->>'university', 'Unknown University'),
    coalesce(new.raw_user_meta_data->>'major', 'Undeclared'),
    coalesce((new.raw_user_meta_data->>'graduation_year')::integer, extract(year from now())::integer + 4)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Bind trigger to user creation in Supabase auth table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
