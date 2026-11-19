// Framing and rendering a clip as a 1080x1920 vertical video.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { capture, clamp, even, run, warn } from "./util.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON ?? "python3";

let framingReady;
export function framingAvailable() {
  framingReady ??=
    spawnSync(PYTHON, ["-c", "import cv2, numpy; cv2.FaceDetectorYN"], { stdio: "ignore" }).status === 0;
  return framingReady;
}

// Faces in [offset, offset+dur) of the file: see framing.py.
export function analyseFraming(file, offset, dur, focus) {
  if (!framingAvailable()) return null;
  try {
    const out = capture(
      PYTHON,
      [join(HERE, "framing.py"), file, String(offset), String(dur), String(focus), resolve(".clipper", "models")],
      { env: { OPENCV_LOG_LEVEL: "ERROR" } },
    );
    return JSON.parse(out);
  } catch (e) {
    warn(`face analysis failed, using a fixed crop: ${(e.stderr ?? e.message).trim().split("\n").pop()}`);
    return null;
  }
}

// auto: facecam in a corner -> split, otherwise a crop (face-tracked when there's a face).
export function chooseLayout(requested, framing) {
  const cam = framing?.facecam;
  if (requested === "auto") return cam?.edge ? "split" : "crop";
  if (requested === "split" && !cam) {
    warn("no facecam found in this clip, using crop instead of split.");
    return "crop";
  }
  return requested;
}

// opts: { layout, framing, dims, focus, camZoom, font, hookSeconds, captions, work, name }
export function renderClip(src, offset, clip, words, outFile, opts) {
  const dur = clip.end - clip.start;
  const { chain, captionY } = videoChain(opts);
  writeFileSync(join(opts.work, `${opts.name}.ass`), buildAss(clip, words, captionY, opts));
  run(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-stats",
      "-ss", String(offset), "-i", src, "-t", String(Math.round(dur * 100) / 100),
      "-filter_complex", `[0:v]${chain},setsar=1,ass=${opts.name}.ass[v]`,
      "-map", "[v]", "-map", "0:a?",
      "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
      "-movflags", "+faststart",
      outFile,
    ],
    // Relative names for the .ass/.cmd files keep ffmpeg's filter escaping out of it.
    { cwd: opts.work },
  );
}

function videoChain({ layout, framing, dims, focus, camZoom, work, name }) {
  const { width: W, height: H } = dims;

  if (layout === "blur") {
    return {
      chain:
        `split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:3,eq=brightness=-0.08[bg];` +
        `[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`,
      captionY: { caption: 560, hook: "top" },
    };
  }

  if (layout === "split") {
    const cam = framing.facecam;
    // The webcam overlay when it was found, otherwise a box sized from the face.
    let box = cam.box && { x: cam.box.x * W, y: cam.box.y * H, w: cam.box.w * W, h: cam.box.h * H };
    if (!box) {
      const w = Math.min(W, cam.w * W * camZoom);
      const h = Math.min(H, w * 0.75);
      box = { x: clamp(cam.cx * W - w / 2, 0, W - w), y: clamp(cam.cy * H - h * 0.45, 0, H - h), w, h };
    }
    // Top panel takes the cam's shape, within limits that leave gameplay at least
    // 58% of the screen; crop the cam to fill it, centred on the face.
    const top = even(clamp(1080 / (box.w / box.h), 540, 800));
    const aspect = 1080 / top;
    let cw = box.w;
    let ch = box.h;
    if (cw / ch > aspect) cw = ch * aspect;
    else ch = cw / aspect;
    const cx = clamp(cam.cx * W - cw / 2, box.x, box.x + box.w - cw);
    const cy = clamp(cam.cy * H - ch / 2, box.y, box.y + box.h - ch);
    const bottom = 1920 - top;
    const gw = even(Math.min(W, (H * 1080) / bottom));
    const gh = even(Math.min(H, (gw * bottom) / 1080));
    // Slide the gameplay crop off the facecam so it doesn't show twice.
    let gx = (W - gw) * focus;
    if (gx < box.x + box.w && gx + gw > box.x) {
      gx = cam.cx < 0.5 ? box.x + box.w : box.x - gw;
      gx = clamp(gx, 0, W - gw);
    }
    return {
      chain:
        `split=2[cam][game];` +
        `[cam]crop=${even(cw)}:${even(ch)}:${Math.round(cx)}:${Math.round(cy)},scale=1080:${top}[top];` +
        `[game]crop=${gw}:${gh}:${Math.round(gx)}:${Math.round((H - gh) / 2)},scale=1080:${bottom}[bottom];` +
        `[top][bottom]vstack=inputs=2`,
      // Captions straddle the seam between cam and game; hook sits low in the gameplay.
      captionY: { caption: 1920 - top - 60, hook: "bottom" },
    };
  }

  // crop
  const cw = even((H * 9) / 16);
  const track = framing?.track;
  if (track && cw < W) {
    const cmds = [];
    let last = null;
    track.x.forEach((x, k) => {
      const px = Math.round(x * W);
      if (px !== last) cmds.push(`${(k / track.fps).toFixed(3)} crop@follow x ${px};`);
      last = px;
    });
    writeFileSync(join(work, `${name}.cmd`), cmds.join("\n") + "\n");
    return {
      chain: `sendcmd=f=${name}.cmd,crop@follow=w=${cw}:h=${H}:x=${Math.round(track.x[0] * W)}:y=0,scale=1080:1920`,
      captionY: { caption: 560, hook: "top" },
    };
  }
  return {
    chain: `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-ow)*${focus}:(ih-oh)/2`,
    captionY: { caption: 560, hook: "top" },
  };
}

// Captions: 1-3 word chunks, the word being spoken in yellow, plus the hook card.
function buildAss(clip, words, captionY, { font, hookSeconds, captions }) {
  const t0 = clip.start;
  const dur = clip.end - clip.start;
  const events = [];

  if (hookSeconds > 0 && clip.hook) {
    events.push(`Dialogue: 1,${assTime(0)},${assTime(Math.min(hookSeconds, dur))},Hook,,0,0,0,,{\\fad(120,200)}${assText(clip.hook)}`);
  }

  if (captions) {
    const ws = words.filter((w) => w.start >= clip.start - 0.05 && w.start < clip.end);
    const chunks = [];
    let cur = [];
    ws.forEach((w, i) => {
      cur.push(w);
      const next = ws[i + 1];
      if (!next || cur.length >= 3 || /[.,!?;:]$/.test(w.text) || next.start - w.end > 0.5) {
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

  const f = font.replace(/,/g, " ");
  const hook = captionY.hook === "top" ? "8,90,90,230" : "2,90,90,260";
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${f},88,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,80,80,${captionY.caption},1
Style: Hook,${f},76,&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,18,0,${hook},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}

function assText(s) {
  return String(s).replace(/[{}\\]/g, "").toUpperCase();
}

function assTime(t) {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

