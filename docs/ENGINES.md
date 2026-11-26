# Reel engines — one repo per reel, so every reel looks different

Plan (2026-11-26): 5 animated reels a day, each made by a DIFFERENT engine/repo. Cards drop out of the daily map while this is rolled out (to be confirmed once engines are proven).

| # | Slot (Edmonton) | Repo / engine | Look | Status |
| - | --- | --- | --- | --- |
| 1 | 08:00 | Lemo-Opuscar (Pictogram Motion) | Grid pattern, pictograms, beat-locked | TESTED (`films/thanksgiving`) |
| 2 | 10:00 | iart-ai/javascript-animation-skills | Hand-drawn graph-paper canvas film | TESTED with our own story (2026-11-26) |
| 3 | 14:00 | ReelMimic: paper-cutout engine (its ONE reel; whiteboard/pixel-art not used) | Stop-motion paper | TESTED with our own story (2026-11-26) |
| 4 | 17:00 | Yusuke710/manim-skill (Manim CE) | Clean chart motion graphics, Text only (no LaTeX) | TESTED with our own story (2026-11-26) |
| 5 | 20:00 | Lemo-Opuscar, second reel (a different treatment from slot 1) | Pictogram or another Lemo treatment | Decided 2026-11-26: Lemo takes two slots |

One repo = one reel, except Lemo-Opuscar which takes two (Abhiyan's call, 2026-11-26). The two Lemo reels must use different treatments, palettes and beat grids so they do not look alike.

DROPPED by Abhiyan (2026-11-26): anything2explainer (non-commercial licence), synctoon (paid keys, landscape), swatimitra88 (no licence). jayadevrana/remotion-trading-documentary-studio is incomplete (missing assets), not used.
ReelMimic: faces on built-in characters are fine. Use only its engines (MIT), never its style-clone feature. Vertical via `scripts/reelmimic-vertical.sh <project-dir>` (3-line patch of W/H, canvas size, window size). Scaffold with `bash .claude/skills/<engine>/scripts/new_project.sh <dir>`.

Rules for every engine: faceless, no licensed music, original script and sources named with period, never reuse a slot id or slug in a day, vary angle/palette per story, license checked and CREDITS written before the first post.
Known gaps for Lemo-Opuscar: unattended cloud run unproven (setup = ffmpeg 7 + Kokoro model + ~700 MB sample libraries); VSCO 2 CE / FreePats license files still to confirm.

Manim needs apt libs (libpango1.0-dev, libcairo2-dev, pkg-config) then `pip install manim`; vertical via config 1080x1920, frame 9x16. Audio per reel: each engine should get its own score/voice settings (demos so far reused one mix).
