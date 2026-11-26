# Reel engines — one repo per reel, so every reel looks different

Plan (2026-11-26): 5 animated reels a day, each made by a DIFFERENT engine/repo. Cards drop out of the daily map while this is rolled out (to be confirmed once engines are proven).

| # | Slot (Edmonton) | Engine | Look | Status |
| - | --- | --- | --- | --- |
| 1 | 08:00 | Lemo-Opuscar (Pictogram Motion) | Grid pattern, pictograms, beat-locked | PILOT DONE (`films/thanksgiving`) |
| 2 | 10:00 | iart-ai/javascript-animation-skills | Hand-drawn canvas film, music in code | TESTED: headless render works |
| 3 | 14:00 | ReelMimic: whiteboard engine | Marker + hand, doodle explainer | TESTED vertical (2026-11-26) |
| 4 | 17:00 | ReelMimic: paper-cutout engine | Stop-motion paper | TESTED vertical (2026-11-26) |
| 5 | 20:00 | ReelMimic: pixel-art engine (anime-cel also works vertical, spare) | Pixel art | TESTED vertical (2026-11-26) |

DROPPED by Abhiyan (2026-11-26): anything2explainer (non-commercial licence), synctoon (paid keys, landscape).
ReelMimic: faces on built-in characters are fine. Use only its engines (MIT), never its style-clone feature. Vertical via `scripts/reelmimic-vertical.sh <project-dir>` (3-line patch of W/H, canvas size, window size). Scaffold with `bash .claude/skills/<engine>/scripts/new_project.sh <dir>`.

Rules for every engine: faceless, no licensed music, original script and sources named with period, never reuse a slot id or slug in a day, vary angle/palette per story, license checked and CREDITS written before the first post.
Known gaps for Lemo-Opuscar: unattended cloud run unproven (setup = ffmpeg 7 + Kokoro model + ~700 MB sample libraries); VSCO 2 CE / FreePats license files still to confirm.
