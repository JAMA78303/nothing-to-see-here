"""Bouncing-ball short: one ball in a ring; every time a ball hits the edge, another ball appears.
usage: python sims/balls.py out/balls/ [seconds]   ->  balls.mp4 (1080x1920, 60 fps, with a note per bounce)"""
import colorsys, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 19.0
W, H, FPS, SUB, SS = 1080, 1920, 60, 4, 2          # SS: draw at 2x and shrink, for smooth edges
C = np.array([540.0, 1010.0]); R, BR, G, CAP = 480.0, 13.0, 850.0, 2500
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
big, mid = ImageFont.truetype(FONT, 150 * SS), ImageFont.truetype(FONT, 52 * SS)
rng = np.random.default_rng(5)

pos = np.array([[C[0] - 120, C[1] - 200]]); vel = np.array([[260.0, -60.0]]); hue = np.array([0.0]); armed = np.array([True])
bounces, frames = [], int(DUR * FPS)
trail = Image.new("RGB", (W * SS, H * SS), (8, 8, 14))
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)
stills = {int(s * FPS): s for s in (0.5, 4, 8, 12, DUR - 0.6)}
for f in range(frames):
    for _ in range(SUB):
        dt = 1 / FPS / SUB
        vel[:, 1] += G * dt; pos += vel * dt
        d = pos - C; dist = np.linalg.norm(d, axis=1); touch = dist > R - BR
        armed |= dist < R - BR - 30                     # a ball must come off the wall before it can count again
        if touch.any():
            n = d[touch] / dist[touch, None]; v = vel[touch]; vn = (v * n).sum(1, keepdims=True)
            vel[touch] = np.where(vn > 0, v - 2 * vn * n, v); pos[touch] = C + n * (R - BR)
        hit = touch & armed; armed &= ~hit
        if hit.any():
            v = vel[hit]
            k = int(min(hit.sum(), CAP - len(pos)))
            for i in range(int(hit.sum())): bounces.append((f / FPS, len(pos)))
            if k > 0:                                   # each bounce adds a ball, sent off at a slightly different angle
                a = rng.uniform(-0.5, 0.5, k); ca, sa = np.cos(a), np.sin(a); v0 = v[:k]
                nv = np.stack([v0[:, 0] * ca - v0[:, 1] * sa, v0[:, 0] * sa + v0[:, 1] * ca], 1) * rng.uniform(0.9, 1.05, (k, 1))
                pos = np.vstack([pos, pos[hit][:k]]); vel = np.vstack([vel, nv])
                hue = np.concatenate([hue, (len(hue) + np.arange(k)) * 0.071 % 1]); armed = np.concatenate([armed, np.zeros(k, bool)])
    trail = Image.blend(trail, Image.new("RGB", trail.size, (8, 8, 14)), 0.35)   # short glowing trails
    dr = ImageDraw.Draw(trail)
    for (x, y), h in zip(pos, hue):
        col = tuple(int(255 * c) for c in colorsys.hsv_to_rgb(h, 0.75, 1.0)); r = BR * SS
        dr.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=col)
    img = trail.copy(); dr = ImageDraw.Draw(img)
    dr.ellipse([(C[0] - R) * SS, (C[1] - R) * SS, (C[0] + R) * SS, (C[1] + R) * SS], outline=(255, 255, 255), width=10 * SS)
    dr.rounded_rectangle([90 * SS, 150 * SS, 990 * SS, 270 * SS], 28 * SS, fill=(255, 212, 0), outline=(0, 0, 0), width=6 * SS)
    dr.text((540 * SS, 210 * SS), "EVERY BOUNCE = +1 BALL", font=mid, fill=(17, 17, 17), anchor="mm")
    dr.text((540 * SS, 395 * SS), f"{len(pos):,}", font=big, fill=(255, 255, 255), anchor="mm", stroke_width=8 * SS, stroke_fill=(0, 0, 0))
    small = img.resize((W, H), Image.LANCZOS)
    if f in stills: small.save(out / f"still_{stills[f]:g}.png")
    ff.stdin.write(small.tobytes())
ff.stdin.close(); ff.wait()

# ---- sound: a plucked note per bounce, climbing a pentatonic scale; quieter as they crowd together ----
SR = 44100; audio = np.zeros(int(DUR * SR) + SR)
scale = [0, 2, 4, 7, 9]
t = np.arange(int(0.22 * SR)) / SR
per_frame = {}
for bt, n in bounces:
    key = round(bt * FPS); c = per_frame.get(key, 0)
    if c >= 5: continue                                 # a few notes per frame is all the ear can use
    per_frame[key] = c + 1
    step = (len(per_frame) + c * 2) % 20
    fr = 261.63 * 2 ** ((scale[step % 5] + 12 * (step // 5)) / 12)
    note = (np.sin(2 * np.pi * fr * t) + 0.35 * np.sin(4 * np.pi * fr * t)) * np.exp(-t * 22)
    i = int(bt * SR); audio[i:i + len(note)] += note * 0.5 / (1 + 0.012 * n) ** 0.5
audio = np.tanh(audio[:int(DUR * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "balls.mp4")], check=True)
print(f"balls.mp4 {DUR}s, {len(pos)} balls at the end, {len(bounces)} bounces")
