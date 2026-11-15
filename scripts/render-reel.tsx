/**
 * Render a Reel: a vertical (1080x1920) video built from plain-style slides.
 *
 *   npm run render-reel -- --input input/reels/2026-11-16-nvidia.json
 *
 * Output: output/reels/<slug>/<slug>.mp4 plus the slide PNGs and bed.wav.
 *
 * Design: the moving version of the `plain` card. Each slide is big sans text
 * on a solid near-black or white ground with the page header on top. Slides
 * alternate dark/light, cut through a 0.12s dip-to-black, drift with
 * alternating punch-in/push-in zooms, and a thin accent progress bar runs
 * along the top. A bass hit + noise riser lands on every cut (the audio bed
 * is ORIGINAL and procedurally generated — nothing to strike, ever).
 *
 * VARIETY IS A REQUIREMENT (Abhiyan, Nov 14): every reel must look and sound
 * different. A deterministic "fingerprint" derived from the slug varies the
 * palette order, the accent colour (brand green or gold), the tempo, the bass
 * root note, the zoom pattern and the slide timing — so two reels never move
 * or sound the same, while any single reel rebuilds identically.
 *
 * No faces, ever — not Abhiyan's, not AI-generated people, no stock footage
 * of people. Everything on screen is our own typography and our own mark.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { loadFonts, FONT_SANS } from "../src/lib/design/fonts";
import { Logo, BRAND_GREEN, BRAND_GOLD } from "../src/lib/design/logo";
import { plainColors } from "../src/lib/design/templates/plain";

export const REEL_W = 1080;
export const REEL_H = 1920;
const PAD = 96;
const CONTENT_W = REEL_W - PAD * 2;
const FPS = 30;
const XFADE = 0.12; // dip-to-black between slides, seconds

type SlideKind = "hook" | "body" | "take" | "end";
export type ReelSlide = {
  kind: SlideKind;
  /** Hero figure/word, huge type. Hook slides usually have one. */
  big?: string;
  /** Body lines; each renders as its own paragraph. */
  lines?: string[];
  /** Seconds on screen. Defaults by kind (then fingerprint-jittered). */
  seconds?: number;
};
export type ReelDoc = {
  slug: string;
  title: string;
  slides: ReelSlide[];
  source_line: string;
  caption: string;
  /** Optional override; the fingerprint supplies one otherwise. */
  audio_seed?: number;
};

const DEFAULT_SECONDS: Record<SlideKind, number> = {
  hook: 2.8,
  body: 3.6,
  take: 4.2,
  end: 3.2,
};

/** Deterministic per-reel variety, derived from the slug. */
type Fingerprint = {
  darkFirst: boolean;
  accent: string; // brand green or gold
  accentDarkText: string; // accent usable on light grounds
  bpm: number;
  rootHz: number;
  audioSeed: number;
  zoomFlip: boolean; // which slides punch vs push
  timeJitter: number; // multiply default durations 0.92–1.08
};

function fingerprint(slug: string): Fingerprint {
  const h = createHash("sha256").update(slug).digest();
  const roots = [55.0, 65.41, 73.42, 49.0]; // A1, C2, D2, G1
  const gold = h[2] % 3 === 0; // gold roughly every third reel
  return {
    darkFirst: h[0] % 2 === 0,
    accent: gold ? BRAND_GOLD : BRAND_GREEN,
    accentDarkText: gold ? "#8A6A12" : "#0E6B3C",
    bpm: 84 + (h[1] % 17), // 84–100
    rootHz: roots[h[3] % roots.length],
    audioSeed: h[4] * 256 + h[5],
    zoomFlip: h[6] % 2 === 0,
    timeJitter: 0.92 + (h[7] % 17) * 0.01, // 0.92–1.08
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
}: {
  slide: ReelSlide;
  dark: boolean;
  source: string;
  fp: Fingerprint;
}) {
  const c = plainColors(dark);
  const accent = dark ? fp.accent : fp.accentDarkText;
  const lines = slide.lines ?? [];
  const totalLen = lines.join(" ").length;
  const size = lineSize(totalLen);
  const gap = Math.round(size * 0.8);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: REEL_W,
        height: REEL_H,
        padding: PAD,
        paddingTop: 170, // keep clear of the Reels top UI
        paddingBottom: 260, // keep clear of caption/actions overlay
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
        {slide.big ? (
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
                fontSize: bigSize(slide.big),
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                color: c.text,
              }}
            >
              {slide.big}
            </div>
            {/* accent underline bar — the one decorative element, earned by the hook */}
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
              color: slide.kind === "take" && i === 0 ? accent : c.text,
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

async function main() {
  const inputPath = arg("input");
  if (!inputPath) throw new Error("--input input/reels/<file>.json is required");
  const doc: ReelDoc = JSON.parse(await readFile(inputPath, "utf8"));
  if (!doc.slug || !doc.slides?.length || !doc.caption || !doc.source_line)
    throw new Error("reel doc needs slug, slides, caption, source_line");
  if (doc.slides.length < 4 || doc.slides.length > 9)
    throw new Error(`4-9 slides, got ${doc.slides.length}`);

  const fp = fingerprint(doc.slug);
  const outDir = path.join("output", "reels", doc.slug);
  await mkdir(outDir, { recursive: true });

  const fonts = await loadFonts();
  const durations: number[] = [];
  const pngs: string[] = [];

  for (let i = 0; i < doc.slides.length; i++) {
    const slide = doc.slides[i];
    const dark = fp.darkFirst ? i % 2 === 0 : i % 2 === 1;
    const res = new ImageResponse(
      <Slide slide={slide} dark={dark} source={doc.source_line} fp={fp} />,
      { width: REEL_W, height: REEL_H, fonts },
    );
    const png = path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await writeFile(png, Buffer.from(await res.arrayBuffer()));
    pngs.push(png);
    const base = slide.seconds ?? DEFAULT_SECONDS[slide.kind];
    durations.push(Math.round(base * fp.timeJitter * 100) / 100);
    console.log(
      `slide ${i + 1}/${doc.slides.length}  ${slide.kind}  ${durations[i]}s  ${dark ? "dark" : "light"}`,
    );
  }

  const n = pngs.length;
  const total =
    durations.reduce((a, b) => a + b, 0) - XFADE * (n - 1);

  // Cut times (midpoint of each dip) for the audio hits.
  const cuts: number[] = [];
  let acc = 0;
  for (let i = 0; i < n - 1; i++) {
    acc += durations[i];
    cuts.push(acc - XFADE * (i + 1) + XFADE / 2);
  }

  // Original audio bed with hits synced to the cuts.
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

  // Motion: hook punches in (starts big, settles), then slides alternate
  // push-in / punch-in; dip-to-black xfade between every pair.
  const inputs: string[] = [];
  const filters: string[] = [];
  for (let i = 0; i < n; i++) {
    inputs.push("-loop", "1", "-t", durations[i].toFixed(2), "-i", pngs[i]);
    const frames = Math.round(durations[i] * FPS);
    const punch = i === 0 ? true : fp.zoomFlip ? i % 2 === 0 : i % 2 === 1;
    const zexpr = punch
      ? `max(1.0,1.055-0.0011*on)` // punch-in: settle from 1.055 toward 1.0
      : `min(1.06,1+0.00045*on)`; // push-in: creep from 1.0 toward 1.06
    filters.push(
      `[${i}:v]fps=${FPS},scale=${REEL_W * 2}:${REEL_H * 2},` +
        `zoompan=z='${zexpr}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${REEL_W}x${REEL_H}:fps=${FPS},` +
        `setsar=1,format=yuv420p[v${i}]`,
    );
  }
  // xfade chain with fadeblack dips.
  let prev = `v0`;
  let offAcc = 0;
  for (let i = 1; i < n; i++) {
    offAcc += durations[i - 1] - XFADE;
    const out = i === n - 1 ? "vall" : `x${i}`;
    filters.push(
      `[${prev}][v${i}]xfade=transition=fadeblack:duration=${XFADE}:offset=${offAcc.toFixed(2)}[${out}]`,
    );
    prev = out;
  }
  filters.push(
    `[vall]drawbox=x=0:y=0:w='iw*min(t/${total.toFixed(2)},1)':h=14:color=${fp.accent}@0.9:t=fill[vout]`,
  );

  const mp4 = path.join(outDir, `${doc.slug}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      ...inputs,
      "-i", bed,
      "-filter_complex", filters.join(";"),
      "-map", "[vout]",
      "-map", `${n}:a`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "21",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest",
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
      `${fp.darkFirst ? "dark" : "light"}-first, accent ${fp.accent}, ${fp.bpm.toFixed(0)}bpm)`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
