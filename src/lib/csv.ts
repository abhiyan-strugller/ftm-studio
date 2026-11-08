/**
 * Post Planner CSV export.
 *
 * The real column headings are not known yet — Post Planner's sample sheet has
 * not been checked — so nothing here hardcodes them. The mapping lives in
 * `config/postplanner-columns.json` and is read at run time: when the real
 * format is confirmed, editing that JSON is the whole change.
 *
 * The file is written UTF-8 **with a BOM** so Excel on Windows opens it as
 * Unicode instead of mangling every curly quote and en dash in the captions.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ET_ZONE } from "./types";

/** The four fields we know how to emit. Keys are fixed; headings are yours. */
export const COLUMN_KEYS = ["text", "mediaUrl", "date", "time"] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

/** Heading per field, in the order the columns should appear. */
export type ColumnMap = {
  keys: ColumnKey[];
  headings: Record<ColumnKey, string>;
};

export const DEFAULT_COLUMN_MAP: ColumnMap = {
  keys: ["text", "mediaUrl", "date", "time"],
  headings: { text: "Content", mediaUrl: "Image URL", date: "Date", time: "Time" },
};

export const COLUMN_CONFIG_PATH = path.join("config", "postplanner-columns.json");

/**
 * Load the column mapping. Key order in the JSON file becomes column order,
 * which is why this reads the raw object rather than destructuring it.
 */
export async function loadColumnMap(
  configPath: string = COLUMN_CONFIG_PATH,
): Promise<ColumnMap> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(configPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Could not read the column mapping at ${configPath}: ` +
        `${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain a JSON object.`);
  }

  const entries = Object.entries(parsed as Record<string, unknown>)
    // `_comment` and any other underscore key is documentation, not a column.
    .filter(([key]) => !key.startsWith("_"));

  const keys: ColumnKey[] = [];
  const headings = {} as Record<ColumnKey, string>;

  for (const [key, value] of entries) {
    if (!(COLUMN_KEYS as readonly string[]).includes(key)) {
      throw new Error(
        `${configPath}: unknown field "${key}". Valid fields are ${COLUMN_KEYS.join(", ")}.`,
      );
    }
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`${configPath}: "${key}" must map to a non-empty column heading.`);
    }
    keys.push(key as ColumnKey);
    headings[key as ColumnKey] = value;
  }

  const missing = COLUMN_KEYS.filter((k) => !keys.includes(k));
  if (missing.length > 0) {
    throw new Error(`${configPath} is missing: ${missing.join(", ")}.`);
  }
  return { keys, headings };
}

export type CsvRow = {
  text: string;
  mediaUrl: string;
  /** UTC instant of the slot; formatted into ET date and time columns. */
  at: Date;
};

/** US-style date, in Eastern time: 11/9/2026. */
export function formatCsvDate(at: Date, timeZone: string = ET_ZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(at);
}

/** US-style time, in Eastern time: 7:00 AM. */
export function formatCsvTime(at: Date, timeZone: string = ET_ZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(at)
    // Intl emits a narrow no-break space before AM/PM in recent ICU versions;
    // spreadsheets display that as a stray glyph, so normalise it.
    .replace(/ /g, " ");
}

/** RFC 4180 escaping: quote when the value contains a delimiter or quote. */
export function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build the CSV body (no BOM — `writeCsv` adds that). */
export function buildCsv(
  rows: CsvRow[],
  map: ColumnMap = DEFAULT_COLUMN_MAP,
  timeZone: string = ET_ZONE,
): string {
  const lines: string[] = [];
  lines.push(map.keys.map((k) => escapeCsvValue(map.headings[k])).join(","));

  for (const row of rows) {
    const values: Record<ColumnKey, string> = {
      text: row.text,
      mediaUrl: row.mediaUrl,
      date: formatCsvDate(row.at, timeZone),
      time: formatCsvTime(row.at, timeZone),
    };
    lines.push(map.keys.map((k) => escapeCsvValue(values[k])).join(","));
  }

  // CRLF line endings: the format spreadsheets and Windows tooling expect.
  return lines.join("\r\n") + "\r\n";
}

/** UTF-8 BOM, so Excel on Windows reads the file as Unicode. */
export const UTF8_BOM = "﻿";

export function csvWithBom(csv: string): Buffer {
  return Buffer.from(UTF8_BOM + csv, "utf8");
}
