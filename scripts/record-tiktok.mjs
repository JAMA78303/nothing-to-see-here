// Records a vertical 1080x1920 video of Gerald, with his sound, for TikTok/Reels/Shorts.
//
//   NEXT_PUBLIC_DEV_TOOLS=1 npm run dev -- -p 3100
//   node scripts/record-tiktok.mjs [url] [out.mp4]
//
// Drives Google Chrome headlessly (playwright-core), captures frames over the
// DevTools screencast and his Web Audio through a MediaRecorder tap, then
// muxes both with ffmpeg. Needs Chrome and ffmpeg installed.

import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const url = process.argv[2] ?? "http://localhost:3100/?demo";
const out = resolve(process.argv[3] ?? "recordings/gerald-tiktok.mp4");
mkdirSync(resolve("recordings"), { recursive: true });
const work = resolve(".recording");
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, "frames"), { recursive: true });

// Runs in the page before anything else: an audio tap, a visible fingertip, no dev overlay.
const initScript = () => {
  const Base = window.AudioContext;
  const realDestination = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "destination").get;
  window.__audio = { chunks: [], startEpoch: null, recorder: null };
  window.AudioContext = class extends Base {
    constructor(...args) {
      super(...args);
      this.__mix = this.createGain();
      this.__mix.connect(realDestination.call(this));
      const tap = this.createMediaStreamDestination();
      this.__mix.connect(tap);
      const rec = new MediaRecorder(tap.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 192000 });
      rec.ondataavailable = (e) => e.data.size && window.__audio.chunks.push(e.data);
      rec.start(500);
      window.__audio.recorder = rec;
      window.__audio.startEpoch = performance.timeOrigin + performance.now();
    }
    get destination() {
      return this.__mix;
    }
  };

  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = `
      nextjs-portal { display: none !important; }
      #demo-finger { position: fixed; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
        background: rgba(255,255,255,.28); border: 3px solid rgba(255,255,255,.85); box-shadow: 0 2px 10px rgba(0,0,0,.35);
        pointer-events: none; z-index: 2147483647; transition: transform .12s ease-out; opacity: 0; }
      #demo-finger.tap { transform: scale(.72); background: rgba(255,255,255,.55); }`;
    document.head.appendChild(style);
    const f = document.createElement("div");
    f.id = "demo-finger";
    document.body.appendChild(f);
    addEventListener("pointermove", (e) => { f.style.opacity = "1"; f.style.left = e.clientX + "px"; f.style.top = e.clientY + "px"; }, true);
    addEventListener("pointerdown", () => f.classList.add("tap"), true);
    addEventListener("pointerup", () => setTimeout(() => f.classList.remove("tap"), 90), true);
  });
};

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"],
});
const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await context.route(/youtube\.com|youtu\.be/, (r) => r.abort()); // never actually load the video
await context.addInitScript(initScript);
const page = await context.newPage();
// The link opens a new tab; close it so he notices you came back.
context.on("page", (p) => { if (p !== page) setTimeout(() => p.close().catch(() => {}), 400); });

/* ---------- frame capture ---------- */
const frames = [];
const cdp = await context.newCDPSession(page);
// Timed on arrival: the screencast's own timestamps use a different clock from the page's audio.
cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
  const file = `f${String(frames.length).padStart(6, "0")}.jpg`;
  writeFileSync(join(work, "frames", file), Buffer.from(data, "base64"));
  frames.push({ file, t: Date.now() / 1000 });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__gerald);
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });

/* ---------- helpers ---------- */
const hold = (ms) => page.waitForTimeout(ms);
const svgPoint = (x, y) =>
  page.evaluate(([x, y]) => {
    const svg = document.querySelector("#stage svg");
    const p = svg.createSVGPoint();
    p.x = x;
    p.y = y;
    const s = p.matrixTransform(svg.getScreenCTM());
    return { x: s.x, y: s.y };
  }, [x, y]);
const moveTo = async (x, y, steps = 14) => {
  const p = await svgPoint(x, y);
  await page.mouse.move(p.x, p.y, { steps });
};
const tap = async (x, y) => {
  await moveTo(x, y, 10);
  await page.mouse.down();
  await hold(70);
  await page.mouse.up();
};
const play = (id) => page.evaluate((id) => window.__gerald.play(id), id);
const untilIdle = () => page.waitForFunction(() => !window.__gerald.busy(), null, { timeout: 60000 });

/* ---------- the take (about 55 seconds) ---------- */
await hold(1800); // arrival line

// His eyes follow your finger.
await moveTo(330, 120, 18);
await hold(250);
await moveTo(60, 260, 22);
await hold(250);
await moveTo(330, 420, 22);
await hold(250);
await moveTo(200, 470, 14);
await hold(400);

// Poke, poke, poke: just noises.
for (const [x, y] of [[200, 290], [185, 360], [215, 300], [200, 185], [190, 380], [210, 290]]) {
  await tap(x, y);
  await hold(330);
}
await hold(700);

await play("pigeon");
await hold(1700);
await play("backflip");
await hold(1700);

// The secret: tap his belt.
await tap(200, 328);
await untilIdle();
await hold(1900);

// He slips you a link. You take it. He sings.
const link = play("link");
await page.waitForSelector("#slip.show");
await hold(1100);
const box = await page.locator("#slip").boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
await page.mouse.down();
await hold(70);
await page.mouse.up();
// Headless Chrome never refocuses the page, so tell him you came back from the video.
await hold(1500);
await page.evaluate(() => { dispatchEvent(new Event("blur")); setTimeout(() => dispatchEvent(new Event("focus")), 50); });
await link;
await hold(1700);

// Legendary.
await play("ufo");
await hold(3800);

/* ---------- finish ---------- */
await cdp.send("Page.stopScreencast");
const endEpoch = Date.now() / 1000;
const audio = await page.evaluate(async () => {
  const a = window.__audio;
  if (!a.recorder) return null;
  await new Promise((r) => { a.recorder.onstop = r; a.recorder.stop(); });
  const blob = new Blob(a.chunks, { type: "audio/webm" });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { b64: btoa(bin), startEpoch: a.startEpoch / 1000 };
});
await browser.close();

if (frames.length < 2) throw new Error("No frames captured");
const t0 = frames[0].t;
const list = frames
  .map((f, i) => `file 'frames/${f.file}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? endEpoch) - f.t).toFixed(4)}`)
  .join("\n") + `\nfile 'frames/${frames.at(-1).file}'\n`;
writeFileSync(join(work, "frames.txt"), list);
const duration = (endEpoch - t0).toFixed(3);

const args = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(work, "frames.txt")];
if (audio?.b64) {
  writeFileSync(join(work, "audio.webm"), Buffer.from(audio.b64, "base64"));
  const offset = audio.startEpoch - t0;
  if (offset >= 0) args.push("-itsoffset", offset.toFixed(3), "-i", join(work, "audio.webm"));
  else args.push("-ss", (-offset).toFixed(3), "-i", join(work, "audio.webm"));
  args.push("-af", "apad,volume=1.6");
} else {
  args.push("-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo");
}
args.push(
  "-map", "0:v", "-map", "1:a",
  "-vf", "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-t", duration, "-movflags", "+faststart", out,
);
execFileSync("ffmpeg", args, { stdio: "inherit" });
rmSync(work, { recursive: true, force: true });
console.log(`Saved ${out} (${duration}s, ${frames.length} frames${audio?.b64 ? ", with sound" : ", silent"})`);
