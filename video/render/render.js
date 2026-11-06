// Renders a scene (scenes/<name>.js), either one frame or the full video.
// Expects out/<name>/timing.json and voice.wav from tts/voice.py (and mix.wav from audio/mix.py, if present).
// Usage:
//   node render/render.js still <name> <seconds> [out.png]
//   node render/render.js video <name>              -> out/<name>/<name>.mp4
//   node render/render.js frames <name> [from] [to]  -> out/<name>/frames/*.jpg (resumable)
//   node render/render.js assemble <name>           -> out/<name>/<name>.mp4 from those frames
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const FPS = 30;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const outDir = name => path.join(ROOT, "out", name);
// WIDE=1 renders a 1920x1080 landscape version (for long videos) into frames_wide/ and <name>_wide.mp4
const WIDE = process.env.WIDE === "1";
const VIEW = WIDE ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
const SUFFIX = WIDE ? "_wide" : "";

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, () => r(server)));
}

async function openScene(name, t = 0) {
  const server = await serve();
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: VIEW });
  page.on("pageerror", e => console.error("page error:", e.message));
  const timing = `/out/${name}/timing.json`;
  await page.goto(`http://localhost:${server.address().port}/scenes/index.html?scene=${name}&timing=${timing}&t=${t}&fx=${process.env.FX ?? 1}${WIDE ? "&wide=1" : ""}${process.env.SCENE_ARGS ? "&" + process.env.SCENE_ARGS : ""}`);
  await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
  const close = async () => { await browser.close(); server.close(); };
  return { page, close };
}

async function still(name, t, out = path.join(outDir(name), `t${t}.png`)) {
  const { page, close } = await openScene(name, t);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out, timeout: 180000 });
  await close();
  console.log("wrote", out);
}

async function video(name) {
  const out = path.join(outDir(name), `${name}${SUFFIX}.mp4`);
  const mix = path.join(outDir(name), "mix.wav");
  const audio = fs.existsSync(mix) ? mix : path.join(outDir(name), "voice.wav");
  const { page, close } = await openScene(name, 0);
  const duration = await page.evaluate(() => window.duration);
  const frames = Math.ceil(duration * FPS);
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-i", audio,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
    out,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate(t => window.renderAt(t), f / FPS);
    const img = await page.screenshot({ type: "jpeg", quality: 92, timeout: 180000 });
    if (!ffmpeg.stdin.write(img)) await new Promise(r => ffmpeg.stdin.once("drain", r));
    if (f % 60 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
  ffmpeg.stdin.end();
  await new Promise((res, rej) => ffmpeg.on("close", c => (c ? rej(new Error("ffmpeg exit " + c)) : res())));
  await close();
  console.log("wrote", out);
}

// Resumable rendering for heavy scenes: frames are saved as JPEGs and existing ones are skipped,
// so a long render can be split across several runs. Then `assemble` muxes them with the audio.
async function frames(name, from = 0, to = Infinity) {
  const dir = path.join(outDir(name), "frames" + SUFFIX);
  fs.mkdirSync(dir, { recursive: true });
  const { page, close } = await openScene(name, 0);
  const total = Math.ceil((await page.evaluate(() => window.duration)) * FPS);
  const end = Math.min(total, to);
  const started = Date.now();
  let done = 0;
  for (let f = from; f < end; f++) {
    const file = path.join(dir, `${String(f).padStart(5, "0")}.jpg`);
    if (fs.existsSync(file)) continue;
    await page.evaluate(t => window.renderAt(t), f / FPS);
    fs.writeFileSync(file + ".tmp", await page.screenshot({ type: "jpeg", quality: 92, timeout: 180000 }));
    fs.renameSync(file + ".tmp", file);
    if (++done % 20 === 0) console.log(`frame ${f + 1}/${total} (${((Date.now() - started) / done / 1000).toFixed(1)}s per frame)`);
  }
  await close();
  const have = fs.readdirSync(dir).filter(f => f.endsWith(".jpg")).length;
  console.log(`${have}/${total} frames rendered`);
}

async function assemble(name) {
  const dir = path.join(outDir(name), "frames" + SUFFIX);
  const mix = path.join(outDir(name), "mix.wav");
  const audio = fs.existsSync(mix) ? mix : path.join(outDir(name), "voice.wav");
  const out = path.join(outDir(name), `${name}${SUFFIX}.mp4`);
  await new Promise((res, rej) => spawn("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"), "-i", audio,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out,
  ], { stdio: "inherit" }).on("close", c => (c ? rej(new Error("ffmpeg exit " + c)) : res())));
  console.log("wrote", out);
}

const [mode, name, t, out] = process.argv.slice(2);
const run = { still: () => still(name, Number(t || 0), out), frames: () => frames(name, Number(t || 0), Number(out || Infinity)), assemble: () => assemble(name) };
(run[mode] || (() => video(name)))().catch(e => {
  console.error(e);
  process.exit(1);
});
