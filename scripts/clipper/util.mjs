import { execFileSync, spawnSync } from "node:child_process";

export function run(cmd, args, { cwd, env } = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd, env: env ? { ...process.env, ...env } : process.env });
  if (r.status !== 0) fail(`${cmd} failed (exit ${r.status}).`);
}

// Runs a command and returns its stdout; throws (with stderr) if it fails.
export function capture(cmd, args, { env } = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    env: env ? { ...process.env, ...env } : process.env,
  });
}

export function has(cmd) {
  return spawnSync(cmd, ["--version"], { stdio: "ignore" }).error == null;
}

export function need(cmd, hint) {
  if (!has(cmd)) fail(`${cmd} not found. ${hint}`);
}

export function probeVideo(file) {
  const out = JSON.parse(
    capture("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", file]),
  );
  const v = out.streams.find((s) => s.codec_type === "video");
  return { duration: Number(out.format.duration), width: v?.width, height: v?.height };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const round = (n) => Math.round(n * 100) / 100;
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const even = (n) => Math.max(2, Math.round(n / 2) * 2);

export function fmtTime(t) {
  const s = Math.round(t);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`;
}

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "clip";
}

export function log(s = "") {
  console.log(s);
}

export function warn(s) {
  console.warn(`clip-shorts: ${s}`);
}

export function fail(s) {
  console.error(`clip-shorts: ${s}`);
  process.exit(1);
}
