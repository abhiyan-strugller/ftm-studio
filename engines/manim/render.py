#!/usr/bin/env python3
"""Manim engine (Manim Community, MIT). Reel JSON + timeline.json -> silent 1080x1920 mp4.
usage: render.py input/reels/<slug>.json <workdir> <out.mp4>
Data-driven: hook (big number, optional count-up), body (lines, optional bars/rank chart), take, end.
Text only (no LaTeX needed). Slide times come from timeline.json so it matches the narration."""
import json, os, re, subprocess, sys
doc_path, work, out = sys.argv[1], sys.argv[2], os.path.abspath(sys.argv[3])
os.environ["FTM_DOC"], os.environ["FTM_TL"] = os.path.abspath(doc_path), os.path.abspath(os.path.join(work, "timeline.json"))
scene = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scene.py")
media = os.path.abspath(os.path.join(work, "manim-media"))
subprocess.check_call([sys.executable, "-m", "manim", "render", "-qm", "--fps", "30", "--media_dir", media, "-o", "reel", scene, "Reel"])
src = os.path.join(media, "videos", "scene", "1920p30", "reel.mp4")
os.replace(src, out); print("wrote", out)
