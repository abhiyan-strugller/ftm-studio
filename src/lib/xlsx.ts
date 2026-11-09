/**
 * A minimal read-only .xlsx reader.
 *
 * Only exists to read Post Planner's bulk-upload template so the generated CSV
 * can derive its two leading comment rows from the real file instead of
 * hardcoding them. Deliberately dependency-free: an xlsx library would be a
 * large surface to carry for one file we read once per build.
 *
 * Supports exactly what that template uses — shared strings, inline strings,
 * and plain values. No formulas, no dates-as-serial-numbers, no styles.
 */
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/** Read the entries of a zip archive into memory, keyed by path. */
function readZip(buf: Buffer): Map<string, Buffer> {
  const EOCD_SIG = 0x06054b50;
  const CEN_SIG = 0x02014b50;

  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip archive (no end-of-central-directory record)");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== CEN_SIG) throw new Error("corrupt zip central directory");
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");

    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compressedSize);
    out.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));

    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** XML entity decode. `&amp;` must be last so `&amp;lt;` does not become `<`. */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

/** Concatenate every <t> run inside a fragment (a cell can hold several). */
function textRuns(fragment: string): string {
  let text = "";
  for (const t of fragment.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += decodeXml(t[1]);
  return text;
}

/** "C5" -> { col: 3, row: 5 }. Columns are 1-based. */
function parseRef(ref: string): { col: number; row: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`unreadable cell reference "${ref}"`);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

/**
 * A sheet as a dense grid of strings, 0-indexed by [row][col]. Empty cells are
 * empty strings, so callers never have to distinguish "absent" from "blank".
 */
export type SheetGrid = string[][];

export function readXlsxSheet(filePath: string): SheetGrid {
  let zipBuf: Buffer;
  try {
    zipBuf = readFileSync(filePath);
  } catch (err) {
    throw new Error(
      `Could not read ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const files = readZip(zipBuf);

  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared: string[] = [];
  for (const si of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(textRuns(si[1]));
  }

  // The template has a single sheet; take the lowest-numbered one.
  const sheetPath = [...files.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort()[0];
  if (!sheetPath) throw new Error(`${filePath} contains no worksheet`);

  const xml = files.get(sheetPath)!.toString("utf8");
  const grid: SheetGrid = [];

  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowIndex = Number(rowMatch[1]) - 1;
    const cells: string[] = [];

    // A self-closing cell must be matched as such: `<c([^>]*)>` would swallow
    // its slash and run on to the next cell's </c>, pairing one cell's
    // reference with another cell's value.
    for (const c of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1] ?? "";
      const inner = c[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? "n";
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "";

      let value: string;
      if (type === "s") value = shared[Number(rawValue)] ?? "";
      else if (type === "inlineStr") value = textRuns(inner);
      else value = decodeXml(rawValue);

      const col = ref ? parseRef(ref).col - 1 : cells.length;
      while (cells.length < col) cells.push("");
      cells[col] = value;
    }

    while (grid.length < rowIndex) grid.push([]);
    grid[rowIndex] = cells;
  }

  return grid;
}

/** Cell value at 0-indexed row/col, or "" when absent. */
export function cell(grid: SheetGrid, row: number, col: number): string {
  return grid[row]?.[col] ?? "";
}
