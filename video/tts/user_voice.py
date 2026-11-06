"""Use your own recorded voiceover instead of the AI voice.

Record every line of the script, in order, with a clear pause (about a second) between lines. Either one file
for the whole script, or one file per line. Any format ffmpeg reads (m4a from a phone, mp3, wav...).

Usage:
  python tts/user_voice.py scripts/<name>.json out/<name>/ recording.m4a
  python tts/user_voice.py scripts/<name>.json out/<name>/ line1.m4a line2.m4a ...

Writes out/<name>/voice.wav and timing.json in the same format as voice.py, so mix.py and render.js work as usual.
The recording is split into lines at its longest pauses; word timings within a line follow word length.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

GAP, LEAD, TAIL, SR = 0.35, 0.25, 1.2, 24000
script_path, out_dir, files = Path(sys.argv[1]), Path(sys.argv[2]), [Path(f) for f in sys.argv[3:]]
script = json.loads(script_path.read_text())
out_dir.mkdir(parents=True, exist_ok=True)
shots_in = script["shots"]
highlight = {w.lower() for w in script.get("highlight", [])}


def load(f):
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), tmp.name], check=True)
        x, _ = sf.read(tmp.name, dtype="float32")
    return x


def envelope(x, win=0.02):
    n = int(win * SR)
    frames = len(x) // n
    return np.sqrt((x[: frames * n].reshape(frames, n) ** 2).mean(1)), n


def trim(x):
    env, n = envelope(x)
    thr = max(env.max() * 0.06, 1e-4)
    loud = np.where(env > thr)[0]
    if not len(loud): return x
    return x[max(0, loud[0] * n - int(0.05 * SR)): min(len(x), (loud[-1] + 1) * n + int(0.12 * SR))]


def split_lines(x, count):
    """cut one recording into `count` lines at its `count - 1` longest pauses"""
    env, n = envelope(x)
    quiet = env < max(env.max() * 0.06, 1e-4)
    gaps, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None: start = i
        if not q and start is not None:
            gaps.append((i - start, start, i)); start = None
    gaps = [g for g in gaps if g[1] > 0]                               # ignore leading silence
    if len(gaps) < count - 1:
        sys.exit(f"Found only {len(gaps) + 1} lines in the recording but the script has {count}. Leave a clear pause between lines.")
    cuts = sorted(sorted(gaps, reverse=True)[: count - 1], key=lambda g: g[1])
    bounds = [0] + [((a + b) // 2) * n for _, a, b in cuts] + [len(x)]
    return [trim(x[bounds[i]: bounds[i + 1]]) for i in range(count)]


if len(files) == 1:
    lines = split_lines(trim(load(files[0])), len(shots_in))
elif len(files) == len(shots_in):
    lines = [trim(load(f)) for f in files]
else:
    sys.exit(f"Give one recording, or one per line ({len(shots_in)} lines).")

# gentle loudness levelling across lines, then peak-normalise the whole thing
lines = [l / (np.sqrt((l ** 2).mean()) + 1e-9) * 0.08 for l in lines]
audio, shots, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], [], LEAD
for i, (shot, samples) in enumerate(zip(shots_in, lines)):
    dur = len(samples) / SR
    words = shot["text"].split()
    weights = [len(re.sub(r"\W", "", w)) + 2 for w in words]
    total, acc, timed = sum(weights), 0, []
    for w, wt in zip(words, weights):
        timed.append({"word": w, "start": round(t + dur * acc / total, 3), "end": round(t + dur * (acc + wt) / total, 3),
                      "hl": re.sub(r"\W", "", w).lower() in highlight})
        acc += wt
    end = t + dur + (script.get("tail", TAIL) if i == len(shots_in) - 1 else script.get("gap", GAP))
    shots.append({**shot, "start": round(t, 3), "speechEnd": round(t + dur, 3), "end": round(end, 3), "words": timed})
    audio += [samples.astype(np.float32), np.zeros(int((end - t - dur) * SR), dtype=np.float32)]
    t = end
shots[0]["start"] = 0
voice = np.concatenate(audio)
voice = voice / (np.abs(voice).max() + 1e-9) * 0.9
sf.write(out_dir / "voice.wav", voice, SR)
extra = {"headline": script["headline"]} if "headline" in script else {}
(out_dir / "timing.json").write_text(json.dumps({"duration": round(t, 3), "shots": shots, **extra}, indent=1, ensure_ascii=False))
print(f"voice.wav {t:.2f}s from your recording, {len(shots)} lines: " + ", ".join(f"{s['shot']} {s['speechEnd'] - s['start']:.1f}s" for s in shots))
