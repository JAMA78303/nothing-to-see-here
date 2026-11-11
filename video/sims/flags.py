"""Country-ball battle: two teams of flag balls bounce around a ring. When rivals collide, the slower one loses
health; at zero it is knocked out. Last team standing wins.
usage: python sims/flags.py out/flags/ [seed]   -> flags.mp4 (1080x1920, 60 fps)
       python sims/flags.py search              -> try seeds and print how each battle goes"""
import subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, SUB, R, BR, BASE, HP, DMG = 60, 4, 470.0, 58.0, 520.0, 100, 20
C = np.array([540.0, 1090.0])
TEAMS = [("EUROPE", (255, 70, 60), ["England", "France", "Germany", "Italy"]),
         ("WORLD", (60, 150, 255), ["Japan", "Nigeria", "Colombia", "Indonesia"])]

def flag(name, s):
    im = Image.new("RGB", (s, s), "white"); d = ImageDraw.Draw(im); t = s / 3
    bands_v = lambda cols: [d.rectangle([i * s / len(cols), 0, (i + 1) * s / len(cols), s], fill=c) for i, c in enumerate(cols)]
    if name == "England": d.rectangle([s * 0.42, 0, s * 0.58, s], fill="#ce1124"); d.rectangle([0, s * 0.42, s, s * 0.58], fill="#ce1124")
    elif name == "France": bands_v(["#0055a4", "#ffffff", "#ef4135"])
    elif name == "Italy": bands_v(["#009246", "#ffffff", "#ce2b37"])
    elif name == "Nigeria": bands_v(["#008751", "#ffffff", "#008751"])
    elif name == "Germany": [d.rectangle([0, i * t, s, (i + 1) * t], fill=c) for i, c in enumerate(["#000000", "#dd0000", "#ffce00"])]
    elif name == "Japan": d.ellipse([s * 0.28, s * 0.28, s * 0.72, s * 0.72], fill="#bc002d")
    elif name == "Colombia": d.rectangle([0, 0, s, s / 2], fill="#fcd116"); d.rectangle([0, s / 2, s, s * 0.75], fill="#003893"); d.rectangle([0, s * 0.75, s, s], fill="#ce1126")
    elif name == "Indonesia": d.rectangle([0, 0, s, s / 2], fill="#e70011")
    return im

def simulate(seed, on_frame=None, hold=2.2, max_t=60):
    rng = np.random.default_rng(seed); n = 8
    team = np.array([0] * 4 + [1] * 4)
    ang = np.concatenate([np.linspace(2.0, 4.3, 4), np.linspace(-1.15, 1.15, 4)])      # team 0 on the left, team 1 on the right
    pos = C + np.stack([np.cos(ang), np.sin(ang)], 1) * 300
    a = rng.uniform(0, 2 * np.pi, n); vel = np.stack([np.cos(a), np.sin(a)], 1) * BASE * rng.uniform(0.85, 1.15, (n, 1))
    hp = np.full(n, HP, float); alive = np.ones(n, bool); cool = np.zeros((n, n)); flash = np.zeros(n)
    events, parts, f, over_at, winner = [], [], 0, None, None
    while f / FPS < max_t:
        t = f / FPS
        for _ in range(SUB):
            dt = 1 / FPS / SUB; pos[alive] += vel[alive] * dt; cool -= dt
            d = pos - C; dist = np.linalg.norm(d, axis=1)
            for i in np.where(alive & (dist > R - BR))[0]:
                nrm = d[i] / dist[i]; vn = vel[i] @ nrm
                if vn > 0:
                    vel[i] -= 2 * vn * nrm; vel[i] *= BASE * rng.uniform(0.8, 1.25) / np.linalg.norm(vel[i]); events.append((t, "wall", i))
                pos[i] = C + nrm * (R - BR)
            idx = np.where(alive)[0]
            for ii, i in enumerate(idx):
                for j in idx[ii + 1:]:
                    dv = pos[j] - pos[i]; dd = np.linalg.norm(dv)
                    if dd >= 2 * BR or dd == 0: continue
                    nrm = dv / dd; rel = (vel[i] - vel[j]) @ nrm
                    pos[i] -= nrm * (2 * BR - dd) / 2; pos[j] += nrm * (2 * BR - dd) / 2
                    if rel <= 0: continue
                    si, sj = np.linalg.norm(vel[i]), np.linalg.norm(vel[j])
                    vel[i] -= rel * nrm; vel[j] += rel * nrm
                    if team[i] != team[j] and cool[i, j] <= 0:      # rivals: the slower ball takes the hit
                        cool[i, j] = 0.3; lose = j if si > sj else i
                        hp[lose] -= DMG; flash[lose] = 0.25; events.append((t, "hit", lose))
                        if hp[lose] <= 0:
                            alive[lose] = False; events.append((t, "ko", lose))
                            for _k in range(16):
                                pa = rng.uniform(0, 2 * np.pi); parts.append([pos[lose].copy(), np.array([np.cos(pa), np.sin(pa)]) * rng.uniform(200, 620), t, lose])
                    else: events.append((t, "bump", i))
        flash = np.maximum(0, flash - 1 / FPS)
        left = [alive[team == k].sum() for k in (0, 1)]
        if over_at is None and min(left) == 0: over_at, winner = t, int(left[1] > 0)
        if on_frame: on_frame(f, t, pos, hp, alive, flash, parts, winner, team)
        f += 1
        if over_at is not None and t - over_at >= hold: break
    return dict(over=over_at, winner=winner, hp=hp, alive=alive, events=events, frames=f)

if sys.argv[1] == "search":
    for seed in range(60):
        r = simulate(seed, hold=0)
        if r["over"] is None: continue
        kos = [round(t, 1) for t, k, _ in r["events"] if k == "ko"]
        print(seed, "t=%.1f" % r["over"], TEAMS[r["winner"]][0], "survivors", int(r["alive"].sum()), "hp", [int(h) for h in r["hp"][r["alive"]]], "KOs", kos)
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

def frame(f, t, pos, hp, alive, flash, parts, winner, team):
    hi = Image.new("RGB", (W * SS, H * SS), BG); d = ImageDraw.Draw(hi); S = SS
    d.ellipse([(C[0] - R - 6) * S, (C[1] - R - 6) * S, (C[0] + R + 6) * S, (C[1] + R + 6) * S], outline=(255, 255, 255), width=10 * S)
    for p0, v, t0, who in parts:                      # knocked-out balls burst into bits
        age = t - t0
        if 0 <= age < 0.6:
            p = p0 + v * age; r = 12 * (1 - age / 0.6) * S; d.ellipse([p[0] * S - r, p[1] * S - r, p[0] * S + r, p[1] * S + r], fill=TEAMS[team[who]][1])
    for i in np.where(alive)[0]:
        x, y = pos[i] * S; col = TEAMS[team[i]][1]; r = BR * S
        hi.paste(sprites[i], (int(x - r), int(y - r)), mask)
        d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255) if flash[i] > 0 else (20, 20, 24), width=5 * S)
        ro = r + 9 * S                                  # health ring in the team colour
        d.arc([x - ro, y - ro, x + ro, y + ro], 0, 360, fill=(50, 50, 60), width=8 * S)
        d.arc([x - ro, y - ro, x + ro, y + ro], -90, -90 + 360 * max(0, hp[i]) / HP, fill=col, width=8 * S)
    img = hi.resize((W, H), Image.LANCZOS); d = ImageDraw.Draw(img)
    d.rounded_rectangle([150, 130, 930, 260], 30, fill=(255, 212, 0), outline=(0, 0, 0), width=6)
    d.text((540, 195), "WHICH TEAM WINS?", font=F(66), fill=(17, 17, 17), anchor="mm")
    for k, (nm, col, _) in enumerate(TEAMS):
        cx = 280 + k * 520
        d.text((cx, 330), nm, font=F(58), fill=col, anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
        for m in range(4):
            i = k * 4 + m; x, y = cx - 150 + m * 100 - 42, 380
            if alive[i]: img.paste(small[i], (x, y), smask); d.ellipse([x, y, x + 84, y + 84], outline=col, width=5)
            else:
                d.ellipse([x, y, x + 84, y + 84], outline=(70, 70, 80), width=5); d.line([x + 18, y + 18, x + 66, y + 66], fill=(110, 110, 120), width=8); d.line([x + 66, y + 18, x + 18, y + 66], fill=(110, 110, 120), width=8)
    d.text((540, 425), "VS", font=F(40), fill=(230, 230, 230), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
    if winner is not None:
        nm, col, _ = TEAMS[winner]
        d.rounded_rectangle([140, 1630, 940, 1790], 36, fill=col, outline=(0, 0, 0), width=8)
        d.text((540, 1710), f"{nm} WINS!", font=F(92), fill=(255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
    if f % (FPS * 5) == 45 or f == frame.last: img.save(out / f"still_{f:04d}.png")
    ff.stdin.write(img.tobytes())
frame.last = -1
probe = simulate(seed); frame.last = probe["frames"] - 30
res = simulate(seed, frame); ff.stdin.close(); ff.wait()

# ---- sound: soft ticks off the wall, a pluck for each hit, a falling pop for a knock-out, a chord for the win ----
SR = 44100; dur = res["frames"] / FPS; audio = np.zeros(int(dur * SR) + SR * 2)
def add(t0, sig, g): i = int(t0 * SR); audio[i:i + len(sig)] += sig * g
tt = lambda s: np.arange(int(s * SR)) / SR
for t0, kind, who in res["events"]:
    if kind == "wall": t = tt(0.06); add(t0, np.sin(2 * np.pi * 700 * t) * np.exp(-t * 70), 0.12)
    elif kind == "bump": t = tt(0.1); add(t0, np.sin(2 * np.pi * 220 * t) * np.exp(-t * 40), 0.25)
    elif kind == "hit": t = tt(0.25); fr = 330 * 2 ** ((who % 4) * 3 / 12); add(t0, (np.sin(2 * np.pi * fr * t) + 0.4 * np.sin(4 * np.pi * fr * t)) * np.exp(-t * 16), 0.5)
    elif kind == "ko": t = tt(0.5); add(t0, np.sin(2 * np.pi * (520 * np.exp(-t * 4)) * t) * np.exp(-t * 6), 0.7)
t = tt(1.8)
for fr in (523.25, 659.25, 783.99, 1046.5): add(res["over"], np.sin(2 * np.pi * fr * t) * np.exp(-t * 2.2), 0.35)
audio = np.tanh(audio[:int(dur * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "flags.mp4")], check=True)
print(f"flags.mp4 {dur:.1f}s, {TEAMS[res['winner']][0]} wins, survivors: {[names[i] for i in np.where(res['alive'])[0]]}")
