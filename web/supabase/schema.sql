create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  department text not null check (char_length(trim(department)) between 1 and 100),
  academic_year integer not null check (academic_year between 1 and 8),
  semester_number integer not null check (semester_number between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  credits numeric(10, 3) not null check (credits > 0),
  grade_points numeric(10, 3) not null check (grade_points >= 0),
  academic_year integer not null check (academic_year between 1 and 8),
  semester_number integer not null check (semester_number between 1 and 8),
  created_at timestamptz not null default now()
);

create index if not exists subjects_user_term_idx
  on public.subjects (user_id, academic_year, semester_number);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can read their own subjects" on public.subjects;
create policy "Users can read their own subjects"
  on public.subjects for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own subjects" on public.subjects;
create policy "Users can add their own subjects"
  on public.subjects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own subjects" on public.subjects;
create policy "Users can delete their own subjects"
  on public.subjects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, public;
revoke all on public.subjects from anon, public;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.subjects to authenticated;
