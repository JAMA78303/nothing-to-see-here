// What happened when: the transcript, chat activity, loudness and YouTube's
// replay heatmap, all lined up on one timeline in seconds.

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { capture, fail, has, log, run, warn } from "./util.mjs";

// ---------------------------------------------------------------------------
// Transcript

// Words with timings, from a transcript file, or whisper when there isn't one.
// Returns [] when there's no way to get a transcript (fine for gameplay).
export function loadWords({ file, media, work, transcribe, whisperModel, duration }) {
  if (file) return parseTranscript(JSON.parse(readFileSync(file, "utf8")));
  if (!transcribe || !has("whisper")) return [];
  const dir = join(work, "whisper");
  const out = join(dir, `${basename(media, extname(media))}.json`);
  if (!existsSync(out)) {
    mkdirSync(dir, { recursive: true });
    log(`Transcribing with whisper (${whisperModel})${duration > 3600 ? ", this will take a while for a long stream" : ""}...`);
    run("whisper", [media, "--model", whisperModel, "--word_timestamps", "True", "--output_format", "json", "--output_dir", dir, "--verbose", "False"]);
  }
  return parseTranscript(JSON.parse(readFileSync(out, "utf8")));
}

// [{ text, start, end }] in seconds, from YouTube json3 or whisper JSON.
export function parseTranscript(data) {
  const out = [];
  if (Array.isArray(data.segments)) {
    for (const seg of data.segments) {
      if (seg.words?.length) for (const w of seg.words) pushWord(out, w.word, w.start, w.end);
      else spread(out, seg.text, seg.start, seg.end);
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
          const next = segs[i + 1];
          pushWord(out, s.utf8, start + (s.tOffsetMs ?? 0) / 1000, next ? start + (next.tOffsetMs ?? 0) / 1000 : end);
        });
      } else {
        spread(out, segs[0].utf8, start, end);
      }
    }
    // Auto captions overlap their neighbours; keep times monotonic.
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
export function groupLines(ws) {
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

// ---------------------------------------------------------------------------
// Chat

// Messages from a yt-dlp live_chat.json (one JSON object per line). Replays
// carry the video offset; a chat followed live only has wall-clock times, so
// pass wallStart (ms) to measure from the start of the recording instead.
export function parseChat(file, { wallStart } = {}) {
  if (!file || !existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue; // a live chat file can end mid-line
    }
    const replay = d.replayChatItemAction;
    const offsetMs = replay?.videoOffsetTimeMsec != null ? Number(replay.videoOffsetTimeMsec) : null;
    for (const a of replay?.actions ?? [d]) {
      const item = a.addChatItemAction?.item;
      const r = item?.liveChatTextMessageRenderer ?? item?.liveChatPaidMessageRenderer;
      if (!r) continue;
      const text = (r.message?.runs ?? []).map((x) => x.text ?? x.emoji?.shortcuts?.[0] ?? "").join("").trim();
      const t = wallStart != null ? (Number(r.timestampUsec) / 1000 - wallStart) / 1000 : offsetMs != null ? offsetMs / 1000 : null;
      if (t == null || Number.isNaN(t)) continue;
      out.push({ t, text, paid: Boolean(item.liveChatPaidMessageRenderer) });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

// Messages that mean "something just happened".
const HYPE =
  /(^|\s)(w+|l+|lol+|lmf?a+o+|omg+|wtf+|no+ ?way|clip( it| that)?|pog\w*|kekw|lul\w*|omegalul|holy|insane|crazy|bro+|gg+|ez+|no{3,}|ha(ha)+\w*|\?{2,}|!{3,})(\s|$|[!?.])|😂|🤣|💀|😭|🔥|😱|🤯|:face_with_tears_of_joy:|:skull:|:fire:/i;

// ---------------------------------------------------------------------------
// Loudness

// RMS level in dB for every second of the file's audio.
export function loudness(file) {
  let out;
  try {
    out = capture("ffmpeg", [
      "-hide_banner", "-nostats", "-i", file, "-vn",
      "-af", "aresample=8000,asetnsamples=n=8000:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-",
      "-f", "null", "-",
    ]);
  } catch {
    warn("couldn't measure loudness; carrying on without it.");
    return [];
  }
  return [...out.matchAll(/RMS_level=(-?[\d.]+|-?inf)/g)].map((m) => (m[1].endsWith("inf") ? -90 : Math.max(-90, Number(m[1]))));
}

// ---------------------------------------------------------------------------
// One timeline

export function buildSignals({ duration, chat = [], loud = [], heat = null }) {
  const n = Math.max(1, Math.ceil(duration));
  const sig = { n, chat: null, hype: null, messages: chat, loud: null, loudMedian: 0, replay: null };
  if (chat.length) {
    sig.chat = new Float32Array(n);
    sig.hype = new Float32Array(n);
    for (const m of chat) {
      const i = Math.floor(m.t);
      if (i < 0 || i >= n) continue;
      sig.chat[i]++;
      if (m.paid || HYPE.test(m.text)) sig.hype[i]++;
    }
  }
  if (loud.length) {
    sig.loud = Float32Array.from({ length: n }, (_, i) => loud[Math.min(i, loud.length - 1)]);
    sig.loudMedian = median([...sig.loud].filter((v) => v > -80));
  }
  if (heat?.length) {
    sig.replay = new Float32Array(n);
    for (const h of heat) for (let i = Math.floor(h.start_time); i < Math.min(n, Math.ceil(h.end_time)); i++) sig.replay[i] = h.value;
  }
  return sig;
}

// Chat reacts a few seconds after the moment; measure the reaction window.
export const CHAT_LAG = [3, 18];

const sum = (arr, a, b) => {
  let s = 0;
  for (let i = Math.max(0, Math.floor(a)); i < Math.min(arr.length, Math.ceil(b)); i++) s += arr[i];
  return s;
};
const max = (arr, a, b) => {
  let m = -Infinity;
  for (let i = Math.max(0, Math.floor(a)); i < Math.min(arr.length, Math.ceil(b)); i++) m = Math.max(m, arr[i]);
  return m;
};
const mean = (arr, a, b) => sum(arr, a, b) / Math.max(1, Math.min(arr.length, Math.ceil(b)) - Math.max(0, Math.floor(a)));

export function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Short tags for a span, e.g. "replay 0.71, chat 34 (12 hype), loud +8dB".
export function annotate(sig, s, e) {
  const parts = [];
  if (sig.replay) parts.push(`replay ${mean(sig.replay, s, e).toFixed(2)}`);
  if (sig.chat) {
    const c = sum(sig.chat, s + CHAT_LAG[0], e + CHAT_LAG[1]);
    const h = sum(sig.hype, s + CHAT_LAG[0], e + CHAT_LAG[1]);
    if (c) parts.push(`chat ${c}${h ? ` (${h} hype)` : ""}`);
  }
  if (sig.loud) {
    const d = Math.round(max(sig.loud, s, e) - sig.loudMedian);
    if (d >= 4) parts.push(`loud +${d}dB`);
  }
  return parts.join(", ");
}

// The busiest stretches of chat, with what people said.
export function chatSpikes(sig, count = 15) {
  if (!sig.chat) return [];
  const B = 10;
  const buckets = [];
  for (let s = 0; s < sig.n; s += B) {
    buckets.push({ s, count: sum(sig.chat, s, s + B), score: sum(sig.chat, s, s + B) + 2 * sum(sig.hype, s, s + B) });
  }
  const typical = Math.max(1, median(buckets.map((b) => b.score)));
  return buckets
    .filter((b) => b.score >= 4 * typical && b.count >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.s - b.s)
    .map((b) => ({
      start: b.s,
      end: b.s + B,
      rate: Math.round(b.score / typical),
      messages: sig.messages.filter((m) => m.t >= b.s && m.t < b.s + B).slice(0, 8).map((m) => m.text.slice(0, 80)),
    }));
}

// Per-second "something is happening" score from whatever signals exist:
// chat reaction, loudness jumps and replays, each normalised and summed.
// baseline ({ chat, loud } arrays from earlier in a live stream) sets what
// counts as normal, so a quiet window's best moment doesn't look like a spike.
export function interest(sig, baseline = {}) {
  const parts = {};
  if (sig.chat) {
    parts.chat = Float32Array.from({ length: sig.n }, (_, i) => sum(sig.chat, i + CHAT_LAG[0], i + CHAT_LAG[1]) + 2 * sum(sig.hype, i + CHAT_LAG[0], i + CHAT_LAG[1]));
  }
  if (sig.loud) parts.loud = Float32Array.from({ length: sig.n }, (_, i) => max(sig.loud, i - 1, i + 2));
  if (sig.replay) parts.replay = sig.replay;
  const score = new Float32Array(sig.n);
  for (const [key, p] of Object.entries(parts)) {
    const all = [...(baseline[key] ?? []), ...p];
    const m = median(all);
    const mad = median(all.map((v) => Math.abs(v - m))) * 1.4826 || 1;
    for (let i = 0; i < sig.n; i++) score[i] += clamp((p[i] - m) / mad, 0, 10);
  }
  return { score, parts, sources: Object.keys(parts).length };
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function describeSources(sig, words) {
  return [
    words.length ? `${words.length} transcript words` : "no transcript",
    sig.chat && `${sig.messages.length} chat messages`,
    sig.loud && "loudness",
    sig.replay && "replay heatmap",
  ].filter(Boolean).join(", ");
}
