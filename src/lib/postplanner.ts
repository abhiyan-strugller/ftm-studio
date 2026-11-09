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
import path from "node:path";
import { cell, readXlsxSheet, type SheetGrid } from "./xlsx";

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
 * Minutes to delay the first comment.
 *
 * NOTE: the template's own guidance (cell G3) states "Allowed values are
 * 5,10,15, 30 and 60". 5 is the smallest permitted value, so it is the closest
 * thing to "as soon as possible" that the importer will accept. Leaving the
 * cell blank also works and publishes the comment immediately — see the
 * template's row 5 — so set this to `null` if you would rather have that.
 */
export const FIRST_COMMENT_DELAY: number | null = 5;

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
 * MM/DD/YYYY, two spaces, H:MM on a 24-hour clock, hour not zero-padded, in
 * US Eastern. Matches the template's own examples exactly:
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
