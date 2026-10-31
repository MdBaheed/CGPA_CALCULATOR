# Gradebook web app

This folder contains the Vercel-ready web version of the academic calculator. It uses Supabase Auth for email/password sign-in and Supabase Postgres for student profiles and subjects. The existing JavaFX desktop application remains in the repository root.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In Supabase Authentication settings, choose whether email confirmation should be required.
4. In the project settings, copy the project URL and the **publishable/anon key**. Never use a `service_role` or secret key in this app.

The schema enables row-level security. Each signed-in student can access only their own profile and subjects.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `web`.
3. Add these environment variables to the Vercel project:
   - `SUPABASE_URL` — the Supabase project URL.
   - `SUPABASE_ANON_KEY` — the Supabase publishable/anon key.
4. Deploy. The app reads these public client settings from `/api/config`; no service-role key is used.
5. In Supabase Authentication URL settings, add the deployed Vercel URL to the allowed redirect URLs.

## Features

- Email/password account creation and sign-in.
- Student profile with name, department, year, and semester.
- Add and remove subjects with credits and grade points.
- Semester GPA and credit-weighted cumulative GPA across saved semesters.

For local development, serve this directory with a static web server and run the Vercel API function locally (for example, `vercel dev`) with `SUPABASE_URL` and `SUPABASE_ANON_KEY` set in the environment.
