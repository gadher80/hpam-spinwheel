# HariPrabodham Amrut Mahotsav — Spin Wheel

React + TypeScript + Vite + MUI spin wheel, backed by Supabase so the admin
panel and the audience display stay in sync live across tabs/devices.

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`.
3. Database → Replication → enable Realtime for the `wheel_state` table.
4. Copy `.env.example` to `.env` (already present) and fill in:
   - `VITE_SUPABASE_URL` — Project Settings → API
   - `VITE_SUPABASE_ANON_KEY` — Project Settings → API
   - `VITE_ADMIN_PASSWORD` — password to open `#admin`
5. `npm install`
6. `npm run dev`

## Usage

- Audience display: open the site root — plain wheel only.
- Admin panel: append `#admin` to the URL, enter the password.
- Any change (entries, settings, spin) syncs to every open tab/device via Supabase Realtime.

## Deploy to Vercel

Push to a git repo, import it in Vercel, set the same three env vars in
Project Settings → Environment Variables, and deploy — it's a static Vite
build, no server config needed.
