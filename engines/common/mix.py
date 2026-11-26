#!/usr/bin/env python3
"""timeline.json + voice/ + procedural bed (scripts/gen-reel-bed.py) -> mix.wav (voice over ducked bed, limited).
usage: mix.py <workdir> [bpm] [seed]"""
import hashlib, json, os, subprocess, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
from scipy.ndimage import uniform_filter1d
work = sys.argv[1]; tl = json.load(open(os.path.join(work, "timeline.json")))
seed = int(sys.argv[3]) if len(sys.argv) > 3 else int(hashlib.sha256(tl["slug"].encode()).hexdigest()[:6], 16)
bpm = float(sys.argv[2]) if len(sys.argv) > 2 else 92 + seed % 24
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bed = os.path.join(work, "bed.wav")
cuts = ",".join(str(s["start"]) for s in tl["slides"][1:])
subprocess.check_call([sys.executable, os.path.join(ROOT, "scripts", "gen-reel-bed.py"), "--seconds", str(tl["total"]), "--out", bed, "--seed", str(seed), "--bpm", str(bpm), "--cuts", cuts])
mus, sr = sf.read(bed, dtype="float32")
if mus.ndim == 1: mus = np.stack([mus, mus], 1)
N = len(mus); voice = np.zeros(N, np.float32); env = np.zeros(N, np.float32)
for s in tl["slides"]:
    x, vsr = sf.read(os.path.join(work, "voice", f"s{s['i']}.wav"), dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    if vsr != sr:
        import soxr; x = soxr.resample(x, vsr, sr)
    a = int(s["vstart"] * sr); b = min(N, a + len(x)); x = x[: b - a]
    x = x / (np.max(np.abs(x)) + 1e-6) * 0.9
    voice[a:b] += x; env[a:b] = 1
env = uniform_filter1d(uniform_filter1d(env, int(.08 * sr)), int(.08 * sr))
sos = butter(2, [300, 4000], btype="band", fs=sr, output="sos")
band = np.stack([sosfilt(sos, mus[:, 0]), sosfilt(sos, mus[:, 1])], 1)
mus = mus * (1 - 0.3 * env[:, None]) - band * (0.45 * env[:, None])
mix = mus * 0.9 + voice[:, None] * 1.0
mix = np.tanh(mix * 1.1) * 0.92
f = int(1.0 * sr); mix[-f:] *= np.linspace(1, 0, f)[:, None]
sf.write(os.path.join(work, "mix.wav"), mix.astype(np.float32), sr, subtype="FLOAT"); print("mix ok bpm", bpm)
