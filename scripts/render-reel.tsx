/**
 * Render a Reel: a vertical (1080x1920) video built from plain-style slides.
 *
 *   npm run render-reel -- --input input/reels/2026-11-16-nvidia.json
 *
 * Output: output/reels/<slug>/<slug>.mp4 plus the slide PNGs and bed.wav.
 *
 * v3 features (each reel picks its own mix — no two reels move the same):
 *  - COUNT-UP HOOK: `"countup": true` on the hook animates its big number
 *    from 0 to the real value in the first beat. The climb is the motion.
 *  - LINE REVEALS: body slides with 2+ lines land their lines as separate
 *    beats inside the slide (hard cuts, like thought-beats).
 *  - STYLE OVERRIDES: `"style": {"accent": "gold"|"green", "first":
 *    "light"|"dark"}` forces a look; otherwise the slug fingerprint decides.
 *  - VOICE: `"voice": "<file>.wav"` (relative to the input JSON) mixes a
 *    narration over a ducked bed — the CapCut Voice Studio hand-off point.
 *  - Everything from v2: dip-to-black cuts with bass hits + risers synced to
 *    them, punch/push zooms, accent underline, progress bar, fingerprint
 *    variety in tempo/root/palette order/timing.
 *
 * The audio bed is ORIGINAL and procedurally generated — nothing to strike.
 * No faces, ever. No licensed media, ever. See prompts/reels.md.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { loadFonts, FONT_SANS } from "../src/lib/design/fonts";
import { Logo, BRAND_GREEN, BRAND_GOLD } from "../src/lib/design/logo";
import { plainColors } from "../src/lib/design/templates/plain";

// Note: scripts/gen-reel-bed.py is pure Python standard library — no numpy,
// no third-party deps — so the audio never depends on a pip install at render
// time. (It used to need numpy; on 2026-11-16 a scheduled run only survived
// by improvising the install, so the dependency was removed entirely.)

export const REEL_W = 1080;
export const REEL_H = 1920;
const PAD = 96;
const CONTENT_W = REEL_W - PAD * 2;
const FPS = 30;
const XFADE = 0.12; // dip-to-black between slides, seconds
const COUNT_STEPS = 14; // frames in a count-up
const COUNT_PORTION = 0.45; // share of the hook spent counting

type SlideKind = "hook" | "body" | "take" | "end";
export type ReelSlide = {
  kind: SlideKind;
  big?: string;
  lines?: string[];
  seconds?: number;
  /** Animate the first number in `big` from 0 to its value. */
  countup?: boolean;
  /** Reveal `lines` one beat at a time (default true for 2+ line bodies). */
  reveal?: boolean;
};
export type ReelDoc = {
  slug: string;
  title: string;
  slides: ReelSlide[];
  source_line: string;
  caption: string;
  audio_seed?: number;
  style?: { accent?: "green" | "gold"; first?: "dark" | "light" };
  /** Narration WAV relative to the input JSON's directory. */
  voice?: string;
};

const DEFAULT_SECONDS: Record<SlideKind, number> = {
  hook: 2.8,
  body: 3.6,
  take: 4.2,
  end: 3.2,
};

type Fingerprint = {
  darkFirst: boolean;
  accent: string;
  accentDarkText: string;
  bpm: number;
  rootHz: number;
  audioSeed: number;
  zoomFlip: boolean;
  timeJitter: number;
};

function fingerprint(slug: string, style?: ReelDoc["style"]): Fingerprint {
  const h = createHash("sha256").update(slug).digest();
  const roots = [55.0, 65.41, 73.42, 49.0]; // A1, C2, D2, G1
  let gold = h[2] % 3 === 0;
  if (style?.accent) gold = style.accent === "gold";
  let darkFirst = h[0] % 2 === 0;
  if (style?.first) darkFirst = style.first === "dark";
  return {
    darkFirst,
    accent: gold ? BRAND_GOLD : BRAND_GREEN,
    accentDarkText: gold ? "#8A6A12" : "#0E6B3C",
    bpm: 84 + (h[1] % 17),
    rootHz: roots[h[3] % roots.length],
    audioSeed: h[4] * 256 + h[5],
    zoomFlip: h[6] % 2 === 0,
    timeJitter: 0.92 + (h[7] % 17) * 0.01,
  };
}

function bigSize(s: string): number {
  if (s.length <= 6) return 240;
  if (s.length <= 12) return 170;
  if (s.length <= 20) return 120;
  return 92;
}

function lineSize(total: number): number {
  if (total <= 90) return 76;
  if (total <= 160) return 64;
  if (total <= 260) return 56;
  return 48;
}

/** "$26 billion" at progress 0.5 -> "$13 billion"; keeps format/commas. */
function countupText(big: string, p: number): string {
  const m = big.match(/([\d][\d,]*(?:\.\d+)?)/);
  if (!m) return big;
  const raw = m[1];
  const value = parseFloat(raw.replace(/,/g, ""));
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  // ease-out so the last ticks slow down like a real counter
  const eased = 1 - Math.pow(1 - p, 2.2);
  let v = value * eased;
  if (p >= 1) v = value;
  const hasCommas = raw.includes(",");
  let s = v.toFixed(decimals);
  if (hasCommas) s = Number(s).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return big.slice(0, m.index) + s + big.slice((m.index ?? 0) + raw.length);
}

function Header({ dark }: { dark: boolean }) {
  const c = plainColors(dark);
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: "#0E2238",
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: c.avatarRing,
        }}
      >
        <Logo width={58} stroke={BRAND_GREEN} dot={BRAND_GOLD} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 26 }}>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: c.text }}>
          Follow the Money
        </div>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 400, color: c.muted, marginTop: 4 }}>
          Money · Policy · You
        </div>
      </div>
    </div>
  );
}

function Slide({
  slide,
  dark,
  source,
  fp,
  bigOverride,
  visibleLines,
}: {
  slide: ReelSlide;
  dark: boolean;
  source: string;
  fp: Fingerprint;
  /** Count-up frame text for `big`. */
  bigOverride?: string;
  /** How many of `lines` are shown (reveal); undefined = all. */
  visibleLines?: number;
}) {
  const c = plainColors(dark);
  const accent = dark ? fp.accent : fp.accentDarkText;
  const lines = slide.lines ?? [];
  const shown = visibleLines ?? lines.length;
  const totalLen = lines.join(" ").length;
  const size = lineSize(totalLen);
  const gap = Math.round(size * 0.8);
  const big = bigOverride ?? slide.big;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: REEL_W,
        height: REEL_H,
        padding: PAD,
        paddingTop: 170,
        paddingBottom: 260,
        backgroundColor: c.bg,
        color: c.text,
        fontFamily: FONT_SANS,
      }}
    >
      <Header dark={dark} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: CONTENT_W,
          flexGrow: 1,
          paddingTop: 36,
        }}
      >
        {big ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: CONTENT_W,
              marginBottom: lines.length ? 48 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: bigSize(slide.big ?? big),
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: c.text,
              }}
            >
              {big}
            </div>
            <div
              style={{
                display: "flex",
                width: 220,
                height: 16,
                marginTop: 34,
                backgroundColor: accent,
              }}
            />
          </div>
        ) : null}
        {lines.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: CONTENT_W,
              fontSize: slide.kind === "take" && i === 0 ? Math.round(size * 0.78) : size,
              fontWeight: slide.kind === "take" && i === 0 ? 800 : 600,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              // reveal: upcoming lines occupy their space invisibly so the
              // layout never jumps, they just "arrive"
              color:
                i >= shown
                  ? c.bg
                  : slide.kind === "take" && i === 0
                    ? accent
                    : c.text,
              marginBottom: i === lines.length - 1 ? 0 : gap,
            }}
          >
            {p}
          </div>
        ))}
        {slide.kind === "end" ? (
          <div
            style={{
              display: "flex",
              width: CONTENT_W,
              marginTop: 56,
              fontSize: 40,
              fontWeight: 600,
              color: c.muted,
            }}
          >
            Follow for the money trail.
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", fontSize: 24, fontWeight: 400, color: c.muted }}>
        {source}
      </div>
    </div>
  );
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** One rendered still with its on-screen duration. */
type Step = { png: string; seconds: number };

async function main() {
  const inputPath = arg("input");
  if (!inputPath) throw new Error("--input input/reels/<file>.json is required");
  const doc: ReelDoc = JSON.parse(await readFile(inputPath, "utf8"));
  if (!doc.slug || !doc.slides?.length || !doc.caption || !doc.source_line)
    throw new Error("reel doc needs slug, slides, caption, source_line");
  if (doc.slides.length < 4 || doc.slides.length > 9)
    throw new Error(`4-9 slides, got ${doc.slides.length}`);

  const fp = fingerprint(doc.slug, doc.style);
  const outDir = path.join("output", "reels", doc.slug);
  await mkdir(outDir, { recursive: true });
  const fonts = await loadFonts();

  // Build each slide as one or more steps (count-up frames / line reveals).
  const slideSteps: Step[][] = [];
  const slideDur: number[] = [];
  let stillIdx = 0;

  async function renderStill(
    slide: ReelSlide,
    dark: boolean,
    opts: { bigOverride?: string; visibleLines?: number },
  ): Promise<string> {
    const res = new ImageResponse(
      <Slide
        slide={slide}
        dark={dark}
        source={doc.source_line}
        fp={fp}
        bigOverride={opts.bigOverride}
        visibleLines={opts.visibleLines}
      />,
      { width: REEL_W, height: REEL_H, fonts },
    );
    stillIdx += 1;
    const png = path.join(outDir, `still-${String(stillIdx).padStart(3, "0")}.png`);
    await writeFile(png, Buffer.from(await res.arrayBuffer()));
    return png;
  }

  for (let i = 0; i < doc.slides.length; i++) {
    const slide = doc.slides[i];
    const dark = fp.darkFirst ? i % 2 === 0 : i % 2 === 1;
    const base = slide.seconds ?? DEFAULT_SECONDS[slide.kind];
    const dur = Math.round(base * fp.timeJitter * 100) / 100;
    const steps: Step[] = [];

    const lines = slide.lines ?? [];
    const doReveal =
      slide.reveal ?? (slide.kind === "body" && lines.length >= 2 && !slide.countup);

    if (slide.countup && slide.big) {
      const countDur = dur * COUNT_PORTION;
      const per = countDur / COUNT_STEPS;
      for (let k = 1; k <= COUNT_STEPS; k++) {
        const png = await renderStill(slide, dark, {
          bigOverride: countupText(slide.big, k / COUNT_STEPS),
          visibleLines: 0,
        });
        steps.push({ png, seconds: per });
      }
      const hold = await renderStill(slide, dark, {});
      steps.push({ png: hold, seconds: dur - countDur });
    } else if (doReveal) {
      const beats = lines.length;
      const first = dur * 0.42;
      const rest = (dur - first) / (beats - 1);
      for (let k = 1; k <= beats; k++) {
        const png = await renderStill(slide, dark, { visibleLines: k });
        steps.push({ png, seconds: k === 1 ? first : rest });
      }
    } else {
      const png = await renderStill(slide, dark, {});
      steps.push({ png, seconds: dur });
    }

    slideSteps.push(steps);
    slideDur.push(dur);
    console.log(
      `slide ${i + 1}/${doc.slides.length}  ${slide.kind}  ${dur}s  ${dark ? "dark" : "light"}  ${steps.length} step(s)`,
    );
  }

  const n = slideSteps.length;
  const slideDurOf = (i: number) => slideDur[i];
  // no overlap: fades live inside each slide, so total is the plain sum
  const total = slideDur.reduce((a, b) => a + b, 0);

  const cuts: number[] = [];
  let acc = 0;
  for (let i = 0; i < n - 1; i++) {
    acc += slideDur[i];
    cuts.push(acc);
  }

  // Audio: original bed with hits on the cuts; optional narration on top.
  const bed = path.join(outDir, "bed.wav");
  execFileSync(
    "python3",
    [
      "scripts/gen-reel-bed.py",
      "--seconds", total.toFixed(2),
      "--out", bed,
      "--seed", String(doc.audio_seed ?? fp.audioSeed),
      "--bpm", fp.bpm.toFixed(1),
      "--root", fp.rootHz.toFixed(2),
      "--cuts", cuts.map((c) => c.toFixed(2)).join(","),
    ],
    { stdio: "inherit" },
  );
  const voicePath = doc.voice
    ? path.resolve(path.dirname(inputPath), doc.voice)
    : undefined;
  if (doc.voice && !existsSync(voicePath!))
    throw new Error(`voice file not found: ${voicePath}`);

  // Video graph: per slide, concat its steps (each gently zoomed), then
  // dip-to-black xfade between slides, then the progress bar.
  const inputs: string[] = [];
  const filters: string[] = [];
  let inIdx = 0;
  for (let i = 0; i < n; i++) {
    const steps = slideSteps[i];
    const punch = i === 0 ? true : fp.zoomFlip ? i % 2 === 0 : i % 2 === 1;
    const parts: string[] = [];
    for (let k = 0; k < steps.length; k++) {
      const st = steps[k];
      // ONE frame in, `d` frames out. Do NOT use -loop/-t here: zoompan
      // emits d frames per INPUT frame, so a looped input multiplies the
      // length (a 22s reel rendered as a 449s video, masked until now by
      // -shortest cutting it back to the bed length).
      inputs.push("-i", st.png);
      const frames = Math.max(1, Math.round(st.seconds * FPS));
      const multi = steps.length > 1;
      // multi-step slides keep a steady slow push so the beat cuts stay
      // crisp; single-step slides get the full punch/push move
      const zexpr = multi
        ? `min(1.05,1+0.00035*on)`
        : punch
          ? `max(1.0,1.055-0.0011*on)`
          : `min(1.06,1+0.00045*on)`;
      filters.push(
        `[${inIdx}:v]scale=${REEL_W * 2}:${REEL_H * 2},` +
          `zoompan=z='${zexpr}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${REEL_W}x${REEL_H}:fps=${FPS},` +
          `setsar=1,format=yuv420p[s${i}_${k}]`,
      );
      parts.push(`[s${i}_${k}]`);
      inIdx += 1;
    }
    // Join this slide's steps, then dip to black at both ends. We do NOT use
    // xfade: it demands matching timebases, and settb REINTERPRETS pts rather
    // than rescaling them, which silently compressed multi-step slides to a
    // fraction of their length. Fades + plain concat are exact.
    const slideFrames = Math.max(1, Math.round(slideDurOf(i) * FPS));
    const fadeF = Math.max(2, Math.round(XFADE * FPS));
    const joined = parts.length > 1
      ? `${parts.join("")}concat=n=${parts.length}:v=1:a=0,`
      : `${parts[0]}`;
    filters.push(
      `${joined}fade=t=in:st=0:d=${XFADE.toFixed(2)},` +
        `fade=t=out:st=${Math.max(0, (slideFrames - fadeF) / FPS).toFixed(2)}:d=${XFADE.toFixed(2)}[v${i}]`,
    );
  }
  filters.push(
    `${slideDur.map((_, i) => `[v${i}]`).join("")}concat=n=${n}:v=1:a=0[vall]`,
  );
  filters.push(
    `[vall]drawbox=x=0:y=0:w='iw*min(t/${total.toFixed(2)},1)':h=14:color=${fp.accent}@0.9:t=fill[vout]`,
  );

  // Audio chain: bed alone, or bed ducked under the narration.
  const bedIn = inIdx;
  inputs.push("-i", bed);
  let audioMap = `${bedIn}:a`;
  if (voicePath) {
    inputs.push("-i", voicePath);
    filters.push(
      `[${bedIn}:a]volume=0.35[bduck];` +
        `[${bedIn + 1}:a]aformat=sample_rates=44100:channel_layouts=mono,volume=1.0[vo];` +
        `[bduck][vo]amix=inputs=2:duration=first:normalize=0[aout]`,
    );
    audioMap = "[aout]";
  }

  const mp4 = path.join(outDir, `${doc.slug}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...inputs,
      "-filter_complex", filters.join(";"),
      "-map", "[vout]",
      "-map", audioMap,
      "-c:v", "libx264", "-preset", "medium", "-crf", "21",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      // hard cap: the graph should already end here, and -shortest must
      // never be the only thing deciding the length again
      "-t", total.toFixed(2),
      "-movflags", "+faststart",
      mp4,
    ],
    { stdio: "inherit" },
  );

  await writeFile(
    path.join(outDir, "caption.txt"),
    doc.caption + "\n\n---\nsource line: " + doc.source_line + "\n",
  );
  console.log(
    `\nreel: ${mp4}  (${total.toFixed(1)}s, ${n} slides, ` +
      `${fp.darkFirst ? "dark" : "light"}-first, accent ${fp.accent}, ${fp.bpm.toFixed(0)}bpm` +
      `${voicePath ? ", with narration" : ""})`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
