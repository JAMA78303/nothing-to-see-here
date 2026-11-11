"""Stick-man fight, one against one: jabs, kicks, jump kicks and blocks, health bars, a slow-motion final blow.
The fight is not scripted: each fighter picks moves at random and the seed decides how it goes.
usage: python sims/fight.py out/fight/ [seed]   -> fight.mp4 (1080x1920, 60 fps)
       python sims/fight.py search              -> try seeds and print how each fight goes"""
import math, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, FLOOR, HP, Z = 60, 1430, 100, 1.45      # Z: how far the camera is zoomed in on the fighters
L = dict(torso=135, head=40, ua=72, fa=72, th=92, sh=92)
COL = [(255, 70, 60), (60, 150, 255)]; NAME = ["RED", "BLUE"]
# angles in degrees: limbs from straight down, + = towards the opponent; torso from upright, + = leaning in
POSES = {
    "idle":  dict(torso=10, aF=(75, 160), aB=(45, 150), lF=(24, -8), lB=(-26, -14), dy=0),
    "walkA": dict(torso=12, aF=(70, 150), aB=(40, 140), lF=(38, 10), lB=(-34, -30), dy=0),
    "walkB": dict(torso=12, aF=(70, 150), aB=(40, 140), lF=(-16, -30), lB=(26, 6), dy=0),
    "jab":   dict(torso=20, aF=(96, 94), aB=(40, 150), lF=(34, -4), lB=(-34, -18), dy=0),
    "kick":  dict(torso=-24, aF=(40, 120), aB=(-50, 10), lF=(4, -2), lB=(98, 92), dy=0),
    "jkick": dict(torso=-12, aF=(140, 170), aB=(-60, -20), lF=(102, 96), lB=(40, -70), dy=0),
    "block": dict(torso=-6, aF=(118, 182), aB=(104, 176), lF=(22, -10), lB=(-30, -16), dy=0),
    "hit":   dict(torso=-34, aF=(10, 50), aB=(-60, -20), lF=(18, -12), lB=(-40, -26), dy=0),
    "ko":    dict(torso=-88, aF=(-110, -100), aB=(-70, -95), lF=(82, 88), lB=(74, 96), dy=0),
    "win":   dict(torso=0, aF=(165, 190), aB=(-165, -190), lF=(16, 4), lB=(-16, -4), dy=0),
}
ATK = {  # wind-up ends, moment of impact, move ends (s), reach (px), damage, knock-back (px/s), forward lunge (px/s)
    "jab":   dict(wind=0.06, hit=0.12, end=0.32, reach=185, dmg=7, kb=170, lunge=60),
    "kick":  dict(wind=0.13, hit=0.23, end=0.55, reach=225, dmg=13, kb=340, lunge=40),
    "jkick": dict(wind=0.18, hit=0.36, end=0.8, reach=250, dmg=20, kb=540, lunge=430),
}
flat = lambda p: np.array([p["torso"], *p["aF"], *p["aB"], *p["lF"], *p["lB"], p["dy"]], float)

class Fighter:
    def __init__(self, i, x): self.i, self.x, self.face, self.hp = i, x, 1 if i == 0 else -1, HP; self.state, self.t, self.cd, self.vx = "idle", 0.0, 0.4 + 0.2 * i, 0.0; self.atk = None; self.done = False; self.pose = flat(POSES["idle"]); self.blockfor = 0
    def target(self, time):
        s = self.state
        if s == "walk": k = 0.5 + 0.5 * math.sin(time * 16); return flat(POSES["walkA"]) * k + flat(POSES["walkB"]) * (1 - k)
        if s == "atk":
            a = ATK[self.atk]; p = flat(POSES[self.atk if a["wind"] * 0.5 < self.t < a["end"] * 0.72 else "idle"]).copy()
            if self.atk == "jkick": p[9] = -170 * math.sin(math.pi * min(1, self.t / a["end"]))
            return p
        p = flat(POSES[{"idle": "idle", "hit": "hit", "block": "block", "ko": "ko", "win": "win"}[s]]).copy()
        if s == "idle": p[9] = 6 * math.sin(time * 9 + self.i * 2)
        if s == "win": p[9] = -28 * abs(math.sin(time * 7))
        return p

def simulate(seed, on_frame=None, hold=2.8, max_t=60):
    rng = np.random.default_rng(seed); A, B = Fighter(0, 340.0), Fighter(1, 740.0); F = [A, B]
    events, fx, time, f, over_at, winner, slow_until = [], [], 0.0, 0, None, None, -1
    real = 0.0
    while real < max_t:
        scale = 0.22 if time < slow_until else 1.0; dt = scale / FPS
        for me, op in ((A, B), (B, A)):
            me.face = 1 if op.x > me.x else -1; d = abs(op.x - me.x); me.t += dt; me.cd -= dt
            if me.state == "idle" and over_at is None and me.cd <= 0:
                if d > 235: me.state, me.t = "walk", 0
                elif d < 135: me.vx = -me.face * 420; me.cd = 0.18
                else:
                    r = rng.random()
                    if r < 0.48: me.atk = "jab"
                    elif r < 0.78: me.atk = "kick"
                    elif r < 0.9: me.atk = "jkick"
                    else: me.atk = None; me.state, me.t, me.blockfor = "block", 0, 0.45
                    if me.atk:
                        me.state, me.t, me.done = "atk", 0, False; events.append((real, "swing", me.i))
                        if op.state == "idle" and rng.random() < 0.24: op.state, op.t, op.blockfor = "block", 0, ATK[me.atk]["end"] * 0.8
            elif me.state == "walk":
                me.x += me.face * 300 * dt
                if d < 190 or me.t > 1.2: me.state, me.cd = "idle", rng.uniform(0.02, 0.2)
            elif me.state == "atk":
                a = ATK[me.atk]
                if a["wind"] < me.t < a["hit"] + 0.05: me.x += me.face * a["lunge"] * dt
                if not me.done and me.t >= a["hit"]:
                    me.done = True
                    if d < a["reach"] and op.state != "ko":
                        px, py = (me.x + op.x) / 2 + me.face * 30, FLOOR - (330 if me.atk == "jab" else 250)
                        if op.state == "block":
                            op.hp -= a["dmg"] * 0.15; op.vx = me.face * a["kb"] * 0.35; events.append((real, "block", me.i)); fx.append((time, px, py, "block", 0))
                        else:
                            op.hp -= a["dmg"]; op.state, op.t, op.vx = "hit", 0, me.face * a["kb"]; events.append((real, me.atk, me.i)); fx.append((time, px, py, "hit", a["dmg"]))
                        if op.hp <= 0 and over_at is None:
                            op.hp = 0; op.state, op.t = "ko", 0; op.vx = me.face * 620; over_at, winner = real, me.i; slow_until = time + 0.2; events.append((real, "ko", me.i))
                if me.t >= a["end"]: me.state, me.cd = "idle", rng.uniform(0.1, 0.5)
            elif me.state == "hit" and me.t > 0.3: me.state, me.cd = "idle", rng.uniform(0.02, 0.22)
            elif me.state == "block" and me.t > me.blockfor: me.state, me.cd = "idle", rng.uniform(0.02, 0.15)
            if over_at is not None and me.i == winner and me.state == "idle" and time > slow_until + 0.25: me.state = "win"
            me.x += me.vx * dt; me.vx *= 0.86 ** (dt * FPS); me.x = min(815, max(265, me.x))
            me.pose += (me.target(time) - me.pose) * (1 - (0.62 if me.state != "ko" else 0.8) ** (dt * FPS))
        if abs(A.x - B.x) < 120 and over_at is None:             # they never stand inside each other
            mid = (A.x + B.x) / 2; s = 1 if A.x < B.x else -1; A.x, B.x = mid - 60 * s, mid + 60 * s
        if on_frame: on_frame(f, real, time, F, fx, winner)
        time += dt; real += 1 / FPS; f += 1
        if over_at is not None and real - over_at >= hold: break
    return dict(over=over_at, winner=winner, hp=[A.hp, B.hp], events=events, frames=f)

if sys.argv[1] == "search":
    for seed in range(80):
        r = simulate(seed, hold=0)
        if r["over"] is None: continue
        print(seed, "t=%.1f" % r["over"], NAME[r["winner"]], "hp left %d" % max(r["hp"]), "last blow", [k for _, k, _ in r["events"] if k in ATK][-1])
    sys.exit()

import soundfile as sf
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); seed = int(sys.argv[2]) if len(sys.argv) > 2 else 0
W, H, SS, BG = 1080, 1920, 2, (10, 10, 18)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; Fnt = lambda px: ImageFont.truetype(FONT, px)
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)
shown = [float(HP), float(HP)]

def joints(fg):
    torso, a1, a2, b1, b2, l1, l2, m1, m2, dy = fg.pose; s = fg.face; r = math.radians
    seg = lambda p, ang, ln: (p[0] + s * ln * math.sin(r(ang)), p[1] + ln * math.cos(r(ang)))
    kF, kB = seg((0, 0), l1, L["th"]), seg((0, 0), m1, L["th"]); fF, fB = seg(kF, l2, L["sh"]), seg(kB, m2, L["sh"])
    hip = (fg.x, FLOOR - max(fF[1], fB[1], 26) + dy)                      # the lower foot rests on the floor
    at = lambda p: (hip[0] + p[0], hip[1] + p[1])
    sh = (hip[0] + s * L["torso"] * math.sin(r(torso)), hip[1] - L["torso"] * math.cos(r(torso)))
    head = (sh[0] + s * (L["head"] + 14) * math.sin(r(torso)), sh[1] - (L["head"] + 14) * math.cos(r(torso)))
    eF, eB = seg(sh, a1, L["ua"]), seg(sh, b1, L["ua"])
    return dict(hip=hip, sh=sh, head=head, back=[(sh, eB, seg(eB, b2, L["fa"])), (hip, at(kB), at(fB))], front=[(sh, eF, seg(eF, a2, L["fa"])), (hip, at(kF), at(fF))])

def frame(f, real, time, F, fx, winner):
    hi = Image.new("RGB", (W * SS, H * SS), BG); d = ImageDraw.Draw(hi); S = SS
    shake = max([0] + [1 - (time - t0) / 0.12 for t0, *_r in fx if _r[2] == "hit" and 0 <= time - t0 < 0.12]); ox = 10 * shake * math.sin(real * 90); oy = 7 * shake * math.cos(real * 70)
    P = lambda p: ((540 + (p[0] - 540) * Z + ox) * S, (FLOOR + (p[1] - FLOOR) * Z + oy) * S)
    d.rectangle([0, (FLOOR + oy) * S, W * S, H * S], fill=(22, 22, 34)); d.line([0, (FLOOR + oy) * S, W * S, (FLOOR + oy) * S], fill=(90, 90, 110), width=6 * S)
    for fg in sorted(F, key=lambda g: g.state != "ko"):
        J = joints(fg); col = COL[fg.i]; dark = tuple(int(c * 0.6) for c in col); wd = int(24 * S * Z)
        sx = 540 + (fg.x - 540) * Z + ox; d.ellipse([(sx - 120) * S, (FLOOR - 12) * S, (sx + 120) * S, (FLOOR + 18) * S], fill=(4, 4, 8))
        def limb(pts, c):
            d.line([P(p) for p in pts], fill=c, width=wd, joint="curve")
            for p in pts: x, y = P(p); d.ellipse([x - wd / 2, y - wd / 2, x + wd / 2, y + wd / 2], fill=c)
        for pts in J["back"]: limb(pts, dark)
        limb((J["hip"], J["sh"]), col)
        hx, hy = P(J["head"]); hr = L["head"] * S * Z; d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=col)
        for pts in J["front"]: limb(pts, col)
    for t0, px, py, kind, dmg in fx:
        age = time - t0
        if 0 <= age < 0.16:                              # impact star
            k = age / 0.16; c = (255, 230, 80) if kind == "hit" else (200, 220, 255)
            for a in range(8):
                an = a * math.pi / 4 + 0.3; r0, r1 = (30 + 90 * k) * S, (70 + 160 * k) * S; x, y = P((px, py))
                d.line([x + r0 * math.cos(an), y + r0 * math.sin(an), x + r1 * math.cos(an), y + r1 * math.sin(an)], fill=c, width=int(12 * (1 - k) + 3) * S)
    img = hi.resize((W, H), Image.LANCZOS); d = ImageDraw.Draw(img)
    for t0, px, py, kind, dmg in fx:
        age = time - t0
        px, py = 540 + (px - 540) * Z, FLOOR + (py - FLOOR) * Z
        if kind == "hit" and 0 <= age < 0.6: d.text((px, py - 70 - 120 * age), f"-{dmg}", font=Fnt(84), fill=(255, 230, 80), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
        if kind == "block" and 0 <= age < 0.5: d.text((px, py - 70 - 90 * age), "BLOCK", font=Fnt(46), fill=(200, 220, 255), anchor="mm", stroke_width=5, stroke_fill=(0, 0, 0))
    d.rounded_rectangle([130, 130, 950, 260], 30, fill=(255, 212, 0), outline=(0, 0, 0), width=6)
    d.text((540, 195), "WHO WINS? RED OR BLUE", font=Fnt(56), fill=(17, 17, 17), anchor="mm")
    for fg in F:
        shown[fg.i] += (fg.hp - shown[fg.i]) * 0.2; x0 = 60 if fg.i == 0 else 580; w = 440
        d.text((x0 + (0 if fg.i == 0 else w), 330), NAME[fg.i], font=Fnt(56), fill=COL[fg.i], anchor="lm" if fg.i == 0 else "rm", stroke_width=6, stroke_fill=(0, 0, 0))
        d.rounded_rectangle([x0, 380, x0 + w, 430], 14, fill=(40, 40, 52), outline=(0, 0, 0), width=5)
        fill = w * max(0, shown[fg.i]) / HP
        if fill > 8: d.rounded_rectangle([x0 if fg.i == 0 else x0 + w - fill, 380, x0 + fill if fg.i == 0 else x0 + w, 430], 14, fill=COL[fg.i], outline=(0, 0, 0), width=5)
    d.text((540, 405), "VS", font=Fnt(40), fill=(230, 230, 230), anchor="mm", stroke_width=4, stroke_fill=(0, 0, 0))
    if winner is not None and any(g.state == "win" for g in F):
        d.rounded_rectangle([170, 1560, 910, 1720], 36, fill=COL[winner], outline=(0, 0, 0), width=8)
        d.text((540, 1640), f"{NAME[winner]} WINS!", font=Fnt(96), fill=(255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
    if f % (FPS * 3) == 100 or f in frame.keep: img.save(out / f"still_{f:04d}.png")
    ff.stdin.write(img.tobytes())
probe = simulate(seed); frame.keep = {int(probe["over"] * FPS) + 14, probe["frames"] - 30}
res = simulate(seed, frame); ff.stdin.close(); ff.wait()

# ---- sound: a steady drum under the fight, a thud for each blow, a click for a block, a boom and a chord for the knock-out ----
SR = 44100; dur = res["frames"] / FPS; audio = np.zeros(int(dur * SR) + SR * 2); rs = np.random.default_rng(1)
def add(t0, sig, g): i = int(t0 * SR); audio[i:i + len(sig)] += sig * g
tt = lambda s: np.arange(int(s * SR)) / SR
def thud(fr, s, noise): t = tt(s); return (np.sin(2 * np.pi * np.cumsum(fr * np.exp(-t * 9)) / SR) + noise * rs.standard_normal(len(t)) * np.exp(-t * 60)) * np.exp(-t * (5 / s))
beat = 0.0
while beat < res["over"]: add(beat, thud(110, 0.18, 0.0), 0.22); add(beat + 0.25, thud(4000, 0.04, 1.0), 0.05); beat += 0.5
for t0, kind, who in res["events"]:
    if kind == "swing": t = tt(0.12); add(t0, rs.standard_normal(len(t)) * np.sin(np.pi * t / 0.12) ** 2, 0.06)
    elif kind == "jab": add(t0, thud(240, 0.14, 0.8), 0.55)
    elif kind == "kick": add(t0, thud(170, 0.2, 0.9), 0.75)
    elif kind == "jkick": add(t0, thud(130, 0.28, 1.0), 0.95)
    elif kind == "block": t = tt(0.07); add(t0, np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 60), 0.3)
    elif kind == "ko":
        add(t0, thud(70, 0.9, 0.6), 1.0); t = tt(1.8)
        for fr in (523.25, 659.25, 783.99, 1046.5): add(t0 + 0.9, np.sin(2 * np.pi * fr * t) * np.exp(-t * 2.2), 0.3)
audio = np.tanh(audio[:int(dur * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "fight.mp4")], check=True)
print(f"fight.mp4 {dur:.1f}s, {NAME[res['winner']]} wins with {max(res['hp']):.0f} health left")
