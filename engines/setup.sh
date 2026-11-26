#!/bin/sh
# Idempotent setup for the reel engines (safe to run at the start of every cloud build; ~2-4 min cold, seconds warm).
# Installs: system libs for Manim, python venv (kokoro-onnx, manim, numpy...), the Kokoro offline voice model, a modern ffmpeg.
# usage: sh engines/setup.sh        -> prints the python/ffmpeg paths on the last line as  ENGINES_ENV=...
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; C="$HERE/.cache"; mkdir -p "$C/kokoro" "$C/bin"
# 1. system libs for Manim (pango/cairo). Skipped silently if already present or no root.
if ! pkg-config --exists pangocairo 2>/dev/null; then
  (apt-get update -qq && apt-get install -y -qq libpango1.0-dev libcairo2-dev pkg-config python3-dev) >/dev/null 2>&1 || echo "WARN: could not apt-install pango/cairo (Manim needs them)"
fi
# 2. python venv
if [ ! -x "$HERE/.venv/bin/python" ]; then python3 -m venv "$HERE/.venv"; fi
"$HERE/.venv/bin/pip" -q install --disable-pip-version-check kokoro-onnx soundfile numpy scipy soxr manim >/dev/null
# 3. Kokoro model + voices (Apache-2.0), from the kokoro-onnx GitHub release
B=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s "$C/kokoro/kokoro-v1.0.onnx" ] || curl -sSL -o "$C/kokoro/kokoro-v1.0.onnx" "$B/kokoro-v1.0.onnx"
[ -s "$C/kokoro/voices-v1.0.bin" ]  || curl -sSL -o "$C/kokoro/voices-v1.0.bin"  "$B/voices-v1.0.bin"
# tts.py: Lemo-Opuscar's offline TTS wrapper (MIT), copied next to the model
if [ ! -s "$C/kokoro/tts.py" ]; then
  if [ -f "$LEMO_HOME/core/tts/tts.py" ]; then cp "$LEMO_HOME/core/tts/tts.py" "$C/kokoro/tts.py"; else cp "$HERE/common/tts.py" "$C/kokoro/tts.py"; fi
fi
# 4. ffmpeg >= 7 (apt's is older): npm ffmpeg-static
if [ ! -x "$C/bin/ffmpeg" ]; then
  (cd "$C" && npm i --silent --no-audit --no-fund ffmpeg-static >/dev/null 2>&1 && cp node_modules/ffmpeg-static/ffmpeg "$C/bin/ffmpeg") || cp "$(command -v ffmpeg)" "$C/bin/ffmpeg"
fi
echo "ENGINES_ENV=PATH=$C/bin:$HERE/.venv/bin:\$PATH KOKORO_DIR=$C/kokoro TTS_PY=$C/kokoro/tts.py"
