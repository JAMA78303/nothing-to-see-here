// Choosing the moments: Claude reading every signal, or the signals alone.

import Anthropic from "@anthropic-ai/sdk";
import { annotate, chatSpikes, interest } from "./signals.mjs";
import { clamp, fail, round } from "./util.mjs";

const SCHEMA = {
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
          start: { type: "number", description: "Seconds from the start of the video" },
          end: { type: "number", description: "Seconds from the start of the video" },
          title: { type: "string", description: "Post title for the Short, under 70 characters" },
          hook: { type: "string", description: "On-screen hook text for the first seconds, 2-7 words" },
          why: { type: "string", description: "One sentence: why this moment will hold and spread" },
          score: { type: "integer", description: "Viral potential, 0-100" },
        },
      },
    },
  },
};

// ctx: { info, duration, lines, sig, count, min, max, live }
export async function pickWithClaude(ctx) {
  const { info, duration, lines, sig, count, min, max, live } = ctx;
  const timeline = lines.length ? transcriptView(lines, sig) : signalView(sig, duration);
  const spikes = chatSpikes(sig);

  const context = [
    `Title: ${info.title ?? "unknown"}`,
    info.uploader && `Channel: ${info.uploader}`,
    info.categories?.length && `Category: ${info.categories.join(", ")}`,
    ["is_live", "was_live", "post_live"].includes(info.live_status) || live ? "This is a live stream." : null,
    `Duration: ${Math.round(duration)}s`,
    info.description && `Description: ${info.description.slice(0, 1000)}`,
    info.chapters?.length && `Chapters:\n${info.chapters.map((c) => `  ${Math.round(c.start_time)}s ${c.title}`).join("\n")}`,
  ].filter(Boolean).join("\n");

  const legend = [
    sig.replay && `- "replay": YouTube's most-replayed score for that stretch, 0-1. Real viewer behaviour; high values are strong evidence.`,
    sig.chat && `- "chat": live chat messages reacting to that stretch (already shifted for the few seconds chat lags behind), "hype" counts messages like LOL, W, CLIP IT, OMG, ???, 💀 and paid messages. A burst well above the stream's normal rate means something happened.`,
    sig.loud && `- "loud +NdB": the audio got that much louder than usual: shouting, screaming, explosions, music drops.`,
  ].filter(Boolean).join("\n");

  const spikeText = spikes.length
    ? `\n\nBiggest chat bursts (${spikes.length}), with what chat said:\n` +
      spikes.map((s) => `[${s.start}-${s.end}] ${s.rate}x normal: ${s.messages.map((m) => JSON.stringify(m)).join(" ")}`).join("\n")
    : "";

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
    system: `You are a short-form video editor who has cut thousands of YouTube Shorts, TikToks and Reels that went viral, for podcasters, creators and gaming streamers. You pick moments from long videos and streams that work on their own for someone scrolling with no context.

What makes a moment travel:
- A hook in the first 1-2 seconds: a bold claim, a surprising number, a question, conflict, emotion, or the middle of something happening. Never start on filler, greetings, sponsor reads or "be right back".
- Self-contained: makes sense without the rest of the video.
- A payoff: it ends on the punchline, reveal, kill, fail, reaction or strongest line, not mid-thought and not after the energy drops.
- High emotion or high information: funny, controversial, counter-intuitive, vulnerable, or genuinely useful.
- Shareable: people send it to a friend, argue in the comments, or watch it twice.

For gaming and streams:
- The best clips are clutch plays, insane luck, hilarious fails and bugs, rage, jump scares, big wins, and the streamer's reaction to them. The reaction is often the payoff, so keep it in.
- Start a few seconds before the action so the viewer sees it build; end once the reaction lands.
- Chat bursts, loudness jumps and replays are your best evidence that something happened even when the transcript is thin. Several signals together are stronger than one.
- Skip dead air, menus, queues, loading screens and long silent stretches of routine gameplay.

Rules:
- Each clip is ${min}-${max} seconds long. Shorter is better when the moment is complete.
- ${lines.length ? "start must be the start time of a transcript line and end the end time of one." : "There is no transcript, so pick times from the timeline."}
- Clips must not overlap.
- Score honestly: 90+ only for moments you'd bet on. Leave out anything below 50 rather than padding the list${live ? "; returning no clips is fine when nothing in this stretch is worth posting" : ""}.
- Rank best first.`,
    messages: [
      {
        role: "user",
        content: `${context}${legend ? `\n\nSignals in the timeline:\n${legend}` : ""}${spikeText}\n\n${timeline}\n\nPick up to ${count} clips.`,
      },
    ],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") fail(`Claude declined this video${msg.stop_details?.explanation ? `: ${msg.stop_details.explanation}` : "."}`);
  if (msg.stop_reason === "max_tokens") fail("Claude's answer was cut off. Try fewer clips.");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text).clips;
}

function transcriptView(lines, sig) {
  return (
    "Transcript, one line per row as [start-end] in seconds, with signals for that stretch:\n" +
    lines
      .map((l) => {
        const a = annotate(sig, l.start, l.end);
        return `[${l.start.toFixed(1)}-${l.end.toFixed(1)}]${a ? ` (${a})` : ""} ${l.text}`;
      })
      .join("\n")
  );
}

function signalView(sig, duration) {
  const B = duration > 3 * 3600 ? 20 : 10;
  const rows = [];
  for (let s = 0; s < duration; s += B) {
    const e = Math.min(duration, s + B);
    const a = annotate(sig, s, e);
    const said = sig.messages
      .filter((m) => m.t >= s + 3 && m.t < e + 3)
      .slice(0, 3)
      .map((m) => JSON.stringify(m.text.slice(0, 50)));
    rows.push(`[${s}-${Math.round(e)}] ${a || "-"}${said.length ? ` | chat: ${said.join(" ")}` : ""}`);
  }
  return `Timeline in ${B}s rows as [start-end] seconds:\n${rows.join("\n")}`;
}

// Without Claude: peaks of the combined signal, grown into clips.
// strict (live): only moments well above the stream's normal, scored on that absolute scale.
export function pickFromSignals(ctx, { strict, baseline }) {
  const { sig, info, duration, count, min, max } = ctx;
  const { score, sources } = interest(sig, baseline);
  if (!sources) return [];
  const target = clamp(30, min, max);
  const order = [...score.keys()].sort((a, b) => score[b] - score[a]);
  const best = Math.max(1e-3, score[order[0]]);
  const chosen = [];
  for (const i of order) {
    if (chosen.length >= count) break;
    if (strict && score[i] < 3) break; // live: only clearly unusual moments
    if (i < 5) continue; // everyone scrubs past the intro
    // Most of the clip before the peak (the build-up), the rest after (the reaction).
    const start = Math.max(0, i - target * 0.6);
    const end = Math.min(duration, start + target);
    if (chosen.some((c) => start < c.end + 2 && end > c.start - 2)) continue;
    chosen.push({ start, end, title: info.title ?? "Clip", hook: "", why: `Signal peak at ${Math.round(i)}s (${annotate(sig, i - 2, i + 2) || "combined"})`, score: Math.round(clamp(strict ? 30 + 5 * score[i] : 40 + (59 * score[i]) / best, 0, 99)) });
  }
  return chosen;
}

// Snap to transcript lines when there are any, enforce lengths, drop overlaps, rank.
export function finalise(list, { lines, duration, min, max, count, sig }) {
  const out = [];
  for (const c of [...list].sort((a, b) => b.score - a.score)) {
    let start, end;
    if (lines.length) {
      const first = lines.findIndex((l) => l.end > c.start + 0.2);
      if (first < 0) continue;
      let last = first;
      while (last + 1 < lines.length && lines[last + 1].end <= c.end + 0.5) last++;
      while (last > first && lines[last].end - lines[first].start > max) last--;
      while (last + 1 < lines.length && lines[last].end - lines[first].start < min && lines[last + 1].end - lines[first].start <= max) last++;
      start = Math.max(0, lines[first].start - 0.15);
      end = Math.min(duration, lines[last].end + 0.35);
      // Gameplay often runs past the last words; keep the clip the length that was asked for.
      if (c.end > end && c.end - start <= max) end = Math.min(duration, c.end);
    } else {
      start = clamp(c.start, 0, duration);
      end = clamp(c.end, start, duration);
      if (end - start > max) end = start + max;
      if (end - start < min) end = Math.min(duration, start + min);
    }
    if (end - start < min * 0.75 || end - start > max + 1) continue;
    if (out.some((o) => start < o.end && end > o.start)) continue;
    out.push({
      rank: 0,
      score: clamp(Math.round(c.score), 0, 100),
      start: round(start),
      end: round(end),
      title: c.title,
      hook: c.hook,
      why: c.why,
      signals: annotate(sig, start, end) || undefined,
      text: lines.length ? lines.filter((l) => l.end > start && l.start < end).map((l) => l.text).join(" ") : undefined,
    });
    if (out.length >= count) break;
  }
  out.forEach((c, i) => (c.rank = i + 1));
  return out;
}
