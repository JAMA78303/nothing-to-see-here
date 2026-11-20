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

`scripts/clip-shorts.mjs` cuts long videos and streams into vertical 1080x1920 clips with burned-in, word-by-word captions, choosing the moments most likely to do well. It handles regular videos, past streams (VODs) and streams that are live right now.

```bash
export ANTHROPIC_API_KEY=...        # lets Claude pick the moments
npm run clip -- "https://www.youtube.com/watch?v=..." -n 5
```

Needs `ffmpeg` and `yt-dlp` (`pip install yt-dlp` or `brew install yt-dlp`). Face framing needs `pip install opencv-python-headless numpy`; it downloads a 230 KB face model on first use. For videos without captions, `pip install openai-whisper` adds transcripts. Clips land in `shorts/<video-id>/` with a `clips.json` listing each clip's score, title, on-screen hook, the signals behind it and the reason it was picked.

**How it picks.** It lines up every signal it can get: the transcript, the **live chat replay** (bursts of messages, and hype like LOL, CLIP IT, 💀, ???), **loudness** (shouting, screams, explosions) and YouTube's **Most replayed** graph. Claude reads all of it and picks self-contained moments that open on a hook and end on a payoff, scoring each 0-100. For gaming that means clutch plays, fails, rage and reactions, even when nobody says much. Without an API key, or with `--no-ai`, it takes the peaks of those signals instead.

**How it frames** (`--layout auto`):

- **Facecam in a corner** (typical gaming stream): split screen, webcam on top and gameplay below. It finds the webcam overlay's actual rectangle (the still region around the face, since gameplay never stops moving) and keeps the gameplay crop clear of it.
- **A face filling the frame** (Just Chatting, podcasts, vlogs): a 9:16 crop that follows the speaker. It holds still when they barely move, pans smoothly when they do, and cuts with the video's own shot changes.
- **No face:** a centre crop of the action. Use `--focus` to aim it, or `--layout blur` to fit the whole frame over a blurred fill.

**Streams.**

- **Past streams:** long VODs (over 45 minutes) don't get downloaded whole. It fetches the audio and chat, picks the clips, then pulls only those stretches of video.
- **Live right now:** point it at a live URL and it records in windows (`--window 10` minutes by default), clipping each finished window while the next one records. Press Ctrl-C to stop; what's been recorded still gets clipped. `-n` is per window, and quiet windows produce nothing. Live streams don't have captions until YouTube processes the VOD, so live clips get captions only with whisper installed. Signals there are live chat and loudness.

| Option | Default | |
| --- | --- | --- |
| `-n, --count` | 5 | clips to make (per window when live) |
| `--min`, `--max` | 20, 59 | clip length in seconds |
| `--layout` | auto | `auto`, `split`, `crop` or `blur` |
| `--focus` | | fixed horizontal crop position, 0 left to 1 right (turns off face following) |
| `--window` | 10 | live: minutes per recording window |
| `--transcript` | | a YouTube `.json3` or whisper JSON file, for local videos |
| `--hook-seconds` | 3.5 | how long the hook title stays up, 0 to hide it |
| `--plan-only` | | pick clips and write `clips.json` without rendering |
| `--no-ai`, `--no-chat`, `--no-captions`, `--no-transcribe`, `--full-download`, `--cam-zoom`, `--whisper-model`, `--font`, `--lang`, `--out` | | see `--help` |

If YouTube says "Sign in to confirm you're not a bot", add `--cookies-from-browser chrome` (or `firefox`, `edge`, `safari`, `brave`) while you're signed in to YouTube in that browser. YouTube always does this to cloud servers, and sometimes to home connections.

Local files work too: `npm run clip -- stream.mp4`. Downloads and working files are cached in `.clipper/`. Only clip videos you own or have permission to reuse.

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
| `scripts/clip-shorts.mjs`, `scripts/clipper/` | Clips videos and streams into Shorts |
