# Video 1: "Never Drain Your Pool"

This is the plan for the first automated short-form video and the pipeline that produces it.

## Concept

| | |
|---|---|
| **Format** | Vertical 1080×1920, 30 fps, ~35–45 s |
| **Style** | Clean, stylized 3D (house, striped lawn, cut-away view of the ground), big word-by-word captions |
| **Hook** | A surprising, slightly alarming fact in the first 2 seconds |
| **Payoff** | The empty pool shell pops up out of the ground |
| **Series potential** | Reuses the same yard and ground-layer scene kit for videos 2–4 (basement flooding, tree roots, "what's under your lawn") |

## Script

| # | Time | Narration | Shot |
|---|------|-----------|------|
| 1 | 0:00–0:03 | "Never drain your pool. Here's why." | Wide shot of the house and the full pool. Fast push-in. |
| 2 | 0:03–0:08 | "Under your yard, the ground is full of water." | The camera drops below the lawn. Cut-away showing soil layers, with a blue water table filling up from the bottom. |
| 3 | 0:08–0:13 | "Your pool is basically a concrete boat sitting in it." | Side cut-away of the pool shell sitting in wet soil. |
| 4 | 0:13–0:19 | "When it's full, the weight of the water holds it down." | Pool full of water. Down arrows on top, up arrows underneath, balanced. |
| 5 | 0:19–0:25 | "But drain it, and that weight is gone." | The water level in the pool drops to empty. The down arrows fade out. |
| 6 | 0:25–0:31 | "Now the water in the ground pushes up from below…" | The up arrows grow and pulse. The shell starts to crack and lift. |
| 7 | 0:31–0:36 | "…until the whole pool pops right out of the ground." | The shell rises out of the lawn. Dirt chunks fly and the camera shakes. |
| 8 | 0:36–0:40 | "That's why pool pros drain slowly, or not at all." | Pull back to a wide shot of the house with the pool tilted out of the yard. Hold for the loop. |

**Caption style:** 1–2 words on screen at a time, white text with a thick black outline, centered on the lower third, a small pop-in scale animation, and the key word highlighted (e.g. **Pushes**).

## Scene kit (reusable)

- **House:** two stories, orange roof, blue shutters. A simple box model is fine.
- **Lawn:** striped green grass plane, with a hose and a few garden props.
- **Ground cut-away:** layered soil block (topsoil, clay, wet layer) with a visible cross-section face.
- **Water table:** blue textured layer with an animatable height.
- **Pool shell:** concrete U-shape with a shallow end and a deep end, and an animatable water level.
- **Force arrows:** white arrows that scale and pulse.
- **FX:** dirt-chunk particles, camera shake, crack decals.
- **Sky:** gradient with a few soft clouds.

## Pipeline

```
topic ──► script.json ──► scenes ──► frames ──┐
              │                               ├──► ffmpeg ──► final.mp4
              └──► TTS voice + word timings ──┤
                                captions  ────┘
```

1. **Script generation** (Claude API): topic in, JSON out containing `{ shots: [{ narration, shot_type, params }] }`.
2. **Voiceover** (TTS): narration in, `voice.wav` plus timing for each word.
   - Start: free local TTS (e.g. Piper).
   - Upgrade: ElevenLabs or OpenAI TTS, which needs an API key.
3. **Render** (Three.js in headless Chromium via Playwright): each shot's length matches its narration. Frames are captured deterministically, one PNG per frame.
4. **Captions:** the word timings become an animated caption track (ASS subtitles or drawn on the canvas).
5. **Assembly** (ffmpeg): frames + voice + captions + optional background music produce `final.mp4` (H.264, 1080×1920).

**One command:**
```bash
npm run make-video -- "Why you should never drain your in-ground pool"
```

## Project layout

```
video/
  scripts/        # script generation (Claude API)
  tts/            # voice + word timing
  scenes/         # Three.js scene kit + shot types
  render/         # Playwright frame capture
  assemble/       # ffmpeg + captions
  out/            # generated videos (gitignored)
```

## Build order

1. Scene kit: house, lawn, ground cut-away and pool, rendered as one still frame.
2. Shot animations 1–8, rendered to frames.
3. Local TTS with word timings.
4. Captions and ffmpeg assembly, producing the **first finished MP4**.
5. Script generator, so any topic can go from text to video.
6. Polish: better voice, music, sound effects, more props.

## Next videos (same kit)

1. Why basements flood even when it isn't raining
2. Why trees can crack your foundation
3. What's actually under your lawn
4. What if you dug straight down from your backyard?

## Notes

- First-version visuals will be clean low-poly. Getting closer to the reference clips means Blender with an asset pack.
- Label the videos as AI-generated where the platform requires it (TikTok, YouTube and Instagram all have disclosure settings).
- Views come from the hook, the topic and posting consistently. Automation only makes each video cheap to produce.
