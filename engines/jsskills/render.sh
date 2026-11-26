#!/bin/sh
# render.sh <reel.json> <workdir> <out.mp4>  — iart-ai/javascript-animation-skills (MIT): code-drawn canvas film, rendered by its render.mjs
set -e
H="$(cd "$(dirname "$0")/.." && pwd)"; DOC="$1"; W="$2"; OUT="$3"; C="$H/.cache/jsskills"
PIN=060f746   # iart-ai/javascript-animation-skills commit tested 2026-11-26
if [ ! -d "$C/repo" ]; then mkdir -p "$C"; git clone -q https://github.com/iart-ai/javascript-animation-skills "$C/repo"; (cd "$C/repo" && git checkout -q $PIN); fi
[ -d "$C/node_modules/playwright-core" ] || (cd "$C" && npm i --silent --no-audit --no-fund playwright-core >/dev/null 2>&1)
S="$C/repo/skills/javascript-animation/templates/starter.html"; N=$(grep -n "^// ---------- storyboard" "$S" | cut -d: -f1)
TOTAL=$(python3 -c "import json;print(json.load(open('$W/timeline.json'))['total'])")
{ head -n $((N-1)) "$S" | sed "s/width=\"1920\" height=\"1080\"/width=\"1080\" height=\"1920\"/; s/const W = 1920, H = 1080, FPS = 30, DUR = 6/const W = 1080, H = 1920, FPS = 30, DUR = Math.ceil($TOTAL)/" \
   | sed "s/^const PAPER = .*/const PAPER = '#f3eee0', INK = '#1d2a47', RED = '#d2325f', BLUE = '#1f8a8a',/; s/^      YELLOW = .*/      YELLOW = '#f2b632', SHADOW = 'rgba(29,42,71,0.16)';/; s/ground: 'flat', /ground: 'paper',/; s/wobble: 0, /wobble: 1.1,/; s/boil: 0, /boil: 4, /; s/labelStyle: 'plain',/labelStyle: 'pill',/"
  printf 'const DOC = %s;\nconst TL = %s;\n' "$(cat "$DOC")" "$(cat "$W/timeline.json")"; cat "$H/jsskills/scene.js"; } > "$W/film.html"
ln -sfn "$C/node_modules" "$W/node_modules"
(cd "$W" && node "$C/repo/skills/javascript-animation/scripts/render.mjs" film.html film.mp4 >/dev/null)
mv "$W/film.mp4" "$OUT"; echo "wrote $OUT"
