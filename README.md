# Academic Calculator

This project includes both a JavaFX desktop calculator and a web version that can be deployed to Vercel and connected to Supabase.

## Web app (Vercel + Supabase)

The web app is in [`web/`](./web/). It adds email/password accounts, student profiles, saved subjects, semester GPA, and cumulative GPA. Setup and deployment instructions are in [`web/README.md`](./web/README.md).

When importing the repository in Vercel, set the project **Root Directory** to `web`. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Vercel environment variables. Run [`web/supabase/schema.sql`](./web/supabase/schema.sql) in the Supabase SQL Editor before using the app.

## JavaFX desktop app

A JavaFX desktop app for calculating GPA, SGPA, and CGPA.

## Requirements

- JDK 25 or newer (Java 25 LTS)
- Maven 3.8 or newer

### Run

From the project directory:

```bash
mvn javafx:run
```

The JavaFX Maven plugin downloads the platform-specific JavaFX runtime as needed.

### Calculation

- **GPA / SGPA:** `sum(credits × grade points) / sum(credits)`
- **CGPA:** `sum(semester credits × semester SGPA) / sum(semester credits)`

Enter grade points using your institution's grading scale. GPA and SGPA are calculated from course rows; CGPA is calculated from semester SGPA and total semester credits.
