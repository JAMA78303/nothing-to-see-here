# Nothing To See Here

A suspicious man under a streetlamp. Most of the time, nothing happens.

- **Visits drive everything.** The world counter counts site visits. A rare moment rolls on arrival and every 30 seconds you stay: small oddities about 1 in 500, bigger moments about 1 in 5,000. Every 50,000th visit to the site gets a legendary moment.
- **Poking Gerald just makes a noise.** His belt is a secret.
- **Every minute or two he sends you a link.** Half the time it's a rick roll.

Next.js 16, TypeScript, Tailwind, Redis (Upstash). Hosted on Vercel; nothing else to sign up for.

## Run it locally

```bash
npm install
npm run dev
```

With no Redis configured it uses an in-memory store with test settings: boosted odds, a milestone of 20 visits and a 20 second visit window. The pill at the top says **Local test mode**. Set `NEXT_PUBLIC_DEV_TOOLS=1` in `.env.local` to preview every moment from the Sightings screen.

## Go live on Vercel

1. Push this repo to GitHub and **import it in Vercel**.
2. In the Vercel project, open **Storage → Create Database → Upstash for Redis** (free tier is fine to start) and connect it to the project. This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
3. Add `NEXT_PUBLIC_SITE_URL` (your domain) under **Settings → Environment Variables**.
4. **Redeploy.** Open the site: the pill should say **Live** and the counter should read 1.

### Testing on the live site

Set these environment variables in Vercel and redeploy to see things happen quickly:

```
MILESTONE=20
ODDS_BOOST=100
VISIT_COOLDOWN_SECONDS=20
```

Remove them before launch, and clear the test data from the Upstash console (Data Browser → flush the database).

## How it works

- Each browser gets a random id in an httpOnly cookie. No accounts, no personal data.
- `POST /api/visit` counts one visit per visitor per 30 minutes (and at most 60 new visits per IP per hour). Redis `INCR` is atomic, so exactly one visitor gets each number and whoever lands a milestone gets the legendary moment.
- `POST /api/roll` decides rare moments on the server, at most once per 25 seconds per visitor.
- `POST /api/sighting` only accepts links and secrets, which the browser legitimately decides.
- `GET /api/world` is polled every 5 seconds by open pages for the live counter.

Redis keys: `world:visits`, `moment_counts` (hash), `visitor:<id>` (hash), `seen:<id>` (set), plus short-lived `lock:*` and `ip:*` keys.

## Before you scale

- **Bot protection.** Clearing cookies gives a new visitor id; the per-IP cap is the only brake. Add [Vercel BotID](https://vercel.com/docs/botid) or Cloudflare Turnstile on `/api/visit` before promoting it.
- **Polling cost.** Each open page calls `/api/world` every 5 seconds. Fine for thousands of people online; past that, cache the response for a second or two at the edge.
- **Lost collections.** A visitor who clears cookies or switches device starts their collection again.
- **Share clips** aren't built. Sharing is text and a link (Web Share on phones, copy on desktop).
- **Rick roll audio** is an original tune; the real song needs a licence.

## Where things are

| Path | What |
| --- | --- |
| `src/game/engine.ts` | Gerald: animations, moments, sounds, timers |
| `src/game/markup.ts` | The SVG stage and overlays |
| `src/game/game.css` | All game styles |
| `src/game/backend.ts` | The browser's API client |
| `src/game/moments.ts` | Tiers, odds and moment ids |
| `src/server/game.ts` | Game rules: visits, rolls, sightings |
| `src/server/store.ts` | Redis, with an in-memory fallback for local dev |
| `src/app/api/*` | The API routes |
