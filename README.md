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

## Clip a YouTube video into Shorts

`scripts/clip-shorts.mjs` cuts a long video into vertical 1080x1920 clips with burned-in, word-by-word captions, choosing the moments most likely to do well.

```bash
export ANTHROPIC_API_KEY=...        # lets Claude pick the moments
npm run clip -- "https://www.youtube.com/watch?v=..." -n 5
```

Needs `ffmpeg` and `yt-dlp` (`pip install yt-dlp` or `brew install yt-dlp`). Clips land in `shorts/<video-id>/` with a `clips.json` listing each clip's score, title, on-screen hook and the reason it was picked.

How it picks: it reads the captions with word timings plus YouTube's **Most replayed** heatmap (when the video has one), and Claude chooses self-contained moments that open on a hook and end on a payoff, scoring each 0-100. Without an API key, or with `--no-ai`, it takes the most-replayed peaks instead.

| Option | Default | |
| --- | --- | --- |
| `-n, --count` | 5 | clips to make |
| `--min`, `--max` | 20, 59 | clip length in seconds |
| `--layout` | crop | `crop` fills the frame; `blur` fits the whole frame over a blurred fill (better for slides, screen shares, two-person shots) |
| `--focus` | 0.5 | horizontal crop position, 0 left to 1 right, for off-center speakers |
| `--transcript` | | a YouTube `.json3` or whisper JSON file, for local videos |
| `--hook-seconds` | 3.5 | how long the hook title stays up, 0 to hide it |
| `--plan-only` | | pick clips and write `clips.json` without rendering |
| `--no-captions`, `--no-ai`, `--font`, `--lang`, `--out` | | |

Local files work too: `npm run clip -- talk.mp4 --transcript talk.json`, or install `openai-whisper` and it transcribes for you. Downloads are cached in `.clipper/`. Only clip videos you own or have permission to reuse.

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
| `scripts/record-tiktok.mjs` | Records Gerald as a vertical video |
| `scripts/clip-shorts.mjs` | Clips a YouTube video into Shorts |
