"""Choreographed stick-figure fight engine for the Blue vs the Red Army story series.

Everything is written out on a timeline (story seconds): every pose, jump, throw, wall break and camera move.
Story time runs through slow-motion stretches and stops for hit-stops and freeze frames; the renderer turns it into
real 60 fps video with sound. A part script builds a Stage, fills it in, then calls run(stage, out_dir).

World coordinates: x to the right, y DOWN (screen style). The main floor is y = 0, its ceiling y = -880, the floor
above is y = -940, the basement floor y = 700. A fighter's h is how high his feet are above the main floor."""
import bisect, math, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS, W, H, SS = 60, 1080, 1920, 2
L = dict(torso=135, head=40, ua=72, fa=72, th=92, sh=92)
STAND = 178
CEIL, UPPER, BASE, LEFT, RIGHT = -880, -940, 700, 150, 3830
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
Fnt = lambda px: ImageFont.truetype(FONT, max(8, int(px)))

# angles in degrees: torso from upright (+ leans towards where he faces); limbs from straight down (+ towards facing)
POSES = dict(
    idle=(10, (75, 160), (45, 150), (24, -8), (-26, -14)),     guard=(8, (55, 150), (35, 140), (30, -6), (-30, -16)),
    walkA=(12, (70, 150), (40, 140), (38, 10), (-34, -30)),    walkB=(12, (70, 150), (40, 140), (-16, -30), (26, 6)),
    runA=(24, (80, 150), (-30, 40), (60, 8), (-50, -80)),      runB=(24, (-30, 40), (80, 150), (-50, -80), (60, 8)),
    jab=(20, (96, 94), (40, 150), (34, -4), (-34, -18)),       jabB=(24, (40, 150), (98, 94), (34, -4), (-34, -18)),
    kick=(-24, (40, 120), (-50, 10), (4, -2), (98, 92)),       jkick=(-12, (140, 170), (-60, -20), (102, 96), (40, -70)),
    upper=(-8, (178, 186), (30, 120), (12, 0), (-14, -6)),     tumble=(30, (60, 120), (-30, 40), (72, 10), (40, -34)),
    tuck=(40, (60, 110), (50, 100), (80, -20), (70, -30)),     ko=(-88, (-110, -100), (-70, -95), (82, 88), (74, 96)),
    land=(44, (40, 60), (30, 50), (62, -36), (-24, -70)),      hit=(-34, (10, 50), (-60, -20), (18, -12), (-40, -26)),
    brace=(-18, (150, 200), (140, 195), (30, 0), (-40, -20)),  fly=(90, (92, 90), (88, 90), (-88, -90), (-92, -92)),
    dangle=(0, (176, 180), (170, 178), (10, 4), (-8, -2)),     dangle2=(0, (176, 180), (170, 178), (-6, -14), (14, 22)),
    catch=(-10, (150, 170), (140, 165), (26, -6), (-30, -14)), sweep=(30, (92, 92), (84, 90), (60, -20), (-50, -60)),
    pinned=(55, (130, 190), (120, 185), (70, -30), (40, -60)), rise=(-20, (160, 180), (-40, -10), (172, 176), (0, 0)),
    grab=(14, (98, 96), (92, 94), (30, -6), (-30, -16)),       carry=(0, (176, 180), (168, 176), (18, 2), (-18, -4)),
    hurl=(32, (70, 60), (30, 40), (40, -5), (-44, -30)),       slamdn=(38, (58, 66), (48, 58), (52, -30), (30, -52)),
    crouch=(35, (60, 120), (40, 110), (70, -40), (-30, -80)),  win=(0, (150, 200), (-150, -200), (16, 4), (-16, -4)),
    cower=(40, (150, 210), (130, 200), (50, -40), (-20, -70)), point=(4, (92, 92), (30, 60), (24, -6), (-26, -14)),
    kneel=(28, (70, 120), (55, 110), (92, 0), (-4, -92)),      roar=(-14, (125, 155), (-125, -155), (34, -4), (-34, -14)),
    windup=(-26, (-70, -40), (40, 80), (30, -6), (-36, -20)),  slamup=(0, (172, 186), (164, 180), (62, -40), (40, -64)),  reach=(30, (110, 120), (60, 90), (60, -20), (-40, -60)),
)
P_ = {k: np.array([v[0], *v[1], *v[2], *v[3], *v[4]], float) for k, v in POSES.items()}
EASE = {"lin": lambda k: k, "io": lambda k: k * k * (3 - 2 * k), "out": lambda k: 1 - (1 - k) ** 2, "in": lambda k: k * k}

class Track:
    """keyed values: key(t, v) means 'v is reached at time t', blending from the key before it"""
    def __init__(self, v): self.t, self.v, self.e = [-1e9], [np.atleast_1d(np.asarray(v, float)).copy()], ["lin"]
    def key(self, t, v, e="io"):
        i = bisect.bisect_right(self.t, t); self.t.insert(i, t); self.v.insert(i, np.atleast_1d(np.asarray(v, float)).copy()); self.e.insert(i, e); return self
    def at(self, t):
        i = bisect.bisect_right(self.t, t)
        if i >= len(self.t): return self.v[-1]
        t0, t1 = self.t[i - 1], self.t[i]; k = 1.0 if t1 <= t0 else min(1.0, max(0.0, (t - t0) / (t1 - t0)))
        return self.v[i - 1] + (self.v[i] - self.v[i - 1]) * EASE[self.e[i]](k)
    def hold(self, t): return self.key(t, self.at(t), "lin")

class Step:
    def __init__(self, v): self.t, self.v = [-1e9], [v]
    def set(self, t, v): i = bisect.bisect_right(self.t, t); self.t.insert(i, t); self.v.insert(i, v); return self
    def at(self, t): return self.v[bisect.bisect_right(self.t, t) - 1]

class Fig:
    def __init__(self, st, col, x, face=1, scale=1.0, band=None, kind="red", h=0.0, pose="guard", vis=1, name=""):
        self.st, self.col, self.scale, self.band, self.kind, self.name = st, col, scale, band, kind, name
        self.P, self.X, self.Hh, self.R = Track(P_[pose]), Track(x), Track(h), Track(0.0)
        self.F, self.V, self.prop = Step(face), Step(vis), Step(None)
        self.G, self.arm, self.bandS = Step(0.0), Step(None), Step(band)     # floor he stands on (h), armband colour, headband colour
        st.figs.append(self)
    def x(self, t): return float(self.X.at(t)[0])
    def h(self, t): return float(self.Hh.at(t)[0])
    def pose(self, t, name, d=0.07, e="io"): self.P.hold(t); self.P.key(t + d, P_[name], e); return self
    def go(self, t0, t1, x=None, h=None, r=None, e="io"):
        for tr, v in ((self.X, x), (self.Hh, h), (self.R, r)):
            if v is not None: tr.hold(t0); tr.key(t1, v, e)
        return self
    def arc(self, t0, t1, x1, h1=0.0, peak=200.0, r1=None, n=18):
        x0, h0, r0 = self.x(t0), self.h(t0), float(self.R.at(t0)[0])
        for tr in (self.X, self.Hh, self.R): tr.hold(t0)
        for j in range(1, n + 1):
            u = j / n; t = t0 + (t1 - t0) * u
            self.X.key(t, x0 + (x1 - x0) * u, "lin"); self.Hh.key(t, h0 + (h1 - h0) * u + 4 * peak * u * (1 - u), "lin")
            if r1 is not None: self.R.key(t, r0 + (r1 - r0) * u, "lin")
        return self
    def face(self, t, f): self.F.set(t, f); return self
    def show(self, t, v=1): self.V.set(t, v); return self
    def walk(self, t0, t1, x1, run=False, end="guard"):
        self.go(t0, t1, x=x1, e="lin"); step = 0.1 if run else 0.15; a, b = ("runA", "runB") if run else ("walkA", "walkB")
        self.P.hold(t0); t, j = t0 + step * 0.6, 0
        while t < t1: self.P.key(t, P_[(a, b)[j % 2]]); t += step; j += 1
        self.P.key(t1 + 0.08, P_[end]); return self
    def knock(self, t, dur, x1, h1=0.0, peak=150.0, spin=-540, end="gone", lie=0.18):
        """sent flying: tumbles along an arc, then is gone in a puff (or lies down, or stays where he lands)"""
        self.pose(t, "tumble", 0.05); r0 = float(self.R.at(t)[0]); self.arc(t, t + dur, x1, h1, peak, r0 + spin)
        te = t + dur
        if end in ("gone", "down"):
            self.R.key(te + 0.001, 0.0, "lin"); self.pose(te, "ko", 0.06); self.st.sfx(te, "land", 0.7)
        if end == "gone": self.gone(te + lie)
        return te
    def gone(self, t, ko=True):
        self.V.set(t, 0); self.st.puff(t, self.x(t), -self.h(t) - 120 * self.scale, self.col)
        if ko: self.st.ko(t)
        return self
    def state(self, t):
        return dict(pose=self.P.at(t), x=self.x(t), h=self.h(t), r=float(self.R.at(t)[0]), face=self.F.at(t), vis=self.V.at(t), prop=self.prop.at(t), ground=self.G.at(t), arm=self.arm.at(t), band=self.bandS.at(t))

class Obj:
    """props and set pieces with their own track: kind in door, staff, hand"""
    def __init__(self, st, kind, x, y, r=0.0, vis=1):
        self.st, self.kind, self.X, self.Y, self.R, self.V = st, kind, Track(x), Track(y), Track(r), Step(vis); st.objs.append(self)
    def go(self, t0, t1, x=None, y=None, r=None, e="io"):
        for tr, v in ((self.X, x), (self.Y, y), (self.R, r)):
            if v is not None: tr.hold(t0); tr.key(t1, v, e)
        return self
    def arc(self, t0, t1, x1, y1, peak=150, r1=None, n=18):
        x0, y0, r0 = float(self.X.at(t0)[0]), float(self.Y.at(t0)[0]), float(self.R.at(t0)[0])
        for tr in (self.X, self.Y, self.R): tr.hold(t0)
        for j in range(1, n + 1):
            u = j / n; t = t0 + (t1 - t0) * u
            self.X.key(t, x0 + (x1 - x0) * u, "lin"); self.Y.key(t, y0 + (y1 - y0) * u - 4 * peak * u * (1 - u), "lin")
            if r1 is not None: self.R.key(t, r0 + (r1 - r0) * u, "lin")
        return self

class Wall:
    def __init__(self, st, x, w=56, opening=None, col=(76, 68, 82)):
        self.x, self.w, self.opening, self.col, self.brk = x, w, opening, col, None; st.walls.append(self)
    def smash(self, st, t, y0, y1, dirx, n=34, big=1.0):
        self.brk = (t, y0, y1); st.chunks_due.append((t, "wall", self.x - self.w / 2, self.x + self.w / 2, y0, y1, dirx, n, self.col))
        st.hit(t, self.x, (y0 + y1) / 2, 1.3 * big, freeze=0.06, shake=2.2 * big, snd="crash")

class Stage:
    def __init__(self, end):
        self.end, self.figs, self.objs, self.walls = end, [], [], []
        self.fx, self.texts, self.freezes, self.slows, self.events, self.kos = [], [], [], [], [], []
        self.floor_holes, self.ceil_holes, self.cracks, self.chunks_due = [], [], [], []
        self.cam = Track([540, -430, 1.0]); self.draw_hooks = []; self.ui_hooks = []; self.music = []; self.gray = Track(0.0)
    # ---- authoring ----
    def camkey(self, t, cx, cy, z, e="io"): self.cam.key(t, [cx, cy, z], e); return self
    def sfx(self, t, kind, g=1.0, d=0.0): self.events.append((t, kind, g, d))
    def shake(self, t, amp): self.events.append((t, "shake", amp, 0))
    def hit(self, t, x, y, size=1.0, freeze=0.05, shake=1.0, snd="hit", col=(255, 230, 80)):
        self.fx.append(("star", t, x, y, size, col))
        if freeze: self.freezes.append((t, freeze, None))
        if shake: self.shake(t, shake)
        if snd: self.sfx(t, snd, size)
    def puff(self, t, x, y, col): self.fx.append(("puff", t, x, y, 1.0, col)); self.sfx(t, "puff", 0.6)
    def ring(self, t, x, y, r0, r1, col, dur=0.4, width=16, squash=1.0): self.fx.append(("ring", t, x, y, (r0, r1, dur, width, squash), col))
    def flash(self, t, dur=0.12, col=(255, 255, 255), amt=0.8): self.fx.append(("flash", t, 0, 0, (dur, amt), col))
    def crack(self, t, x, y, size=1.0): self.cracks.append((t, x, y, size))
    def dustfall(self, t0, t1): self.fx.append(("dustfall", t0, 0, 0, t1, (150, 140, 130)))
    def floor_hole(self, t, x0, x1, n=30): self.floor_holes.append((t, x0, x1)); self.chunks_due.append((t, "floor", x0, x1, 0, 60, 0, n, (66, 60, 72)))
    def ceil_hole(self, t, x0, x1, n=18, up=True): self.ceil_holes.append((t, x0, x1)); self.chunks_due.append((t, "ceilup" if up else "ceil", x0, x1, UPPER, CEIL, 0, n, (70, 64, 76)))
    def text(self, t0, t1, kind, **kw): self.texts.append(dict(t0=t0, t1=t1, kind=kind, **kw))
    def freeze(self, t, dur, label=None): self.freezes.append((t, dur, label))
    def slow(self, t0, t1, speed): self.slows.append((t0, t1, speed))
    def ko(self, t): self.kos.append(t)

# ---------------------------------------------------------------- drawing ----------------------------------------------------------------
def joints(s):
    torso, a1, a2, b1, b2, l1, l2, m1, m2 = s["pose"]; f = s["face"]; sc = s["scale"]; r = math.radians
    seg = lambda p, ang, ln: (p[0] + f * ln * sc * math.sin(r(ang)), p[1] + ln * sc * math.cos(r(ang)))
    kF, kB = seg((0, 0), l1, L["th"]), seg((0, 0), m1, L["th"]); fF, fB = seg(kF, l2, L["sh"]), seg(kB, m2, L["sh"])
    g0 = s.get("ground", 0.0); flying = abs(s["h"] - g0) > 1 or abs(s["r"]) > 1
    hip = (s["x"], -(STAND * sc) - s["h"] if flying else -max(fF[1], fB[1], 26 * sc) - g0)
    sh = (f * L["torso"] * sc * math.sin(r(torso)), -L["torso"] * sc * math.cos(r(torso)))
    head = (sh[0] + f * (L["head"] + 14) * sc * math.sin(r(torso)), sh[1] - (L["head"] + 14) * sc * math.cos(r(torso)))
    eF, eB = seg(sh, a1, L["ua"]), seg(sh, b1, L["ua"]); hF, hB = seg(eF, a2, L["fa"]), seg(eB, b2, L["fa"])
    ca, sa = math.cos(r(s["r"] * f)), math.sin(r(s["r"] * f))
    at = lambda p: (hip[0] + p[0] * ca - p[1] * sa, hip[1] + p[0] * sa + p[1] * ca)
    return dict(hip=hip, sh=at(sh), head=at(head), elbow=at(eF), hand=at(hF), back=[(at(sh), at(eB), at(hB)), (hip, at(kB), at(fB))],
                front=[(at(sh), at(eF), at(hF)), (hip, at(kF), at(fF))])

class Renderer:
    def __init__(self, st):
        self.st = st; self.chunks = []; self.rng = np.random.default_rng(3); self.spawned = set()
        self.stars = [(self.rng.uniform(-900, LEFT), self.rng.uniform(-2400, -20), self.rng.uniform(1.5, 4)) for _ in range(70)]
    def physics(self, s0, s1):
        st = self.st
        for i, (t, kind, x0, x1, y0, y1, dirx, n, col) in enumerate(st.chunks_due):
            if i in self.spawned or t > s1: continue
            self.spawned.add(i)
            for _ in range(n):
                x, y = self.rng.uniform(x0, x1), self.rng.uniform(y0, y1)
                if kind == "wall": vx, vy = dirx * self.rng.uniform(250, 1150), -self.rng.uniform(80, 760)
                elif kind == "floor": vx, vy = self.rng.uniform(-380, 380), -self.rng.uniform(600, 1350)
                elif kind == "ceilup": vx, vy = self.rng.uniform(-250, 250), -self.rng.uniform(400, 900)
                else: vx, vy = self.rng.uniform(-250, 250), self.rng.uniform(0, 300)
                floor = UPPER if (kind == "ceilup" or y < UPPER) else 0.0
                c = tuple(int(v * self.rng.uniform(0.75, 1.15)) for v in col)
                self.chunks.append([x, y, vx, vy, self.rng.uniform(0, 6), self.rng.uniform(-14, 14), self.rng.uniform(10, 30), c, floor, 0])
        dt = s1 - s0
        if dt <= 0: return
        for c in self.chunks:
            if c[9] >= 3: continue
            c[3] += 2600 * dt; c[0] += c[2] * dt; c[1] += c[3] * dt; c[4] += c[5] * dt
            fl = c[8]
            if fl == 0 and any(t <= s1 and a <= c[0] <= b for t, a, b in st.floor_holes): fl = BASE
            if c[1] + c[6] * 0.4 > fl and c[3] > 0:
                c[1] = fl - c[6] * 0.4; c[3] *= -0.32; c[2] *= 0.55; c[5] *= 0.5; c[9] += 1
                if c[9] >= 3: c[2] = c[3] = c[5] = 0

    def frame(self, s, real, shake, freeze_label):
        st = self.st; cx, cy, z = (float(v) for v in st.cam.at(s)); S = SS
        ox, oy = shake * 14 * math.sin(real * 93), shake * 10 * math.cos(real * 71)
        X = lambda x: ((x - cx) * z + 540 + ox) * S; Y = lambda y: ((y - cy) * z + 1000 + oy) * S
        P = lambda p: (X(p[0]), Y(p[1])); Z = z * S
        img = Image.new("RGB", (W * S, H * S), (14, 16, 36)); d = ImageDraw.Draw(img)
        rect = lambda x0, y0, x1, y1, col: d.rectangle([X(x0), Y(y0), X(x1), Y(y1)], fill=col)
        # night outside
        rect(-3000, 0, LEFT, 3000, (24, 24, 32)); d.ellipse([X(-520) - 70 * Z, Y(-1500) - 70 * Z, X(-520) + 70 * Z, Y(-1500) + 70 * Z], fill=(235, 232, 210))
        for sx, sy, sr in self.stars: d.ellipse([X(sx) - sr * Z, Y(sy) - sr * Z, X(sx) + sr * Z, Y(sy) + sr * Z], fill=(200, 200, 230))
        # the building in cutaway: upper floor, main floor, basement; beyond its far wall, darkness
        rect(LEFT - 28, -1880, RIGHT + 28, BASE + 80, (40, 36, 48))
        rect(LEFT, -1820, RIGHT, UPPER, (30, 26, 38)); rect(LEFT, CEIL, RIGHT, 0, (44, 38, 52)); rect(LEFT, 60, RIGHT, BASE, (22, 20, 30))
        rect(RIGHT + 28, -1880, RIGHT + 4000, BASE + 80, (6, 4, 8))
        x0v, x1v = cx - 700 / z, cx + 700 / z
        for x in range(int((max(LEFT, x0v) // 160) * 160), int(min(RIGHT, x1v)) + 1, 160):
            if x < LEFT: continue
            d.line([X(x), Y(CEIL), X(x), Y(0)], fill=(52, 46, 60), width=int(4 * Z)); d.line([X(x), Y(-1820), X(x), Y(UPPER)], fill=(36, 32, 44), width=int(4 * Z))
        rect(max(LEFT, x0v), -270, min(RIGHT, x1v), -246, (36, 30, 44)); rect(max(LEFT, x0v), -830, min(RIGHT, x1v), -812, (64, 60, 72))
        for yy in (210, 270): rect(max(LEFT, x0v), yy, min(RIGHT, x1v), yy + 14, (54, 50, 64))
        for t, x, y, size in st.cracks:                                  # cracks punched into the back wall
            if s >= t:
                for a in range(7):
                    an = a * 0.9 + x * 0.01; ln = (60 + 40 * ((a * 7) % 3)) * size
                    pts = [(x, y), (x + math.cos(an) * ln * 0.5 + 10, y + math.sin(an) * ln * 0.5), (x + math.cos(an) * ln, y + math.sin(an) * ln)]
                    d.line([P(p) for p in pts], fill=(20, 16, 24), width=int(6 * Z))
        for h in st.draw_hooks: h(self, d, s, real, X, Y, Z, "back")
        # fighters, back to front
        for fg in st.figs:
            S_ = fg.state(s)
            if not S_["vis"]: continue
            S_["scale"] = fg.scale; J = joints(S_); col = fg.col; dark = tuple(int(c * 0.6) for c in col); wd = max(2, int(24 * fg.scale * Z))
            v0 = fg.state(max(0, s - 0.04)); speed = math.hypot(S_["x"] - v0["x"], S_["h"] - v0["h"]) / 0.04
            if speed > 1100:                                             # speed lines
                ux, uy = (S_["x"] - v0["x"]) / (speed * 0.04), -(S_["h"] - v0["h"]) / (speed * 0.04); hx, hy = J["hip"]
                for q in range(-2, 3):
                    bx, by = hx - ux * 90 + uy * q * 45, hy - uy * 90 - ux * q * 45 - 60
                    d.line([P((bx, by)), P((bx - ux * 260, by - uy * 260))], fill=(210, 214, 230), width=int(5 * Z))
            def limb(pts, c):
                d.line([P(p) for p in pts], fill=c, width=wd, joint="curve")
                for p in pts: x, y = P(p); d.ellipse([x - wd / 2, y - wd / 2, x + wd / 2, y + wd / 2], fill=c)
            if fg.kind == "boss":                                        # a cape streaming behind
                sx, sy = J["sh"]; hx0, hy0 = J["hip"]; f0 = S_["face"]
                cape = [(sx + f0 * 20, sy), (sx - f0 * 40, sy - 10), (hx0 - f0 * (150 + 20 * math.sin(real * 3)), hy0 + 170 * fg.scale), (hx0 - f0 * 20, hy0 + 150 * fg.scale)]
                d.polygon([P(p) for p in cape], fill=(70, 0, 12))
            for pts in J["back"]: limb(pts, dark)
            limb((J["hip"], J["sh"]), col)
            hx, hy = P(J["head"]); hr = L["head"] * fg.scale * Z; d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=col)
            f = S_["face"]; ex, ey = hx + f * 16 * fg.scale * Z, hy - 5 * fg.scale * Z; er = 7 * fg.scale * Z
            if fg.kind in ("red", "big", "boss") and S_["pose"][0] > -60:
                d.ellipse([ex - er, ey - er * 0.6, ex + er, ey + er * 0.6], fill=(255, 240, 200) if fg.kind != "red" else (255, 255, 255))
                d.line([ex - f * 10 * fg.scale * Z, ey - 12 * fg.scale * Z, ex + f * 9 * fg.scale * Z, ey - 5 * fg.scale * Z], fill=(30, 10, 10), width=max(1, int(5 * fg.scale * Z)))
            elif S_["pose"][0] > -60: d.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(255, 255, 255))
            band = S_["band"]
            if band:                                                     # headband with tails that stream behind
                bx0, by0 = hx - hr, hy - 12 * fg.scale * Z; d.line([bx0, by0, hx + hr, by0], fill=band, width=int(11 * fg.scale * Z))
                tx, ty = hx - f * hr * 0.9, by0
                for q in (0, 1):
                    pts = [(tx, ty)]
                    for k in range(1, 5): pts.append((tx - f * k * 26 * fg.scale * Z, ty + (k * 6 + q * 14) * fg.scale * Z + 9 * Z * math.sin(real * 15 + k * 0.9 + q)))
                    d.line(pts, fill=band, width=int(9 * fg.scale * Z), joint="curve")
            if fg.kind == "big":                                         # shoulder spikes
                sx, sy = P(J["sh"])
                for q in (-1, 1): d.polygon([(sx + q * 30 * Z, sy), (sx + q * 70 * Z, sy - 70 * Z), (sx + q * 80 * Z, sy + 10 * Z)], fill=(60, 10, 10))
            for pts in J["front"]: limb(pts, col)
            if S_["arm"]:
                (sx, sy), (ex_, ey_) = J["front"][0][0], J["front"][0][1]; mx_, my_ = (sx + ex_) / 2, (sy + ey_) / 2; ux, uy = (ex_ - sx) / 72, (ey_ - sy) / 72
                d.line([P((mx_ - ux * 14, my_ - uy * 14)), P((mx_ + ux * 14, my_ + uy * 14))], fill=S_["arm"], width=int(wd * 1.45))
            if fg.kind == "boss":                                        # crown
                k_ = hr; cx_, cy_ = hx, hy - hr * 0.8
                d.polygon([(cx_ - k_, cy_), (cx_ - k_, cy_ - k_ * 0.9), (cx_ - k_ * 0.5, cy_ - k_ * 0.45), (cx_, cy_ - k_ * 1.1), (cx_ + k_ * 0.5, cy_ - k_ * 0.45), (cx_ + k_, cy_ - k_ * 0.9), (cx_ + k_, cy_)], fill=(235, 190, 40), outline=(120, 80, 10), width=max(1, int(3 * Z)))
            if S_["prop"] == "staff":
                ex_, ey_ = J["elbow"]; hx_, hy_ = J["hand"]; ln = math.hypot(hx_ - ex_, hy_ - ey_) or 1; ux, uy = (hx_ - ex_) / ln, (hy_ - ey_) / ln
                d.line([P((hx_ - ux * 150, hy_ - uy * 150)), P((hx_ + ux * 190, hy_ + uy * 190))], fill=(170, 120, 60), width=int(13 * Z))
        # props and set pieces
        for o in st.objs:
            if not o.V.at(s): continue
            x, y, r_ = float(o.X.at(s)[0]), float(o.Y.at(s)[0]), math.radians(float(o.R.at(s)[0])); ca, sa = math.cos(r_), math.sin(r_)
            rot = lambda pts: [P((x + px * ca - py * sa, y + px * sa + py * ca)) for px, py in pts]
            if o.kind == "door":
                d.polygon(rot([(-26, -215), (26, -215), (26, 215), (-26, 215)]), fill=(120, 80, 46), outline=(60, 38, 20), width=int(6 * Z))
                for py in (-120, 0, 120): d.polygon(rot([(-18, py - 40), (18, py - 40), (18, py + 40), (-18, py + 40)]), outline=(90, 60, 34), width=int(4 * Z))
                hx_, hy_ = rot([(14, 10)])[0]; d.ellipse([hx_ - 7 * Z, hy_ - 7 * Z, hx_ + 7 * Z, hy_ + 7 * Z], fill=(220, 190, 80))
            elif o.kind == "staff": d.line(rot([(-170, 0), (170, 0)]), fill=(170, 120, 60), width=int(13 * Z))
            elif o.kind == "hand":                                       # a huge red hand, fingers spread
                sc = 3.2; d.polygon(rot([(0, -60 * sc), (90 * sc, -50 * sc), (90 * sc, 50 * sc), (0, 60 * sc)]), fill=(200, 40, 40))
                for k, (dy, ln) in enumerate(((-48, 70), (-16, 82), (16, 78), (48, 64))):
                    p0, p1 = rot([(0, dy * sc), (-ln * sc, dy * sc * 1.2)]); d.line([p0, p1], fill=(200, 40, 40), width=int(26 * sc * Z * 0.9))
                    d.ellipse([p1[0] - 13 * sc * Z, p1[1] - 13 * sc * Z, p1[0] + 13 * sc * Z, p1[1] + 13 * sc * Z], fill=(200, 40, 40))
                p0, p1 = rot([(30 * sc, 55 * sc), (-20 * sc, 95 * sc)]); d.line([p0, p1], fill=(200, 40, 40), width=int(24 * sc * Z * 0.9))
        # floor and ceiling slabs (drawn over the fighters, so heads stuck in the ceiling are hidden) with holes punched in them
        rect(LEFT - 28, UPPER, RIGHT + 28, CEIL, (70, 64, 76)); rect(LEFT - 28, 0, RIGHT + 28, 60, (66, 60, 72))
        d.line([X(LEFT - 28), Y(0), X(RIGHT + 28), Y(0)], fill=(120, 110, 130), width=int(6 * Z)); d.line([X(LEFT - 28), Y(UPPER), X(RIGHT + 28), Y(UPPER)], fill=(96, 88, 104), width=int(5 * Z))
        rect(LEFT - 28, -1880, RIGHT + 28, -1820, (70, 64, 76))
        for holes, y0, y1, colh in ((st.floor_holes, 0, 60, (22, 20, 30)), (st.ceil_holes, UPPER, CEIL, (30, 26, 38))):
            for t, a, b in holes:
                if s < t: continue
                pts = [(a, y0)]; n = 6
                for k in range(n + 1): pts.append((a + (b - a) * k / n, y0 + (14 if k % 2 else -4)))
                pts += [(b, y0), (b, y1)] + [(b - (b - a) * k / n, y1 + (-14 if k % 2 else 4)) for k in range(n + 1)] + [(a, y1)]
                d.polygon([P(p) for p in pts], fill=colh)
        # dividing walls of the main floor, with any holes smashed through them
        for wl in st.walls:
            x0, x1 = wl.x - wl.w / 2, wl.x + wl.w / 2; gaps = []
            if wl.opening: gaps.append(wl.opening)
            if wl.brk and s >= wl.brk[0]: gaps.append((wl.brk[1], wl.brk[2]))
            ys = sorted([CEIL, 0] + [g for gp in gaps for g in gp]); segs = []; y = CEIL
            for g0, g1 in sorted(gaps):
                if g0 > y: segs.append((y, g0))
                y = max(y, g1)
            if y < 0: segs.append((y, 0))
            for y0, y1 in segs:
                rect(x0, y0, x1, y1, wl.col)
                for yy in range(int(y0) + 40, int(y1), 46): d.line([X(x0), Y(yy), X(x1), Y(yy)], fill=tuple(c - 18 for c in wl.col), width=int(3 * Z))
            for g0, g1 in gaps:
                if (g0, g1) == wl.opening: continue
                for yy, sgn in ((g0, 1), (g1, -1)):
                    if CEIL < yy < 0: d.polygon([P((x0, yy)), P((x0 + wl.w * 0.3, yy + sgn * 24)), P((x0 + wl.w * 0.6, yy - sgn * 6)), P((x1, yy + sgn * 30)), P((x1, yy))], fill=wl.col)
        for h in st.draw_hooks: h(self, d, s, real, X, Y, Z, "front")
        for c in self.chunks:
            x, y, _, _, ang, _, sz, col, _, _ = c; ca, sa = math.cos(ang), math.sin(ang); hs = sz / 2
            d.polygon([P((x + px * ca - py * sa, y + px * sa + py * ca)) for px, py in ((-hs, -hs * 0.7), (hs, -hs * 0.6), (hs * 0.8, hs * 0.7), (-hs * 0.9, hs * 0.6))], fill=col)
        # effects
        flash = None
        for kind, t, x, y, a, col in st.fx:
            age = s - t
            if kind == "star" and 0 <= age < 0.16:
                k = age / 0.16
                for q in range(8):
                    an = q * math.pi / 4 + 0.3; r0, r1 = (30 + 90 * k) * a, (70 + 170 * k) * a; px, py = P((x, y))
                    d.line([px + r0 * Z * math.cos(an), py + r0 * Z * math.sin(an), px + r1 * Z * math.cos(an), py + r1 * Z * math.sin(an)], fill=col, width=max(2, int((14 * (1 - k) + 3) * Z)))
            elif kind == "puff" and 0 <= age < 0.45:
                k = age / 0.45; px, py = P((x, y))
                for q in range(9):
                    an = q * 0.7; rr = (20 + 70 * k) * Z; cx_, cy_ = px + math.cos(an) * (30 + 90 * k) * Z, py + math.sin(an) * (20 + 60 * k) * Z
                    g = int(150 - 70 * k); d.ellipse([cx_ - rr * (1 - k * 0.6), cy_ - rr * (1 - k * 0.6), cx_ + rr * (1 - k * 0.6), cy_ + rr * (1 - k * 0.6)], fill=(g, g, g + 6))
            elif kind == "ring":
                r0, r1, dur, wd, sq = a
                if 0 <= age < dur:
                    k = age / dur; rr = (r0 + (r1 - r0) * k) * Z; px, py = P((x, y))
                    d.ellipse([px - rr, py - rr * sq, px + rr, py + rr * sq], outline=col, width=max(2, int(wd * (1 - k) * Z + 2)))
            elif kind == "flash" and 0 <= age < a[0]: flash = (col, a[1] * (1 - age / a[0]))
            elif kind == "dustfall" and t <= s < a:
                for q in range(40):
                    px = cx - 600 / z + ((q * 137.5) % 1200) / z; py = CEIL + ((s - t) * 520 + q * 97) % 900
                    d.ellipse([X(px) - 4 * Z, Y(py) - 4 * Z, X(px) + 4 * Z, Y(py) + 4 * Z], fill=col)
        img = img.resize((W, H), Image.LANCZOS)
        if flash: img = Image.blend(img, Image.new("RGB", (W, H), flash[0]), max(0.0, min(1.0, flash[1])))
        gv = float(st.gray.at(s)[0])
        if gv > 0.01:                                                    # drain the colour, but keep anything yellow (Green's headband)
            a = np.asarray(img).astype(np.float32); gry = a @ np.array([0.3, 0.59, 0.11], np.float32)
            keep = (a[..., 0] > 190) & (a[..., 1] > 150) & (a[..., 2] < 110) & (a[..., 0] - a[..., 2] > 120)
            o = a * (1 - gv) + gry[..., None] * gv; o[keep] = a[keep]; img = Image.fromarray(o.clip(0, 255).astype(np.uint8))
        if freeze_label: img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), 0.45)
        d = ImageDraw.Draw(img)
        for hk in st.ui_hooks: hk(d, s, real, freeze_label)
        for tx in st.texts:
            if tx["t0"] <= s < tx["t1"]: draw_text(d, tx, s)
        return img

def outlined(d, xy, text, size, fill, anchor="mm", stroke=8):
    d.text(xy, text, font=Fnt(size), fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(0, 0, 0))

def draw_text(d, tx, s):
    k = (s - tx["t0"]) / max(0.01, tx["t1"] - tx["t0"]); a = min(1, (s - tx["t0"]) / 0.12); b = min(1, (tx["t1"] - s) / 0.12)
    if tx["kind"] == "title":
        off = (1 - a) * -700 + (1 - b) * 700
        d.rounded_rectangle([190 + off, 820, 890 + off, 900], 20, fill=(255, 212, 0), outline=(0, 0, 0), width=6); d.text((540 + off, 860), tx["top"], font=Fnt(54), fill=(17, 17, 17), anchor="mm")
        outlined(d, (540 - off, 975), tx["main"], 118, (255, 255, 255), stroke=10)
    elif tx["kind"] == "big":
        sc = 1 + 0.25 * max(0, 1 - (s - tx["t0"]) / 0.15)
        for part, xoff, col in tx["parts"]: outlined(d, (540 + xoff * sc, tx.get("y", 960)), part, tx.get("size", 200) * sc, col, stroke=12)
    elif tx["kind"] == "end":
        d.rounded_rectangle([200, 1470, 880, 1600], 30, fill=(255, 212, 0), outline=(0, 0, 0), width=7); d.text((540, 1535), tx["main"], font=Fnt(84), fill=(17, 17, 17), anchor="mm")
        if s - tx["t0"] > 0.4: outlined(d, (540, 1680), tx["sub"], 52, (255, 255, 255), stroke=6)

# ---------------------------------------------------------------- run: story time -> real frames + sound ----------------------------------------------------------------
def run(st, out, stills=None):
    out = Path(out); out.mkdir(parents=True, exist_ok=True); R = Renderer(st)
    freezes = sorted(st.freezes, key=lambda f: f[0]); fi = 0; events = sorted(st.events, key=lambda e: e[0]); ei = 0
    speed = lambda s: min([sp for a, b, sp in st.slows if a <= s < b] + [1.0])
    ff = None; stills = sorted(stills) if stills is not None else None
    if stills is None:
        ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", str(out / "video.mp4")], stdin=subprocess.PIPE)
    s, real, f, hold, label, shakes, log = 0.0, 0.0, 0, 0.0, None, [], []
    while s < st.end:
        if hold > 0: hold -= 1 / FPS
        else:
            label = None; ns = s + speed(s) / FPS
            while fi < len(freezes) and freezes[fi][0] <= s: fi += 1
            if fi < len(freezes) and freezes[fi][0] <= ns:
                ns = freezes[fi][0]; hold = freezes[fi][1]; label = freezes[fi][2]; fi += 1
            R.physics(s, ns); s = ns
        while ei < len(events) and events[ei][0] <= s:
            t, kind, g, dd = events[ei]; ei += 1
            if kind == "shake": shakes.append((real, g))
            else: log.append((real, kind, g, dd))
        amp = sum(g * max(0, 1 - (real - r0) / 0.32) for r0, g in shakes)
        if ff: ff.stdin.write(R.frame(s, real, amp, label).tobytes())
        elif stills and s >= stills[0]: R.frame(s, real, amp, label).save(out / f"still_{stills.pop(0):05.2f}.png")
        real += 1 / FPS; f += 1
    if ff: ff.stdin.close(); ff.wait()
    return real, log

def audio(out, dur, log, music):
    """music: list of (real_t0, real_t1) stretches where the drum track plays"""
    SR = 44100; a = np.zeros(int((dur + 3) * SR)); rs = np.random.default_rng(1)
    tt = lambda s: np.arange(int(s * SR)) / SR
    def add(t0, sig, g):
        i = int(t0 * SR); n = min(len(sig), len(a) - i)
        if n > 0 and i >= 0: a[i:i + n] += sig[:n] * g
    def thud(fr, s, noise): t = tt(s); return (np.sin(2 * np.pi * np.cumsum(fr * np.exp(-t * 9)) / SR) + noise * rs.standard_normal(len(t)) * np.exp(-t * 50)) * np.exp(-t * (5 / s))
    def sweep(f0, f1, s): t = tt(s); return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / s) / SR) * np.sin(np.pi * t / s)
    def noise(s, decay, lp=0.0):
        n = rs.standard_normal(int(s * SR))
        if lp: n = np.convolve(n, np.ones(int(lp)) / lp, mode="same")
        return n * np.exp(-tt(s) * decay)
    # music: a driving drum loop with a bass riff, 150 bpm
    beat = 60 / 150; riff = [41.2, 41.2, 49.0, 41.2, 55.0, 41.2, 49.0, 36.7]
    for m0, m1 in music:
        t, i = m0, 0
        while t < m1:
            add(t, thud(120, 0.2, 0.0), 0.32)
            if i % 2 == 1: add(t, noise(0.18, 22, 3), 0.16)
            add(t + beat / 2, noise(0.04, 90), 0.05); add(t, noise(0.04, 90), 0.04)
            fr = riff[i % 8]; tb = tt(beat * 0.9); add(t, (2 * ((fr * tb) % 1) - 1) * np.exp(-tb * 3) * 0.6, 0.16)
            t += beat; i += 1
    for t0, kind, g, dd in log:
        if kind == "hit": add(t0, thud(170, 0.2, 1.0), 0.55 * min(1.6, g))
        elif kind == "bighit": add(t0, thud(110, 0.35, 1.0), 0.9)
        elif kind == "crash": add(t0, thud(80, 0.45, 1.0), 0.9); add(t0, noise(0.6, 6, 2), 0.35)
        elif kind == "puff": add(t0, noise(0.25, 14, 6), 0.18)
        elif kind == "land": add(t0, thud(100, 0.18, 0.6), 0.35 * g)
        elif kind == "whoosh": add(t0, noise(0.35, 2, 4) * np.sin(np.pi * tt(0.35) / 0.35), 0.18 * g)
        elif kind == "block": t = tt(0.08); add(t0, np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 50), 0.3)
        elif kind == "energy": add(t0, sweep(200, 1400, 0.35), 0.35); add(t0 + 0.3, thud(90, 0.5, 1.0), 0.8)
        elif kind == "title": add(t0, thud(60, 0.8, 0.4), 0.8); add(t0, sweep(1800, 300, 0.4), 0.15)
        elif kind == "rumble": add(t0, noise(dd, 0.6, 40) * np.minimum(1, tt(dd) / 0.6), 1.6)
        elif kind == "roar":
            t = tt(1.6); fr = 70 + 25 * np.sin(2 * np.pi * 7 * t); saw = 2 * ((np.cumsum(fr) / SR) % 1) - 1
            add(t0, (saw * 0.7 + noise(1.6, 0, 3) * 0.5) * np.minimum(1, t / 0.15) * np.exp(-t * 1.2), 0.9)
        elif kind == "heart": add(t0, thud(55, 0.25, 0.0), 0.8); add(t0 + 0.22, thud(50, 0.25, 0.0), 0.6)
        elif kind == "sting":
            t = tt(2.2)
            for fr in (55, 82.4, 110, 164.8): add(t0, np.sin(2 * np.pi * fr * t) * np.exp(-t * 1.4), 0.35)
            add(t0, thud(60, 1.0, 0.8), 0.9)
    a = np.tanh(a[:int(dur * SR)] * 0.9); a *= 0.85 / (np.abs(a).max() or 1)
    import soundfile as sf
    sf.write(Path(out) / "audio.wav", a.astype(np.float32), SR)

def mux(out, name):
    out = Path(out)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out / "video.mp4"), "-i", str(out / "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out / f"{name}.mp4")], check=True)
