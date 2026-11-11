"""Flag balls in a ring with a gap: two teams bounce around, the gap turns slowly, and a ball that goes through it
is out. The team that still has a ball inside wins.
usage: python sims/gap.py out/gap/ [seed]   -> gap.mp4 (1080x1920, 60 fps)
       python sims/gap.py search            -> try seeds and print how each one goes"""
import math, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, SUB, R, BR, BASE = 60, 4, 470.0, 58.0, 540.0
GAP, PASS, SPIN, GRAV = 0.21, 0.15, 0.55, 1500.0       # gap half-angle drawn, half-angle a ball fits through, turn speed
C = np.array([540.0, 1090.0])
TEAMS = [("EUROPE", (255, 70, 60), ["England", "France", "Germany", "Italy"]),
         ("ASIA", (60, 150, 255), ["Japan", "Indonesia", "Thailand", "Vietnam"])]

def flag(name, s):
    im = Image.new("RGB", (s, s), "white"); d = ImageDraw.Draw(im); t = s / 3
    bands_v = lambda cols: [d.rectangle([i * s / len(cols), 0, (i + 1) * s / len(cols), s], fill=c) for i, c in enumerate(cols)]
    if name == "England": d.rectangle([s * 0.42, 0, s * 0.58, s], fill="#ce1124"); d.rectangle([0, s * 0.42, s, s * 0.58], fill="#ce1124")
    elif name == "France": bands_v(["#0055a4", "#ffffff", "#ef4135"])
    elif name == "Italy": bands_v(["#009246", "#ffffff", "#ce2b37"])
    elif name == "Germany": [d.rectangle([0, i * t, s, (i + 1) * t], fill=c) for i, c in enumerate(["#000000", "#dd0000", "#ffce00"])]
    elif name == "Japan": d.ellipse([s * 0.28, s * 0.28, s * 0.72, s * 0.72], fill="#bc002d")
    elif name == "Indonesia": d.rectangle([0, 0, s, s / 2], fill="#e70011")
    elif name == "Thailand":
        y = 0
        for h, c in ((1, "#a51931"), (1, "#f4f5f8"), (2, "#2d2a4a"), (1, "#f4f5f8"), (1, "#a51931")): d.rectangle([0, y * s / 6, s, (y + h) * s / 6], fill=c); y += h
    elif name == "Vietnam":
        d.rectangle([0, 0, s, s], fill="#da251d")
        pts = [(s / 2 + (s * 0.3 if k % 2 == 0 else s * 0.115) * math.sin(k * math.pi / 5), s / 2 - (s * 0.3 if k % 2 == 0 else s * 0.115) * math.cos(k * math.pi / 5)) for k in range(10)]
        d.polygon(pts, fill="#ffff00")
    return im

def simulate(seed, on_frame=None, hold=2.2, max_t=70):
    rng = np.random.default_rng(seed); n = 8; team = np.array([0] * 4 + [1] * 4)
    ang = np.concatenate([np.linspace(2.0, 4.3, 4), np.linspace(-1.15, 1.15, 4)])      # Europe on the left, Asia on the right
    pos = C + np.stack([np.cos(ang), np.sin(ang)], 1) * 290
    a = rng.uniform(0, 2 * np.pi, n); vel = np.stack([np.cos(a), np.sin(a)], 1) * BASE * rng.uniform(0.85, 1.15, (n, 1))
    inside = np.ones(n, bool); out_t = np.full(n, np.inf); gap0 = rng.uniform(0, 2 * np.pi)
    events, f, over_at, winner = [], 0, None, None
    while f / FPS < max_t:
        t = f / FPS; gap = gap0 + SPIN * t
        for _ in range(SUB):
            dt = 1 / FPS / SUB
            vel[~inside, 1] += GRAV * dt                                  # balls that got out drop away
            pos += vel * dt
            d = pos - C; dist = np.linalg.norm(d, axis=1)
            for i in np.where(inside & (dist > R - BR))[0]:
                nrm = d[i] / dist[i]; da = (math.atan2(d[i][1], d[i][0]) - gap + math.pi) % (2 * math.pi) - math.pi
                if abs(da) < PASS and vel[i] @ nrm > 0:                 # lined up with the gap: it is through
                    if dist[i] > R: inside[i] = False; out_t[i] = t; events.append((t, "out", i))
                    continue
                vn = vel[i] @ nrm
                if vn > 0: vel[i] -= 2 * vn * nrm; vel[i] *= BASE * rng.uniform(0.85, 1.2) / np.linalg.norm(vel[i]); events.append((t, "wall", i))
                pos[i] = C + nrm * (R - BR)
            idx = np.where(inside)[0]
            for ii, i in enumerate(idx):
                for j in idx[ii + 1:]:
                    dv = pos[j] - pos[i]; dd = np.linalg.norm(dv)
                    if dd >= 2 * BR or dd == 0: continue
                    nrm = dv / dd; rel = (vel[i] - vel[j]) @ nrm
                    pos[i] -= nrm * (2 * BR - dd) / 2; pos[j] += nrm * (2 * BR - dd) / 2
                    if rel > 0: vel[i] -= rel * nrm; vel[j] += rel * nrm; events.append((t, "bump", i))
        left = [inside[team == k].sum() for k in (0, 1)]
        if over_at is None and min(left) == 0: over_at, winner = t, int(left[1] > 0)
        if on_frame: on_frame(f, t, pos, inside, out_t, gap, winner, team)
        f += 1
        if over_at is not None and t - over_at >= hold: break
    return dict(over=over_at, winner=winner, inside=inside, events=events, frames=f)

if sys.argv[1] == "search":
    for seed in range(80):
        r = simulate(seed, hold=0)
        if r["over"] is None: continue
        outs = [round(t, 1) for t, k, _ in r["events"] if k == "out"]
        print(seed, "t=%.1f" % r["over"], TEAMS[r["winner"]][0], "left in", int(r["inside"].sum()), "outs", outs)
    sys.exit()

import soundfile as sf
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); seed = int(sys.argv[2]) if len(sys.argv) > 2 else 0
W, H, SS, BG = 1080, 1920, 2, (8, 8, 14)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; F = lambda px: ImageFont.truetype(FONT, px)
names = TEAMS[0][2] + TEAMS[1][2]
d2 = int(BR * 2 * SS); mask = Image.new("L", (d2, d2), 0); ImageDraw.Draw(mask).ellipse([0, 0, d2 - 1, d2 - 1], fill=255)
sprites = [flag(nm, d2) for nm in names]; small = [flag(nm, 84) for nm in names]
smask = Image.new("L", (84, 84), 0); ImageDraw.Draw(smask).ellipse([0, 0, 83, 83], fill=255)
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)

def frame(f, t, pos, inside, out_t, gap, winner, team):
    hi = Image.new("RGB", (W * SS, H * SS), BG); d = ImageDraw.Draw(hi); S = SS
    box = [(C[0] - R - 6) * S, (C[1] - R - 6) * S, (C[0] + R + 6) * S, (C[1] + R + 6) * S]
    g = math.degrees(gap); d.arc(box, g + math.degrees(GAP), g - math.degrees(GAP) + 360, fill=(255, 255, 255), width=12 * S)
    for sgn in (-1, 1):                                # bright posts either side of the gap
        a = gap + sgn * GAP; x, y = (C[0] + R * math.cos(a)) * S, (C[1] + R * math.sin(a)) * S; d.ellipse([x - 14 * S, y - 14 * S, x + 14 * S, y + 14 * S], fill=(255, 212, 0))
    for i in range(len(pos)):
        if not inside[i] and (t - out_t[i] > 1.2 or pos[i][1] > H + 100): continue
        x, y = pos[i] * S; col = TEAMS[team[i]][1]; r = BR * S
        hi.paste(sprites[i], (int(x - r), int(y - r)), mask)
        d.ellipse([x - r - 4 * S, y - r - 4 * S, x + r + 4 * S, y + r + 4 * S], outline=col if inside[i] else (120, 120, 130), width=8 * S)
    img = hi.resize((W, H), Image.LANCZOS); d = ImageDraw.Draw(img)
    d.rounded_rectangle([110, 120, 970, 250], 30, fill=(255, 212, 0), outline=(0, 0, 0), width=6)
    d.text((540, 185), "WHICH TEAM STAYS IN?", font=F(62), fill=(17, 17, 17), anchor="mm")
    d.text((540, 292), "fall through the gap = out", font=F(38), fill=(230, 230, 230), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
    for k, (nm, col, _) in enumerate(TEAMS):
        cx = 280 + k * 520
        d.text((cx, 370), nm, font=F(58), fill=col, anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
        for m in range(4):
            i = k * 4 + m; x, y = cx - 150 + m * 100 - 42, 420
            if inside[i]: img.paste(small[i], (x, y), smask); d.ellipse([x, y, x + 84, y + 84], outline=col, width=5)
            else:
                d.ellipse([x, y, x + 84, y + 84], outline=(70, 70, 80), width=5); d.line([x + 18, y + 18, x + 66, y + 66], fill=(110, 110, 120), width=8); d.line([x + 66, y + 18, x + 18, y + 66], fill=(110, 110, 120), width=8)
    d.text((540, 465), "VS", font=F(40), fill=(230, 230, 230), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
    if winner is not None:
        nm, col, _ = TEAMS[winner]
        d.rounded_rectangle([140, 1650, 940, 1810], 36, fill=col, outline=(0, 0, 0), width=8)
        d.text((540, 1730), f"{nm} WINS!", font=F(92), fill=(255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
    if f % (FPS * 5) == 45 or f == frame.last: img.save(out / f"still_{f:04d}.png")
    ff.stdin.write(img.tobytes())
frame.last = simulate(seed)["frames"] - 30
res = simulate(seed, frame); ff.stdin.close(); ff.wait()

# ---- sound: a tick off the wall, a soft knock when balls bump, a falling whistle when one goes out, a chord for the win ----
SR = 44100; dur = res["frames"] / FPS; audio = np.zeros(int(dur * SR) + SR * 2)
def add(t0, sig, g): i = int(t0 * SR); audio[i:i + len(sig)] += sig * g
tt = lambda s: np.arange(int(s * SR)) / SR
scale = [0, 2, 4, 7, 9, 12, 14, 16]
for t0, kind, who in res["events"]:
    if kind == "wall": t = tt(0.2); fr = 392 * 2 ** (scale[who] / 12); add(t0, (np.sin(2 * np.pi * fr * t) + 0.3 * np.sin(4 * np.pi * fr * t)) * np.exp(-t * 22), 0.3)
    elif kind == "bump": t = tt(0.1); add(t0, np.sin(2 * np.pi * 200 * t) * np.exp(-t * 45), 0.3)
    elif kind == "out": t = tt(0.7); add(t0, np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t * 3.5)) / SR) * np.exp(-t * 4), 0.6)
t = tt(1.8)
for fr in (523.25, 659.25, 783.99, 1046.5): add(res["over"], np.sin(2 * np.pi * fr * t) * np.exp(-t * 2.2), 0.35)
audio = np.tanh(audio[:int(dur * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "gap.mp4")], check=True)
print(f"gap.mp4 {dur:.1f}s, {TEAMS[res['winner']][0]} wins, still in: {[names[i] for i in np.where(res['inside'])[0]]}")
