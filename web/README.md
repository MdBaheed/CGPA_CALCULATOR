# Gradebook web app

This folder contains the Vercel-ready web version of the academic calculator. It uses Supabase Auth for email/password sign-in and Supabase Postgres for student profiles and subjects. The JavaFX desktop application uses the same Supabase project.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). Re-run it for an existing installation to add the profile email and registration-number fields, admin profile-read policy, and separate GPA, SGPA, and CGPA result tables. Existing profiles have no registration number until one is added; new student registrations require a unique number.
3. In Supabase Authentication settings, choose whether email confirmation should be required.
4. In the project settings, copy the project URL and the **publishable/anon key**. Never use a `service_role` or secret key in this app.

The schema enables row-level security. Students can access only their own profile, subjects, and saved results; administrators can read student profiles only.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `web`.
3. Add these environment variables to the Vercel project:
   - `SUPABASE_URL` — the Supabase project URL.
   - `SUPABASE_ANON_KEY` — the Supabase publishable/anon key.
4. Deploy. The app reads these public client settings from `/api/config`; no service-role key is used.
5. In Supabase Authentication URL settings, add the deployed Vercel URL to the allowed redirect URLs.

## Admin access

Administrators can sign in from the Admin option on the student sign-in screen or directly at `/?admin=1`. The admin page uses the same Supabase email/password authentication as student accounts and does not allow admin self-registration. To grant administrator access, first create and confirm the account, then assign its trusted `app_metadata` role from the Supabase SQL Editor:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

Replace the example address with the intended administrator account. The user must sign out and sign in again to receive a token with the new role. Do not assign roles from user-editable metadata, the browser, or the desktop client. Row-level security lets admins read student profile records; students can still read only their own profile and subjects. The admin view shows registration number, student name, email, department, year, and semester.

## Features

- Email/password account creation and sign-in.
- Admin sign-in and a protected student directory.
- Student profile with name, department, year, and semester.
- Student details page for editing name, degree/branch, year, and semester; email is shown from the sign-in account.
- Academic year choices are Year 1–4; semester choices remain Semester 1–8.
- Unique registration number for new student accounts.
- Add and remove subjects with credits and grade points.
- Semester GPA and credit-weighted cumulative GPA across saved semesters.
- Save current-semester GPA and SGPA, and cumulative CGPA snapshots in separate Supabase tables; view each result history in its calculator section.

For local development, serve this directory with a static web server and run the Vercel API function locally (for example, `vercel dev`) with `SUPABASE_URL` and `SUPABASE_ANON_KEY` set in the environment.
