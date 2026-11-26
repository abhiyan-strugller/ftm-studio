# Reel engines — diverse visual styles per slot

Live since 2026-11-26. Three data-driven engines (manim, jsskills, papercut) are wired into Task A's prompt. The remaining slots use the existing painted renderer until Lemo-Opuscar automation is built.

## Engine map (in Task A prompt)

| Slot (Edmonton) | Engine | Look | Renderer | Voice |
| --- | --- | --- | --- | --- |
| 08:00 | painted | Watercolour/ink motifs | `npm run render-reel` | Procedural audio only |
| 10:00 | jsskills | Graph-paper infographic | `engines/run.sh jsskills` | Kokoro TTS + audio bed |
| 12:00 | painted | Watercolour/ink motifs | `npm run render-reel` | Procedural audio only |
| 14:00 | papercut | Torn-paper collage | `engines/run.sh papercut` | Kokoro TTS + audio bed |
| 17:00 | manim | Animated data/chart motion graphics | `engines/run.sh manim` | Kokoro TTS + audio bed |
| 20:00 | painted | Watercolour/ink motifs | `npm run render-reel` | Procedural audio only |

Future: 08:00 and 20:00 will switch to Lemo-Opuscar once its data-driven automation is built.

## Shared pipeline (`engines/`)

All three engines share:
- **`engines/setup.sh`** — idempotent, installs Kokoro TTS model, ffmpeg-static, Manim CE, creates `.venv`. Caches under `engines/.cache/`.
- **`engines/common/narrate.py`** — Kokoro TTS (Apache-2.0, `am_michael`, speed 1.08–1.3, ≤44s). Writes per-slide WAVs + `timeline.json`.
- **`engines/common/mix.py`** — procedural audio bed (seeded by slug) + voice ducking.
- **`engines/common/mux.sh`** — ffmpeg loudnorm to -14 LUFS.
- **`engines/run.sh <engine> <reel.json>`** — orchestrates setup → narrate → engine → mix → mux. Output: `output/reels/<slug>/<slug>.mp4`.

Each engine reads the SAME reel JSON schema and produces a silent `1080x1920` mp4 that gets muxed with the voice+bed mix.

## Engine details

### manim (`engines/manim/`)
- **Repo:** Yusuke710/manim-skill (MIT)
- **Deps:** apt libpango1.0-dev libcairo2-dev pkg-config; pip manim
- **Render time:** ~2.5 min
- **Notes:** Text only (no LaTeX), DejaVu Sans, vertical 1080x1920 via config

### jsskills (`engines/jsskills/`)
- **Repo:** iart-ai/javascript-animation-skills (MIT, pinned 060f746)
- **Deps:** playwright-core + system Chrome
- **Render time:** ~2.3 min
- **Notes:** Graph-paper background, pill-style chart labels, procedural motifs

### papercut (`engines/papercut/`)
- **Repo:** edenfunf/reelmimic paper-cutout engine (MIT own code)
- **Deps:** puppeteer-core + system Chrome
- **Render time:** ~4 min
- **Notes:** Scaffold + vertical patch, torn-paper transitions, ray/motif backgrounds

## Dropped repos

- anything2explainer: non-commercial licence
- synctoon: GPL, paid keys, landscape-only
- swatimitra88: dropped by Abhiyan
- jayadevrana/remotion-trading-documentary-studio: incomplete, unused

## Open items

- **Lemo-Opuscar automation**: hand-authored `film.js` today; needs data-driven or agent-driven approach. Deps: ffmpeg 7, Kokoro model (~311 MB), ~700 MB sampler libs. VSCO2CE / FreePats licences unverified.
- **CREDITS files**: needed per engine before monetization.
- **Cloud proof**: engines work in this sandbox; real Task A cloud environment has the same proxy and should work, but first live fire is the real test.

## Rules (unchanged)

Faceless, no licensed music, original script, sources named with period, never reuse a slot id or slug in a day, licence checked and CREDITS written before the first post.
