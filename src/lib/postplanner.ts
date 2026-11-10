/**
 * Post Planner bulk-upload format.
 *
 * Derived from their real template at
 * `reference/sample_bulk_posts_import.xlsx`, which overrides their public docs
 * wherever the two disagree. What the file actually shows:
 *
 *   - Any row whose FIRST cell starts with `##` is ignored on import.
 *   - Their own header row is one of those comment rows (A2 is literally
 *     "## POSTING TIME"), so the importer does NOT read column names.
 *     **Parsing is positional**: nine columns, fixed order, always present.
 *   - POSTING TIME cells are TEXT (number format `@`), written as
 *     MM/DD/YYYY, two spaces, then H:MM on a 24-hour clock with the hour NOT
 *     zero-padded — "01/01/2030  8:15" and "07/04/2030  14:30".
 *   - A blank POSTING TIME queues the post instead of scheduling it, so ours
 *     must never be blank.
 *
 * Rows 1 and 2 are read back out of the template at build time rather than
 * hardcoded, so a version bump on their side carries through. The shape is
 * validated hard: if the columns move, the build stops rather than quietly
 * emitting a file that imports into the wrong fields.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cell, readXlsxSheet, type SheetGrid } from "./xlsx";

// ---------------------------------------------------------------------------
// Scheduler time zone
// ---------------------------------------------------------------------------

export const POSTPLANNER_CONFIG_PATH = path.join("config", "postplanner.json");

/**
 * The zone Post Planner reads POSTING TIME in. It is a property of the Post
 * Planner account, not of our slots: the scheduler's own field reads
 * "America/Edmonton", so a bare "8:15" in the sheet means 8:15 Mountain.
 *
 * Our slots are still authored in US Eastern. The instant is unchanged; only
 * how it is written into the CSV follows this zone — 07:00 ET is written "5:00".
 */
export const DEFAULT_POSTPLANNER_ZONE = "America/Edmonton";

/**
 * Read `timeZone` from `config/postplanner.json`. A missing file or key falls
 * back to `DEFAULT_POSTPLANNER_ZONE`; a zone `Intl` does not recognise fails,
 * because a typo would otherwise shift every post.
 */
export function loadPostPlannerZone(configPath: string = POSTPLANNER_CONFIG_PATH): string {
  if (!existsSync(configPath)) return DEFAULT_POSTPLANNER_ZONE;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(`Could not read ${configPath}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain a JSON object.`);
  }

  const raw = (parsed as Record<string, unknown>).timeZone;
  if (raw === undefined) return DEFAULT_POSTPLANNER_ZONE;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`${configPath}: "timeZone" must be an IANA zone name such as "America/Edmonton".`);
  }
  const zone = raw.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    throw new Error(`${configPath}: "timeZone" ${JSON.stringify(zone)} is not a recognised IANA zone.`);
  }
  return zone;
}

export const TEMPLATE_PATH = path.join("reference", "sample_bulk_posts_import.xlsx");

/**
 * The nine columns, in the order the importer reads them positionally.
 * This order is the contract — not the names, which the importer never sees.
 */
export const COLUMNS = [
  "POSTING TIME",
  "CAPTION",
  "LINK",
  "MEDIA",
  "TITLE",
  "FIRST COMMENT",
  "FIRST COMMENT DELAY",
  "TOBI BACKGROUND",
  "REEL OR STORY",
] as const;

export const COLUMN_COUNT = COLUMNS.length;

/** Their documented ceiling: "limit media posts to 200 per bulk upload file". */
export const MAX_DATA_ROWS = 200;

/**
 * Delays the importer accepts, per the template's own guidance in cell G3:
 * "Allowed values are 5,10,15, 30 and 60". Anything else is rejected or
 * ignored — a delay of 2, for instance, is not a valid value.
 */
export const ALLOWED_FIRST_COMMENT_DELAYS = [5, 10, 15, 30, 60] as const;

/**
 * Minutes to delay the first comment, or `null` to leave the cell blank.
 *
 * Blank is the default and means *immediately*: the template's row 5 pairs a
 * first comment with an empty delay and describes it publishing right after
 * the post. We carry the source link in that comment, so it needs to be there
 * for the first people who see the post — not five minutes behind them.
 *
 * Set this to one of `ALLOWED_FIRST_COMMENT_DELAYS` if a real delay is ever
 * wanted. Values outside that list will not work.
 */
export const FIRST_COMMENT_DELAY: (typeof ALLOWED_FIRST_COMMENT_DELAYS)[number] | null = null;

export type TemplatePreamble = {
  /** Row 1: the comment-row explanation and the version cell, then blanks. */
  row1: string[];
  /** Row 2: the header comment row, A2 through I2. */
  row2: string[];
  /** For the build log, e.g. "BULK UPLOAD VERSION 3.1 — Please DO NOT EDIT this cell." */
  version: string;
};

export class TemplateShapeError extends Error {
  constructor(message: string) {
    super(
      `${message}\n\n` +
        `This is read from ${TEMPLATE_PATH}. Post Planner may have changed their ` +
        `bulk-upload format. Re-download their template, diff it against the one ` +
        `in reference/, and update src/lib/postplanner.ts before building again.`,
    );
    this.name = "TemplateShapeError";
  }
}

/** Pad or trim a row to exactly nine fields. */
function toNineFields(row: string[]): string[] {
  const out = row.slice(0, COLUMN_COUNT);
  while (out.length < COLUMN_COUNT) out.push("");
  return out;
}

/**
 * Read and validate the two leading rows.
 *
 * The version string is read rather than asserted, so Post Planner bumping
 * 3.1 to 3.2 flows through. Everything structural IS asserted.
 */
export function readTemplatePreamble(templatePath: string = TEMPLATE_PATH): TemplatePreamble {
  let grid: SheetGrid;
  try {
    grid = readXlsxSheet(templatePath);
  } catch (err) {
    throw new TemplateShapeError(
      `Could not open the template: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const a1 = cell(grid, 0, 0);
  const b1 = cell(grid, 0, 1);
  const a2 = cell(grid, 1, 0);

  if (!a1.startsWith("##")) {
    throw new TemplateShapeError(`Expected cell A1 to be a "##" comment row, found: ${JSON.stringify(a1)}`);
  }
  if (!/^BULK UPLOAD VERSION\b/.test(b1)) {
    throw new TemplateShapeError(
      `Expected cell B1 to start with "BULK UPLOAD VERSION", found: ${JSON.stringify(b1)}`,
    );
  }
  if (a2 !== `## ${COLUMNS[0]}`) {
    throw new TemplateShapeError(
      `Expected cell A2 to be "## ${COLUMNS[0]}", found: ${JSON.stringify(a2)}`,
    );
  }

  // Positional parsing means a reordered column silently sends captions into
  // the LINK field, so verify all nine names and their order.
  const headerRow = toNineFields(grid[1] ?? []);
  const expected = [`## ${COLUMNS[0]}`, ...COLUMNS.slice(1)];
  for (let i = 0; i < COLUMN_COUNT; i++) {
    if (headerRow[i] !== expected[i]) {
      throw new TemplateShapeError(
        `Column ${i + 1} of the header row should be ${JSON.stringify(expected[i])} ` +
          `but the template has ${JSON.stringify(headerRow[i])}.\n` +
          `Full header row: ${JSON.stringify(headerRow)}`,
      );
    }
  }

  return {
    // C1..I1 are blank in the template; keep them so the row has nine fields.
    row1: toNineFields([a1, b1]),
    row2: headerRow,
    version: b1,
  };
}

// ---------------------------------------------------------------------------
// POSTING TIME
// ---------------------------------------------------------------------------

/**
 * Format an instant as Post Planner's POSTING TIME text.
 *
 * MM/DD/YYYY, two spaces, H:MM on a 24-hour clock, hour not zero-padded, as
 * seen in `timeZone` — which must be the zone the Post Planner account
 * schedules in (`loadPostPlannerZone`), not the zone our slots are authored
 * in. DST is handled by `Intl`. Matches the template's own examples exactly:
 * "01/01/2030  8:15" and "07/04/2030  14:30".
 */
export function formatPostingTime(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  const month = get("month");
  const day = get("day");
  const year = get("year");
  // h23 zero-pads; the template does not pad the hour.
  const hour = String(Number(get("hour")));
  const minute = get("minute");

  return `${month}/${day}/${year}  ${hour}:${minute}`;
}
