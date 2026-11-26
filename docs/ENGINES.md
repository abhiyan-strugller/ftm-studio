# Reel engines — one repo per reel, so every reel looks different

Plan (2026-11-26): 5 animated reels a day, each made by a DIFFERENT engine/repo. Cards drop out of the daily map while this is rolled out (to be confirmed once engines are proven).

| # | Slot (Edmonton) | Engine / repo | Look | Status | License note |
| - | --- | --- | --- | --- | --- |
| 1 | 08:00 | Lemo-Opuscar — github.com/lemomo-ai/lemo-opuscar (Pictogram Motion style) | Grid pattern, pictograms, beat-locked, Kokoro voice | PILOT DONE: `films/thanksgiving` (30 s, 1080x1920) | Films ours incl. commercial; code MIT; docs CC BY-NC (permission to follow for own films); list third-party assets in CREDITS; no Clawd |
| 2 | 10:00 | iart-ai/javascript-animation-skills | Hand-drawn canvas films, music synthesized in code, no assets | TESTED 2026-11-26: headless render works (20 s clip in 28 s). MIT. | MIT, zero assets, no API keys. Best fit. |
| 3 | 14:00 | edenfunf/reelmimic | Multi-agent video maker with web UI | Not tested. We would NOT use its style-clone feature, only original content. | MIT, but bundles mixed third-party skills (see THIRD_PARTY_NOTICES); needs Claude Code/Codex + local UI on :4318, unattended run unlikely |
| 4 | 17:00 | Automate-Animation/synctoon | Lip-synced 2D cut-out characters | Not tested. Needs paid ElevenLabs + LLM keys; characters have faces. | GPL-3.0 (videos are ours); API costs ours |
| 5 | 20:00 | Vincentwei1021/anything2explainer | 3-8 min black-canvas explainers (Remotion) | REJECTED | PolyForm Noncommercial: commercial use needs the author's permission; also 1280x720 landscape, 1-3 h per video |
| - | - | Remotion (own demo) | Cartoon 2D motion graphics | Demo built, user skipped it | Free for individuals / up to 3 people |

Rules for every engine: faceless, no licensed music, original script and sources named with period, never reuse a slot id or slug in a day, vary angle/palette per story, license checked and CREDITS written before the first post.
Known gaps for Lemo-Opuscar: unattended cloud run unproven (setup = ffmpeg 7 + Kokoro model + ~700 MB sample libraries); VSCO 2 CE / FreePats license files still to confirm.
