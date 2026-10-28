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

## Make the pool video

```bash
.venv/bin/python tts/voice.py scripts/pool.json out/   # out/voice.wav + out/timing.json
npm run render -- out/pool.mp4 out/voice.wav           # final video
npm run still -- out/frame.png 18.5                    # preview a single moment (seconds)
```

Shot lengths follow the voiceover, so editing the lines in `scripts/pool.json` and re-running both steps keeps everything in sync. The animation for each shot is in `renderAt()` in `scenes/pool.html`.
