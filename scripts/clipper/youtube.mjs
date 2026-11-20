// Everything that talks to YouTube goes through yt-dlp.

import { spawn } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { capture, fail, log, run } from "./util.mjs";

// Extra yt-dlp arguments for every call, e.g. cookies when YouTube asks for sign-in.
let extra = [];
export function setYtDlpArgs(args) {
  extra = args;
}

const VIDEO_FORMAT = "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b";

export function probe(url) {
  try {
    return JSON.parse(capture("yt-dlp", [...extra, "--no-warnings", "--no-playlist", "-J", url]));
  } catch (e) {
    const msg = String(e.stderr ?? e.message);
    if (/not a bot|Sign in to confirm/i.test(msg)) {
      fail(
        "YouTube wants a signed-in request (it does this to servers and some home networks).\n" +
          "Run again with --cookies-from-browser chrome (or firefox, edge, safari, brave) while you're signed in to YouTube in that browser,\n" +
          "or with --cookies <cookies.txt> exported from it. See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp",
      );
    }
    fail(`yt-dlp couldn't read ${url}:\n${msg}`);
  }
}

// Captions (creator-uploaded preferred over auto) and, for past streams, the chat replay.
export function fetchSidecars(url, info, work, { lang, chat }) {
  const wantChat = chat && info.subtitles?.live_chat;
  const langs = [`${lang}.*`, lang, ...(wantChat ? ["live_chat"] : [])].join(",");
  const done = join(work, ".sidecars");
  if (!existsSync(done)) {
    log(wantChat ? "Downloading captions and chat replay (long streams take a minute)..." : "Downloading captions...");
    run("yt-dlp", [...extra, 
      "--no-warnings", "--no-playlist", "--skip-download",
      "--write-subs", "--write-auto-subs", "--sub-langs", langs, "--sub-format", "json3/json/best",
      "-o", join(work, "source.%(ext)s"),
      url,
    ]);
    writeFileSync(done, "");
  }
  const files = readdirSync(work);
  const subs = files.filter((f) => f.endsWith(".json3"));
  const manual = Object.keys(info.subtitles ?? {}).filter((l) => l !== "live_chat");
  const caption = subs.find((f) => manual.some((l) => f.includes(`.${l}.`))) ?? subs[0];
  const chatFile = files.find((f) => f.includes("live_chat"));
  return { captionFile: caption && join(work, caption), chatFile: chatFile && join(work, chatFile) };
}

export function fetchVideo(url, work) {
  const file = join(work, "source.mp4");
  if (!existsSync(file)) {
    log("Downloading video...");
    run("yt-dlp", [...extra, "--no-warnings", "--no-playlist", "-f", VIDEO_FORMAT, "--merge-output-format", "mp4", "-o", file, url]);
  }
  return file;
}

export function fetchAudio(url, work) {
  const have = readdirSync(work).find((f) => f.startsWith("audio."));
  if (have) return join(work, have);
  log("Downloading audio track...");
  run("yt-dlp", [...extra, "--no-warnings", "--no-playlist", "-f", "ba[abr<=96]/ba/b", "-o", join(work, "audio.%(ext)s"), url]);
  return join(work, readdirSync(work).find((f) => f.startsWith("audio.")));
}

// Direct media URLs (video, then audio when they're separate), for cutting
// sections out of a long VOD without downloading all of it.
export function mediaUrls(url) {
  return capture("yt-dlp", [...extra, "--no-warnings", "--no-playlist", "-g", "-f", VIDEO_FORMAT, url]).trim().split("\n");
}

export function liveUrl(url) {
  return capture("yt-dlp", [...extra, "--no-warnings", "-g", "-f", "b[height<=1080]/b", url]).trim().split("\n")[0];
}

// Follows a live stream's chat into chat.live_chat.json until killed.
export function followLiveChat(url, work) {
  return spawn(
    "yt-dlp",
    [...extra, "--no-warnings", "--skip-download", "--write-subs", "--sub-langs", "live_chat", "-o", join(work, "chat.%(ext)s"), url],
    { stdio: "ignore" },
  );
}
