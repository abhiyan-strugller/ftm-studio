#!/bin/sh
# render.sh <reel.json> <workdir> <out.mp4> — ReelMimic paper-cutout engine (edenfunf/reelmimic, MIT own code), 1080x1920
set -e
H="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(cd "$H/.." && pwd)"; DOC="$1"; W="$2"; OUT="$3"; C="$H/.cache/reelmimic"; P="$W/pc"
PIN=HEAD
[ -d "$C/repo" ] || { mkdir -p "$C"; git clone -q --depth 1 https://github.com/edenfunf/reelmimic "$C/repo"; }
rm -rf "$P"; bash "$C/repo/.claude/skills/paper-cutout/scripts/new_project.sh" "$P" >/dev/null
bash "$ROOT/scripts/reelmimic-vertical.sh" "$P" >/dev/null
rm -f "$P/src/scenes/"*.js
python3 - "$DOC" "$W/timeline.json" "$H/papercut/scene.tpl.js" "$P/src/scenes/reel.js" <<'PY'
import sys; d,t,tpl,out=sys.argv[1:]; s=open(tpl).read().replace('__DOC__',open(d).read()).replace('__TL__',open(t).read()); open(out,'w').write(s)
PY
python3 - "$W/timeline.json" "$P" <<'PY'
import json,re,sys; tl=json.load(open(sys.argv[1])); P=sys.argv[2]
c=open(P+'/src/config.js').read(); c=re.sub(r'duration:\s*[\d.]+','duration: %s'%tl['total'],c); open(P+'/src/config.js','w').write(c)
h=open(P+'/studio.html').read(); h=re.sub(r'<script src="src/scenes/[A-Za-z0-9_.-]+\.js"></script>\n?','',h); h=re.sub(r'(<!-- your video[^>]*-->\n)',r'\1<script src="src/scenes/reel.js"></script>\n',h); open(P+'/studio.html','w').write(h)
PY
(cd "$P" && npm i --silent --no-audit --no-fund >/dev/null 2>&1)
export CHROME_PATH="${CHROME_PATH:-/usr/bin/google-chrome}"
(cd "$P" && node render.mjs --frames --workers=2 >/dev/null && node render.mjs --encode --out=out/pc.mp4 >/dev/null 2>&1)
mv "$P/out/pc.mp4" "$OUT"; echo "wrote $OUT"
