/**
 * Re-download the bundled fonts into public/fonts.
 *
 * The fonts are committed to the repo (Satori needs them on disk at runtime, and
 * Vercel needs them in the deployment bundle), so you normally never run this.
 * It exists so the bundle is reproducible and auditable.
 *
 *   npm run fonts
 *
 * All four families are OFL-1.1 licensed; see public/fonts/LICENSES.md.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "fonts");

/** Files we can fetch byte-for-byte from a raw URL. */
const DIRECT: Record<string, string> = {
  "InstrumentSerif-Regular.ttf":
    "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf",
  "InstrumentSerif-Italic.ttf":
    "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-Italic.ttf",
  "JetBrainsMono-Regular.ttf":
    "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-Regular.ttf",
  "JetBrainsMono-SemiBold.ttf":
    "https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/fonts/ttf/JetBrainsMono-SemiBold.ttf",
};

/**
 * Inter only publishes *static* TTFs inside its release archive — google/fonts
 * carries the variable font, which Satori renders at a single weight. We need
 * genuinely distinct 400/600/800 faces, so we pull them out of the zip.
 */
const INTER_ZIP = "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip";
const INTER_WANTED: Record<string, string> = {
  "extras/ttf/Inter-Regular.ttf": "Inter-Regular.ttf",
  "extras/ttf/Inter-SemiBold.ttf": "Inter-SemiBold.ttf",
  "extras/ttf/Inter-ExtraBold.ttf": "Inter-ExtraBold.ttf",
};

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Minimal ZIP reader: locate the end-of-central-directory record, walk the
 * central directory, and inflate only the entries we asked for. Keeps this
 * script dependency-free. Handles "stored" (0) and "deflate" (8) entries,
 * which covers every entry in the Inter release.
 */
function unzip(zip: Buffer, wanted: Record<string, string>): Map<string, Buffer> {
  const EOCD_SIG = 0x06054b50;
  const CEN_SIG = 0x02014b50;

  let eocd = -1;
  for (let i = zip.length - 22; i >= 0 && i > zip.length - 22 - 0xffff; i--) {
    if (zip.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file: no end-of-central-directory record");

  const entryCount = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();

  for (let n = 0; n < entryCount; n++) {
    if (zip.readUInt32LE(p) !== CEN_SIG) throw new Error("corrupt central directory");
    const method = zip.readUInt16LE(p + 10);
    const compressedSize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString("utf8");

    if (name in wanted) {
      // Local header: 30 fixed bytes + name + extra, then the payload.
      const lNameLen = zip.readUInt16LE(localOffset + 26);
      const lExtraLen = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = zip.subarray(start, start + compressedSize);
      out.set(wanted[name], method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }

  const missing = Object.values(wanted).filter((f) => !out.has(f));
  if (missing.length) throw new Error(`zip did not contain: ${missing.join(", ")}`);
  return out;
}

/** A real TrueType/OpenType file starts with 0x00010000, "true", or "OTTO". */
function assertFontBytes(name: string, buf: Buffer): void {
  const tag = buf.readUInt32BE(0);
  const ok = tag === 0x00010000 || tag === 0x74727565 || tag === 0x4f54544f;
  if (!ok) throw new Error(`${name} is not a TTF/OTF (magic ${tag.toString(16)})`);
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });

  for (const [file, url] of Object.entries(DIRECT)) {
    const buf = await download(url);
    assertFontBytes(file, buf);
    await writeFile(path.join(OUT, file), buf);
    console.log(`  ${file.padEnd(30)} ${buf.length} bytes`);
  }

  console.log(`  fetching ${INTER_ZIP} ...`);
  const entries = unzip(await download(INTER_ZIP), INTER_WANTED);
  for (const [file, buf] of entries) {
    assertFontBytes(file, buf);
    await writeFile(path.join(OUT, file), buf);
    console.log(`  ${file.padEnd(30)} ${buf.length} bytes`);
  }

  console.log("\nFonts written to public/fonts.");
}

main().catch((err) => {
  console.error(`\nfetch-fonts failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
