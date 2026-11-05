"""Stitch several rendered shorts into one landscape long video, with a voiced intro, a numbered title card
before each segment, a voiced outro, and YouTube chapters.

Usage: python publish/compile.py scripts/<compilation>.json
Needs out/<segment>/<segment>_wide.mp4 for every segment (render with WIDE=1). Writes out/<name>/<name>.mp4 and
out/<name>/youtube.txt (title, description with chapters, tags).
"""
import json, subprocess, sys
from pathlib import Path

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
cfg = json.loads(Path(sys.argv[1]).read_text())
out = ROOT / "out" / cfg["name"]
work = out / "parts"
work.mkdir(parents=True, exist_ok=True)
W, H, FPS, SR = 1920, 1080, 30, 48000
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def run(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, args)], check=True)


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout)


def frame_at(video, t, png):
    run("-ss", t, "-i", video, "-frames:v", 1, png)
    return Image.open(png).convert("RGB")


def wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= width: cur = test
        else: lines.append(cur); cur = w
    return lines + [cur]


def card(bg, big, small, png):
    """a blurred, darkened frame with a yellow label box and big white text"""
    img = bg.resize((W, H)).filter(ImageFilter.GaussianBlur(14))
    img = Image.blend(img, Image.new("RGB", (W, H), (10, 12, 20)), 0.45)
    d = ImageDraw.Draw(img)
    if small:
        f = ImageFont.truetype(BOLD, 64)
        tw = d.textlength(small, font=f)
        x0 = (W - tw) / 2 - 36
        d.rounded_rectangle([x0, 250, x0 + tw + 72, 360], radius=28, fill=(255, 212, 0), outline=(17, 17, 17), width=8)
        d.text((W / 2, 305), small, font=f, fill=(17, 17, 17), anchor="mm")
    f = ImageFont.truetype(BOLD, 112)
    lines = wrap(d, big.upper(), f, W - 260)
    y = 600 - (len(lines) - 1) * 66
    for line in lines:
        d.text((W / 2, y), line, font=f, fill="white", anchor="mm", stroke_width=12, stroke_fill="black")
        y += 132
    img.save(png)


def whoosh(seconds, gain=0.25):
    n = int(seconds * SR)
    noise = np.random.default_rng(1).standard_normal(n)
    # sweep a simple one-pole low-pass up and down for the "swish"
    out_, y = np.zeros(n), 0.0
    for i in range(n):
        k = 0.02 + 0.25 * np.sin(np.pi * i / n) ** 2
        y += k * (noise[i] - y); out_[i] = y
    env = np.sin(np.pi * np.arange(n) / n) ** 1.5
    return (out_ / (np.abs(out_).max() + 1e-9) * env * gain).astype(np.float32)


def still_clip(png, audio, seconds, mp4):
    run("-loop", 1, "-framerate", FPS, "-i", png, "-i", audio, "-t", seconds,
        "-vf", "zoompan=z='min(1.0+0.0006*on,1.08)':d=1:s=1920x1080:fps=30",
        "-c:v", "libx264", "-preset", "medium", "-crf", 20, "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", SR, "-ac", 2, mp4)


kokoro = Kokoro(str(ROOT / "voices/kokoro-v1.0.onnx"), str(ROOT / "voices/voices-v1.0.bin"))


def voiced(text, wav, pad=0.6):
    samples, sr = kokoro.create(text, voice=cfg.get("voice", "am_michael"), speed=cfg.get("speed", 1.1), lang="en-us")
    loud = np.where(np.abs(samples) > 0.01)[0]
    samples = samples[max(0, loud[0] - 600): loud[-1] + 1200]
    # resample to 48k by linear interpolation and lay over a soft whoosh
    t_new = np.linspace(0, len(samples) / sr, int(len(samples) / sr * SR))
    v = np.interp(t_new, np.arange(len(samples)) / sr, samples).astype(np.float32)
    total = np.zeros(int((len(v) / SR + pad + 0.3) * SR), dtype=np.float32)
    total[int(0.3 * SR): int(0.3 * SR) + len(v)] += v
    w = whoosh(0.9, 0.18); total[: len(w)] += w
    sf.write(wav, np.stack([total, total], 1), SR)
    return len(total) / SR


segs = cfg["segments"]
parts, chapters, t = [], [], 0.0
first = ROOT / "out" / segs[0]["name"] / f"{segs[0]['name']}_wide.mp4"

# intro
secs = voiced(cfg["intro"], work / "intro.wav")
card(frame_at(first, 3.0, work / "intro_bg.png"), cfg["title_card"], f"{len(segs)} THINGS", work / "intro.png")
still_clip(work / "intro.png", work / "intro.wav", secs, work / "00_intro.mp4")
parts.append(work / "00_intro.mp4"); t += dur(work / "00_intro.mp4")

for i, s in enumerate(segs, 1):
    src = ROOT / "out" / s["name"] / f"{s['name']}_wide.mp4"
    # numbered title card (chapters start on the card)
    chapters.append((t, s["label"]))
    sf.write(work / "whoosh.wav", np.stack([whoosh(1.4)] * 2, 1), SR)
    card(frame_at(src, min(6.0, dur(src) / 3), work / f"bg{i}.png"), s["label"], f"#{i}", work / f"card{i}.png")
    still_clip(work / f"card{i}.png", work / "whoosh.wav", 1.4, work / f"{i:02d}a_card.mp4")
    # the segment itself, optionally trimmed (e.g. to drop a Shorts-only loop line)
    until = s.get("until")
    run("-i", src, *(["-t", until] if until else []), "-vf", "scale=1920:1080,fps=30",
        "-c:v", "libx264", "-preset", "medium", "-crf", 20, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", SR, "-ac", 2,
        work / f"{i:02d}b_seg.mp4")
    for p in (work / f"{i:02d}a_card.mp4", work / f"{i:02d}b_seg.mp4"):
        parts.append(p); t += dur(p)

# outro
secs = voiced(cfg["outro"], work / "outro.wav", pad=1.2)
last = ROOT / "out" / segs[-1]["name"] / f"{segs[-1]['name']}_wide.mp4"
card(frame_at(last, 2.0, work / "outro_bg.png"), cfg["outro_card"], "", work / "outro.png")
still_clip(work / "outro.png", work / "outro.wav", secs, work / "99_outro.mp4")
parts.append(work / "99_outro.mp4")

(work / "list.txt").write_text("".join(f"file '{p.name}'\n" for p in parts))
final = out / f"{cfg['name']}.mp4"
run("-f", "concat", "-safe", 0, "-i", work / "list.txt", "-c", "copy", "-movflags", "+faststart", final)

# YouTube text with chapters (the first must be 0:00; the intro rides in the first chapter)
chapters[0] = (0.0, chapters[0][1])
fmt = lambda x: f"{int(x) // 60}:{int(x) % 60:02d}"
y = cfg["youtube"]
desc = y["description"].replace("{chapters}", "\n".join(f"{fmt(c)} {label}" for c, label in chapters))
(out / "youtube.txt").write_text(f"TITLE\n{y['title']}\n\nDESCRIPTION\n{desc}\n\nTAGS\n{', '.join(y['tags'])}\n")
print(f"wrote {final} ({fmt(dur(final))}) and youtube.txt")
