#!/usr/bin/env python3
"""Generate an ORIGINAL minimal music bed for Reels — procedural, so there is
never a copyright claim on the audio. Dark newsroom pulse: sub root, soft tick,
slow pad swell. Deterministic per seed so a reel's audio is reproducible.

  python3 scripts/gen-reel-bed.py --seconds 32 --out /tmp/bed.wav [--seed 7]
"""
import argparse
import struct
import wave

import numpy as np

SR = 44100


def env(n, a, d):
    """Linear attack/decay envelope of length n samples."""
    e = np.ones(n)
    a = min(a, n)
    d = min(d, n - 1)
    e[:a] = np.linspace(0, 1, a)
    if d > 0:
        e[-d:] = np.linspace(1, 0, d)
    return e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--bpm", type=float, default=92.0)
    args = ap.parse_args()

    rng = np.random.default_rng(args.seed)
    n = int(SR * args.seconds)
    t = np.arange(n) / SR
    mix = np.zeros(n)

    beat = 60.0 / args.bpm
    root_hz = 55.0  # A1 sub

    # Sub pulse on every beat: short decaying sine, slight pitch drop.
    for k in range(int(args.seconds / beat) + 1):
        s = int(k * beat * SR)
        dur = int(0.42 * SR)
        if s >= n:
            break
        seg = min(dur, n - s)
        tt = np.arange(seg) / SR
        f = root_hz * (1 + 0.04 * np.exp(-tt * 18))
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6.5)
        mix[s : s + seg] += 0.50 * tone

    # Soft tick on offbeats: filtered noise click.
    for k in range(int(args.seconds / beat) + 1):
        s = int((k + 0.5) * beat * SR)
        dur = int(0.05 * SR)
        if s >= n:
            break
        seg = min(dur, n - s)
        click = rng.standard_normal(seg) * np.exp(-np.arange(seg) / (0.006 * SR))
        mix[s : s + seg] += 0.07 * click

    # Pad: two slow detuned sines a fifth up, swelling over the piece.
    swell = np.linspace(0.25, 1.0, n)
    pad = 0.5 * np.sin(2 * np.pi * root_hz * 3 * t) + 0.5 * np.sin(
        2 * np.pi * root_hz * 3.005 * t
    )
    pad *= 0.085 * swell
    # gentle tremolo so the pad breathes with the pulse
    pad *= 0.8 + 0.2 * np.sin(2 * np.pi * (1 / (2 * beat)) * t)
    mix += pad

    # Global fade in/out and soft clip.
    mix *= env(n, int(0.4 * SR), int(1.2 * SR))
    mix = np.tanh(mix * 1.1)
    peak = np.max(np.abs(mix)) or 1.0
    mix = mix / peak * 0.72  # headroom under the (future) voice layer

    pcm = (mix * 32767).astype("<i2")
    with wave.open(args.out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"bed: {args.out} ({args.seconds:.1f}s, seed {args.seed})")


if __name__ == "__main__":
    main()
