create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 100),
  registration_number text check (
    registration_number is null
    or char_length(trim(registration_number)) between 1 and 50
  ),
  email text not null,
  department text not null check (char_length(trim(department)) between 1 and 100),
  academic_year integer not null check (academic_year between 1 and 4),
  semester_number integer not null check (semester_number between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists registration_number text;
alter table public.profiles drop constraint if exists profiles_registration_number_check;
alter table public.profiles add constraint profiles_registration_number_check
  check (
    registration_number is null
    or char_length(trim(registration_number)) between 1 and 50
  );
create unique index if not exists profiles_registration_number_unique_idx
  on public.profiles (registration_number)
  where registration_number is not null;

alter table public.profiles add column if not exists email text;
update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id and profile.email is distinct from auth_user.email;
alter table public.profiles alter column email set not null;

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.registration_number := nullif(trim(new.registration_number), '');
  if tg_op = 'INSERT' and new.registration_number is null then
    raise exception 'A student registration number is required.';
  end if;

  select auth_user.email
  into new.email
  from auth.users as auth_user
  where auth_user.id = new.id;

  if new.email is null then
    raise exception 'A valid email is required for the student profile.';
  end if;
  return new;
end;
$$;

revoke all on function public.sync_profile_email_from_auth() from public, anon, authenticated;
drop trigger if exists sync_profile_email_from_auth on public.profiles;
create trigger sync_profile_email_from_auth
  before insert or update on public.profiles
  for each row execute function public.sync_profile_email_from_auth();

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  credits numeric(10, 3) not null check (credits > 0),
  grade_points numeric(10, 3) not null check (grade_points >= 0),
  academic_year integer not null check (academic_year between 1 and 4),
  semester_number integer not null check (semester_number between 1 and 8),
  created_at timestamptz not null default now()
);

create index if not exists subjects_user_term_idx
  on public.subjects (user_id, academic_year, semester_number);

create table if not exists public.gpa_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gpa numeric(12, 4) not null check (gpa >= 0),
  total_credits numeric(12, 3) not null check (total_credits > 0),
  subject_count integer not null check (subject_count > 0),
  academic_year integer not null check (academic_year between 1 and 4),
  semester_number integer not null check (semester_number between 1 and 8),
  created_at timestamptz not null default now()
);

create table if not exists public.sgpa_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sgpa numeric(12, 4) not null check (sgpa >= 0),
  total_credits numeric(12, 3) not null check (total_credits > 0),
  subject_count integer not null check (subject_count > 0),
  academic_year integer not null check (academic_year between 1 and 4),
  semester_number integer not null check (semester_number between 1 and 8),
  created_at timestamptz not null default now()
);

create table if not exists public.cgpa_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cgpa numeric(12, 4) not null check (cgpa >= 0),
  total_credits numeric(12, 3) not null check (total_credits > 0),
  subject_count integer not null check (subject_count > 0),
  created_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_academic_year_check;
alter table public.profiles drop constraint if exists profiles_academic_year_range_check;
alter table public.profiles add constraint profiles_academic_year_range_check
  check (academic_year between 1 and 4) not valid;

alter table public.subjects drop constraint if exists subjects_academic_year_check;
alter table public.subjects drop constraint if exists subjects_academic_year_range_check;
alter table public.subjects add constraint subjects_academic_year_range_check
  check (academic_year between 1 and 4) not valid;

alter table public.gpa_results drop constraint if exists gpa_results_academic_year_check;
alter table public.gpa_results drop constraint if exists gpa_results_academic_year_range_check;
alter table public.gpa_results add constraint gpa_results_academic_year_range_check
  check (academic_year between 1 and 4) not valid;

alter table public.sgpa_results drop constraint if exists sgpa_results_academic_year_check;
alter table public.sgpa_results drop constraint if exists sgpa_results_academic_year_range_check;
alter table public.sgpa_results add constraint sgpa_results_academic_year_range_check
  check (academic_year between 1 and 4) not valid;

create index if not exists gpa_results_user_created_idx
  on public.gpa_results (user_id, created_at desc);
create index if not exists sgpa_results_user_created_idx
  on public.sgpa_results (user_id, created_at desc);
create index if not exists cgpa_results_user_created_idx
  on public.cgpa_results (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.gpa_results enable row level security;
alter table public.sgpa_results enable row level security;
alter table public.cgpa_results enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

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

drop policy if exists "Users can read their own GPA results" on public.gpa_results;
create policy "Users can read their own GPA results"
  on public.gpa_results for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save their own GPA results" on public.gpa_results;
create policy "Users can save their own GPA results"
  on public.gpa_results for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own SGPA results" on public.sgpa_results;
create policy "Users can read their own SGPA results"
  on public.sgpa_results for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save their own SGPA results" on public.sgpa_results;
create policy "Users can save their own SGPA results"
  on public.sgpa_results for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own CGPA results" on public.cgpa_results;
create policy "Users can read their own CGPA results"
  on public.cgpa_results for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save their own CGPA results" on public.cgpa_results;
create policy "Users can save their own CGPA results"
  on public.cgpa_results for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, public;
revoke all on public.subjects from anon, public;
revoke all on public.gpa_results, public.sgpa_results, public.cgpa_results from anon, public;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.subjects to authenticated;
grant select, insert on public.gpa_results, public.sgpa_results, public.cgpa_results to authenticated;
