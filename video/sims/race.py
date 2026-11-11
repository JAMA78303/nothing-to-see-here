"""Side-by-side ball race: two rings, every bounce adds a ball, first side to TARGET wins.
usage: python sims/race.py out/race/            -> race.mp4 (1080x1920, 60 fps)
       python sims/race.py search               -> try starting set-ups and print how close each race is"""
import subprocess, sys
from pathlib import Path
import numpy as np

FPS, SUB, R, BR, G, TARGET = 60, 4, 245.0, 8.0, 520.0, 1000

class Side:
    def __init__(self, cx, n0, speed, seed):
        self.c = np.array([cx, 1010.0]); self.rng = np.random.default_rng(seed)
        a = self.rng.uniform(0, 2 * np.pi, n0)
        self.pos = self.c + np.stack([np.cos(a), np.sin(a)], 1) * 60 * (n0 > 1)
        b = self.rng.uniform(-2.6, -0.5, n0); self.vel = np.stack([np.cos(b), np.sin(b)], 1) * speed
        self.armed = np.ones(n0, bool); self.done = None
    def step(self, t):
        nb = 0
        for _ in range(SUB):
            dt = 1 / FPS / SUB
            self.vel[:, 1] += G * dt; self.pos += self.vel * dt
            d = self.pos - self.c; dist = np.linalg.norm(d, axis=1); touch = dist > R - BR
            self.armed |= dist < R - BR - 22
            if touch.any():
                n = d[touch] / dist[touch, None]; v = self.vel[touch]; vn = (v * n).sum(1, keepdims=True)
                self.vel[touch] = np.where(vn > 0, v - 2 * vn * n, v); self.pos[touch] = self.c + n * (R - BR)
            hit = touch & self.armed; self.armed &= ~hit; k = int(hit.sum()); nb += k
            if k:
                v0 = self.vel[hit]; a = self.rng.uniform(-0.5, 0.5, k); ca, sa = np.cos(a), np.sin(a)
                nv = np.stack([v0[:, 0] * ca - v0[:, 1] * sa, v0[:, 0] * sa + v0[:, 1] * ca], 1) * self.rng.uniform(0.92, 1.04, (k, 1))
                self.pos = np.vstack([self.pos, self.pos[hit]]); self.vel = np.vstack([self.vel, nv]); self.armed = np.concatenate([self.armed, np.zeros(k, bool)])
        if self.done is None and len(self.pos) >= TARGET: self.done = t
        return nb

def run(setup, on_frame=None, max_t=40):
    (n1, s1, seed1), (n2, s2, seed2) = setup
    A, B = Side(277, n1, s1, seed1), Side(803, n2, s2, seed2); hist = []; f = 0
    while f / FPS < max_t:
        t = f / FPS; na, nb = A.step(t), B.step(t); hist.append((len(A.pos), len(B.pos), na, nb))
        if on_frame: on_frame(f, A, B)
        f += 1
        if A.done is not None or B.done is not None: break
    return A, B, hist

SETUP = ((1, 520, 3), (3, 340, 13))   # red: one fast ball; blue: three slow balls (a close race with lead changes)

if sys.argv[1] == "search":
    for s1 in (480, 520, 560, 600, 640):
        for s2 in (340, 400, 460):
            for seed in range(4):
                A, B, h = run(((1, s1, seed), (3, s2, seed + 10)))
                lead = np.sign(np.array([a - b for a, b, *_ in h])); swaps = int((np.diff(lead[lead != 0]) != 0).sum())
                print(s1, s2, seed, "t=%.1f" % (len(h) / FPS), "final", h[-1][0], h[-1][1], "swaps", swaps)
    sys.exit()

import soundfile as sf
from PIL import Image, ImageDraw, ImageFont
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
W, H, SS, HOLD, BG = 1080, 1920, 2, 1.8, (8, 8, 14)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; F = lambda px: ImageFont.truetype(FONT, px)
RED, BLUE = (255, 70, 60), (60, 150, 255)
state = {"trail": Image.new("RGB", (W * SS, H * SS), BG)}
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)

def frame(f, A, B, win=None, hold=0.0):
    if win is None:
        state["trail"] = Image.blend(state["trail"], Image.new("RGB", state["trail"].size, BG), 0.35); dr = ImageDraw.Draw(state["trail"]); r = BR * SS
        for S, col in ((A, RED), (B, BLUE)):
            for x, y in S.pos: dr.ellipse([x * SS - r, y * SS - r, x * SS + r, y * SS + r], fill=col)
    img = state["trail"].resize((W, H), Image.LANCZOS); dr = ImageDraw.Draw(img)
    dr.rounded_rectangle([50, 150, 1030, 290], 30, fill=(255, 212, 0), outline=(0, 0, 0), width=6)
    dr.text((540, 220), f"WHICH SIDE HITS {TARGET:,} FIRST?", font=F(50), fill=(17, 17, 17), anchor="mm")
    for S, col, name, sub in ((A, RED, "RED", "1 fast ball"), (B, BLUE, "BLUE", "3 slow balls")):
        cx, cy = S.c; won = win == name; n = min(len(S.pos), TARGET) if win else len(S.pos)
        dr.ellipse([cx - R - 5, cy - R - 5, cx + R + 5, cy + R + 5], outline=(255, 212, 0) if won else col, width=14 if won else 8)
        dr.text((cx, 420), name, font=F(64), fill=col, anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
        dr.text((cx, 490), sub, font=F(36), fill=(230, 230, 230), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
        size = int(110 * (1 + 0.1 * np.sin(hold * 14))) if won else 110
        dr.text((cx, 620), f"{n:,}", font=F(size), fill=(255, 212, 0) if won else (255, 255, 255), anchor="mm", stroke_width=8, stroke_fill=(0, 0, 0))
        dr.rounded_rectangle([cx - 220, 1320, cx + 220, 1350], 15, fill=(50, 50, 60))
        dr.rounded_rectangle([cx - 220, 1320, cx - 220 + max(30, 440 * min(1, n / TARGET)), 1350], 15, fill=col)
    if win:
        col = RED if win == "RED" else BLUE
        dr.rounded_rectangle([190, 1450, 890, 1610], 36, fill=col, outline=(0, 0, 0), width=8)
        dr.text((540, 1530), f"{win} WINS!", font=F(96), fill=(255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
    if f % (FPS * 3) == 30 or (win and abs(hold - 0.5) < 0.009): img.save(out / f"still_{f:04d}.png")
    ff.stdin.write(img.tobytes())

A, B, hist = run(SETUP, frame)
win = "RED" if (B.done is None or (A.done is not None and A.done <= B.done)) else "BLUE"
n_live = len(hist)
for i in range(int(HOLD * FPS)): frame(n_live + i, A, B, win, i / FPS)
ff.stdin.close(); ff.wait()

# ---- sound: red plucks low, blue rings high, both walking up and down the same five-note scale ----
SR = 44100; dur = (n_live / FPS) + HOLD; audio = np.zeros(int(dur * SR) + SR); t = np.arange(int(0.28 * SR)) / SR
scale = [0, 2, 4, 7, 9, 12, 9, 7, 4, 2]; ia = ib = 0
for f, (na_, nb_, ba, bb) in enumerate(hist):
    for side, cnt, base in ((0, ba, 196.0), (1, bb, 523.25)):
        for j in range(min(cnt, 3)):
            idx = ia if side == 0 else ib
            fr = base * 2 ** (scale[idx % len(scale)] / 12)
            if side == 0: ia += 1
            else: ib += 1
            note = (np.sin(2 * np.pi * fr * t) + 0.4 * np.sin(4 * np.pi * fr * t)) * np.exp(-t * (14 if side == 0 else 20))
            i = int((f + j / 3) / FPS * SR); audio[i:i + len(note)] += note * 0.45 / (1 + 0.05 * min(cnt, 30))
i = int(n_live / FPS * SR); tc = np.arange(int(1.5 * SR)) / SR
for fr in (523.25, 659.25, 783.99, 1046.5): audio[i:i + len(tc)] += 0.4 * np.sin(2 * np.pi * fr * tc) * np.exp(-tc * 2.5)
audio = np.tanh(audio[:int(dur * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "race.mp4")], check=True)
print(f"race.mp4 {dur:.1f}s, {win} wins: red {len(A.pos):,} blue {len(B.pos):,}")
