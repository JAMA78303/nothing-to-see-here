# Video pipeline

Turns a script into a vertical 1080×1920 explainer video: a voiceover, an animated 3D scene, and word-by-word captions.

## Setup

```bash
npm install
python3 -m venv .venv && .venv/bin/pip install kokoro-onnx soundfile
mkdir -p voices && cd voices
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

You also need `ffmpeg` and Playwright's Chromium.

## Make a video

Each video is a script in `scripts/<name>.json` plus a scene in `scenes/<name>.js`. The current videos are `pool` and `basement`.

```bash
.venv/bin/python tts/voice.py scripts/basement.json out/basement/   # voice.wav + timing.json
.venv/bin/python audio/mix.py scripts/basement.json out/basement/  # music + sound effects -> mix.wav
npm run render -- basement                                         # out/basement/basement.mp4
npm run still -- basement 16.5                                     # preview one moment (seconds)
```

### Script options

- **Cold open:** give the first shot `"replay": "<shot>"` and `"from": 0.1` to open on a later moment (10% into that shot), followed by a white flash back to the start of the story. Opening on the payoff keeps more viewers from swiping away.
- **Sound effects:** add cues to `"sfx"`, e.g. `{ "sound": "impact", "shot": "pop", "at": 0.05, "length": 1.8 }` (`at` is seconds from the shot's start, or before its end if negative). Available sounds: `impact`, `rumble`, `whoosh`, `rewind`, `water`, `bubbles`, `drips`, `rain`, `drain`. Background music is added automatically and dips under the voice.

Shot lengths follow the voiceover, so editing the lines in the script and re-running both steps keeps everything in sync.

## Adding a topic

`scenes/kit.js` holds the shared pieces: the yard, soil layers, groundwater, house, trees, clouds, arrows, captions and camera moves. A new scene imports the kit, uses `groundWithHole()` to cut its set piece into the ground, defines one camera framing per shot, and passes a draw function to `start()`. See `scenes/basement.js` for an example.
