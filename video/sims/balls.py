"""Bouncing-ball short: one ball in a ring; every time a ball hits the edge, another ball appears. No limit on the
count. Each bounce plays the next note of "Ode to Joy", and the title asks the viewer to guess the final number.
usage: python sims/balls.py out/balls/ [seconds]   ->  balls.mp4 (1080x1920, 60 fps)"""
import colorsys, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 17.0
HOLD = 1.2                                            # the final number holds on screen at the end
W, H, FPS, SUB, SS = 1080, 1920, 60, 4, 2             # SS: while there are few balls, draw at 2x and shrink
C = np.array([540.0, 1010.0]); R, BR, G = 480.0, 13.0, 850.0
BG = (8, 8, 14)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F = lambda px: ImageFont.truetype(FONT, px)
rng = np.random.default_rng(5)

pos = np.array([[C[0] - 120, C[1] - 200]]); vel = np.array([[260.0, -60.0]]); hue = np.array([0.0]); armed = np.array([True])
rgb = lambda h: np.array([[int(255 * c) for c in colorsys.hsv_to_rgb(x, 0.75, 1.0)] for x in h], np.uint8)
cols = rgb(hue)
frames, live = int(DUR * FPS), int((DUR - HOLD) * FPS)
per_frame = []                                        # (bounces this frame, balls) for the sound
trail_hi = Image.new("RGB", (W * SS, H * SS), BG); trail_lo = None
yy, xx = np.mgrid[-13:14, -13:14]; DISC = np.argwhere(xx * xx + yy * yy <= BR * BR) - 13   # pixel offsets of one ball
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)
stills = {int(s * FPS): s for s in (0.5, 4, 8, 12, DUR - HOLD - 0.1, DUR - 0.3)}

def step(f):
    global pos, vel, hue, armed, cols
    nb = 0
    for _ in range(SUB):
        dt = 1 / FPS / SUB
        vel[:, 1] += G * dt; pos += vel * dt
        d = pos - C; dist = np.linalg.norm(d, axis=1); touch = dist > R - BR
        armed |= dist < R - BR - 30                   # a ball must come off the wall before it can count again
        if touch.any():
            n = d[touch] / dist[touch, None]; v = vel[touch]; vn = (v * n).sum(1, keepdims=True)
            vel[touch] = np.where(vn > 0, v - 2 * vn * n, v); pos[touch] = C + n * (R - BR)
        hit = touch & armed; armed &= ~hit
        k = int(hit.sum()); nb += k
        if k:                                         # each bounce adds a ball, sent off at a slightly different angle
            v0 = vel[hit]; a = rng.uniform(-0.5, 0.5, k); ca, sa = np.cos(a), np.sin(a)
            nv = np.stack([v0[:, 0] * ca - v0[:, 1] * sa, v0[:, 0] * sa + v0[:, 1] * ca], 1) * rng.uniform(0.9, 1.05, (k, 1))
            nh = (len(hue) + np.arange(k)) * 0.071 % 1
            pos = np.vstack([pos, pos[hit]]); vel = np.vstack([vel, nv]); hue = np.concatenate([hue, nh])
            armed = np.concatenate([armed, np.zeros(k, bool)]); cols = np.vstack([cols, rgb(nh)])
    per_frame.append((nb, len(pos)))

def draw_balls():
    """few balls: smooth circles drawn at 2x; many balls: stamped straight into the pixel grid"""
    global trail_hi, trail_lo
    if len(pos) <= 2500 and trail_lo is None:
        trail_hi = Image.blend(trail_hi, Image.new("RGB", trail_hi.size, BG), 0.35); dr = ImageDraw.Draw(trail_hi); r = BR * SS
        for (x, y), c in zip(pos, cols): dr.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=tuple(int(v) for v in c))
        return trail_hi.resize((W, H), Image.LANCZOS)
    if trail_lo is None: trail_lo = np.asarray(trail_hi.resize((W, H), Image.LANCZOS)).astype(np.float32)
    trail_lo = trail_lo * 0.65 + np.array(BG, np.float32) * 0.35
    px, py = np.rint(pos[:, 0]).astype(int), np.rint(pos[:, 1]).astype(int)
    for dy, dx in DISC: trail_lo[py + dy, px + dx] = cols
    return Image.fromarray(trail_lo.astype(np.uint8))

for f in range(frames):
    if f < live: step(f)
    else: per_frame.append((0, len(pos)))
    img = draw_balls(); dr = ImageDraw.Draw(img); done = f >= live
    dr.ellipse([C[0] - R - 5, C[1] - R - 5, C[0] + R + 5, C[1] + R + 5], outline=(255, 255, 255), width=10)
    dr.rounded_rectangle([70, 150, 1010, 270], 28, fill=(255, 212, 0), outline=(0, 0, 0), width=6)
    dr.text((540, 210), "GUESS THE FINAL NUMBER", font=F(58), fill=(17, 17, 17), anchor="mm")
    dr.text((540, 318), "every bounce = +1 ball", font=F(40), fill=(230, 230, 230), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
    pulse = 1 + 0.08 * np.sin((f - live) / FPS * 14) if done else 1
    dr.text((540, 440), f"{len(pos):,}", font=F(int(150 * pulse)), fill=(255, 212, 0) if done else (255, 255, 255), anchor="mm", stroke_width=10, stroke_fill=(0, 0, 0))
    k = min(1, f / live)                              # time bar: how long is left to guess
    dr.rounded_rectangle([140, 1560, 940, 1590], 15, fill=(50, 50, 60)); dr.rounded_rectangle([140, 1560, 140 + max(30, 800 * k), 1590], 15, fill=(255, 212, 0))
    if f in stills: img.save(out / f"still_{stills[f]:g}.png")
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait()

# ---- sound: each bounce plays the next note of "Ode to Joy"; a few notes per frame at most ----
SR = 44100; audio = np.zeros(int(DUR * SR) + SR)
E, Fn, Gn, D, Cn = 329.63, 349.23, 392.0, 293.66, 261.63
TUNE = [E, E, Fn, Gn, Gn, Fn, E, D, Cn, Cn, D, E, E, D, D, E, E, Fn, Gn, Gn, Fn, E, D, Cn, Cn, D, E, D, Cn, Cn]
t = np.arange(int(0.3 * SR)) / SR; i_note = 0
for f, (nb, n) in enumerate(per_frame):
    for j in range(min(nb, 4)):
        fr = TUNE[i_note % len(TUNE)] * (2 if (i_note // len(TUNE)) % 2 else 1); i_note += 1
        note = (np.sin(2 * np.pi * fr * t) + 0.4 * np.sin(4 * np.pi * fr * t) + 0.15 * np.sin(6 * np.pi * fr * t)) * np.exp(-t * 16)
        i = int((f + j / 4) / FPS * SR); audio[i:i + len(note)] += note * 0.5 / (1 + 0.02 * min(nb, 40))
# a bright chord on the final number
i = int(live / FPS * SR); tc = np.arange(int(1.1 * SR)) / SR
for fr in (523.25, 659.25, 783.99, 1046.5): audio[i:i + len(tc)] += 0.35 * np.sin(2 * np.pi * fr * tc) * np.exp(-tc * 3)
audio = np.tanh(audio[:int(DUR * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "balls.mp4")], check=True)
print(f"balls.mp4 {DUR}s, final number {len(pos):,}")
