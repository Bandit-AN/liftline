# Liftline — online coaching app

Coach dashboard (desktop, sidebar) + client app (phone-first, bottom nav) for training plans, nutrition targets, habits, progress tracking, weekly check-ins, private messaging and community groups.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, private Storage) · Recharts.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables the app runs in **demo mode only**: open the home page and pick a demo coach or client. Demo data (2 coaches, 7 clients, 10 weeks of history) lives only in your browser's localStorage, is clearly labelled, and never touches real accounts. Reset it from the account menu.

## Enable real accounts (Supabase)

1. Create a project at supabase.com.
2. SQL editor → run, in order:
   - `supabase/migrations/0001_schema.sql` — tables, row level security, guards, triggers, invite functions
   - `supabase/migrations/0002_storage.sql` — private `progress-photos` bucket + policies
   - `supabase/migrations/0003_realtime.sql` — live chat/notifications
3. `cp .env.example .env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
4. Authentication → URL Configuration: set the Site URL and add `<site>/invite/*`, `<site>/coach`, `<site>/reset-password` as redirect URLs.
5. Restart `npm run dev`.

Coaches sign up at `/signup`. Clients join only through an invite link (`/invite/<token>`) and must use the invited email address.

## Publish on GitHub Pages

Pushing to `main` runs `.github/workflows/pages.yml`, which builds the site (`scripts/build-site.mjs`) and publishes it to `https://<user>.github.io/liftline/`.

One-time setup in the repo:
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → Variables:** add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the project URL and publishable key — these are public by design; the AI key never goes here).
3. In Supabase → Authentication → URL Configuration, set the Site URL to your Pages address.

## How permissions work

All access control is in the database (RLS), not the UI:

- Coaches read/write only clients where `coach_id = auth.uid()` and everything attached to them.
- Clients read only their own record, plans, logs, check-ins and thread; they write only their own logs.
- Coach notes are invisible to clients. Check-in answers can't be edited by coaches; feedback can't be written by clients. Messages can't be edited. Users can't change their own role.
- Progress photos are stored under `<client_id>/…` in a private bucket and served via 1-hour signed URLs to the client and their coach only.
- Notifications are created by database triggers.

Demo mode enforces the same rules in `src/lib/demo-repo.ts`.

```bash
npm run test:rls     # runs the real migrations in an embedded Postgres and checks 56 permission cases
```

## Project layout

```
src/app/coach/*        coach dashboard (overview, clients, check-ins, messages, workouts, nutrition, community, settings)
src/app/app/*          client app (today, train, food, progress, check-in, messages, community, profile)
src/app/invite/[token] client onboarding
src/lib/repo.ts        backend interface; supabase-repo.ts / demo-repo.ts implement it
src/lib/demo-seed.ts   sample data
supabase/migrations    schema + policies
```

## Food photo scanning

Clients tap **Scan food** in the food diary, take or upload a photo, and get an AI estimate per food (calories, protein, carbs, fat, fiber, sugar, sodium) plus the meal total. The AI asks follow-up questions when oils, sauces, hidden ingredients or portions are unclear. Clients edit names, grams and nutrients before saving; saved foods are marked "Est." for both client and coach.

- Server: `supabase/functions/analyze-food` (Supabase Edge Function). The photo goes browser → your Supabase function → Anthropic's Claude API. The API key is only stored as a Supabase secret. Photos are not stored.
- Required secret: `ANTHROPIC_API_KEY` (Supabase dashboard → Edge Functions → Secrets). Optional: `FOOD_VISION_MODEL` (default `claude-sonnet-5-5`), `FOOD_SCANS_PER_DAY` (default 40 per client).
- Without the key, the app shows "Food scanning isn't switched on yet" and offers manual entry. Demo mode never scans.

## Exercise demonstrations

Every built-in exercise (51) has a start/finish photo animation, step-by-step instructions, a breathing cue and common mistakes (`src/lib/exercise-library.ts`, photos in `public/exercises/`). Photos come from Free Exercise DB (public domain); the coaching text was written for this app. Coaches add their own exercises with a video (MP4/MOV/WebM, up to 50 MB) or image/GIF under **Exercises**; files are stored in the private `exercise-media` bucket and are visible only to that coach and their clients. The workout builder links each exercise to its exact demo and equipment, and flags exercises that don't have one yet.

## Not included yet

Shown in the UI as "Not available yet": automatic invite/reminder emails (coaches copy the link or open an email draft), push notifications, Apple Health / Google Fit sync, barcode food scanning, voice/video messages.
