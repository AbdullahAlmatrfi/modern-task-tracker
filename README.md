# Dayflow

A daily task tracker with a week strip, history, focus timer, and goals with an animated journey line.
React + TypeScript + Vite. Works fully offline in the browser. Add Supabase to get sign-in and sync across devices.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # type-check + production build into dist/
```

Without any setup, everything saves in your browser (localStorage).

## Turn on sign-in and sync (optional)

1. Create a project at https://supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`. It creates the `tasks` and `goals` tables with row-level security.
3. Authentication → URL Configuration: set Site URL to your site (and `http://localhost:5173` for dev).
4. Project Settings → API: copy the Project URL and the `anon` public key.
5. `cp .env.example .env` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
6. Restart `npm run dev`. An account box appears in the sidebar; sign in with an email magic link.

Tasks and goals made before signing in move into your account on first sign-in.

## Deploy (Netlify)

`netlify.toml` is included (build `npm run build`, publish `dist`, SPA redirect).
Add the two `VITE_SUPABASE_*` variables in Netlify → Site settings → Environment variables, then deploy from your Git repo.

## Moving old data in

Account → Import accepts a JSON export from this app, and the older single-file version.

## Structure

```
src/
  lib/         dates, quick-add parsing, lanes, stats, goals (pure functions)
  store/       reducer, localStorage, import/export, Supabase row mapping
  hooks/       auth, sync, clock, toast, prefs
  components/  UI
supabase/schema.sql
```

Quick add: `Grade quiz 16:30 #teach !` → time, lane, and priority are picked out of the text.
Shortcut: `N` or `/` jumps to the add box.
