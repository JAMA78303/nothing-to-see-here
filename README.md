# Nothing To See Here

A suspicious man under a streetlamp. Most of the time, nothing happens.

- **Visits drive everything.** The world counter counts site visits. A rare moment rolls on arrival and every 30 seconds you stay: small oddities about 1 in 500, bigger moments about 1 in 5,000. Every 50,000th visit to the site gets a legendary moment.
- **Poking Gerald just makes a noise.** His belt is a secret.
- **Every minute or two he sends you a link.** Half the time it's a rick roll.

Next.js 16, TypeScript, Tailwind, Supabase (anonymous auth, Postgres functions, Realtime).

## Run it locally

```bash
npm install
npm run dev
```

With no Supabase keys it runs in **local test mode**: boosted odds, a milestone of 20 visits and a 20 second visit window, all stored in your browser. Set `NEXT_PUBLIC_DEV_TOOLS=1` in `.env.local` to preview every moment from the Sightings screen.

## Go live

1. **Create a Supabase project** (London region, `eu-west-2`, if most players are in the UK).
2. **Run the migration.** Paste `supabase/migrations/20261011000000_init.sql` into the SQL editor and run it, or use the CLI: `supabase link` then `supabase db push`.
3. **Turn on anonymous sign-ins:** Authentication → Sign In / Providers → Allow anonymous sign-ins.
4. **Deploy to Vercel.** Import the repo and set these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Settings → API keys)
   - `NEXT_PUBLIC_SITE_URL` (for example `https://nothingtoseehere.lol`)
5. Open the site. The pill at the top should say **Live** and the counter should read 1.

### Testing on the live database

Tuning lives in one row of the `settings` table. To see things happen quickly:

```sql
update public.settings set milestone = 20, odds_boost = 100, visit_cooldown = '20 seconds';
```

Put it back before launch, and reset the counter:

```sql
update public.settings set milestone = 50000, odds_boost = 1, visit_cooldown = '30 minutes';
truncate public.sightings, public.visitors;
update public.world set visits = 0;
update public.moment_counts set witnesses = 0;
```

## How it's protected

- Tables are read-only to the browser (RLS select policies only). All writes go through `record_visit()`, `roll_moment()` and `record_sighting()`.
- `record_visit()` counts one visit per visitor per 30 minutes. The world row lock makes the increment atomic, so exactly one person lands each milestone.
- `roll_moment()` decides rare moments on the server, at most once per 25 seconds per visitor.
- `record_sighting()` only accepts links and secrets, which the browser legitimately decides.

## Before you scale

- **Bot protection.** Anonymous sign-ups are only rate-limited per IP. Add Cloudflare Turnstile: pass its token to `signInAnonymously({ options: { captchaToken } })` in `src/game/backend.ts`, then turn on CAPTCHA in Supabase (Authentication → Attack Protection). Turning it on first will break sign-in.
- **Realtime fan-out.** Every visit broadcasts the new count to every open page. Past a few thousand people online at once, switch to a throttled Broadcast (for example a `pg_cron` job that sends the count once a second).
- **Hot row.** All visits update one `world` row. That handles hundreds of visits a second. If it goes viral, shard the counter into N rows and sum them.
- **Share clips** aren't built. Sharing is text and a link (Web Share on phones, copy on desktop).
- **Rick roll audio** is an original tune; the real song needs a licence.

## Where things are

| Path | What |
| --- | --- |
| `src/game/engine.ts` | Gerald: animations, moments, sounds, timers |
| `src/game/markup.ts` | The SVG stage and overlays |
| `src/game/game.css` | All game styles |
| `src/game/backend.ts` | Supabase backend and the local test-mode backend |
| `src/game/moments.ts` | Tiers and odds (moment ids must match the migration) |
| `supabase/migrations/` | Schema, RLS and Postgres functions |
