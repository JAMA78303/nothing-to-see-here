"""Blue vs the Red Army, Part 2: THE BRUTE. Big Red bursts in; Green dies taking the blow meant for Blue; Blue mourns,
ties on Green's headband, powers up and drives Big Red down through two floors. Then a glimpse of the King.
usage: python sims/saga_p2.py out/saga2/            -> saga2.mp4
       python sims/saga_p2.py out/saga2/ stills     -> stills at the story beats only"""
import math, sys
from saga import Stage, Fig, Obj, Wall, run, audio, mux, joints, UPPER, CEIL
from earth import earth

BLUE, GREEN, RED, BIGRED, KING = (60, 150, 255), (70, 200, 90), (230, 60, 55), (205, 40, 40), (120, 15, 20)
WHITE, YELLOW = (245, 245, 245), (255, 212, 0)
st = Stage(end=20.8)
SHIP = 10000                                                      # the King's ship: a separate set, far off to the right
outer, wallB, doorwall, farwall = Wall(st, 150), Wall(st, 1500), Wall(st, 2700, opening=(-440, 0)), Wall(st, 3830)
for wl in (outer, wallB): wl.brk = (-1, -600, -20)                  # the holes from Part 1

B = Fig(st, BLUE, 3080, 1, band=WHITE, kind="hero", pose="brace", name="blue")
G = Fig(st, GREEN, 2960, 1, band=YELLOW, kind="hero", pose="brace", name="green")
BR = Fig(st, BIGRED, 4150, -1, scale=1.9, kind="big", pose="guard", name="bigred")
K = Fig(st, KING, SHIP + 70, 1, scale=1.35, kind="boss", pose="sit", vis=0, name="king"); K.G.set(0, -9999)   # seated on the throne
ASSASSINS = []
for x, f, pose in ((SHIP - 330, -1, "guard"), (SHIP - 520, -1, "kneel"), (SHIP - 700, -1, "guard"), (SHIP + 460, 1, "guard"), (SHIP + 650, 1, "kneel"), (SHIP + 830, 1, "guard")):   # all facing outward: his bodyguards
    ASSASSINS.append(Fig(st, (170, 22, 28), x, f, kind="assassin", pose=pose, vis=0))

# ---------------- 0.0  Big Red bursts through the wall ----------------
farwall.smash(st, 0.25, -860, -20, -1, n=60, big=2.2); st.flash(0.25, 0.1, amt=0.35)
BR.walk(0.05, 0.6, 3600, run=True); BR.pose(0.62, "guard", 0.1)
BR.pose(0.75, "roar", 0.12); st.sfx(0.8, "roar")
for t in (0.8, 0.95, 1.1): st.ring(t, 3600, -640, 60, 900, (255, 70, 60), dur=0.6, width=26)
st.shake(0.8, 2.8)
B.go(0.8, 1.1, x=3000); G.go(0.8, 1.1, x=2880)
st.text(1.0, 2.3, "title", top="PART 2", main="THE BRUTE"); st.sfx(1.0, "title")
BR.pose(1.2, "guard", 0.15)

# ---------------- 1.25  Green charges first and is swatted out of the room ----------------
B.pose(1.25, "guard", 0.05); G.pose(1.25, "guard", 0.05)
G.walk(1.25, 1.42, 3300, run=True)
BR.pose(1.36, "windup", 0.05); BR.pose(1.44, "hurl", 0.05); st.hit(1.47, 3330, -360, 1.6, freeze=0.06, shake=2.0, snd="bighit")
G.knock(1.47, 0.42, 2400, peak=160, spin=-720, end="down"); doorwall.smash(st, 1.75, -820, -440, -1, n=26)
G.R.key(5.1, 0.0, "lin"); G.pose(5.15, "guard", 0.15)

# ---------------- 1.9  Big Red beats Blue up ----------------
# a jump kick, caught by the leg, and slammed into the floor
B.walk(1.6, 1.85, 3250, run=True); B.pose(1.88, "jkick", 0.05); B.arc(1.88, 2.12, 3360, h1=330, peak=80)
BR.pose(2.05, "grab", 0.06); B.pose(2.14, "tumble", 0.05); B.go(2.14, 2.3, x=3400, h=520, r=180)
BR.pose(2.32, "slamup", 0.08); B.go(2.32, 2.42, x=3420, h=700, r=200)
BR.pose(2.45, "slamdn", 0.05); B.go(2.45, 2.55, x=3330, h=0, r=270, e="in"); B.R.key(2.551, 0.0, "lin"); B.pose(2.55, "ko", 0.04)
st.hit(2.55, 3330, -40, 2.4, freeze=0.1, shake=3.0, snd="crash"); st.ring(2.55, 3330, 0, 60, 760, (255, 230, 150), dur=0.4, width=22, squash=0.18)
st.chunks_due.append((2.55, "floor", 3260, 3400, 0, 60, 0, 18, (66, 60, 72)))
# up again, and kicked across the room into the wall
B.pose(2.85, "hit", 0.2); BR.pose(2.95, "kick", 0.07)
st.hit(3.02, 3350, -260, 1.8, freeze=0.07, shake=2.0, snd="bighit")
B.knock(3.02, 0.3, 2770, h1=120, peak=60, spin=0, end="stay"); st.crack(3.32, 2765, -320, 1.4); st.hit(3.32, 2760, -320, 1.2, freeze=0.04, snd="crash")
B.pose(3.32, "hit", 0.04); B.go(3.35, 3.6, h=0, e="in"); B.pose(3.55, "kneel", 0.08)
BR.pose(3.2, "guard", 0.15); BR.walk(3.4, 3.95, 3380)
# he staggers back in: a punch to the gut, an uppercut into the ceiling
B.pose(3.7, "hit", 0.2); B.walk(3.7, 4.0, 3150)
BR.pose(4.02, "jab", 0.05); st.hit(4.07, 3200, -330, 1.6, freeze=0.06, shake=1.8); B.pose(4.07, "pinned", 0.05); B.go(4.07, 4.2, x=3130)
BR.pose(4.22, "upper", 0.07); st.hit(4.3, 3160, -380, 2.2, freeze=0.08, shake=2.4, snd="bighit")
B.pose(4.3, "tumble", 0.04); B.go(4.3, 4.48, x=3200, h=470, e="out"); st.chunks_due.append((4.48, "ceil", 3140, 3260, UPPER, CEIL, 0, 12, (70, 64, 76))); st.hit(4.48, 3200, -870, 1.0, freeze=0.04, snd="crash")
B.go(4.52, 4.8, h=0, e="in"); B.pose(4.78, "ko", 0.05); st.sfx(4.8, "land", 1.0)
# picked up limp and slammed down again
BR.walk(4.85, 5.05, 3330); BR.pose(5.05, "grab", 0.08)
B.pose(5.1, "tumble", 0.05); B.go(5.1, 5.35, x=3250, h=420, r=-30)
BR.pose(5.38, "slamup", 0.06); BR.pose(5.5, "slamdn", 0.05); B.go(5.5, 5.58, h=0, r=0, e="in"); B.pose(5.58, "ko", 0.04)
st.hit(5.58, 3250, -40, 2.6, freeze=0.1, shake=3.0, snd="crash"); st.ring(5.58, 3250, 0, 60, 700, (255, 230, 150), dur=0.4, width=22, squash=0.18)
# he can only get as far as his knees
B.pose(5.85, "kneel", 0.3); B.face(5.85, 1)

# ---------------- 6.0  the finishing blow, and Green comes in for the save ----------------
BR.walk(5.75, 5.98, 3420); BR.pose(6.0, "slamup", 0.25)
G.walk(5.3, 6.02, 2960, run=True)
G.pose(6.05, "fly", 0.05); G.arc(6.05, 6.4, 3270, h1=150, peak=90)
B.go(6.36, 6.55, x=3150); B.pose(6.36, "brace", 0.05)
BR.pose(6.38, "slamdn", 0.05)
st.hit(6.45, 3290, -300, 3.0, freeze=0.25, shake=3.4, snd="bighit"); st.flash(6.45, 0.12, amt=0.7); st.slow(6.42, 6.95, 0.3); st.sfx(6.45, "music_off")
G.knock(6.45, 0.75, 2800, peak=200, spin=-720, end="down"); st.crack(7.2, 2770, -260, 1.2)
BR.pose(6.7, "guard", 0.3)

# ---------------- 7.3  Blue goes to him. The colour drains, except his headband ----------------
st.gray.key(7.25, 0.0, "lin"); st.gray.key(8.0, 1.0, "io"); st.gray.key(11.6, 1.0, "lin"); st.gray.key(12.25, 0.0, "io")
for t in (8.0, 9.0, 10.0, 11.0): st.sfx(t, "heart")
B.face(7.4, -1); B.pose(7.4, "idle", 0.3)
B.walk(7.7, 8.5, 2860); B.pose(8.55, "kneel", 0.3)
BR.pose(7.5, "idle", 0.3)
from saga import P_
t, j = 7.9, 0
while t < 11.5: BR.P.key(t, P_["idle"] + [6 * (j % 2), 0, 0, 0, 0, 0, 0, 0, 0], "io"); t += 0.45; j += 1      # big slow breaths
B.pose(9.15, "reach", 0.3); G.bandS.set(9.5, None)                # he slips the headband off Green's head
G.V.set(9.95, 0)                                                     # Green fades away
B.pose(10.5, "idle", 0.6)                                            # stands, holding it
B.pose(11.0, "tie", 0.25); B.bandS.set(11.35, YELLOW)                # and ties it on in place of his own
B.pose(11.45, "idle", 0.15); B.face(11.5, 1)

# ---------------- 11.5  the power-up: the whole room shakes ----------------
st.sfx(11.55, "energy"); st.sfx(11.55, "rumble", 1.0, 1.1); st.dustfall(11.6, 12.7)
t, amp = 11.55, 0.6
while t < 12.45: st.shake(t, amp); t += 0.08; amp = min(3.2, amp + 0.2)
for i, (t, x, y) in enumerate(((11.75, 2700, -500), (11.9, 3100, -650), (12.05, 2560, -300), (12.15, 3300, -420), (12.3, 2950, -700))): st.crack(t, x, y, 1.0 + 0.2 * i)
for t, x in ((11.7, 2700), (11.85, 3050), (12.0, 2880), (12.15, 3250), (12.3, 2620)): st.chunks_due.append((t, "ceil", x - 50, x + 50, UPPER, CEIL, 0, 8, (70, 64, 76)))
for t in (11.7, 11.95, 12.15, 12.32): st.flash(t, 0.07, (150, 200, 255), 0.35)
st.ring(11.9, 2860, 0, 40, 620, (120, 190, 255), dur=0.5, width=22, squash=0.2); st.ring(12.15, 2860, -200, 40, 900, (170, 220, 255), dur=0.55, width=28)
st.chunks_due.append((11.95, "floor", 2760, 2960, 0, 60, 0, 20, (66, 60, 72)))
B.pose(11.9, "guard", 0.12); st.sfx(12.3, "title"); st.sfx(12.3, "music_on")
BR.pose(11.85, "brace", 0.12); BR.go(11.85, 12.2, x=3520); BR.pose(12.2, "roar", 0.1); st.sfx(12.2, "roar")

# ---------------- 12.35  Blue's turn ----------------
B.pose(12.35, "runA", 0.04); B.go(12.38, 12.55, x=3330, e="in")
B.pose(12.53, "jab", 0.05); st.hit(12.6, 3380, -380, 2.5, freeze=0.12, shake=3.0, snd="bighit", col=(170, 220, 255)); st.flash(12.6, 0.08, (180, 220, 255), 0.4)
BR.pose(12.6, "hit", 0.06); BR.go(12.6, 12.9, x=3560, e="out")
B.walk(12.75, 12.92, 3450, run=True); B.pose(12.92, "kick", 0.06); st.hit(12.98, 3510, -160, 1.6, freeze=0.06, shake=1.8, col=(170, 220, 255))
BR.pose(13.0, "kneel", 0.1)
B.pose(13.15, "upper", 0.08); st.hit(13.25, 3520, -560, 2.4, freeze=0.1, shake=2.8, snd="bighit", col=(170, 220, 255)); st.slow(13.22, 13.6, 0.45)
BR.pose(13.25, "tumble", 0.05); BR.go(13.25, 13.62, x=3580, h=1100, e="out"); st.ceil_hole(13.42, 3440, 3720, n=24)
B.pose(13.42, "tuck", 0.05); B.arc(13.42, 13.82, 3600, h1=1330, peak=40, r1=-360); B.R.key(13.821, 0.0, "lin")
B.pose(13.82, "slamup", 0.05); B.pose(13.88, "slamdn", 0.04)
st.hit(13.92, 3600, -1500, 2.6, freeze=0.12, shake=3.0, snd="bighit", col=(170, 220, 255))
BR.pose(13.92, "ko", 0.05); BR.go(13.92, 14.45, h=-700, e="in"); B.go(13.92, 14.45, h=-560, e="in"); B.pose(14.0, "slamdn", 0.05)
st.floor_hole(14.18, 3460, 3740, n=34); st.hit(14.18, 3600, 20, 1.6, freeze=0.04, snd="crash")
st.hit(14.45, 3600, 680, 3.4, freeze=0.15, shake=3.6, snd="crash"); st.flash(14.45, 0.1, amt=0.5)
st.ring(14.45, 3600, 700, 80, 1000, (255, 230, 150), dur=0.5, width=26, squash=0.2)
st.chunks_due.append((14.45, "floor", 3420, 3780, 640, 700, 0, 30, (40, 36, 46)))
BR.G.set(14.45, -700); B.pose(14.5, "land", 0.06); B.pose(14.9, "guard", 0.2); B.pose(15.6, "idle", 0.4)

# ---------------- 16.4  cut to the King's ship: on his throne, surrounded by assassins ----------------
st.sfx(16.0, "music_off"); st.sfx(16.4, "whoosh", 1.5); st.flash(16.4, 0.15, amt=0.8)
K.show(16.4)
for a in ASSASSINS: a.show(16.4)
K.pose(17.6, "lean", 0.4)                                            # he leans forward...
for a in ASSASSINS:                                                  # ...and every assassin draws his blade at once
    a.prop.set(18.35, "blade"); a.pose(18.3, "kneel" if a.P.at(18.0)[0] > 20 else "guard", 0.06)
st.sfx(18.35, "block", 1.0); st.sfx(18.38, "block", 1.0); st.flash(18.35, 0.06, (255, 220, 220), 0.25)
st.text(18.7, 20.8, "end", main="PART 3 →", sub="FOLLOW FOR PART 3"); st.sfx(18.7, "sting")

import random
_r = random.Random(9); STARS = [(SHIP - 1500 + _r.random() * 3000, -1900 + _r.random() * 1300, 1.5 + _r.random() * 3) for _ in range(120)]
def ship(R_, d, s, real, X, Y, Z, layer):
    if s < 16.4: return
    rect = lambda x0, y0, x1, y1, col: d.rectangle([X(x0), Y(y0), X(x1), Y(y1)], fill=col)
    if layer == "front":                                                             # the near armrest, in front of him, his arm resting on it
        rect(SHIP + 262, -372, SHIP + 296, -120, (235, 190, 40)); rect(SHIP - 40, -386, SHIP + 300, -352, (235, 190, 40)); return
    rect(SHIP - 3000, -3000, SHIP + 3000, 3000, (26, 26, 38))                        # hull
    d.rounded_rectangle([X(SHIP - 1250), Y(-1950), X(SHIP + 1250), Y(-560)], radius=int(120 * Z), fill=(4, 6, 18), outline=(90, 96, 120), width=int(18 * Z))
    for sx, sy, sr in STARS: d.ellipse([X(sx) - sr * Z, Y(sy) - sr * Z, X(sx) + sr * Z, Y(sy) + sr * Z], fill=(210, 215, 240))
    pr = int(330 * Z); e = earth(pr * 2)                                             # Earth, out of the window
    d._image.paste(e, (int(X(SHIP + 330) - e.width / 2), int(Y(-1230) - e.height / 2)), e)
    rect(SHIP - 1250, -620, SHIP + 1250, -560, (90, 96, 120))
    for x in range(SHIP - 2800, SHIP + 2800, 240): rect(x, -540, x + 12, 0, (40, 40, 56))
    for x in (SHIP - 900, SHIP + 1000):                                              # glowing red panels
        rect(x - 60, -460, x + 60, -140, (60, 10, 16)); rect(x - 44, -440, x + 44, -160, (200, 30, 40) if int(real * 2) % 2 else (160, 20, 30))
    rect(SHIP - 3000, 0, SHIP + 3000, 900, (44, 44, 60)); d.line([X(SHIP - 3000), Y(0), X(SHIP + 3000), Y(0)], fill=(110, 110, 140), width=int(6 * Z))
    rect(SHIP - 900, -8, SHIP + 1100, 0, (130, 20, 30))                              # red carpet
    rect(SHIP - 200, -120, SHIP + 340, 0, (60, 58, 80))                              # the dais
    d.polygon([(X(SHIP - 40), Y(-120)), (X(SHIP - 40), Y(-980)), (X(SHIP + 70), Y(-1070)), (X(SHIP + 180), Y(-980)), (X(SHIP + 180), Y(-120))], fill=(46, 30, 70), outline=(235, 190, 40), width=int(8 * Z))
    rect(SHIP - 40, -252, SHIP + 240, -120, (46, 30, 70)); rect(SHIP - 40, -266, SHIP + 250, -236, (200, 40, 60))   # the seat he sits on, with a cushion
    d.line([X(SHIP - 40), Y(-262), X(SHIP + 210), Y(-262)], fill=(235, 190, 40), width=int(6 * Z))
st.draw_hooks.append(ship)

def hooks(R_, d, s, real, X, Y, Z, layer):
    if layer == "back" and 11.55 <= s:                                # Blue's aura: strong while powering up, then a faint glow
        S_ = B.state(s); k = min(1, (s - 11.55) / 0.5) * (1.0 if s < 12.6 else 0.45)
        cx, cy = X(S_["x"]), Y(-200 - S_["h"])
        for q, col in ((1.25, (40, 90, 170)), (1.0, (80, 150, 240)), (0.75, (150, 210, 255))):
            w = 130 * q * k * (1 + 0.08 * math.sin(real * 18 + q)) * Z; d.ellipse([cx - w, cy - w * 1.9, cx + w, cy + w * 1.7], outline=col, width=max(2, int(10 * Z)))
        for i in range(8):
            ph = (real * 1.8 + i / 8) % 1; x = cx + (i - 3.5) * 26 * Z; y = cy + (160 - 380 * ph) * Z
            d.line([x, y, x, y - 40 * Z], fill=(170, 220, 255), width=max(1, int(5 * Z)))
    if layer == "front" and 11.6 <= s < 12.6:                         # rocks lifting off the floor around him
        for i in range(14):
            ph = ((s - 11.6) * 0.8 + i / 14) % 1; x = X(2860 - 260 + (i * 41) % 520); y = Y(-10 - 520 * ph)
            r = (14 - 6 * ph) * Z; d.polygon([(x - r, y), (x, y - r * 0.8), (x + r, y), (x, y + r * 0.7)], fill=(96, 90, 108))
    if layer == "front":
        if 9.9 <= s < 11.3:                                            # Green fades into rising sparks
            for i in range(26):
                ph = ((s - 9.9) * 0.9 + i / 26) % 1; x = X(2800 - 140 + (i * 37) % 280); y = Y(-30 - 600 * ph)
                r = (9 - 7 * ph) * Z; d.ellipse([x - r, y - r, x + r, y + r], fill=(160, 240, 140) if i % 2 else (255, 230, 80))
        if 9.5 <= s < 11.35:                                           # Green's headband in Blue's hand
            J = joints({**B.state(s), "scale": 1.0}); x, y = X(J["hand"][0]), Y(J["hand"][1])
            d.ellipse([x - 22 * Z, y - 14 * Z, x + 22 * Z, y + 14 * Z], outline=YELLOW, width=int(9 * Z))
            for q in (0, 1): d.line([x, y + 10 * Z, x + (8 - 16 * q) * Z, y + 54 * Z + 6 * Z * math.sin(real * 4 + q)], fill=YELLOW, width=int(8 * Z))
        if s >= 18.0:                                                  # the King's eyes light up
            k = min(1, (s - 18.0) / 0.3); J = joints({**K.state(s), "scale": K.scale}); hx, hy = X(J["head"][0]), Y(J["head"][1])
            for dx in (8, 30):
                r = 11 * k * Z * (1 + 0.15 * math.sin(real * 8)); d.ellipse([hx + dx * Z - r, hy - 6 * Z - r * 0.6, hx + dx * Z + r, hy - 6 * Z + r * 0.6], fill=(255, 230, 120))
st.draw_hooks.append(hooks)

# ---------------- camera ----------------
for t, cx, cy, z in ((0.0, 3420, -430, 1.0), (0.8, 3300, -450, 0.95), (1.7, 3100, -450, 0.9), (2.2, 3330, -520, 0.95), (2.7, 3300, -430, 1.0), (3.1, 3080, -430, 0.85), (3.6, 2960, -430, 0.88),
                     (4.0, 3220, -450, 1.0), (4.45, 3220, -560, 0.95), (5.0, 3280, -430, 1.0), (5.7, 3300, -430, 1.05), (6.3, 3250, -430, 1.05), (6.6, 3100, -430, 1.0),
                     (7.3, 2950, -400, 1.1), (8.6, 2850, -330, 1.4), (10.6, 2870, -330, 1.35), (11.6, 2980, -420, 1.1), (12.4, 3250, -450, 0.95),
                     (13.2, 3500, -650, 0.9), (13.8, 3580, -1250, 0.9), (14.2, 3600, -500, 0.8), (14.6, 3600, 250, 0.95), (15.9, 3600, 250, 1.0),
                     (16.39, 3600, 250, 1.0), (16.4, SHIP + 180, -560, 0.72), (17.6, SHIP + 150, -560, 0.8), (19.0, SHIP + 110, -600, 1.0), (20.8, SHIP + 110, -600, 1.0)):
    st.camkey(t, cx, cy, z * 1.15)

if __name__ == "__main__":
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == "stills":
        run(st, out, stills=[0.3, 1.5, 2.2, 2.4, 2.6, 3.1, 3.4, 4.1, 4.4, 5.25, 5.6, 6.0, 6.3, 6.45, 9.0, 9.7, 11.4, 11.8, 12.1, 12.35, 12.6, 13.3, 13.9, 14.5, 18.5])
    else:
        dur, log = run(st, out)
        marks = [(t, k) for t, k, *_ in log if k in ("music_on", "music_off")]; spans, on = [], 0.0
        for t, k in marks:
            if k == "music_off" and on is not None: spans.append((on, t)); on = None
            elif k == "music_on" and on is None: on = t
        if on is not None: spans.append((on, dur))
        audio(out, dur, [x for x in log if x[1] not in ("music_on", "music_off")], spans); mux(out, "saga2")
        print(f"saga2.mp4 {dur:.1f}s")
