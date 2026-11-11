"""Stick-man fight, one against one, with over-the-top moves: launching uppercuts, tornado kicks, energy blasts,
teleport strikes, ground slams, punch flurries and backflip dodges. Health bars and a slow-motion final blow.
The fight is not scripted: each fighter picks moves at random and the seed decides how it goes.
usage: python sims/fight.py out/fight/ [seed]   -> fight.mp4 (1080x1920, 60 fps)
       python sims/fight.py search              -> try seeds and print how each fight goes"""
import math, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, FLOOR, HP, Z, GRAV, STAND = 60, 1430, 120, 1.1, 3400.0, 178   # Z: camera zoom on the fighters
L = dict(torso=135, head=40, ua=72, fa=72, th=92, sh=92)
COL = [(255, 70, 60), (60, 150, 255)]; NAME = ["RED", "BLUE"]
# angles in degrees: limbs from straight down, + = towards the opponent; torso from upright, + = leaning in
POSES = {
    "idle":   dict(torso=10, aF=(75, 160), aB=(45, 150), lF=(24, -8), lB=(-26, -14)),
    "walkA":  dict(torso=12, aF=(70, 150), aB=(40, 140), lF=(38, 10), lB=(-34, -30)),
    "walkB":  dict(torso=12, aF=(70, 150), aB=(40, 140), lF=(-16, -30), lB=(26, 6)),
    "jab":    dict(torso=20, aF=(96, 94), aB=(40, 150), lF=(34, -4), lB=(-34, -18)),
    "jabB":   dict(torso=24, aF=(40, 150), aB=(98, 94), lF=(34, -4), lB=(-34, -18)),
    "kick":   dict(torso=-24, aF=(40, 120), aB=(-50, 10), lF=(4, -2), lB=(98, 92)),
    "jkick":  dict(torso=-12, aF=(140, 170), aB=(-60, -20), lF=(102, 96), lB=(40, -70)),
    "upper":  dict(torso=-8, aF=(178, 186), aB=(30, 120), lF=(12, 0), lB=(-14, -6)),
    "charge": dict(torso=-14, aF=(30, 96), aB=(24, 92), lF=(32, -6), lB=(-36, -22)),
    "fire":   dict(torso=20, aF=(94, 90), aB=(86, 90), lF=(36, -4), lB=(-38, -22)),
    "slamup": dict(torso=0, aF=(172, 186), aB=(164, 180), lF=(62, -40), lB=(40, -64)),
    "slamdn": dict(torso=38, aF=(58, 66), aB=(48, 58), lF=(52, -30), lB=(30, -52)),
    "land":   dict(torso=44, aF=(40, 60), aB=(30, 50), lF=(62, -36), lB=(-24, -70)),
    "block":  dict(torso=-6, aF=(118, 182), aB=(104, 176), lF=(22, -10), lB=(-30, -16)),
    "hit":    dict(torso=-34, aF=(10, 50), aB=(-60, -20), lF=(18, -12), lB=(-40, -26)),
    "tumble": dict(torso=30, aF=(60, 120), aB=(-30, 40), lF=(72, 10), lB=(40, -34)),
    "tuck":   dict(torso=40, aF=(60, 110), aB=(50, 100), lF=(80, -20), lB=(70, -30)),
    "ko":     dict(torso=-88, aF=(-110, -100), aB=(-70, -95), lF=(82, 88), lB=(74, 96)),
    "win":    dict(torso=0, aF=(150, 200), aB=(-150, -200), lF=(16, 4), lB=(-16, -4)),
}
flat = lambda p: np.array([p["torso"], *p["aF"], *p["aB"], *p["lF"], *p["lB"]], float)
P_ = {k: flat(v) for k, v in POSES.items()}
MOVES = {  # hits: moments of impact (s); end: move length; reach px; dmg per hit; kb: knock-back px/s; launch: upward speed given to the victim
    "jab":     dict(hits=[0.12], end=0.32, reach=185, dmg=6, kb=170, lunge=60),
    "kick":    dict(hits=[0.23], end=0.55, reach=225, dmg=11, kb=340, lunge=40),
    "jkick":   dict(hits=[0.36], end=0.8, reach=250, dmg=16, kb=540, lunge=430),
    "upper":   dict(hits=[0.2], end=0.62, reach=190, dmg=12, kb=150, launch=1350, lunge=80),
    "tornado": dict(hits=[0.25, 0.45, 0.65], end=0.92, reach=220, dmg=6, kb=230, lunge=240),
    "flurry":  dict(hits=[0.1, 0.18, 0.26, 0.34, 0.42, 0.5], end=0.78, reach=195, dmg=3, kb=70, lunge=90),
    "blast":   dict(hits=[], end=0.85, fire=0.42, dmg=16, kb=700),
    "teleport": dict(hits=[0.44], end=0.78, reach=235, dmg=14, kb=440, lunge=0),
    "slam":    dict(hits=[], end=0.98, land=0.6, reach=300, dmg=17, kb=260, launch=820),
}

class Fighter:
    def __init__(self, i, x):
        self.i, self.x, self.face, self.hp = i, x, 1 if i == 0 else -1, HP
        self.state, self.t, self.cd, self.vx, self.move, self.nhit = "idle", 0.0, 0.4 + 0.2 * i, 0.0, None, 0
        self.pose = P_["idle"].copy(); self.dy = 0.0; self.h = 0.0; self.vh = 0.0; self.rot = 0.0; self.spin = 0.0; self.base = STAND
        self.hidden = False; self.blockfor = 0.0; self.x0 = x; self.x1 = x; self.fired = False
    invuln = property(lambda s: s.hidden or s.state == "flip")
    def target(self, time):
        s, t = self.state, self.t
        if s == "walk": k = 0.5 + 0.5 * math.sin(time * 16); return P_["walkA"] * k + P_["walkB"] * (1 - k)
        if s == "atk":
            m, e = self.move, MOVES[self.move]["end"]
            if m == "flurry": return P_["jab" if int(t / 0.08) % 2 == 0 else "jabB"] if t < 0.58 else P_["idle"]
            if m == "blast": return P_["charge"] if t < 0.42 else P_["fire"] if t < 0.72 else P_["idle"]
            if m == "slam": return P_["slamup"] if t < 0.36 else P_["slamdn"] if t < 0.6 else P_["land"]
            if m == "teleport": return P_["kick"] if 0.34 < t < 0.6 else P_["idle"]
            if m == "tornado": return P_["kick"] if 0.1 < t < 0.8 else P_["idle"]
            return P_[m] if 0.03 < t < e * 0.72 else P_["idle"]
        return P_[{"idle": "idle", "hit": "hit", "block": "block", "air": "tumble", "down": "ko", "flip": "tuck", "ko": "ko" if self.h <= 0 else "tumble", "win": "win"}[s]]

def simulate(seed, on_frame=None, hold=2.8, max_t=60):
    rng = np.random.default_rng(seed); A, B = Fighter(0, 340.0), Fighter(1, 740.0); F = [A, B]
    events, fx, shots, time, real, f = [], [], [], 0.0, 0.0, 0
    S = dict(over=None, winner=None, slow=-1.0, used=set(), last=None)

    def strike(me, op, mv, dmg, kb, launch=0, where=None, breaks=False):
        if op.state == "ko" or op.invuln: return False
        px, py = where or ((me.x + op.x) / 2 + me.face * 30, FLOOR - 260 - op.h)
        if op.dy < 0: op.h, op.dy, op.rot = max(op.h, -op.dy), 0.0, 0.0      # caught mid-jump: they drop from where they were
        if op.state == "block" and not breaks:
            op.hp -= dmg * 0.15; op.vx = me.face * kb * 0.35; events.append((real, "block", me.i)); fx.append((time, px, py, "block", 0, me.i))
        else:
            op.hp -= dmg; events.append((real, mv, me.i)); fx.append((time, px, py, "hit", dmg, me.i)); S["last"] = mv
            if launch: op.state, op.t, op.vh, op.spin, op.vx, op.base = "air", 0, launch, -560.0, me.face * max(kb, 140), 120
            elif op.h > 0: op.state, op.t, op.vh, op.vx = "air", 0, 560.0, me.face * kb * 0.5
            else: op.state, op.t, op.vx = "hit", 0, me.face * kb
        if op.hp <= 0 and S["over"] is None:
            op.hp = 0; op.state, op.t = "ko", 0; S["over"], S["winner"], S["slow"] = real, me.i, time + 0.2; events.append((real, "ko", me.i))
            if op.h <= 0 and not launch: op.vh, op.spin, op.base = 760.0, -420.0, 120                # the last blow always sends them flying
            op.vx = me.face * max(abs(op.vx), 520)
        return True

    while real < max_t:
        dt = (0.22 if time < S["slow"] else 1.0) / FPS
        for me, op in ((A, B), (B, A)):
            d = abs(op.x - me.x); me.t += dt; me.cd -= dt
            if me.state in ("idle", "walk", "block"): me.face = 1 if op.x > me.x else -1
            if me.state == "idle" and S["over"] is None and me.cd <= 0:
                r = rng.random(); mv = None
                if op.state == "down": me.cd = 0.15
                elif d > 330: mv = "blast" if r < 0.38 else "teleport" if r < 0.55 else "slam" if r < 0.72 else None
                elif d > 235: mv = "slam" if r < 0.12 else "jkick" if r < 0.24 else None
                elif d < 135 and r < 0.5: me.vx = -me.face * 420; me.cd = 0.18; continue
                else:
                    for name, p in (("jab", 0.2), ("kick", 0.17), ("jkick", 0.08), ("upper", 0.15), ("tornado", 0.12), ("flurry", 0.1), ("teleport", 0.06), ("slam", 0.05)):
                        if r < p: mv = name; break
                        r -= p
                    if mv is None: me.state, me.t, me.blockfor = "block", 0, 0.45; continue
                if mv is None and op.state != "down": me.state, me.t = "walk", 0
                elif mv:
                    me.state, me.t, me.move, me.nhit, me.fired = "atk", 0, mv, 0, False; me.x0 = me.x; S["used"].add(mv); events.append((real, "swing", me.i))
                    me.x1 = min(785, max(295, op.x - me.face * 110))
                    if op.state == "idle" and mv not in ("blast",):
                        q = rng.random()
                        if q < 0.2: op.state, op.t, op.blockfor = "block", 0, MOVES[mv]["end"] * 0.8
                        elif q < 0.33: op.state, op.t = "flip", 0; events.append((real, "flip", op.i))
            elif me.state == "walk":
                me.x += me.face * 300 * dt
                if d < 190 or me.t > 1.2: me.state, me.cd = "idle", rng.uniform(0.02, 0.2)
            elif me.state == "atk":
                mv, m, t = me.move, MOVES[me.move], me.t
                if mv == "jkick": me.dy = -170 * math.sin(math.pi * min(1, t / m["end"]))
                elif mv == "upper": me.dy = -70 * math.sin(math.pi * min(1, t / 0.5))
                elif mv == "tornado": me.dy = -85 * math.sin(math.pi * min(1, t / m["end"])); me.rot = 0; me.face = (1 if op.x > me.x else -1) * (1 if int(max(0, t - 0.1) / 0.09) % 2 == 0 else -1) if 0.1 < t < 0.8 else (1 if op.x > me.x else -1)
                elif mv == "slam":
                    k = min(1, t / m["land"]); me.dy = -440 * math.sin(math.pi * k); me.x = me.x0 + (me.x1 - me.x0) * k
                    if not me.fired and t >= m["land"]:
                        me.fired = True; me.dy = 0; events.append((real, "shock", me.i)); fx.append((time, me.x, FLOOR, "shock", 0, me.i))
                        if abs(op.x - me.x) < m["reach"] and op.h < 60: strike(me, op, "slam", m["dmg"], m["kb"], m["launch"], where=(op.x, FLOOR - 120), breaks=True)
                elif mv == "teleport":
                    if 0.08 <= t < 0.3 and not me.hidden: me.hidden = True; fx.append((time, me.x, FLOOR - 200, "puff", 0, me.i)); events.append((real, "tele", me.i))
                    if t >= 0.3 and me.hidden:
                        me.hidden = False; me.x = min(785, max(295, op.x + (1 if op.x > me.x else -1) * 140)); me.face = 1 if op.x > me.x else -1; fx.append((time, me.x, FLOOR - 200, "puff", 0, me.i))
                elif mv == "blast" and not me.fired and t >= m["fire"]:
                    me.fired = True; shots.append(dict(x=me.x + me.face * 120, y=FLOOR - 255, vx=me.face * 1150, who=me.i, born=time)); events.append((real, "blast", me.i)); me.vx = -me.face * 160
                if m.get("lunge") and m["hits"] and 0.05 < t < m["hits"][-1] + 0.05: me.x += (me.face if mv != "tornado" else (1 if op.x > me.x else -1)) * m["lunge"] * dt
                while me.nhit < len(m["hits"]) and t >= m["hits"][me.nhit]:
                    last = me.nhit == len(m["hits"]) - 1; me.nhit += 1
                    if abs(op.x - me.x) < m["reach"] and op.h < (400 if mv in ("upper", "jkick") else 250):
                        strike(me, op, mv, m["dmg"], (520 if last and mv in ("tornado", "flurry") else m["kb"]), m.get("launch", 0), breaks=mv == "upper")
                if t >= m["end"]: me.state, me.cd, me.dy, me.rot = "idle", rng.uniform(0.1, 0.45), 0, 0
            elif me.state == "flip":
                k = min(1, me.t / 0.5); me.dy = -230 * math.sin(math.pi * k); me.rot = -360 * k; me.x -= me.face * 520 * dt
                if me.t >= 0.5: me.state, me.cd, me.dy, me.rot = "idle", rng.uniform(0.05, 0.25), 0, 0
            elif me.state == "hit" and me.t > 0.3: me.state, me.cd = "idle", rng.uniform(0.02, 0.22)
            elif me.state == "block" and me.t > me.blockfor: me.state, me.cd = "idle", rng.uniform(0.02, 0.15)
            elif me.state == "down" and me.t > 0.42: me.state, me.cd, me.base = "idle", rng.uniform(0.05, 0.2), STAND
            if S["over"] is not None and me.i == S["winner"] and me.state == "idle" and time > S["slow"] + 0.25: me.state = "win"
            if me.state == "win": me.dy = -28 * abs(math.sin(time * 7))
            # free flight for anyone knocked into the air
            if me.h > 0 or me.vh > 0:
                me.vh -= GRAV * dt; me.h += me.vh * dt; me.rot += me.spin * dt
                if me.h <= 0:
                    me.h, me.vh, me.rot, me.spin = 0.0, 0.0, 0.0, 0.0; events.append((real, "land", me.i)); fx.append((time, me.x, FLOOR, "dust", 0, me.i))
                    if me.state == "air": me.state, me.t = "down", 0
            me.x += me.vx * dt; me.vx *= (0.86 if me.h <= 0 else 0.985) ** (dt * FPS); me.x = min(785, max(295, me.x))
            me.pose += (me.target(time) - me.pose) * (1 - 0.62 ** (dt * FPS))
        for s in shots:                                     # energy blasts in flight
            s["x"] += s["vx"] * dt; op = F[1 - s["who"]]
            if abs(s["x"] - op.x) < 70 and op.h < 200 and not op.invuln and op.state != "ko":
                strike(F[s["who"]], op, "blast", MOVES["blast"]["dmg"], MOVES["blast"]["kb"], where=(op.x, s["y"])); s["x"] = 9999
        shots[:] = [s for s in shots if 60 < s["x"] < 1020]
        if abs(A.x - B.x) < 120 and S["over"] is None and A.h < 150 and B.h < 150 and not (A.hidden or B.hidden) and "slam" not in (A.move if A.state == "atk" else "", B.move if B.state == "atk" else ""):
            mid = (A.x + B.x) / 2; sg = 1 if A.x < B.x else -1; A.x, B.x = mid - 60 * sg, mid + 60 * sg      # they never stand inside each other
        if on_frame: on_frame(f, real, time, F, fx, shots, S["winner"])
        time += dt; real += 1 / FPS; f += 1
        if S["over"] is not None and real - S["over"] >= hold: break
    return dict(over=S["over"], winner=S["winner"], hp=[A.hp, B.hp], events=events, frames=f, used=S["used"], last=S["last"])

if sys.argv[1] == "search":
    for seed in range(120):
        r = simulate(seed, hold=0)
        if r["over"] is None: continue
        print(seed, "t=%.1f" % r["over"], NAME[r["winner"]], "hp left %d" % max(r["hp"]), "moves", len(r["used"]), "last", r["last"])
    sys.exit()

import soundfile as sf
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); seed = int(sys.argv[2]) if len(sys.argv) > 2 else 0
W, H, SS, BG = 1080, 1920, 2, (10, 10, 18)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; Fnt = lambda px: ImageFont.truetype(FONT, px)
ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)
shown = [float(HP), float(HP)]

def joints(fg):
    torso, a1, a2, b1, b2, l1, l2, m1, m2 = fg.pose; s = fg.face; r = math.radians
    seg = lambda p, ang, ln: (p[0] + s * ln * math.sin(r(ang)), p[1] + ln * math.cos(r(ang)))
    kF, kB = seg((0, 0), l1, L["th"]), seg((0, 0), m1, L["th"]); fF, fB = seg(kF, l2, L["sh"]), seg(kB, m2, L["sh"])
    flying = fg.h > 0 or fg.rot != 0 or fg.dy < -1
    fg.base += ((120 if fg.state in ("air",) or (fg.state == "ko" and fg.h > 0) else STAND) - fg.base) * 0.2
    hip = (fg.x, FLOOR - (fg.base if flying else max(fF[1], fB[1], 26)) + fg.dy - fg.h)
    sh = (s * L["torso"] * math.sin(r(torso)), -L["torso"] * math.cos(r(torso)))
    head = (sh[0] + s * (L["head"] + 14) * math.sin(r(torso)), sh[1] - (L["head"] + 14) * math.cos(r(torso)))
    eF, eB = seg(sh, a1, L["ua"]), seg(sh, b1, L["ua"]); hF, hB = seg(eF, a2, L["fa"]), seg(eB, b2, L["fa"])
    ca, sa = math.cos(r(fg.rot * s)), math.sin(r(fg.rot * s))
    at = lambda p: (hip[0] + p[0] * ca - p[1] * sa, hip[1] + p[0] * sa + p[1] * ca)
    return dict(hip=hip, sh=at(sh), head=at(head), hand=at(hF), back=[(at(sh), at(eB), at(hB)), (hip, at(kB), at(fB))], front=[(at(sh), at(eF), at(hF)), (hip, at(kF), at(fF))])

def frame(f, real, time, F, fx, shots, winner):
    hi = Image.new("RGB", (W * SS, H * SS), BG); d = ImageDraw.Draw(hi); S = SS
    shake = max([0] + [(1.6 if k == "shock" else 1) * (1 - (time - t0) / 0.14) for t0, _x, _y, k, *_ in fx if k in ("hit", "shock") and 0 <= time - t0 < 0.14])
    ox, oy = 11 * shake * math.sin(real * 90), 8 * shake * math.cos(real * 70)
    X = lambda x: 540 + (x - 540) * Z + ox; Y = lambda y: FLOOR + (y - FLOOR) * Z + oy
    P = lambda p: (X(p[0]) * S, Y(p[1]) * S)
    d.rectangle([0, (FLOOR + oy) * S, W * S, H * S], fill=(22, 22, 34)); d.line([0, (FLOOR + oy) * S, W * S, (FLOOR + oy) * S], fill=(90, 90, 110), width=6 * S)
    for t0, px, py, kind, dmg, who in fx:
        age = time - t0
        if kind == "shock" and 0 <= age < 0.35:               # shockwave racing along the floor
            k = age / 0.35; w = (60 + 520 * k) * S; x, y = P((px, py)); c = tuple(int(v * (1 - k) + 20 * k) for v in (255, 230, 120))
            d.ellipse([x - w, y - w * 0.12, x + w, y + w * 0.12], outline=c, width=int(16 * (1 - k) + 3) * S)
        if kind == "dust" and 0 <= age < 0.25:
            k = age / 0.25; x, y = P((px, py))
            for sg in (-1, 1): r_ = (26 - 16 * k) * S; cx = x + sg * (50 + 110 * k) * S; d.ellipse([cx - r_, y - r_ * 1.2, cx + r_, y + r_ * 0.4], fill=(70, 70, 90))
        if kind == "puff" and 0 <= age < 0.22:                # vanish / appear
            k = age / 0.22; x, y = P((px, py)); c = tuple(int(v * (1 - k * 0.6)) for v in COL[who])
            for a in range(10):
                an = a * math.pi / 5; r0, r1 = (30 + 150 * k) * S, (70 + 210 * k) * S
                d.line([x + r0 * math.cos(an), y + r0 * math.sin(an) * 1.5, x + r1 * math.cos(an), y + r1 * math.sin(an) * 1.5], fill=c, width=int(14 * (1 - k) + 2) * S)
    for fg in sorted(F, key=lambda g: g.state != "ko"):
        sx = X(fg.x); sw = max(40, 120 - fg.h * 0.2 + fg.dy * 0.15)
        d.ellipse([(sx - sw) * S, (FLOOR - 12 + oy) * S, (sx + sw) * S, (FLOOR + 18 + oy) * S], fill=(4, 4, 8))
        if fg.hidden: continue
        J = joints(fg); col = COL[fg.i]; dark = tuple(int(c * 0.6) for c in col); wd = int(24 * S * Z)
        def limb(pts, c):
            d.line([P(p) for p in pts], fill=c, width=wd, joint="curve")
            for p in pts: x, y = P(p); d.ellipse([x - wd / 2, y - wd / 2, x + wd / 2, y + wd / 2], fill=c)
        for pts in J["back"]: limb(pts, dark)
        limb((J["hip"], J["sh"]), col)
        hx, hy = P(J["head"]); hr = L["head"] * S * Z; d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=col)
        for pts in J["front"]: limb(pts, col)
        if fg.state == "atk" and fg.move == "blast" and fg.t < 0.42:      # energy gathering in the hands
            k = fg.t / 0.42; x, y = P(J["hand"]); r_ = (14 + 46 * k) * S * (1 + 0.15 * math.sin(real * 60))
            d.ellipse([x - r_ * 1.5, y - r_ * 1.5, x + r_ * 1.5, y + r_ * 1.5], fill=tuple(int(c * 0.55) for c in col)); d.ellipse([x - r_, y - r_, x + r_, y + r_], fill=col); d.ellipse([x - r_ * 0.5, y - r_ * 0.5, x + r_ * 0.5, y + r_ * 0.5], fill=(255, 255, 255))
        if fg.state == "atk" and fg.move == "tornado" and 0.1 < fg.t < 0.8:  # wind rings round the spinning kick
            hx_, hy_ = P(J["hip"])
            for q in range(3): w = (150 + 40 * q) * S; yy = hy_ + (q - 1) * 70 * S; d.arc([hx_ - w, yy - w * 0.2, hx_ + w, yy + w * 0.2], (real * 900 + q * 120) % 360, (real * 900 + q * 120) % 360 + 200, fill=(230, 230, 255), width=8 * S)
    for s in shots:                                          # the blast itself, with a tail
        col = COL[s["who"]]; sg = 1 if s["vx"] > 0 else -1
        for q in range(7, -1, -1):
            x, y = P((s["x"] - sg * q * 26, s["y"])); r_ = (40 - q * 4.2) * S * Z * 0.8; c = tuple(int(v * (1 - q / 9)) for v in col)
            d.ellipse([x - r_, y - r_, x + r_, y + r_], fill=c)
        x, y = P((s["x"], s["y"])); r_ = 18 * S * Z; d.ellipse([x - r_, y - r_, x + r_, y + r_], fill=(255, 255, 255))
    for t0, px, py, kind, dmg, who in fx:
        age = time - t0
        if kind in ("hit", "block") and 0 <= age < 0.16:     # impact star
            k = age / 0.16; c = (255, 230, 80) if kind == "hit" else (200, 220, 255); big = 1 + dmg / 20
            for a in range(8):
                an = a * math.pi / 4 + 0.3; r0, r1 = (30 + 90 * k) * S * big, (70 + 160 * k) * S * big; x, y = P((px, py))
                d.line([x + r0 * math.cos(an), y + r0 * math.sin(an), x + r1 * math.cos(an), y + r1 * math.sin(an)], fill=c, width=int(12 * (1 - k) + 3) * S)
    img = hi.resize((W, H), Image.LANCZOS); d = ImageDraw.Draw(img)
    for t0, px, py, kind, dmg, who in fx:
        age = time - t0; tx, ty = X(px) - ox, Y(py) - oy
        if kind == "hit" and 0 <= age < 0.6: d.text((tx, ty - 70 - 120 * age), f"-{dmg}", font=Fnt(60 + dmg * 2), fill=(255, 230, 80), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
        if kind == "block" and 0 <= age < 0.5: d.text((tx, ty - 70 - 90 * age), "BLOCK", font=Fnt(46), fill=(200, 220, 255), anchor="mm", stroke_width=5, stroke_fill=(0, 0, 0))
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
        d.rounded_rectangle([170, 1600, 910, 1760], 36, fill=COL[winner], outline=(0, 0, 0), width=8)
        d.text((540, 1680), f"{NAME[winner]} WINS!", font=Fnt(96), fill=(255, 255, 255), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0))
    if f in frame.keep: img.save(out / f"still_{f:04d}_{frame.keep[f]}.png")
    ff.stdin.write(img.tobytes())
probe = simulate(seed); frame.keep = {}
for mv in ("upper", "tornado", "blast", "tele", "shock", "flurry", "flip"):                # one still per kind of move
    ts = [t for t, k, _ in probe["events"] if k == mv]
    if ts: frame.keep[int(ts[0] * FPS) + (16 if mv == "upper" else 6)] = mv
frame.keep[int(probe["over"] * FPS) + 20] = "ko"; frame.keep[probe["frames"] - 30] = "end"
res = simulate(seed, frame); ff.stdin.close(); ff.wait()

# ---- sound: a steady drum under the fight, thuds for blows, a zap for the blast, a boom for the slam, a chord for the knock-out ----
SR = 44100; dur = res["frames"] / FPS; audio = np.zeros(int(dur * SR) + SR * 3); rs = np.random.default_rng(1)
def add(t0, sig, g): i = int(t0 * SR); audio[i:i + len(sig)] += sig * g
tt = lambda s: np.arange(int(s * SR)) / SR
def thud(fr, s, noise): t = tt(s); return (np.sin(2 * np.pi * np.cumsum(fr * np.exp(-t * 9)) / SR) + noise * rs.standard_normal(len(t)) * np.exp(-t * 60)) * np.exp(-t * (5 / s))
def sweep(f0, f1, s): t = tt(s); return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / s) / SR) * np.sin(np.pi * t / s)
beat = 0.0
while beat < res["over"]: add(beat, thud(110, 0.18, 0.0), 0.2); add(beat + 0.25, thud(4000, 0.04, 1.0), 0.045); beat += 0.5
LOUD = dict(jab=(240, 0.14, 0.5), flurry=(300, 0.1, 0.4), kick=(170, 0.2, 0.7), tornado=(190, 0.16, 0.6), jkick=(130, 0.28, 0.9), upper=(150, 0.26, 0.9), teleport=(160, 0.22, 0.8), slam=(90, 0.4, 1.0), blast=(110, 0.4, 1.0))
for t0, kind, who in res["events"]:
    if kind in LOUD: fr, s, g = LOUD[kind]; add(t0, thud(fr, s, 0.9), g)
    elif kind == "swing": t = tt(0.12); add(t0, rs.standard_normal(len(t)) * np.sin(np.pi * t / 0.12) ** 2, 0.05)
    elif kind == "block": t = tt(0.07); add(t0, np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 60), 0.3)
    elif kind == "blast": add(t0 - 0.4, sweep(200, 900, 0.4), 0.25); add(t0, sweep(1400, 300, 0.3), 0.4)
    elif kind == "tele": add(t0, sweep(600, 2400, 0.12), 0.25); add(t0 + 0.22, sweep(2400, 600, 0.12), 0.25)
    elif kind == "flip": add(t0, sweep(300, 700, 0.3), 0.12)
    elif kind == "shock": add(t0, thud(60, 0.6, 1.0), 0.9)
    elif kind == "land": add(t0, thud(100, 0.2, 0.6), 0.45)
    elif kind == "ko":
        add(t0, thud(70, 0.9, 0.6), 1.0); t = tt(1.8)
        for fr in (523.25, 659.25, 783.99, 1046.5): add(t0 + 1.0, np.sin(2 * np.pi * fr * t) * np.exp(-t * 2.2), 0.3)
audio = np.tanh(audio[:int(dur * SR)] * 0.9); audio *= 0.85 / np.abs(audio).max()
sf.write(out / "audio.wav", audio.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / "fight.mp4")], check=True)
print(f"fight.mp4 {dur:.1f}s, {NAME[res['winner']]} wins with {max(res['hp']):.0f} health left; moves used: {sorted(res['used'])}; last blow: {res['last']}")
