// Renders a scene (scenes/<name>.js), either one frame or the full video.
// Expects out/<name>/timing.json and voice.wav from tts/voice.py (and mix.wav from audio/mix.py, if present).
// Usage:
//   node render/render.js still <name> <seconds> [out.png]
//   node render/render.js video <name>              -> out/<name>/<name>.mp4
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const FPS = 30;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const outDir = name => path.join(ROOT, "out", name);

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
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => console.error("page error:", e.message));
  const timing = `/out/${name}/timing.json`;
  await page.goto(`http://localhost:${server.address().port}/scenes/index.html?scene=${name}&timing=${timing}&t=${t}`);
  await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const close = async () => { await browser.close(); server.close(); };
  return { page, close };
}

async function still(name, t, out = path.join(outDir(name), `t${t}.png`)) {
  const { page, close } = await openScene(name, t);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  await close();
  console.log("wrote", out);
}

async function video(name) {
  const out = path.join(outDir(name), `${name}.mp4`);
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
    const img = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ffmpeg.stdin.write(img)) await new Promise(r => ffmpeg.stdin.once("drain", r));
    if (f % 60 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
  ffmpeg.stdin.end();
  await new Promise((res, rej) => ffmpeg.on("close", c => (c ? rej(new Error("ffmpeg exit " + c)) : res())));
  await close();
  console.log("wrote", out);
}

const [mode, name, t, out] = process.argv.slice(2);
(mode === "still" ? still(name, Number(t || 0), out) : video(name)).catch(e => {
  console.error(e);
  process.exit(1);
});
