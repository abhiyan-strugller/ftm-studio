/**
 * Render a Reel: a vertical (1080x1920) video built from plain-style slides.
 *
 *   npm run render-reel -- --input input/reels/2026-11-16-nvidia.json
 *
 * Output: output/reels/<slug>/<slug>.mp4 plus the slide PNGs and bed.wav.
 *
 * Design: the moving version of the `plain` card. Each slide is big sans text
 * on a solid near-black or white ground with the page header on top. Slides
 * alternate dark/light (a deliberate pattern interrupt), drift with a slow
 * zoom, and a thin progress bar runs along the top. Audio is an ORIGINAL
 * procedurally generated bed (scripts/gen-reel-bed.py) — nothing to strike.
 *
 * No faces, ever — not Abhiyan's, not AI-generated people, no stock footage
 * of people. Everything on screen is our own typography and our own mark.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { loadFonts } from "../src/lib/design/fonts";
import { FONT_SANS } from "../src/lib/design/fonts";
import { Logo, BRAND_GREEN, BRAND_GOLD } from "../src/lib/design/logo";
import { plainColors } from "../src/lib/design/templates/plain";

export const REEL_W = 1080;
export const REEL_H = 1920;
const PAD = 96;
const CONTENT_W = REEL_W - PAD * 2;
const FPS = 30;

type SlideKind = "hook" | "body" | "take" | "end";
export type ReelSlide = {
  kind: SlideKind;
  /** Hero figure/word, huge type. Hook slides usually have one. */
  big?: string;
  /** Body lines; each renders as its own paragraph. */
  lines?: string[];
  /** Seconds on screen. Defaults by kind. */
  seconds?: number;
};
export type ReelDoc = {
  slug: string;
  title: string;
  slides: ReelSlide[];
  source_line: string;
  caption: string;
  /** Audio seed so a rebuilt reel sounds identical. */
  audio_seed?: number;
};

const DEFAULT_SECONDS: Record<SlideKind, number> = {
  hook: 2.8,
  body: 3.6,
  take: 4.2,
  end: 3.2,
};

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

function Slide({ slide, dark, source }: { slide: ReelSlide; dark: boolean; source: string }) {
  const c = plainColors(dark);
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
              width: CONTENT_W,
              fontSize: bigSize(slide.big),
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: c.text,
              marginBottom: lines.length ? 48 : 0,
            }}
          >
            {slide.big}
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
              color: slide.kind === "take" && i === 0 ? (dark ? BRAND_GREEN : "#0E6B3C") : c.text,
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

  const outDir = path.join("output", "reels", doc.slug);
  await mkdir(outDir, { recursive: true });

  const fonts = await loadFonts();
  const durations: number[] = [];
  const pngs: string[] = [];

  for (let i = 0; i < doc.slides.length; i++) {
    const slide = doc.slides[i];
    const dark = i % 2 === 0; // alternate: dark, light, dark...
    const res = new ImageResponse(
      <Slide slide={slide} dark={dark} source={doc.source_line} />,
      { width: REEL_W, height: REEL_H, fonts },
    );
    const png = path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await writeFile(png, Buffer.from(await res.arrayBuffer()));
    pngs.push(png);
    durations.push(slide.seconds ?? DEFAULT_SECONDS[slide.kind]);
    console.log(`slide ${i + 1}/${doc.slides.length}  ${slide.kind}  ${durations[i]}s  ${dark ? "dark" : "light"}`);
  }

  const total = durations.reduce((a, b) => a + b, 0);

  // Original audio bed — never a licensing question.
  const bed = path.join(outDir, "bed.wav");
  execFileSync(
    "python3",
    ["scripts/gen-reel-bed.py", "--seconds", String(total.toFixed(2)), "--out", bed, "--seed", String(doc.audio_seed ?? 7)],
    { stdio: "inherit" },
  );

  // Assemble: each still gets a slow push-in (zoompan), then concat, progress
  // bar along the top, bed underneath. yuv420p + faststart for Facebook.
  const inputs: string[] = [];
  const filters: string[] = [];
  for (let i = 0; i < pngs.length; i++) {
    inputs.push("-loop", "1", "-t", durations[i].toFixed(2), "-i", pngs[i]);
    const frames = Math.round(durations[i] * FPS);
    filters.push(
      `[${i}:v]fps=${FPS},scale=${REEL_W * 2}:${REEL_H * 2},` +
        `zoompan=z='1+0.00045*on':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=${REEL_W}x${REEL_H}:fps=${FPS},` +
        `setsar=1[v${i}]`,
    );
  }
  const concatIn = pngs.map((_, i) => `[v${i}]`).join("");
  filters.push(`${concatIn}concat=n=${pngs.length}:v=1:a=0[vall]`);
  filters.push(
    `[vall]drawbox=x=0:y=0:w='iw*min(t/${total.toFixed(2)},1)':h=14:color=${BRAND_GREEN}@0.9:t=fill[vout]`,
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
      "-map", `${pngs.length}:a`,
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
  console.log(`\nreel: ${mp4}  (${total.toFixed(1)}s, ${doc.slides.length} slides)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
