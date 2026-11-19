// Turns a long YouTube video into vertical Shorts/TikToks/Reels, picking the
// moments most likely to travel.
//
//   node scripts/clip-shorts.mjs <youtube-url | video-file> [options]
//
// How it picks:
//   1. Transcript with word timings: YouTube captions (yt-dlp), a transcript you
//      pass with --transcript, or the `whisper` CLI if it's installed.
//   2. YouTube's "Most replayed" heatmap, when the video has one: real viewer
//      behaviour, the strongest signal there is.
//   3. Claude reads the transcript with the replay data alongside and picks
//      self-contained moments with a hook in the first seconds and a payoff at
//      the end, scores them and writes a title and on-screen hook for each.
//      Without ANTHROPIC_API_KEY (or with --no-ai) it falls back to the
//      heatmap peaks alone.
//
// How it renders: 1080x1920, center crop (or --layout blur for a fitted frame
// over a blurred fill), word-by-word burned-in captions with the spoken word
// highlighted, the hook as a title card for the first seconds, loudness
// normalised for phones. Output goes to shorts/<video-id>/ with a clips.json
// that lists each clip's score and reasoning.
//
// Needs ffmpeg (with libass) and, for URLs, yt-dlp on the PATH.
// Only clip videos you own or have permission to reuse.

import Anthropic from "@anthropic-ai/sdk";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const HELP = `Usage: node scripts/clip-shorts.mjs <youtube-url | video-file> [options]

  -n, --count <n>        clips to make (default 5)
      --min <sec>        shortest clip (default 20)
      --max <sec>        longest clip (default 59)
      --layout <mode>    crop | blur (default crop)
      --focus <0..1>     horizontal crop position, 0 left, 0.5 center, 1 right (default 0.5)
      --transcript <f>   use this transcript (.json3 from YouTube, or whisper JSON)
      --lang <code>      caption language to fetch (default en)
      --font <name>      caption font (default "Arial")
      --hook-seconds <s> how long the hook title stays up, 0 to hide (default 3.5)
      --no-captions      don't burn in captions
      --no-ai            pick from the replay heatmap only, no Claude call
      --plan-only        pick clips and write clips.json, don't render
      --out <dir>        output folder (default shorts/<video-id>)
  -h, --help`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    count: { type: "string", short: "n", default: "5" },
    min: { type: "string", default: "20" },
    max: { type: "string", default: "59" },
    layout: { type: "string", default: "crop" },
    focus: { type: "string", default: "0.5" },
    transcript: { type: "string" },
    lang: { type: "string", default: "en" },
    font: { type: "string", default: "Arial" },
    "hook-seconds": { type: "string", default: "3.5" },
    "no-captions": { type: "boolean", default: false },
    "no-ai": { type: "boolean", default: false },
    "plan-only": { type: "boolean", default: false },
    out: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opt.help || positionals.length !== 1) {
  console.log(HELP);
  process.exit(opt.help ? 0 : 1);
}

const COUNT = Math.max(1, parseInt(opt.count, 10));
const MIN = Number(opt.min);
const MAX = Number(opt.max);
const FOCUS = Math.min(1, Math.max(0, Number(opt.focus)));
const HOOK_SECONDS = Number(opt["hook-seconds"]);
if (!["crop", "blur"].includes(opt.layout)) fail(`--layout must be crop or blur`);
if (!(MIN > 0 && MAX > MIN)) fail(`--min and --max must satisfy 0 < min < max`);

const input = positionals[0];
const isUrl = /^https?:\/\//i.test(input);

// ---------------------------------------------------------------------------
// 1. Source video, metadata and captions

const { work, video, info, captionFile } = isUrl ? fetchYouTube(input) : fromLocalFile(input);
const outDir = resolve(opt.out ?? join("shorts", info.id));
mkdirSync(outDir, { recursive: true });
const duration = info.duration ?? probeDuration(video);

log(`Video: ${info.title ?? basename(video)} (${fmtTime(duration)})`);

function fetchYouTube(url) {
  need("yt-dlp", "Install it with `pip install yt-dlp` or `brew install yt-dlp`.");
  const id = execFileSync("yt-dlp", ["--no-warnings", "--print", "id", url], { encoding: "utf8" }).trim();
  const work = resolve(".clipper", id);
  mkdirSync(work, { recursive: true });
  const video = join(work, "source.mp4");
  if (!existsSync(video) || !existsSync(join(work, "source.info.json"))) {
    log("Downloading video, captions and replay data...");
    run("yt-dlp", [
      "--no-warnings", "--no-playlist",
      "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b",
      "--merge-output-format", "mp4",
      "--write-info-json",
      "--write-subs", "--write-auto-subs",
      "--sub-langs", `${opt.lang}.*,${opt.lang}`,
      "--sub-format", "json3",
      "-o", join(work, "source.%(ext)s"),
      url,
    ]);
  }
  const info = JSON.parse(readFileSync(join(work, "source.info.json"), "utf8"));
  // Prefer creator-uploaded captions over auto-generated ones: better text, same timing format.
  const subs = readdirSync(work).filter((f) => f.endsWith(".json3"));
  const manual = info.subtitles ? Object.keys(info.subtitles) : [];
  const pick = subs.find((f) => manual.some((l) => f.includes(`.${l}.`))) ?? subs[0];
  return { work, video, info, captionFile: pick && join(work, pick) };
}

function fromLocalFile(file) {
  const video = resolve(file);
  if (!existsSync(video)) fail(`No such file: ${file}`);
  const id = basename(video, extname(video)).replace(/[^\w-]+/g, "-");
  const work = resolve(".clipper", id);
  mkdirSync(work, { recursive: true });
  return { work, video, info: { id, title: basename(video) }, captionFile: null };
}

// ---------------------------------------------------------------------------
// 2. Transcript with word timings

const words = loadWords();
if (!words.length) fail("The transcript is empty.");
const lines = groupLines(words);
const heat = info.heatmap ?? null;
log(`Transcript: ${words.length} words in ${lines.length} lines${heat ? ", replay heatmap found" : ", no replay heatmap"}`);

function loadWords() {
  const file = opt.transcript ? resolve(opt.transcript) : captionFile;
  if (file) return parseTranscript(JSON.parse(readFileSync(file, "utf8")));

  const whisperOut = join(work, "whisper", "audio.json");
  if (!existsSync(whisperOut)) {
    if (!has("whisper")) {
      fail("No captions found. Pass --transcript <file>, or install whisper (`pip install openai-whisper`) to transcribe locally.");
    }
    log("No captions, transcribing with whisper (this can take a while)...");
    mkdirSync(join(work, "whisper"), { recursive: true });
    const audio = join(work, "whisper", "audio.wav");
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", audio]);
    run("whisper", [audio, "--model", "small", "--word_timestamps", "True", "--output_format", "json", "--output_dir", join(work, "whisper")]);
  }
  return parseTranscript(JSON.parse(readFileSync(whisperOut, "utf8")));
}

// Returns [{ text, start, end }] in seconds, from YouTube json3 or whisper JSON.
function parseTranscript(data) {
  const out = [];
  if (Array.isArray(data.segments)) {
    for (const seg of data.segments) {
      if (seg.words?.length) {
        for (const w of seg.words) pushWord(out, w.word, w.start, w.end);
      } else {
        spread(out, seg.text, seg.start, seg.end);
      }
    }
    return out;
  }
  if (Array.isArray(data.events)) {
    for (const ev of data.events) {
      const segs = (ev.segs ?? []).filter((s) => s.utf8 && s.utf8.trim());
      if (!segs.length) continue;
      const start = ev.tStartMs / 1000;
      const end = (ev.tStartMs + (ev.dDurationMs ?? 0)) / 1000;
      if (segs.length > 1 || segs[0].tOffsetMs != null) {
        // Auto captions: one seg per word, each with its own offset.
        segs.forEach((s, i) => {
          const ws = start + (s.tOffsetMs ?? 0) / 1000;
          const next = segs[i + 1];
          const we = next ? start + (next.tOffsetMs ?? 0) / 1000 : end;
          pushWord(out, s.utf8, ws, we);
        });
      } else {
        spread(out, segs[0].utf8, start, end);
      }
    }
    // Auto captions overlap their neighbours; keep times monotonic and ends sane.
    out.sort((a, b) => a.start - b.start);
    for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, out[i + 1].start) || out[i + 1].start;
    return out;
  }
  fail("Unrecognised transcript format: expected YouTube json3 or whisper JSON.");
}

function pushWord(out, text, start, end) {
  for (const t of String(text).replace(/\n/g, " ").split(/\s+/)) {
    if (t) out.push({ text: t, start, end: Math.max(end, start + 0.05) });
  }
}

// Phrase-level captions: share the phrase's time across its words by length.
function spread(out, text, start, end) {
  const ws = String(text).replace(/\n/g, " ").split(/\s+/).filter(Boolean);
  const total = ws.reduce((n, w) => n + w.length + 1, 0);
  let t = start;
  for (const w of ws) {
    const d = ((end - start) * (w.length + 1)) / total;
    out.push({ text: w, start: t, end: t + d });
    t += d;
  }
}

// Sentence-ish lines: break on end punctuation, pauses, or length.
function groupLines(ws) {
  const out = [];
  let cur = [];
  ws.forEach((w, i) => {
    cur.push(w);
    const next = ws[i + 1];
    const pause = next ? next.start - w.end : Infinity;
    if (/[.!?]["')\]]?$/.test(w.text) || pause > 0.7 || cur.length >= 18 || !next) {
      out.push({ start: cur[0].start, end: w.end, text: cur.map((x) => x.text).join(" ") });
      cur = [];
    }
  });
  return out;
}

function replayAt(start, end) {
  if (!heat) return null;
  const hits = heat.filter((h) => h.end_time > start && h.start_time < end);
  if (!hits.length) return null;
  return hits.reduce((n, h) => n + h.value, 0) / hits.length;
}

// ---------------------------------------------------------------------------
// 3. Pick the moments

const useAi = !opt["no-ai"] && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
if (!useAi && !heat) {
  fail("Nothing to choose with: set ANTHROPIC_API_KEY to let Claude pick, or use a video that has YouTube's replay heatmap.");
}
const raw = useAi ? await pickWithClaude() : pickFromHeatmap();
const clips = finalise(raw);
if (!clips.length) fail("No clips survived the length limits. Try a wider --min/--max.");

writeFileSync(
  join(outDir, "clips.json"),
  JSON.stringify({ source: input, title: info.title, picked_by: useAi ? "claude" : "heatmap", clips }, null, 2),
);
log(`\nPicked ${clips.length} clips (${useAi ? "Claude" : "replay heatmap"}):`);
for (const c of clips) {
  log(`  #${c.rank}  ${String(c.score).padStart(3)}  ${fmtTime(c.start)}-${fmtTime(c.end)} (${Math.round(c.end - c.start)}s)  ${c.title}`);
}

async function pickWithClaude() {
  log("Asking Claude for the strongest moments...");
  const transcript = lines
    .map((l) => {
      const r = replayAt(l.start, l.end);
      return `[${l.start.toFixed(1)}-${l.end.toFixed(1)}]${r != null ? ` (replay ${r.toFixed(2)})` : ""} ${l.text}`;
    })
    .join("\n");

  const context = [
    `Title: ${info.title ?? "unknown"}`,
    info.uploader && `Channel: ${info.uploader}`,
    `Duration: ${Math.round(duration)}s`,
    info.description && `Description: ${info.description.slice(0, 1200)}`,
    info.chapters?.length && `Chapters:\n${info.chapters.map((c) => `  ${c.start_time}s ${c.title}`).join("\n")}`,
    heat && `Replay heatmap: "replay" is YouTube's most-replayed score for that stretch, 0 to 1 (1 = the most rewatched part of the video). Treat high values as strong evidence viewers found it compelling.`,
  ].filter(Boolean).join("\n");

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "high",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["clips"],
          properties: {
            clips: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["start", "end", "title", "hook", "why", "score"],
                properties: {
                  start: { type: "number", description: "Seconds; the start of a transcript line" },
                  end: { type: "number", description: "Seconds; the end of a transcript line" },
                  title: { type: "string", description: "Post title/caption for the Short, under 70 characters" },
                  hook: { type: "string", description: "On-screen hook text for the first seconds, 2-7 words" },
                  why: { type: "string", description: "One sentence: why this moment will hold and spread" },
                  score: { type: "integer", description: "Viral potential, 0-100" },
                },
              },
            },
          },
        },
      },
    },
    system: `You are a short-form video editor who has cut thousands of YouTube Shorts, TikToks and Reels that went viral. You pick moments from long videos that work on their own for a viewer scrolling with no context.

What makes a moment travel:
- A hook in the first 1-2 seconds: a bold claim, a surprising number, a question, conflict, emotion, or the middle of something happening. Never start on filler ("so", "um", "anyway", greetings, sponsor reads).
- Self-contained: understandable without the rest of the video. No dangling "as I said earlier", no unexplained "he" or "this".
- A payoff: it ends on the punchline, reveal, answer or strongest line, not mid-thought and not after the energy drops.
- High emotion or high information density: funny, controversial, counter-intuitive, vulnerable, or genuinely useful.
- Replayable or shareable: people send it to a friend, argue in the comments, or watch it twice.

Rules:
- Each clip is ${MIN}-${MAX} seconds long. Shorter is better when the moment is complete.
- start must be the start time of a transcript line, end must be the end time of a transcript line.
- Clips must not overlap.
- Score honestly: 90+ only for moments you'd bet on, and skip anything below 50 rather than padding the list.
- Rank best first.`,
    messages: [
      {
        role: "user",
        content: `${context}\n\nTranscript, one line per row as [start-end] in seconds:\n${transcript}\n\nPick up to ${COUNT} clips.`,
      },
    ],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") fail(`Claude declined this video${msg.stop_details?.explanation ? `: ${msg.stop_details.explanation}` : "."}`);
  if (msg.stop_reason === "max_tokens") fail("Claude's answer was cut off. Try fewer clips.");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text).clips;
}

// Without Claude: take the most-replayed peaks and grow a window around each.
function pickFromHeatmap() {
  const target = Math.min(MAX, Math.max(MIN, 35));
  const peaks = [...heat].sort((a, b) => b.value - a.value);
  const chosen = [];
  for (const p of peaks) {
    if (chosen.length >= COUNT) break;
    const mid = (p.start_time + p.end_time) / 2;
    if (mid < 5) continue; // the intro is always "replayed" by people scrubbing
    const start = Math.max(0, mid - target * 0.4);
    const end = Math.min(duration, start + target);
    if (chosen.some((c) => start < c.end && end > c.start)) continue;
    chosen.push({
      start, end,
      title: info.title ?? "Clip",
      hook: "",
      why: `Most-replayed stretch (replay ${p.value.toFixed(2)})`,
      score: Math.round(p.value * 100),
    });
  }
  return chosen;
}

// Snap to line boundaries, enforce lengths, drop overlaps, rank.
function finalise(list) {
  const out = [];
  for (const c of [...list].sort((a, b) => b.score - a.score)) {
    const first = lines.findIndex((l) => l.end > c.start + 0.2);
    if (first < 0) continue;
    let last = first;
    while (last + 1 < lines.length && lines[last + 1].end <= c.end + 0.5) last++;
    // Too long: drop lines from the end. Too short: add lines until it isn't.
    while (last > first && lines[last].end - lines[first].start > MAX) last--;
    while (last + 1 < lines.length && lines[last].end - lines[first].start < MIN && lines[last + 1].end - lines[first].start <= MAX) last++;
    const start = Math.max(0, lines[first].start - 0.15);
    const end = Math.min(duration, lines[last].end + 0.35);
    if (end - start < MIN * 0.75 || end - start > MAX + 1) continue;
    if (out.some((o) => start < o.end && end > o.start)) continue;
    const r = replayAt(start, end);
    out.push({
      rank: 0,
      score: Math.max(0, Math.min(100, Math.round(c.score))),
      start: round(start),
      end: round(end),
      title: c.title,
      hook: c.hook,
      why: c.why,
      ...(r != null && { avg_replay: round(r) }),
      text: lines.slice(first, last + 1).map((l) => l.text).join(" "),
    });
    if (out.length >= COUNT) break;
  }
  out.forEach((c, i) => (c.rank = i + 1));
  return out;
}

// ---------------------------------------------------------------------------
// 4. Render

if (opt["plan-only"]) {
  log(`\nPlan written to ${join(outDir, "clips.json")}`);
  process.exit(0);
}
need("ffmpeg", "Install ffmpeg (with libass) from your package manager.");

for (const c of clips) {
  const name = `${String(c.rank).padStart(2, "0")}-${slug(c.title)}`;
  const file = join(outDir, `${name}.mp4`);
  const ass = join(work, `${name}.ass`);
  writeFileSync(ass, buildAss(c));
  log(`Rendering #${c.rank} -> ${file}`);

  const frame =
    opt.layout === "blur"
      ? `split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:3,eq=brightness=-0.08[bg];` +
        `[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`
      : `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-ow)*${FOCUS}:(ih-oh)/2`;
  // Run from the work dir so the ass filter gets a plain relative path (no escaping trouble).
  run(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-stats",
      "-ss", String(c.start), "-i", video, "-t", String(round(c.end - c.start)),
      "-vf", `${frame},setsar=1,ass=${basename(ass)}`,
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
      "-movflags", "+faststart",
      file,
    ],
    work,
  );
}
log(`\nDone. ${clips.length} clips in ${outDir}`);

// Captions: 1-3 word chunks, the word being spoken in yellow, plus the hook card.
function buildAss(c) {
  const t0 = c.start;
  const dur = c.end - c.start;
  const events = [];

  if (HOOK_SECONDS > 0 && c.hook) {
    events.push(`Dialogue: 1,${assTime(0)},${assTime(Math.min(HOOK_SECONDS, dur))},Hook,,0,0,0,,{\\fad(120,200)}${assText(c.hook)}`);
  }

  if (!opt["no-captions"]) {
    const ws = words.filter((w) => w.start >= c.start - 0.05 && w.start < c.end);
    const chunks = [];
    let cur = [];
    ws.forEach((w, i) => {
      cur.push(w);
      const next = ws[i + 1];
      const breakHere = !next || cur.length >= 3 || /[.,!?;:]$/.test(w.text) || next.start - w.end > 0.5;
      if (breakHere) {
        chunks.push(cur);
        cur = [];
      }
    });
    chunks.forEach((chunk, k) => {
      // Hold the chunk through short pauses so captions don't blink off and on.
      const lastEnd = chunk[chunk.length - 1].end;
      const nextStart = chunks[k + 1]?.[0].start ?? Infinity;
      const chunkEnd = nextStart - lastEnd < 1 ? nextStart : lastEnd + 0.3;
      chunk.forEach((w, i) => {
        const s = Math.max(0, w.start - t0);
        const e = Math.min(dur, (i + 1 < chunk.length ? chunk[i + 1].start : chunkEnd) - t0);
        if (e <= s) return;
        const text = chunk
          .map((x, j) => (j === i ? `{\\c&H00E6FF&}${assText(x.text)}{\\c&HFFFFFF&}` : assText(x.text)))
          .join(" ");
        events.push(`Dialogue: 0,${assTime(s)},${assTime(e)},Caption,,0,0,0,,${text}`);
      });
    });
  }

  const font = opt.font.replace(/,/g, " ");
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${font},88,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,80,80,560,1
Style: Hook,${font},76,&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,18,0,8,90,90,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}

// ---------------------------------------------------------------------------
// helpers

function assText(s) {
  return String(s).replace(/[{}]/g, "").replace(/\\/g, "").toUpperCase();
}
function assTime(t) {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}
function fmtTime(t) {
  const s = Math.round(t);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`;
}
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "clip";
}
function round(n) {
  return Math.round(n * 100) / 100;
}
function probeDuration(file) {
  return Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }),
  );
}
function has(cmd) {
  return spawnSync(cmd, ["--version"], { stdio: "ignore" }).error == null;
}
function need(cmd, hint) {
  if (!has(cmd)) fail(`${cmd} not found. ${hint}`);
}
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd });
  if (r.status !== 0) fail(`${cmd} failed (exit ${r.status}).`);
}
function log(s) {
  console.log(s);
}
function fail(s) {
  console.error(`clip-shorts: ${s}`);
  process.exit(1);
}
