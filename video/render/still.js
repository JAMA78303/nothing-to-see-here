// Renders one frame of a scene to a PNG.
// Usage: node render/still.js <out.png> [key=value ...]   e.g. poolWater=0 arrows=1 caption=Pushes
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript" };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, () => r(server)));
}

(async () => {
  const [out = "out/still.png", ...pairs] = process.argv.slice(2);
  const query = new URLSearchParams(pairs.map(p => p.split("="))).toString();
  const server = await serve();
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.goto(`http://localhost:${server.address().port}/scenes/pool.html?${query}`);
  await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  await browser.close();
  server.close();
  console.log("wrote", out);
})();
