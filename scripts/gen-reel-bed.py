#!/usr/bin/env python3
"""Generate an ORIGINAL, catchy music bed for Reels — procedural, so there is
never a copyright claim on the audio. Each reel gets a melodic hook (a looping
riff in a pentatonic scale, so it is always consonant and easy to listen to), a
bassline, groove (kick / hats / clap) and a chord pad, plus a bass hit synced to
every slide cut. One of several STYLES is chosen from the seed, so reels rotate
between distinct feels and no two sound alike.

Pure Python standard library — NO numpy, NO third-party deps. The bed renders on
every reel, several times a day, so a run must never depend on a pip install.
Deterministic per seed/params; reproducible and varied.

  python3 scripts/gen-reel-bed.py --seconds 30 --out /tmp/bed.wav \
      [--seed 7] [--bpm 96] [--root 55] [--cuts 2.7,6.2,9.8] [--style bounce]
"""
import argparse, array, math, random, wave

SR = 44100
TWO_PI = 2.0 * math.pi

# Minor and major pentatonic (semitone intervals) — both stay consonant.
PENT_MIN = [0, 3, 5, 7, 10]
PENT_MAJ = [0, 2, 4, 7, 9]

# Catchy 16-step riffs as (scale-degree, octave) or None for a rest. Degree
# indexes the pentatonic scale and can exceed its length (wraps up an octave).
RIFFS = [
    [0, None, 2, 3, None, 2, 4, None, 3, None, 2, 0, None, 2, None, None],
    [4, 4, None, 3, 2, None, 0, None, 2, None, 3, None, 4, None, 2, None],
    [0, None, None, 2, None, 3, None, 4, 3, None, 2, None, 0, None, 3, 2],
    [2, None, 3, None, 4, 3, 2, None, 0, None, 0, 2, 3, None, None, None],
    [0, 2, 3, 4, None, 4, 3, 2, 0, None, 2, None, 3, None, 4, None],
]

# Styles. Each sets feel, which elements play, and the drum patterns over 16
# sixteenth-steps (1 bar = 4 beats). '1' = hit.
STYLES = {
    "pulse":  dict(scale=PENT_MIN, lead=0.16, bassg=0.5, padg=0.09, swing=0.0,
                   kick="1000001000100000", hat="0010001000100010", clap="0000000000000000",
                   hatg=0.05, leadoct=2, timbre="soft"),
    "bounce": dict(scale=PENT_MIN, lead=0.22, bassg=0.55, padg=0.07, swing=0.12,
                   kick="1000000010010000", hat="1010101010101011", clap="0000100000001000",
                   hatg=0.08, leadoct=2, timbre="pluck"),
    "lofi":   dict(scale=PENT_MAJ, lead=0.18, bassg=0.5, padg=0.11, swing=0.16,
                   kick="1000000000100000", hat="0010001000100010", clap="0000100000000000",
                   hatg=0.05, leadoct=2, timbre="soft"),
    "drive":  dict(scale=PENT_MIN, lead=0.2, bassg=0.6, padg=0.06, swing=0.0,
                   kick="1001001000100100", hat="1111111111111111", clap="0000100000001000",
                   hatg=0.045, leadoct=3, timbre="pluck"),
    "anthem": dict(scale=PENT_MAJ, lead=0.24, bassg=0.5, padg=0.1, swing=0.0,
                   kick="1000001000100000", hat="0010101000101010", clap="0000100000001000",
                   hatg=0.06, leadoct=3, timbre="bright"),
}
STYLE_NAMES = list(STYLES.keys())


def semitone(root, n):
    return root * (2.0 ** (n / 12.0))


def scale_freq(root, scale, degree, octave):
    o, d = divmod(degree, len(scale))
    return semitone(root, scale[d] + 12 * (o + octave))


def add_note(mix, n, start, freq, dur, gain, timbre, rng):
    s = int(start * SR)
    ln = int(dur * SR)
    if s >= n:
        return
    phase = 0.0
    # pluck/bright add harmonics; soft is near-sine
    h2 = {"soft": 0.12, "pluck": 0.5, "bright": 0.7}.get(timbre, 0.3)
    h3 = {"soft": 0.03, "pluck": 0.22, "bright": 0.4}.get(timbre, 0.12)
    dec = {"soft": 4.5, "pluck": 7.5, "bright": 5.5}.get(timbre, 6.0)
    vib = 0.004 if timbre == "bright" else 0.0
    for j in range(min(ln, n - s)):
        tt = j / SR
        f = freq * (1 + vib * math.sin(TWO_PI * 5.5 * tt))
        phase += TWO_PI * f / SR
        env = math.exp(-tt * dec) * (1 - math.exp(-tt * 120))  # tiny attack
        v = math.sin(phase) + h2 * math.sin(2 * phase) + h3 * math.sin(3 * phase)
        mix[s + j] += gain * v * env


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--bpm", type=float, default=96.0)
    ap.add_argument("--root", type=float, default=55.0)
    ap.add_argument("--cuts", type=str, default="")
    ap.add_argument("--style", type=str, default="")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    style_name = args.style if args.style in STYLES else STYLE_NAMES[args.seed % len(STYLE_NAMES)]
    st = STYLES[style_name]
    riff = RIFFS[(args.seed // 7) % len(RIFFS)]
    scale = st["scale"]

    n = int(SR * args.seconds)
    mix = [0.0] * n
    beat = 60.0 / args.bpm
    step = beat / 4.0                       # sixteenth note
    root = args.root
    # bass walks a short loop among scale tones; melody sits 2-3 octaves up
    bass_loop = [0, 0, len(scale), len(scale) - 2]  # root, root, octave, 5th-ish
    lead_base_oct = st["leadoct"]

    total_steps = int(args.seconds / step)
    for i in range(total_steps):
        t = i * step
        t += (st["swing"] * step) if (i % 2 == 1) else 0.0  # swing offbeats
        bar_step = i % 16
        bar = i // 16

        # --- kick / hat / clap
        if st["kick"][bar_step] == "1":
            add_kick(mix, n, t, 0.9)
        if st["hat"][bar_step] == "1":
            add_hat(mix, n, t, st["hatg"], rng)
        if st["clap"][bar_step] == "1":
            add_clap(mix, n, t, 0.16, rng)

        # --- bass on quarter notes
        if bar_step % 4 == 0:
            bdeg = bass_loop[(bar * 4 + bar_step // 4) % len(bass_loop)]
            add_note(mix, n, t, scale_freq(root, scale, bdeg, 1), beat * 0.9,
                     st["bassg"], "soft", rng)

        # --- melody riff
        deg = riff[bar_step]
        if deg is not None:
            freq = scale_freq(root, scale, deg, lead_base_oct)
            add_note(mix, n, t, freq, step * 1.8, st["lead"], st["timbre"], rng)

    # --- chord pad: slow fifth drone that swells
    for i in range(n):
        tt = i / SR
        swell = 0.3 + 0.7 * (i / n)
        pad = 0.5 * math.sin(TWO_PI * semitone(root, 12) * tt) \
            + 0.5 * math.sin(TWO_PI * semitone(root, 19) * tt + 0.3)
        pad *= st["padg"] * swell * (0.85 + 0.15 * math.sin(TWO_PI * (1.0 / (3 * beat)) * tt))
        mix[i] += pad

    # --- slide-cut hits (keep the edit glued to the sound)
    cuts = [float(c) for c in args.cuts.split(",") if c.strip()]
    for c in cuts:
        add_kick(mix, n, c, 1.0)
        rdur = int(0.5 * SR)
        s = int(c * SR)
        rs = max(0, s - rdur)
        if s > rs:
            raw = [rng.uniform(-1, 1) for _ in range(s - rs)]
            win, acc = 48, 0.0
            sm = [0.0] * len(raw)
            for j in range(len(raw)):
                acc += raw[j]
                if j >= win:
                    acc -= raw[j - win]
                sm[j] = acc / win
            for j in range(len(raw)):
                mix[rs + j] += 0.1 * sm[j] * (j / len(raw)) ** 2

    # --- fade, soft-clip, normalise under the voice
    fi, fo = int(0.3 * SR), int(1.1 * SR)
    for i in range(n):
        e = 1.0
        if i < fi:
            e = i / fi
        elif i > n - fo:
            e = max(0.0, (n - i) / fo)
        mix[i] = math.tanh(mix[i] * e * 1.05)
    peak = max((abs(v) for v in mix), default=1.0) or 1.0
    scale_out = 0.74 / peak
    pcm = array.array("h", (int(max(-1.0, min(1.0, v * scale_out)) * 32767) for v in mix))
    with wave.open(args.out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"bed: {args.out} ({args.seconds:.1f}s, seed {args.seed}, style {style_name}, "
          f"bpm {args.bpm:.0f}, root {args.root:.1f}Hz, riff {(args.seed//7)%len(RIFFS)}, "
          f"{len(cuts)} cuts, numpy-free)")


def add_kick(mix, n, t, g):
    s = int(t * SR)
    dur = int(0.3 * SR)
    phase = 0.0
    for j in range(min(dur, n - s)):
        if s + j < 0:
            continue
        tt = j / SR
        f = 120 * math.exp(-tt * 22) + 44
        phase += TWO_PI * f / SR
        mix[s + j] += g * 0.5 * math.sin(phase) * math.exp(-tt * 9)


def add_hat(mix, n, t, g, rng):
    s = int(t * SR)
    dur = int(0.04 * SR)
    for j in range(min(dur, n - s)):
        if s + j < 0:
            continue
        mix[s + j] += g * rng.uniform(-1, 1) * math.exp(-j / (0.004 * SR))


def add_clap(mix, n, t, g, rng):
    s = int(t * SR)
    dur = int(0.12 * SR)
    for j in range(min(dur, n - s)):
        if s + j < 0:
            continue
        env = math.exp(-j / (0.03 * SR)) * (1 - math.exp(-j / (0.001 * SR)))
        mix[s + j] += g * rng.uniform(-1, 1) * env


if __name__ == "__main__":
    main()
