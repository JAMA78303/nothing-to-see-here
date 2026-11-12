"""Blue vs the Red Army, Part 1: THE BREACH. Every move is written out here on the story timeline (seconds).
usage: python sims/saga_p1.py out/saga1/            -> saga1.mp4
       python sims/saga_p1.py out/saga1/ stills     -> stills at the story beats only"""
import sys
from saga import Stage, Fig, Obj, Wall, run, audio, mux, outlined, UPPER, CEIL

BLUE, GREEN, RED = (60, 150, 255), (70, 200, 90), (230, 60, 55)
WHITE, YELLOW = (245, 245, 245), (255, 212, 0)
st = Stage(end=21.3)
outer, wallB, doorwall, farwall = Wall(st, 150), Wall(st, 1500), Wall(st, 2700, opening=(-440, 0)), Wall(st, 3830)
R = lambda x, face=-1, **kw: Fig(st, RED, x, face, **kw)

# ---------------- cast ----------------
B = Fig(st, BLUE, -260, 1, band=WHITE, kind="hero", h=70, pose="jkick", name="blue")
G = Fig(st, GREEN, 1240, -1, band=YELLOW, kind="hero", h=-700, pose="crouch", vis=0, name="green")
R1 = R(470, pose="idle")
L1, L2 = R(-150, 1, vis=0), R(-300, 1, vis=0)
R2, R3, R4, R5 = (R(x, h=940, vis=0) for x in (800, 930, 1060, 1190))
N1, N2 = R(1230, h=940, vis=0), R(1350, h=940, vis=0)
P1, P2 = R(-200, 1, vis=0), R(-330, 1, vis=0)
P3, P4 = R(1250, h=940, vis=0), R(1370, h=940, vis=0)
WS = [R(x, vis=0) for x in (1640, 1730, 1820, 1910, 2000)]
C1, C2, C3, C4 = R(2370), R(2480), R(2570), R(2640)
Q = R(3350)
door = Obj(st, "door", 2700, -215)
staff = Obj(st, "staff", 1100, -760, 90, vis=0)
hand = Obj(st, "hand", 4100, -400, vis=0)

# ---------------- 0.0  cold open: Blue kicks through the outer wall ----------------
st.sfx(0.0, "whoosh", 1.2)
B.arc(0.0, 0.42, 440, h1=70, peak=30)
outer.smash(st, 0.22, -560, -20, 1, n=36)
R1.pose(0.26, "hit", 0.1)
st.hit(0.42, 470, -270, 1.7, freeze=0.1, shake=2.5, snd="bighit"); st.flash(0.42, 0.08, amt=0.4)
R1.knock(0.42, 0.62, 1180, peak=170, spin=-720)
B.arc(0.42, 0.66, 430, 0, peak=50); B.pose(0.62, "land", 0.06); B.pose(0.8, "guard", 0.12)
st.slow(0.33, 0.5, 0.3)
B.walk(0.95, 1.45, 640)
st.text(1.0, 2.35, "title", top="PART 1", main="THE BREACH"); st.sfx(1.0, "title")

# ---------------- 1.2  the reds arrive: two run in, four drop through the ceiling ----------------
for f, t1, x1 in ((L1, 2.1, 330), (L2, 2.25, 460)): f.show(1.2); f.walk(1.25, t1, x1, run=True)
def drop(f, t, x):
    f.show(t - 0.1); st.ceil_hole(t, x - 60, x + 60, n=8, up=False)
    f.pose(t, "tuck", 0.05); f.go(t, t + 0.32, h=0, e="in"); f.pose(t + 0.3, "crouch", 0.04); st.sfx(t + 0.32, "land", 0.8); f.pose(t + 0.45, "guard", 0.12)
for i, (f, x) in enumerate(((R2, 800), (R3, 930), (R4, 1060), (R5, 1190))): drop(f, 1.4 + i * 0.07, x)
R5.prop.set(0, "staff")

# ---------------- 2.6  combo: spin kicks both ways, an uppercut into the ceiling ----------------
B.pose(2.66, "kick", 0.08)
st.hit(2.76, 730, -250, 1.2); R2.knock(2.76, 0.62, 1430, peak=220, spin=-720); st.crack(3.38, 1440, -320)
B.pose(2.84, "guard", 0.05); B.face(2.9, -1); B.pose(2.9, "kick", 0.07)
st.hit(2.98, 550, -250, 1.2); L2.knock(2.98, 0.75, -360, peak=230, spin=720, lie=0.05)
B.face(3.15, 1); B.pose(3.12, "runA", 0.06); B.go(3.15, 3.42, x=840); B.pose(3.38, "guard", 0.05)
B.pose(3.45, "upper", 0.08); st.hit(3.53, 900, -330, 1.5, freeze=0.08, shake=2.0, snd="bighit"); st.slow(3.5, 3.95, 0.4)
R3.pose(3.53, "tumble", 0.04); R3.go(3.53, 3.86, x=950, h=552, e="out"); R3.pose(3.8, "dangle", 0.06)
st.chunks_due.append((3.86, "ceil", 900, 1000, UPPER, CEIL, 0, 10, (70, 64, 76))); st.hit(3.86, 950, -880, 1.0, freeze=0.04, snd="crash"); st.ko(3.86)
t = 4.05
while t < 21: R3.pose(t, "dangle2" if int((t - 4.05) / 0.22) % 2 == 0 else "dangle", 0.1); t += 0.22

# ---------------- 3.95  both sides charge; Blue backflips out and they collide ----------------
L1.walk(3.95, 4.5, 815, run=True, end="runA"); R4.walk(3.95, 4.5, 865, run=True, end="runB")
B.pose(4.18, "crouch", 0.05); B.pose(4.26, "tuck", 0.06); B.arc(4.26, 4.68, 640, 0, peak=300, r1=-360); B.R.key(4.681, 0.0, "lin")
st.hit(4.5, 840, -300, 1.4, freeze=0.07); L1.knock(4.5, 0.5, 520, peak=150, spin=-360); R4.knock(4.5, 0.55, 1250, peak=170, spin=360)
B.pose(4.66, "land", 0.05); B.pose(4.8, "guard", 0.1)

# ---------------- 4.85  the staff: catch it, vault over him, sweep three ----------------
for i, (f, x) in enumerate(((N1, 1230), (N2, 1350))): drop(f, 4.85 + i * 0.08, x)
R5.walk(4.85, 5.25, 860, run=True); R5.pose(5.25, "carry", 0.08); R5.pose(5.38, "slamdn", 0.06)
B.pose(5.36, "catch", 0.06); st.hit(5.44, 750, -470, 0.9, freeze=0.07, snd="block", col=(200, 220, 255))
R5.prop.set(5.55, None); B.prop.set(5.55, "staff")
B.pose(5.55, "tuck", 0.06); B.arc(5.55, 5.95, 1010, 0, peak=330, r1=-360); B.R.key(5.951, 0.0, "lin")
R5.pose(5.6, "hit", 0.1); R5.face(5.8, 1)
B.pose(5.95, "sweep", 0.06)
for tf, fc in ((6.0, 1), (6.1, -1), (6.2, 1), (6.3, -1)): B.face(tf, fc)
st.hit(6.04, 1200, -240, 1.1); N1.knock(6.04, 0.55, 1400, peak=280, spin=-360)
st.hit(6.14, 900, -240, 1.1); R5.knock(6.14, 0.6, 620, peak=300, spin=360)
st.hit(6.24, 1320, -240, 1.1); N2.knock(6.24, 0.55, 1440, peak=240, spin=-360)
B.prop.set(6.5, None); staff.V.set(6.5, 1); staff.X.key(6.49, 1150, "lin"); staff.Y.key(6.49, -330, "lin"); staff.R.key(6.49, 0, "lin")
staff.arc(6.5, 6.85, 1120, -760, peak=120, r1=810); st.hit(6.85, 1120, -880, 0.5, freeze=0, shake=0.4, snd="block")
B.pose(6.45, "guard", 0.1); B.face(6.5, -1)

# ---------------- 6.9  the pile-on ----------------
for f, t1, x1 in ((P1, 7.45, 760), (P2, 7.5, 870)): f.show(6.9); f.walk(6.9, t1, x1, run=True)
for i, (f, x) in enumerate(((P3, 1250), (P4, 1370))): drop(f, 6.95 + i * 0.07, x)
P3.walk(7.3, 7.5, 1130); P4.walk(7.35, 7.52, 1210)
for f, t0, t1, x1, h1, pk, pose, rr in ((P1, 7.55, 7.85, 960, 40, 160, "grab", 0), (P2, 7.55, 7.88, 1000, 170, 200, "tumble", 60),
                                        (P3, 7.55, 7.86, 1060, 60, 150, "grab", 0), (P4, 7.6, 7.9, 1020, 280, 160, "pinned", -30)):
    f.pose(t0, "tuck", 0.05); f.arc(t0, t1, x1, h1, pk, r1=rr); f.pose(t1 - 0.05, pose, 0.05)
B.face(7.5, 1); B.pose(7.75, "pinned", 0.08); st.hit(7.86, 1010, -200, 0.9, freeze=0.04, shake=1.2)
import random; rnd = random.Random(4)
for f in (P1, P2, P3, P4):
    x0, t = f.x(7.92), 7.95
    while t < 8.65: f.X.key(t, x0 + rnd.uniform(-9, 9), "lin"); t += 0.08

# ---------------- 8.2  Green bursts up through the floor ----------------
G.show(7.9); G.go(8.25, 8.42, h=-180, e="in")
st.floor_hole(8.42, 1150, 1330, n=34); st.hit(8.42, 1240, 20, 1.3, freeze=0.05, snd="crash")
G.pose(8.38, "rise", 0.06); G.go(8.45, 8.68, h=260, e="out")
st.ring(8.68, 1120, -260, 40, 760, (120, 255, 140), dur=0.5, width=30); st.ring(8.74, 1120, -260, 20, 480, (230, 255, 230), dur=0.4, width=18)
st.flash(8.68, 0.14, (200, 255, 200), 0.6); st.hit(8.68, 1120, -260, 2.0, freeze=0.1, shake=2.6, snd="energy", col=(160, 255, 170)); st.slow(8.6, 9.1, 0.4)
P1.knock(8.7, 0.6, 560, peak=300, spin=720)
st.ceil_hole(8.86, 950, 1060); P2.knock(8.7, 0.4, 1000, h1=940, peak=60, spin=-360)
P3.knock(8.7, 0.45, 1440, peak=200, spin=-720); st.crack(9.15, 1450, -330)
P4.pose(8.7, "hit", 0.05); P4.go(8.7, 8.85, x=1040, h=330, r=0, e="out"); st.crack(8.85, 1040, -500, 1.3); P4.gone(9.2)
G.face(8.75, -1); G.pose(8.75, "tuck", 0.05); G.arc(8.75, 9.0, 1070, 0, peak=60); G.pose(8.95, "land", 0.05); G.pose(9.1, "guard", 0.1)
B.pose(8.9, "guard", 0.15); B.walk(9.0, 9.2, 960)
B.face(9.25, -1); G.face(9.25, 1)

# ---------------- 9.9  Green throws Blue like a missile through the wall ----------------
for w in WS: w.show(9.5)
G.pose(9.9, "carry", 0.08); B.pose(9.95, "tuck", 0.05); B.face(10.0, 1); B.arc(9.95, 10.15, 1070, h1=290, peak=60); B.pose(10.12, "fly", 0.05)
G.pose(10.3, "hurl", 0.08); st.sfx(10.38, "whoosh", 1.4)
B.go(10.38, 11.0, x=2150, h=150, e="lin"); st.slow(10.38, 11.0, 0.4)
wallB.smash(st, 10.6, -600, -20, 1, n=40, big=1.2)
for i, w in enumerate(WS):
    x = w.x(10.0); t = 10.38 + 0.62 * (x - 120 - 1070) / 1080
    st.hit(t, x - 40, -330, 1.1, freeze=0.03)
    if i == 2: w.knock(t, 0.4, 1900, h1=940, peak=40, spin=-360); st.ceil_hole(t + 0.25, 1850, 1960)
    else: w.knock(t, 0.55, x + 380 + i * 40, peak=260 + i * 30, spin=-720)
B.pose(11.0, "tuck", 0.05); B.arc(11.0, 11.25, 2260, 0, peak=40, r1=-360); B.R.key(11.251, 0.0, "lin"); B.pose(11.23, "land", 0.05); B.pose(11.38, "guard", 0.1)
G.pose(10.55, "tuck", 0.05); G.face(10.5, 1); G.arc(10.55, 10.9, 1420, 0, peak=120, r1=-360); G.R.key(10.901, 0.0, "lin"); G.walk(10.95, 11.45, 2060, run=True)

# ---------------- 11.45  the corridor ----------------
B.pose(11.45, "jab", 0.06); st.hit(11.52, 2330, -330, 1.2, freeze=0.05)
C1.pose(11.52, "hit", 0.05); C1.go(11.52, 11.62, x=2420, h=60, e="out"); st.crack(11.62, 2420, -300, 1.3)
C1.go(11.9, 12.1, h=0, e="in"); C1.pose(12.0, "ko", 0.08); C1.gone(12.2)
B.pose(11.6, "guard", 0.1)
G.walk(11.45, 11.75, 2280, run=True)
C2.pose(11.7, "jkick", 0.06); C2.arc(11.7, 11.92, 2350, h1=60, peak=120)
G.pose(11.88, "rise", 0.06); st.hit(11.95, 2340, -420, 1.4, freeze=0.07, shake=1.8)
C2.knock(11.95, 0.35, 2360, h1=940, peak=30, spin=-360); st.ceil_hole(12.12, 2300, 2420)
G.pose(12.05, "land", 0.06); G.pose(12.2, "guard", 0.1)
B.pose(12.35, "jkick", 0.06); B.arc(12.35, 12.62, 2480, h1=40, peak=120); st.hit(12.62, 2530, -300, 1.3, freeze=0.05)
C3.knock(12.62, 0.4, 2600, peak=50, spin=0); B.go(12.62, 12.75, h=0); B.pose(12.72, "guard", 0.08)
G.walk(12.4, 12.95, 2520, run=True)
C4.pose(13.0, "hit", 0.05)
for i, t in enumerate((13.05, 13.12, 13.19, 13.26, 13.33)):
    G.pose(t - 0.04, "jab" if i % 2 == 0 else "jabB", 0.03); st.hit(t, 2585, -330, 0.7, freeze=0, shake=0.4); C4.X.key(t + 0.02, 2640 + 4 * (i + 1), "lin")
B.walk(13.0, 13.35, 2545, run=True)
B.pose(13.45, "kick", 0.08); G.pose(13.45, "kick", 0.08)
st.hit(13.56, 2650, -280, 2.0, freeze=0.1, shake=2.6, snd="bighit"); st.flash(13.56, 0.08, amt=0.35); st.slow(13.5, 13.75, 0.4)
door.arc(13.56, 14.05, 3080, -26, peak=200, r1=450); st.sfx(14.05, "land", 1.0)
C4.knock(13.56, 0.55, 3200, peak=220, spin=-720)

# ---------------- 14.0  the last red runs; Blue throws the door at him ----------------
Q.face(14.25, 1); Q.walk(14.3, 15.2, 3690, run=True, end="cower"); Q.face(15.25, -1)
B.walk(14.0, 14.55, 3060, run=True); B.pose(14.6, "crouch", 0.08)
door.go(14.7, 14.95, x=3060, y=-490, r=450); B.pose(14.7, "carry", 0.2)
B.pose(15.1, "hurl", 0.08); door.arc(15.15, 15.5, 3700, -230, peak=120, r1=1080); st.slow(15.12, 15.5, 0.5); st.sfx(15.15, "whoosh")
st.hit(15.5, 3700, -260, 1.8, freeze=0.1, shake=2.4, snd="bighit"); Q.pose(15.45, "brace", 0.04); Q.gone(15.62)
door.go(15.5, 15.6, x=3740, r=1088)
G.walk(14.4, 15.3, 2900, run=True)

# ---------------- 15.8  quiet... then the wall shakes ----------------
st.sfx(15.8, "music_off")
B.walk(15.9, 16.5, 3250, end="idle"); G.walk(15.7, 16.4, 3120, end="idle"); G.face(16.45, 1)
st.sfx(16.6, "rumble", 1.0, 2.8); st.dustfall(16.6, 17.9)
for t, a in ((16.6, 0.4), (16.9, 0.6), (17.2, 0.9), (17.45, 1.2)): st.shake(t, a)
B.face(16.75, -1); B.pose(16.8, "guard", 0.1); G.pose(16.85, "guard", 0.1); B.face(17.05, 1)
farwall.smash(st, 17.5, -620, -180, -1, n=40, big=1.6); st.slow(17.45, 17.75, 0.5)
door.arc(17.5, 17.95, 3420, -26, peak=160, r1=1170)
hand.V.set(17.45, 1); hand.go(17.48, 17.65, x=3690, e="out"); hand.go(18.1, 18.3, x=4100, e="in"); hand.V.set(18.35, 0)
B.pose(17.55, "brace", 0.06); B.go(17.55, 17.8, x=3180); G.pose(17.57, "brace", 0.06); G.go(17.55, 17.8, x=3060)
st.sfx(18.85, "roar")
for t in (18.85, 19.0, 19.15): st.ring(t, 3945, -440, 60, 900, (255, 70, 60), dur=0.6, width=26)
st.shake(18.85, 2.8); st.flash(18.85, 0.2, (255, 60, 50), 0.3)
B.go(18.85, 19.2, x=3080); G.go(18.85, 19.2, x=2960)
st.text(19.5, 21.3, "end", main="PART 2 →", sub="FOLLOW FOR PART 2"); st.sfx(19.5, "sting")

def eyes(R_, d, s, real, X, Y, Z, layer):
    if layer != "front" or not 18.45 <= s: return
    k = min(1, (s - 18.45) / 0.25); pulse = 1 + 0.12 * __import__("math").sin(real * 10)
    for ex, ey in ((3905, -430), (3990, -446)):
        for rr, col in ((34, (120, 10, 10)), (22, (255, 60, 40)), (10, (255, 230, 200))):
            r = rr * k * pulse * Z; d.ellipse([X(ex) - r, Y(ey) - r * 0.7, X(ex) + r, Y(ey) + r * 0.7], fill=col)
st.draw_hooks.append(eyes)

def ui(d, s, real, label):
    if label == "1v6":
        for part, xo, col in (("1", -270, BLUE), ("VS", 0, (255, 255, 255)), ("6", 270, RED)): outlined(d, (540 + xo, 960), part, 190, col, stroke=14)
st.ui_hooks.append(ui)

# ---------------- camera ----------------
for t, cx, cy, z in ((0.0, 330, -380, 1.3), (0.4, 360, -380, 1.25), (0.9, 640, -430, 1.0), (2.3, 760, -430, 0.82), (2.7, 720, -430, 0.95),
                     (3.5, 880, -450, 0.95), (3.9, 880, -520, 0.9), (4.6, 820, -430, 0.9), (5.4, 850, -430, 0.95), (6.4, 1050, -430, 0.9),
                     (7.3, 1000, -430, 0.95), (7.9, 1020, -380, 1.25), (8.45, 1100, -300, 0.95), (9.1, 1080, -430, 0.9), (9.3, 1015, -330, 1.35),
                     (9.85, 1050, -400, 1.25), (10.4, 1250, -430, 0.95), (10.95, 1950, -430, 0.95), (11.4, 2250, -430, 0.95), (12.0, 2380, -520, 0.9),
                     (12.7, 2480, -430, 0.95), (13.5, 2600, -430, 1.05), (14.3, 2950, -430, 0.95), (15.0, 3250, -430, 0.9), (15.6, 3500, -430, 0.95),
                     (16.4, 3400, -430, 1.0), (17.3, 3480, -430, 0.95), (17.7, 3470, -430, 0.8), (18.4, 3500, -450, 0.84), (19.4, 3470, -430, 0.8), (21.3, 3470, -430, 0.8)):
    st.camkey(t, cx, cy + 40, z if t in (2.3,) else z * 1.2)

if __name__ == "__main__":
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == "stills":
        run(st, out, stills=[0.3, 0.42, 1.6, 2.55, 2.8, 3.95, 4.5, 5.45, 6.15, 7.9, 8.7, 9.6, 10.75, 11.95, 13.56, 15.5, 17.65, 19.0, 20.0])
    else:
        dur, log = run(st, out)
        off = next((t for t, k, *_ in log if k == "music_off"), dur)
        audio(out, dur, [x for x in log if x[1] != "music_off"], [(0.0, off)]); mux(out, "saga1")
        print(f"saga1.mp4 {dur:.1f}s")
