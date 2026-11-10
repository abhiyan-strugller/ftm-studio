/**
 * Post Planner bulk-upload CSV.
 *
 * Nine positional columns — see `postplanner.ts` for why the column *names*
 * are irrelevant to the importer and the *order* is the entire contract.
 *
 * Output shape:
 *   row 1   the template's comment-row explanation + version cell, then blanks
 *   row 2   the template's header comment row (A2 starts "##", so it is ignored)
 *   row 3+  one row per post
 *
 * Written UTF-8 **with a BOM** — row 1 carries an em dash, and without the BOM
 * Excel on Windows mangles it. CRLF rows, RFC 4180 quoting.
 */
import {
  COLUMN_COUNT,
  DEFAULT_POSTPLANNER_ZONE,
  FIRST_COMMENT_DELAY,
  MAX_DATA_ROWS,
  formatPostingTime,
  type TemplatePreamble,
} from "./postplanner";

/** One post, already resolved to the values that go in the sheet. */
export type CsvRow = {
  /** Slot instant. Written as POSTING TIME in the Post Planner account zone (Mountain); never blank. */
  at: Date;
  caption: string;
  /** Full public URL ending in an image extension. */
  mediaUrl: string;
  /** Already composed, e.g. "Source: Freddie Mac — https://…". Blank if none. */
  firstComment: string;
};

/** RFC 4180 escaping: quote when the value contains a delimiter or quote. */
export function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toLine(fields: string[]): string {
  if (fields.length !== COLUMN_COUNT) {
    throw new Error(`Expected ${COLUMN_COUNT} fields, got ${fields.length}`);
  }
  return fields.map(escapeCsvValue).join(",");
}

/**
 * The nine fields for one post, in importer order.
 *
 * LINK stays blank on purpose: the template warns that a LINK url must not end
 * in a media file type, and our posts are images with the source carried in the
 * first comment instead.
 */
export function postRowFields(row: CsvRow, timeZone: string = DEFAULT_POSTPLANNER_ZONE): string[] {
  const postingTime = formatPostingTime(row.at, timeZone);
  if (!postingTime.trim()) {
    // A blank POSTING TIME silently turns a scheduled post into a queued one.
    throw new Error("POSTING TIME came out blank, which would queue the post instead of scheduling it");
  }

  const hasComment = row.firstComment.trim() !== "";
  const delay = hasComment && FIRST_COMMENT_DELAY !== null ? String(FIRST_COMMENT_DELAY) : "";

  return [
    postingTime, // 1 POSTING TIME
    row.caption, // 2 CAPTION
    "", // 3 LINK
    row.mediaUrl, // 4 MEDIA
    "", // 5 TITLE
    hasComment ? row.firstComment : "", // 6 FIRST COMMENT
    delay, // 7 FIRST COMMENT DELAY
    "", // 8 TOBI BACKGROUND
    "", // 9 REEL OR STORY
  ];
}

export function buildCsv(
  rows: CsvRow[],
  preamble: TemplatePreamble,
  timeZone: string = DEFAULT_POSTPLANNER_ZONE,
): string {
  if (rows.length > MAX_DATA_ROWS) {
    throw new Error(
      `${rows.length} posts exceeds Post Planner's documented limit of ${MAX_DATA_ROWS} per ` +
        `bulk upload file. Split the day across more than one file.`,
    );
  }

  const lines = [toLine(preamble.row1), toLine(preamble.row2)];
  for (const row of rows) lines.push(toLine(postRowFields(row, timeZone)));

  // CRLF: the row separator spreadsheets and Windows tooling expect.
  return lines.join("\r\n") + "\r\n";
}

/** UTF-8 BOM, so Excel on Windows reads the file as Unicode. */
export const UTF8_BOM = "﻿";

export function csvWithBom(csv: string): Buffer {
  return Buffer.from(UTF8_BOM + csv, "utf8");
}

/**
 * Compose the FIRST COMMENT from a post's source.
 *
 * `source` is written on the card with its own "Source:" prefix, so that is
 * stripped before recomposing — otherwise the comment reads "Source: Source: …".
 */
export function composeFirstComment(source?: string, sourceUrl?: string): string {
  const name = (source ?? "").replace(/^\s*source\s*:\s*/i, "").trim();
  const url = (sourceUrl ?? "").trim();
  if (!name && !url) return "";
  if (!name) return `Source: ${url}`;
  return url ? `Source: ${name} — ${url}` : `Source: ${name}`;
}
