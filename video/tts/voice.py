"""Generate the voiceover and word timings for a script.

Usage: python tts/voice.py scripts/pool.json out/
Writes out/voice.wav and out/timing.json.
Word timings are estimated from character counts within each spoken line.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

GAP = 0.35   # silence between lines (s)
LEAD = 0.25  # silence before the first line (s)
TAIL = 1.2   # hold at the end (s)

ROOT = Path(__file__).resolve().parent.parent
script_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
script = json.loads(script_path.read_text())
out_dir.mkdir(parents=True, exist_ok=True)

kokoro = Kokoro(str(ROOT / "voices/kokoro-v1.0.onnx"), str(ROOT / "voices/voices-v1.0.bin"))
highlight = {w.lower() for w in script.get("highlight", [])}

audio, shots, t = [], [], LEAD
sr = 24000
audio.append(np.zeros(int(LEAD * sr), dtype=np.float32))
for i, shot in enumerate(script["shots"]):
    samples, sr = kokoro.create(shot["text"], voice=script["voice"], speed=script["speed"], lang="en-us")
    # trim the model's own leading/trailing silence so timings line up
    loud = np.where(np.abs(samples) > 0.01)[0]
    samples = samples[max(0, loud[0] - 600): loud[-1] + 1200]
    dur = len(samples) / sr

    words = shot["text"].split()
    weights = [len(re.sub(r"\W", "", w)) + 2 for w in words]
    total, acc, timed = sum(weights), 0, []
    for w, wt in zip(words, weights):
        timed.append({
            "word": w,
            "start": round(t + dur * acc / total, 3),
            "end": round(t + dur * (acc + wt) / total, 3),
            "hl": re.sub(r"\W", "", w).lower() in highlight,
        })
        acc += wt

    end = t + dur + (TAIL if i == len(script["shots"]) - 1 else GAP)
    shots.append({"shot": shot["shot"], "text": shot["text"], "start": round(t, 3),
                  "speechEnd": round(t + dur, 3), "end": round(end, 3), "words": timed})
    audio.append(samples)
    audio.append(np.zeros(int((end - t - dur) * sr), dtype=np.float32))
    t = end

# the first shot starts at 0 so the intro covers the lead-in
shots[0]["start"] = 0
sf.write(out_dir / "voice.wav", np.concatenate(audio), sr)
(out_dir / "timing.json").write_text(json.dumps({"duration": round(t, 3), "shots": shots}, indent=1))
print(f"voice.wav {t:.2f}s, {len(shots)} shots")
