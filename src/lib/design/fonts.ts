/**
 * Font loading for Satori.
 *
 * Satori needs each face as an ArrayBuffer of a TTF/OTF — it cannot read WOFF2
 * and cannot fetch remote fonts at render time. The files are committed under
 * public/fonts and included in the deployment bundle via
 * `outputFileTracingIncludes` in next.config.ts.
 *
 * Buffers are cached per process: a cold render pays ~1.9MB of disk reads once,
 * then every subsequent render is free.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export type SatoriFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 800;
  style: "normal" | "italic";
};

/** Family names referenced from template styles. */
export const FONT_SERIF = "Instrument Serif";
export const FONT_SANS = "Inter";
export const FONT_MONO = "JetBrains Mono";

type FaceSpec = {
  file: string;
  name: string;
  weight: 400 | 600 | 800;
  style: "normal" | "italic";
};

const FACES: FaceSpec[] = [
  { file: "InstrumentSerif-Regular.ttf", name: FONT_SERIF, weight: 400, style: "normal" },
  { file: "InstrumentSerif-Italic.ttf", name: FONT_SERIF, weight: 400, style: "italic" },
  { file: "Inter-Regular.ttf", name: FONT_SANS, weight: 400, style: "normal" },
  { file: "Inter-SemiBold.ttf", name: FONT_SANS, weight: 600, style: "normal" },
  { file: "Inter-ExtraBold.ttf", name: FONT_SANS, weight: 800, style: "normal" },
  { file: "JetBrainsMono-Regular.ttf", name: FONT_MONO, weight: 400, style: "normal" },
  { file: "JetBrainsMono-SemiBold.ttf", name: FONT_MONO, weight: 600, style: "normal" },
];

let cached: SatoriFont[] | null = null;

function fontsDir(): string {
  return path.join(process.cwd(), "public", "fonts");
}

/** A real TrueType/OpenType file starts with 0x00010000, "true", or "OTTO". */
function assertFontBytes(file: string, buf: Buffer): void {
  if (buf.length < 4) throw new Error(`Font ${file} is empty or truncated`);
  const tag = buf.readUInt32BE(0);
  if (tag !== 0x00010000 && tag !== 0x74727565 && tag !== 0x4f54544f) {
    throw new Error(
      `Font ${file} is not a TTF/OTF (magic 0x${tag.toString(16)}). ` +
        `Satori cannot read WOFF/WOFF2 — re-run \`npm run fonts\`.`,
    );
  }
}

export async function loadFonts(): Promise<SatoriFont[]> {
  if (cached) return cached;

  const dir = fontsDir();
  const loaded = await Promise.all(
    FACES.map(async (face) => {
      const full = path.join(dir, face.file);
      let buf: Buffer;
      try {
        buf = await readFile(full);
      } catch {
        throw new Error(
          `Missing font file ${face.file} in public/fonts. Run \`npm run fonts\` to fetch them.`,
        );
      }
      assertFontBytes(face.file, buf);
      // Copy into a standalone ArrayBuffer — a Node Buffer can be a view into a
      // larger pooled allocation, and Satori would then read the wrong bytes.
      const data = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ) as ArrayBuffer;
      return { name: face.name, data, weight: face.weight, style: face.style };
    }),
  );

  cached = loaded;
  return loaded;
}
