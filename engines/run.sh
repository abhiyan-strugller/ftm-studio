#!/bin/sh
# usage: sh engines/run.sh <engine> input/reels/<slug>.json
# engine: manim | jsskills | papercut | lemo.   Writes output/reels/<slug>/<slug>.mp4 (voice + music, 1080x1920), same place render-reel does.
set -e
ENGINE="$1"; DOC="$2"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"; H="$ROOT/engines"
eval "export $(sh "$H/setup.sh" | tail -1 | sed 's/^ENGINES_ENV=//; s/\$PATH/'"$PATH"'/')"
SLUG=$(python3 -c "import json,sys;print(json.load(open('$DOC'))['slug'])")
W="$ROOT/output/reels/$SLUG/.work-$ENGINE"; OUT="$ROOT/output/reels/$SLUG/$SLUG.mp4"; mkdir -p "$W"
PY="$H/.venv/bin/python"
"$PY" "$H/common/narrate.py" "$DOC" "$W"
case "$ENGINE" in
  manim)    "$PY" "$H/manim/render.py" "$DOC" "$W" "$W/silent.mp4" ;;
  jsskills) sh "$H/jsskills/render.sh" "$DOC" "$W" "$W/silent.mp4" ;;
  papercut) sh "$H/papercut/render.sh" "$DOC" "$W" "$W/silent.mp4" ;;
  lemo)     sh "$H/lemo/render.sh" "$DOC" "$W" "$W/silent.mp4" ;;
  *) echo "unknown engine $ENGINE"; exit 2 ;;
esac
"$PY" "$H/common/mix.py" "$W"
sh "$H/common/mux.sh" "$W/silent.mp4" "$W/mix.wav" "$OUT"
echo "REEL $ENGINE -> $OUT"
