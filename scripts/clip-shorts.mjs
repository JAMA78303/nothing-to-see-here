// Turns long videos and streams into vertical Shorts/TikToks/Reels, picking
// the moments most likely to travel.
//
//   node scripts/clip-shorts.mjs <youtube-url | video-file> [options]
//
// Works on regular videos, past live streams (VODs) and streams that are live
// right now. See --help, or the "Clip a YouTube video into Shorts" section of
// the README.
//
// How it picks: it lines up every signal it can get (the transcript, the live
// chat replay, loudness, and YouTube's "Most replayed" heatmap) and has Claude
// choose self-contained moments with a hook and a payoff. Without
// ANTHROPIC_API_KEY (or with --no-ai) it takes the peaks of those signals.
//
// How it frames: a streamer's facecam in a corner becomes a split screen (cam
// on top, gameplay below); a face filling the frame is followed by a moving
// 9:16 crop that cuts with the shots; anything else is a centre crop.
//
// Needs ffmpeg (with libass) and, for URLs, yt-dlp. Face framing needs Python
// with opencv-python-headless and numpy; whisper is optional, for transcripts.
// Only clip videos you own or have permission to reuse.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { finalise, pickFromSignals, pickWithClaude } from "./clipper/pick.mjs";
import { analyseFraming, chooseLayout, framingAvailable, renderClip } from "./clipper/render.mjs";
import { buildSignals, describeSources, groupLines, interest, loadWords, loudness, parseChat } from "./clipper/signals.mjs";
import { fail, fmtTime, log, need, probeVideo, round, run, sleep, slug, warn } from "./clipper/util.mjs";
import * as yt from "./clipper/youtube.mjs";

const HELP = `Usage: node scripts/clip-shorts.mjs <youtube-url | video-file> [options]

Picking
  -n, --count <n>          clips to make (per window when live; default 5)
      --min <sec>          shortest clip (default 20)
      --max <sec>          longest clip (default 59)
      --no-ai              pick from chat, loudness and replays only, no Claude call
      --no-chat            ignore live chat
      --plan-only          pick clips and write clips.json, don't render

Framing
      --layout <mode>      auto | split | crop | blur (default auto)
                             auto   facecam in a corner -> split, else crop
                             split  facecam on top, gameplay below
                             crop   9:16 crop that follows the main face
                             blur   whole frame over a blurred fill
      --focus <0..1>       fixed horizontal position for the crop and the gameplay
                           panel, 0 left to 1 right (default 0.5; turns off face following)
      --cam-zoom <x>       facecam crop width in face-widths, used only when the cam's
                           border can't be found (default 3.5)

Captions
      --transcript <file>  use this transcript (.json3 from YouTube, or whisper JSON)
      --lang <code>        caption language to fetch (default en)
      --no-transcribe      don't run whisper when there are no captions
      --whisper-model <m>  whisper model (default base)
      --no-captions        don't burn in captions
      --font <name>        caption font (default "Arial")
      --hook-seconds <s>   how long the hook title stays up, 0 to hide (default 3.5)

Streams
      --window <min>       live: clip every this many minutes (default 10)
      --full-download      long VODs: download the whole video instead of just the clips

YouTube sign-in (when YouTube says "confirm you're not a bot")
      --cookies-from-browser <name>  chrome, firefox, edge, safari, brave...
      --cookies <file>               a cookies.txt exported from your browser

      --out <dir>          output folder (default shorts/<video-id>)
  -h, --help`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    count: { type: "string", short: "n", default: "5" },
    min: { type: "string", default: "20" },
    max: { type: "string", default: "59" },
    "no-ai": { type: "boolean", default: false },
    "no-chat": { type: "boolean", default: false },
    "plan-only": { type: "boolean", default: false },
    layout: { type: "string", default: "auto" },
    focus: { type: "string" },
    "cam-zoom": { type: "string", default: "3.5" },
    transcript: { type: "string" },
    lang: { type: "string", default: "en" },
    "no-transcribe": { type: "boolean", default: false },
    "whisper-model": { type: "string", default: "base" },
    "no-captions": { type: "boolean", default: false },
    font: { type: "string", default: "Arial" },
    "hook-seconds": { type: "string", default: "3.5" },
    window: { type: "string", default: "10" },
    "full-download": { type: "boolean", default: false },
    "cookies-from-browser": { type: "string" },
    cookies: { type: "string" },
    out: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opt.help || positionals.length !== 1) {
  console.log(HELP);
  process.exit(opt.help ? 0 : 1);
}

const O = {
  count: Math.max(1, parseInt(opt.count, 10)),
  min: Number(opt.min),
  max: Number(opt.max),
  layout: opt.layout,
  focus: opt.focus == null ? 0.5 : Math.min(1, Math.max(0, Number(opt.focus))),
  followFaces: opt.focus == null,
  camZoom: Number(opt["cam-zoom"]),
  hookSeconds: Number(opt["hook-seconds"]),
  captions: !opt["no-captions"],
  transcribe: !opt["no-transcribe"],
  whisperModel: opt["whisper-model"],
  window: Number(opt.window) * 60,
};
if (!["auto", "split", "crop", "blur"].includes(O.layout)) fail("--layout must be auto, split, crop or blur");
if (!(O.min > 0 && O.max > O.min)) fail("--min and --max must satisfy 0 < min < max");
if (!(O.window >= 60)) fail("--window must be at least 1 minute");

const input = positionals[0];
const useAi = !opt["no-ai"] && Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

need("ffmpeg", "Install ffmpeg (with libass) from your package manager.");
if (O.layout !== "blur" && !opt["plan-only"] && !framingAvailable()) {
  warn("face framing needs Python with OpenCV: pip install opencv-python-headless numpy. Using a centre crop for now.");
}

if (/^https?:\/\//i.test(input)) {
  need("yt-dlp", "Install it with `pip install yt-dlp` or `brew install yt-dlp`.");
  yt.setYtDlpArgs([
    ...(opt["cookies-from-browser"] ? ["--cookies-from-browser", opt["cookies-from-browser"]] : []),
    ...(opt.cookies ? ["--cookies", resolve(opt.cookies)] : []),
  ]);
  const info = yt.probe(input);
  if (info.live_status === "is_live") await runLive(input, info);
  else if (info.live_status === "is_upcoming") fail("This stream hasn't started yet. Run this again once it's live.");
  else await runVod(input, info);
} else {
  await runLocal(input);
}

// ---------------------------------------------------------------------------
// Sources

async function runVod(url, info) {
  const work = resolve(".clipper", info.id);
  mkdirSync(work, { recursive: true });
  const outDir = resolve(opt.out ?? join("shorts", info.id));
  const long = info.duration > 45 * 60 && !opt["full-download"];
  log(`${info.title} (${fmtTime(info.duration)})${long ? ": long video, fetching audio and chat now and only the chosen clips' video later" : ""}`);

  const { captionFile, chatFile } = yt.fetchSidecars(url, info, work, { lang: opt.lang, chat: !opt["no-chat"] });
  const video = long ? null : yt.fetchVideo(url, work);
  const audio = long ? yt.fetchAudio(url, work) : video;
  const words = loadWords({
    file: opt.transcript ? resolve(opt.transcript) : captionFile,
    media: audio, work, transcribe: O.transcribe, whisperModel: O.whisperModel, duration: info.duration,
  });

  let urls = null;
  await processSource({
    info, duration: info.duration, words, audio, work, outDir,
    chat: chatFile && !opt["no-chat"] ? parseChat(chatFile) : [],
    heat: info.heatmap,
    source(clip, name) {
      if (!long) return { file: video, offset: clip.start, cleanup() {} };
      // Cut just this stretch from YouTube; a fresh, frame-accurate file.
      urls ??= yt.mediaUrls(url);
      const file = join(work, `${name}.raw.mp4`);
      const args = ["-y", "-loglevel", "error", "-ss", String(clip.start), "-i", urls[0]];
      if (urls[1]) args.push("-ss", String(clip.start), "-i", urls[1]);
      args.push(
        "-t", String(round(clip.end - clip.start)),
        "-map", "0:v:0", "-map", urls[1] ? "1:a:0" : "0:a:0?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-c:a", "aac", "-b:a", "192k",
        file,
      );
      log(`Fetching ${fmtTime(clip.start)}-${fmtTime(clip.end)} from YouTube...`);
      run("ffmpeg", args);
      return { file, offset: 0, cleanup: () => rmSync(file, { force: true }) };
    },
  });
}

async function runLocal(file) {
  const video = resolve(file);
  if (!existsSync(video)) fail(`No such file: ${file}`);
  const id = basename(video, extname(video)).replace(/[^\w-]+/g, "-");
  const work = resolve(".clipper", id);
  mkdirSync(work, { recursive: true });
  const { duration } = probeVideo(video);
  log(`${basename(video)} (${fmtTime(duration)})`);
  const words = loadWords({
    file: opt.transcript && resolve(opt.transcript),
    media: video, work, transcribe: O.transcribe, whisperModel: O.whisperModel, duration,
  });
  await processSource({
    info: { id, title: basename(video, extname(video)) }, duration, words, chat: [], heat: null,
    audio: video, work, outDir: resolve(opt.out ?? join("shorts", id)),
    source: (clip) => ({ file: video, offset: clip.start, cleanup() {} }),
  });
}

// A stream that's live now: record it in windows, clip each finished window
// while the next one records.
async function runLive(url, info) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const id = `${info.id}-live-${stamp}`;
  const work = resolve(".clipper", id);
  mkdirSync(work, { recursive: true });
  const outDir = resolve(opt.out ?? join("shorts", id));
  log(`LIVE: ${info.title}`);
  log(`Recording in ${O.window / 60}-minute windows and clipping each one as it finishes. Press Ctrl-C to stop; what's been recorded still gets clipped.`);

  const chatFile = join(work, "chat.live_chat.json");
  const chatProc = opt["no-chat"] ? null : yt.followLiveChat(url, work);
  const wallStart = Date.now();
  // Its own process group, so Ctrl-C reaches us and we stop it cleanly.
  const rec = spawn(
    "ffmpeg",
    ["-loglevel", "error", "-i", yt.liveUrl(url), "-c", "copy", "-f", "segment", "-segment_time", String(O.window), "-reset_timestamps", "1", join(work, "window-%04d.ts")],
    { stdio: ["pipe", "ignore", "inherit"], detached: true },
  );
  let ended = false;
  rec.on("exit", () => (ended = true));
  process.on("SIGINT", () => {
    if (ended) process.exit(130);
    log("\nStopping the recording; clipping what's left...");
    rec.stdin.write("q");
    chatProc?.kill();
  });

  const seg = (k) => join(work, `window-${String(k).padStart(4, "0")}.ts`);
  const history = { chat: [], loud: [] }; // what "normal" looks like on this stream so far
  let offset = 0;
  for (let k = 0; ; k++) {
    while (!existsSync(seg(k + 1)) && !ended) await sleep(3000);
    if (!existsSync(seg(k))) break;
    let duration = 0;
    try {
      duration = probeVideo(seg(k)).duration;
    } catch {
      // an empty last window
    }
    if (duration >= O.min) {
      log(`\nWindow ${k + 1}: ${fmtTime(offset)}-${fmtTime(offset + duration)} into the recording`);
      const chat = parseChat(chatFile, { wallStart })
        .filter((m) => m.t >= offset && m.t < offset + duration + 20)
        .map((m) => ({ ...m, t: m.t - offset }));
      const words = loadWords({ media: seg(k), work, transcribe: O.transcribe, whisperModel: O.whisperModel, duration });
      await processSource({
        info, duration, words, chat, heat: null, audio: seg(k), work, outDir,
        live: { window: k + 1, offset, history },
        source: (clip) => ({ file: seg(k), offset: clip.start, cleanup() {} }),
      });
    }
    offset += duration;
    if (ended && !existsSync(seg(k + 1))) break;
  }
  chatProc?.kill();
  log(`\nStream recording finished. Clips are in ${outDir}`);
}

// ---------------------------------------------------------------------------
// Pick and render

async function processSource(ctx) {
  const { info, duration, words, chat, heat, audio, work, outDir, live } = ctx;
  mkdirSync(outDir, { recursive: true });
  const lines = groupLines(words);
  const sig = buildSignals({ duration, chat, heat, loud: loudness(audio) });
  log(`Signals: ${describeSources(sig, words)}`);

  const pctx = { info, duration, lines, sig, count: O.count, min: O.min, max: O.max, live: Boolean(live) };
  let raw;
  if (useAi) {
    log("Asking Claude for the strongest moments...");
    raw = await pickWithClaude(pctx);
  } else {
    if (!sig.chat && !sig.loud && !sig.replay) fail("Nothing to pick with: set ANTHROPIC_API_KEY to let Claude choose.");
    raw = pickFromSignals(pctx, { strict: Boolean(live), baseline: live?.history });
  }
  if (live) {
    const { parts } = interest(sig);
    if (parts.chat) live.history.chat.push(...parts.chat);
    if (parts.loud) live.history.loud.push(...parts.loud);
  }
  const clips = finalise(raw, pctx);
  const prefix = live ? `w${String(live.window).padStart(2, "0")}-` : "";
  for (const c of clips) {
    c.file = `${prefix}${String(c.rank).padStart(2, "0")}-${slug(c.title)}.mp4`;
    if (live) c.recording_start = round(live.offset + c.start);
  }
  saveClips(outDir, info, clips, live);

  if (!clips.length) {
    log("No moments worth clipping here.");
    return;
  }
  log(`Picked ${clips.length} (${useAi ? "Claude" : "signal peaks"}):`);
  for (const c of clips) {
    log(`  #${c.rank}  ${String(c.score).padStart(3)}  ${fmtTime(c.start)}-${fmtTime(c.end)} (${Math.round(c.end - c.start)}s)  ${c.title}${c.signals ? `  [${c.signals}]` : ""}`);
  }
  if (opt["plan-only"]) {
    log(`Plan written to ${join(outDir, "clips.json")}`);
    return;
  }

  for (const c of clips) {
    const name = c.file.replace(/\.mp4$/, "");
    const src = ctx.source(c, name);
    const dims = probeVideo(src.file);
    const dur = c.end - c.start;
    const framing = O.layout === "blur" ? null : analyseFraming(src.file, src.offset, dur, O.focus);
    if (framing && !O.followFaces) framing.track = null;
    c.layout = chooseLayout(O.layout, framing);
    const following = c.layout === "crop" && framing?.track;
    log(`Rendering #${c.rank} (${c.layout}${following ? ", following the face" : ""}) -> ${join(outDir, c.file)}`);
    renderClip(src.file, src.offset, c, words, join(outDir, c.file), {
      layout: c.layout, framing, dims, focus: O.focus, camZoom: O.camZoom,
      font: opt.font, hookSeconds: O.hookSeconds, captions: O.captions, work, name,
    });
    src.cleanup();
  }
  saveClips(outDir, info, clips, live);
  log(`Done: ${clips.length} clip${clips.length === 1 ? "" : "s"} in ${outDir}`);
}

function saveClips(outDir, info, clips, live) {
  const file = join(outDir, "clips.json");
  const doc =
    live && existsSync(file)
      ? JSON.parse(readFileSync(file, "utf8"))
      : { source: input, title: info.title, picked_by: useAi ? "claude" : "signals", clips: [] };
  if (live) doc.clips = [...doc.clips.filter((c) => !clips.some((n) => n.file === c.file)), ...clips];
  else doc.clips = clips;
  writeFileSync(file, JSON.stringify(doc, null, 2));
}
