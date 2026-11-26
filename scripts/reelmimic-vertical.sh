#!/bin/sh
# Make a scaffolded ReelMimic engine project render 1080x1920 (vertical) instead of 1920x1080.
# usage: sh scripts/reelmimic-vertical.sh <project-dir>     (project made with the engine's new_project.sh)
set -e
P="${1:?project dir}"
sed -i 's/const W = 1920, H = 1080/const W = 1080, H = 1920/' "$P/src/kit.js"
sed -i 's/width="1920" height="1080"/width="1080" height="1920"/' "$P/studio.html"
sed -i 's/--window-size=1920,1080/--window-size=1080,1920/' "$P/render.mjs"
echo "vertical patch applied to $P"
