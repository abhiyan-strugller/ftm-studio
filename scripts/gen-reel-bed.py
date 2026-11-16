#!/usr/bin/env python3
"""Generate an ORIGINAL minimal music bed for Reels — procedural, so there is
never a copyright claim on the audio. Dark newsroom pulse: sub root, soft tick,
slow pad swell, and a bass hit + noise riser synced to every slide cut.

Pure Python standard library — NO numpy, NO third-party deps. This matters
because the bed is rendered on every reel (several times a day on the intraday
schedule); a run must never depend on a pip install succeeding. Deterministic
per seed/params so a reel's audio is reproducible, varied per reel so no two
reels sound the same.

  python3 scripts/gen-reel-bed.py --seconds 32 --out /tmp/bed.wav \
      [--seed 7] [--bpm 92] [--root 55] [--cuts 2.7,6.2,9.8]
"""
import argparse
import array
import math
import random
import struct
import wave

SR = 44100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--bpm", type=float, default=92.0)
    ap.add_argument("--root", type=float, default=55.0)
    ap.add_argument("--cuts", type=str, default="",
                    help="comma-separated slide-cut times in seconds")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    n = int(SR * args.seconds)
    mix = [0.0] * n
    beat = 60.0 / args.bpm
    root_hz = args.root
    two_pi = 2.0 * math.pi

    # Sub pulse on every beat: short decaying sine with a slight pitch drop.
    k = 0
    while k * beat * SR < n:
        s = int(k * beat * SR)
        dur = int(0.42 * SR)
        phase = 0.0
        for j in range(min(dur, n - s)):
            tt = j / SR
            f = root_hz * (1 + 0.04 * math.exp(-tt * 18))
            phase += two_pi * f / SR
            mix[s + j] += 0.46 * math.sin(phase) * math.exp(-tt * 6.5)
        k += 1

    # Soft tick on offbeats: a short filtered noise click.
    k = 0
    while (k + 0.5) * beat * SR < n:
        s = int((k + 0.5) * beat * SR)
        dur = int(0.05 * SR)
        for j in range(min(dur, n - s)):
            mix[s + j] += 0.06 * (rng.uniform(-1, 1) * math.exp(-j / (0.006 * SR)))
        k += 1

    # Pad: two slow detuned sines a fifth up, swelling, with a breathing tremolo.
    trem_hz = 1.0 / (2 * beat)
    for i in range(n):
        t = i / SR
        swell = 0.25 + 0.75 * (i / n)
        pad = 0.5 * math.sin(two_pi * root_hz * 3 * t) + 0.5 * math.sin(two_pi * root_hz * 3.005 * t)
        pad *= 0.08 * swell
        pad *= 0.8 + 0.2 * math.sin(two_pi * trem_hz * t)
        mix[i] += pad

    # Slide-cut hits: a deep thump ON the cut and a soft noise riser sweeping
    # INTO it. This glues the edit to the sound.
    cuts = [float(c) for c in args.cuts.split(",") if c.strip()]
    for c in cuts:
        s = int(c * SR)
        # riser: 0.55s of noise swelling into the cut (smoothed for a whoosh)
        rdur = int(0.55 * SR)
        rs = max(0, s - rdur)
        if s > rs:
            raw = [rng.uniform(-1, 1) for _ in range(s - rs)]
            win = 48
            acc = 0.0
            smooth = [0.0] * len(raw)
            for j in range(len(raw)):
                acc += raw[j]
                if j >= win:
                    acc -= raw[j - win]
                smooth[j] = acc / win
            for j in range(len(raw)):
                ramp = (j / len(raw)) ** 2
                mix[rs + j] += 0.11 * smooth[j] * ramp
        # thump: 80 -> 38 Hz over 0.28s
        tdur = int(0.28 * SR)
        phase = 0.0
        for j in range(min(tdur, n - s)):
            tt = j / SR
            f = 80 * math.exp(-tt * 9) + 38
            phase += two_pi * f / SR
            mix[s + j] += 0.42 * math.sin(phase) * math.exp(-tt * 11)

    # Global fade in/out, soft clip, normalize with headroom under the voice.
    fade_in = int(0.35 * SR)
    fade_out = int(1.2 * SR)
    for i in range(n):
        e = 1.0
        if i < fade_in:
            e = i / fade_in
        elif i > n - fade_out:
            e = max(0.0, (n - i) / fade_out)
        mix[i] = math.tanh(mix[i] * e * 1.1)
    peak = max((abs(v) for v in mix), default=1.0) or 1.0
    scale = 0.72 / peak

    pcm = array.array("h", (int(max(-1.0, min(1.0, v * scale)) * 32767) for v in mix))
    with wave.open(args.out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(
        f"bed: {args.out} ({args.seconds:.1f}s, seed {args.seed}, "
        f"bpm {args.bpm:.0f}, root {args.root:.1f}Hz, {len(cuts)} cut hits, numpy-free)"
    )


if __name__ == "__main__":
    main()
