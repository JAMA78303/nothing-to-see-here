"""Mix the voiceover with generated background music and sound effects.

Usage: python audio/mix.py scripts/pool.json out/pool/
Reads out/<name>/voice.wav + timing.json, writes out/<name>/mix.wav.

Sound effects are cued in the script's "sfx" list:
  { "sound": "impact", "shot": "pop", "at": 0.2, "length": 1.5, "gain": 1.0 }
"at" is seconds from the shot's start (negative = seconds before its end).
Everything is synthesized here, so there are no licensing questions.
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
rng = np.random.default_rng(7)


# ---------- building blocks ----------
def tt(d):
    return np.arange(int(d * SR)) / SR

def noise(d):
    return rng.standard_normal(int(d * SR))

def lowpass(x, cutoff):
    """One-pole lowpass; cutoff may be a constant or a per-sample array (Hz)."""
    a = 1 - np.exp(-2 * np.pi * np.broadcast_to(cutoff, x.shape) / SR)
    y, acc = np.empty_like(x), 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y

def highpass(x, cutoff):
    return x - lowpass(x, cutoff)

def env(d, attack=0.01, release=0.2):
    t = tt(d)
    e = np.minimum(1, t / max(attack, 1e-4))
    return e * np.clip((d - t) / max(release, 1e-4), 0, 1)

def norm(x, peak=1.0):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


# ---------- sound effects ----------
def whoosh(d=0.8, reverse=False):
    t = tt(d)
    sweep = 300 + 5000 * np.sin(np.pi * t / d) ** 2
    x = lowpass(noise(d), sweep) * np.sin(np.pi * t / d) ** 2
    return norm(x[::-1] if reverse else x)

def rumble(d=3.0):
    t = tt(d)
    low = lowpass(lowpass(noise(d), 90), 90)
    shake = np.sin(2 * np.pi * 38 * t + 3 * np.sin(2 * np.pi * 0.7 * t))
    swell = np.clip(t / (d * 0.7), 0, 1) ** 1.5
    return norm((norm(low) + 0.5 * shake) * swell * env(d, 0.05, 0.4))

def impact(d=1.5):
    t = tt(d)
    thump = np.sin(2 * np.pi * (35 + 80 * np.exp(-t * 12)) * t) * np.exp(-t * 4)
    crack = highpass(noise(d), 1500) * np.exp(-t * 18)
    debris = lowpass(noise(d), 1200) * np.exp(-t * 3) * (rng.random(len(t)) < 0.02)
    return norm(1.0 * thump + 0.5 * norm(crack) + 0.4 * norm(lowpass(debris, 800)))

def water(d=2.5):
    t = tt(d)
    flow = lowpass(lowpass(noise(d), 500 + 250 * np.sin(2 * np.pi * 3.1 * t)), 1200)
    return norm(flow * (0.7 + 0.3 * np.sin(2 * np.pi * 5.3 * t)) * env(d, 0.3, 0.6))

def bubbles(d=2.5):
    t, x = tt(d), np.zeros(int(d * SR))
    for start in rng.uniform(0, d - 0.15, int(d * 9)):
        bt = tt(0.12)
        f = rng.uniform(250, 600) * (1 + 2.5 * bt)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-bt * 30)
        i = int(start * SR)
        x[i:i + len(b)] += b * rng.uniform(0.3, 1)
    return norm(x + 0.25 * norm(water(d)))

def drips(d=3.0):
    x = np.zeros(int(d * SR))
    for start in np.cumsum(rng.uniform(0.08, 0.3, int(d * 8))):
        if start > d - 0.1:
            break
        bt = tt(0.07)
        f = rng.uniform(900, 1500) * np.exp(-bt * 12)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-bt * 45)
        i = int(start * SR)
        x[i:i + len(b)] += b
    return norm(x + 0.5 * norm(water(d)))

def rain(d=3.0):
    return norm(lowpass(highpass(noise(d), 800), 6000) * env(d, 0.4, 0.6))

def drain(d=2.5):
    t = tt(d)
    gurgle = lowpass(noise(d), 300 + 250 * np.sin(2 * np.pi * 7 * t) ** 2)
    return norm(gurgle * env(d, 0.2, 0.8))

# steady, hissy sounds read much louder than their level suggests, so they sit lower in the mix
LEVEL = dict(water=0.4, drain=0.45, bubbles=0.5, drips=0.5, rain=0.4)

SOUNDS = dict(whoosh=whoosh, rewind=lambda d: whoosh(d, reverse=True), rumble=rumble, impact=impact,
              water=water, bubbles=bubbles, drips=drips, rain=rain, drain=drain)


# ---------- background music: a soft, mid-tempo loop (Am F C G) ----------
def midi(n):
    return 440 * 2 ** ((n - 69) / 12)

def music(d, bpm=100):
    beat, n = 60 / bpm, int(d * SR)
    out = np.zeros(n + SR * 2)
    chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    bar = 4 * beat
    for b in range(int(d / bar) + 1):
        chord, i0 = chords[b % 4], int(b * bar * SR)
        pt = tt(bar)
        pad = sum(np.sin(2 * np.pi * midi(m) * pt) + 0.3 * np.sin(2 * np.pi * midi(m) * 2.003 * pt) for m in chord)
        pad *= np.minimum(1, pt / 0.3) * np.clip((bar - pt) / 0.3, 0, 1)
        bass = np.sin(2 * np.pi * midi(chord[0] - 12) * pt) * np.minimum(1, pt / 0.02)
        out[i0:i0 + len(pt)] += 0.12 * pad + 0.35 * bass
        for s in range(8):  # eighth-note arpeggio
            at = tt(beat / 2)
            note = chord[[0, 1, 2, 1][s % 4]] + 12
            pl = np.sign(np.sin(2 * np.pi * midi(note) * at)) * 0.3 + np.sin(2 * np.pi * midi(note) * at)
            j = i0 + int(s * beat / 2 * SR)
            out[j:j + len(at)] += 0.18 * pl * np.exp(-at * 9)
        for k in range(4):  # kick on every beat, hat on the off-beats
            kt = tt(0.3)
            kick = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-kt * 25)) / SR) * np.exp(-kt * 14)
            j = i0 + int(k * beat * SR)
            out[j:j + len(kt)] += 0.6 * kick
            ht = tt(0.05)
            hat = np.diff(rng.standard_normal(len(ht) + 1)) * np.exp(-ht * 90)
            j = i0 + int((k + 0.5) * beat * SR)
            out[j:j + len(ht)] += 0.08 * hat
    return norm(lowpass(out[:n], 5000))


# ---------- mix ----------
def place(track, sound, t0, gain):
    i = int(t0 * SR)
    if i >= len(track):
        return
    seg = sound[: len(track) - max(i, 0)] if i >= 0 else sound[-i:]
    i = max(i, 0)
    track[i:i + len(seg)] += gain * seg

def main():
    script_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    script = json.loads(script_path.read_text())
    timing = json.loads((out_dir / "timing.json").read_text())
    shots = {s["shot"]: s for s in timing["shots"]}

    voice, vsr = sf.read(out_dir / "voice.wav")
    n = int(timing["duration"] * SR)
    voice = np.interp(np.arange(n) / SR, np.arange(len(voice)) / vsr, voice, right=0)

    # music, ducked under the voice
    bed = music(timing["duration"])
    level = lowpass(np.abs(voice), 8)
    duck = 1 - 0.55 * np.clip(level / (np.max(level) * 0.25), 0, 1)
    bed *= 0.13 * duck

    fx = np.zeros(n)
    for cue in script.get("sfx", []):
        s = shots[cue["shot"]]
        t0 = s["start"] + cue["at"] if cue["at"] >= 0 else s["end"] + cue["at"]
        length = cue.get("length", 1.5)
        level_ = LEVEL.get(cue["sound"], 1.0)
        place(fx, SOUNDS[cue["sound"]](length), t0, 0.35 * level_ * cue.get("gain", 1.0))
    fx *= 1 - 0.75 * np.clip(level / (np.max(level) * 0.25), 0, 1)  # effects dip under the voice too

    mix = norm(voice) * 0.9 + bed + fx
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)  # gentle limiter
    sf.write(out_dir / "mix.wav", norm(mix, 0.89).astype(np.float32), SR)
    print(f"mix.wav {timing['duration']:.2f}s, {len(script.get('sfx', []))} sfx cues")

main()
