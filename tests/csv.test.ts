import { describe, expect, it } from "vitest";
import {
  buildCsv,
  composeFirstComment,
  csvWithBom,
  escapeCsvValue,
  postRowFields,
  type CsvRow,
} from "@/lib/csv";
import {
  COLUMNS,
  COLUMN_COUNT,
  FIRST_COMMENT_DELAY,
  MAX_DATA_ROWS,
  formatPostingTime,
  readTemplatePreamble,
  TemplateShapeError,
  TEMPLATE_PATH,
} from "@/lib/postplanner";
import { ET_ZONE } from "@/lib/types";
import { slotInstant } from "@/lib/time";

/**
 * A stubbed preamble, so most of these tests do not depend on the real
 * spreadsheet being present or unchanged.
 */
const PREAMBLE = {
  row1: ["## comment row explanation", "BULK UPLOAD VERSION 9.9 — do not edit", "", "", "", "", "", "", ""],
  row2: ["## POSTING TIME", "CAPTION", "LINK", "MEDIA", "TITLE", "FIRST COMMENT", "FIRST COMMENT DELAY", "TOBI BACKGROUND", "REEL OR STORY"],
  version: "BULK UPLOAD VERSION 9.9 — do not edit",
};

function row(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    at: new Date("2026-11-09T12:00:00.000Z"), // 07:00 EST
    caption: "Rates held steady.",
    mediaUrl: "https://example.github.io/ftm-media/2026-11-09/01-headline.png",
    firstComment: "",
    ...overrides,
  };
}

function dataLines(csv: string): string[] {
  return csv.split("\r\n").filter(Boolean).slice(2);
}

describe("POSTING TIME matches the template's own examples", () => {
  it("does not zero-pad a single-digit hour", () => {
    // The template's example is exactly "01/01/2030  8:15".
    const at = new Date(Date.UTC(2030, 0, 1, 13, 15)); // 08:15 EST
    expect(formatPostingTime(at, ET_ZONE)).toBe("01/01/2030  8:15");
  });

  it("uses a 24-hour clock for the afternoon", () => {
    // The template's example is exactly "07/04/2030  14:30".
    const at = new Date(Date.UTC(2030, 6, 4, 18, 30)); // 14:30 EDT
    expect(formatPostingTime(at, ET_ZONE)).toBe("07/04/2030  14:30");
  });

  it("separates date and time with exactly two spaces", () => {
    const formatted = formatPostingTime(new Date("2026-11-09T12:00:00.000Z"), ET_ZONE);
    expect(formatted).toBe("11/09/2026  7:00");
    expect(/^\d{2}\/\d{2}\/\d{4} {2}\d{1,2}:\d{2}$/.test(formatted)).toBe(true);
  });

  it("zero-pads the month and day but never the hour", () => {
    const at = slotInstant("2026-01-05", "09:00");
    expect(formatPostingTime(at, ET_ZONE)).toBe("01/05/2026  9:00");
  });

  it("holds the Eastern wall-clock hour across the spring DST change", () => {
    // 08:00 ET either side of 8 March 2026 — different UTC, same printed hour.
    expect(formatPostingTime(slotInstant("2026-03-07", "08:00"), ET_ZONE)).toBe("03/07/2026  8:00");
    expect(formatPostingTime(slotInstant("2026-03-09", "08:00"), ET_ZONE)).toBe("03/09/2026  8:00");
  });

  it("holds the Eastern wall-clock hour across the autumn DST change", () => {
    expect(formatPostingTime(slotInstant("2026-10-31", "20:00"), ET_ZONE)).toBe("10/31/2026  20:00");
    expect(formatPostingTime(slotInstant("2026-11-01", "20:00"), ET_ZONE)).toBe("11/01/2026  20:00");
  });

  it("uses the Eastern calendar day, not the UTC one", () => {
    // 02:00 UTC on the 10th is still 21:00 on the 9th in Eastern time.
    expect(formatPostingTime(new Date("2026-11-10T02:00:00.000Z"), ET_ZONE)).toBe("11/09/2026  21:00");
  });

  it("is never blank, which would queue the post instead of scheduling it", () => {
    for (const slot of ["07:00", "13:00", "21:00"]) {
      expect(formatPostingTime(slotInstant("2026-06-15", slot), ET_ZONE).trim()).not.toBe("");
    }
  });
});

describe("the nine positional fields", () => {
  it("emits exactly nine, in importer order", () => {
    const fields = postRowFields(row());
    expect(fields).toHaveLength(COLUMN_COUNT);
    expect(COLUMNS).toHaveLength(9);
  });

  it("puts posting time, caption and media in slots 1, 2 and 4", () => {
    const fields = postRowFields(row());
    expect(fields[0]).toBe("11/09/2026  7:00");
    expect(fields[1]).toBe("Rates held steady.");
    expect(fields[3]).toBe("https://example.github.io/ftm-media/2026-11-09/01-headline.png");
  });

  it("leaves LINK blank — the template forbids a link ending in a media type", () => {
    expect(postRowFields(row())[2]).toBe("");
  });

  it("leaves TITLE, TOBI BACKGROUND and REEL OR STORY blank", () => {
    const fields = postRowFields(row());
    expect(fields[4]).toBe("");
    expect(fields[7]).toBe("");
    expect(fields[8]).toBe("");
  });

  it("sets the delay only when there is a first comment", () => {
    const without = postRowFields(row());
    expect(without[5]).toBe("");
    expect(without[6]).toBe("");

    const withComment = postRowFields(row({ firstComment: "Source: BLS — https://bls.gov" }));
    expect(withComment[5]).toBe("Source: BLS — https://bls.gov");
    expect(withComment[6]).toBe(String(FIRST_COMMENT_DELAY));
  });

  it("uses a delay the template actually permits", () => {
    // The template's cell G3 states: "Allowed values are 5,10,15, 30 and 60".
    if (FIRST_COMMENT_DELAY !== null) {
      expect([5, 10, 15, 30, 60]).toContain(FIRST_COMMENT_DELAY);
    }
  });

  it("treats a whitespace-only first comment as absent", () => {
    const fields = postRowFields(row({ firstComment: "   " }));
    expect(fields[5]).toBe("");
    expect(fields[6]).toBe("");
  });
});

describe("composeFirstComment", () => {
  it("joins name and url with an em dash", () => {
    expect(composeFirstComment("Source: Freddie Mac", "https://freddiemac.com")).toBe(
      "Source: Freddie Mac — https://freddiemac.com",
    );
  });

  it("does not double the Source prefix the card already carries", () => {
    expect(composeFirstComment("Source: BLS")).toBe("Source: BLS");
    expect(composeFirstComment("source:  BLS")).toBe("Source: BLS");
  });

  it("works with a name and no url", () => {
    expect(composeFirstComment("Federal Reserve statement")).toBe("Source: Federal Reserve statement");
  });

  it("works with a url and no name", () => {
    expect(composeFirstComment(undefined, "https://bls.gov")).toBe("Source: https://bls.gov");
  });

  it("is blank when there is neither", () => {
    expect(composeFirstComment()).toBe("");
    expect(composeFirstComment("", "")).toBe("");
  });
});

describe("RFC 4180 escaping", () => {
  it("leaves plain values alone", () => {
    expect(escapeCsvValue("Rates held steady")).toBe("Rates held steady");
  });

  it("quotes values containing a comma", () => {
    expect(escapeCsvValue("Chicago, Illinois")).toBe('"Chicago, Illinois"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvValue('He said "no"')).toBe('"He said ""no"""');
  });

  it("quotes values containing newlines", () => {
    expect(escapeCsvValue("line one\nline two")).toBe('"line one\nline two"');
  });
});

describe("CSV assembly", () => {
  it("leads with the template's two comment rows", () => {
    const lines = buildCsv([row()], PREAMBLE).split("\r\n");
    expect(lines[0]).toBe(
      '## comment row explanation,BULK UPLOAD VERSION 9.9 — do not edit,,,,,,,',
    );
    expect(lines[1]).toBe(
      "## POSTING TIME,CAPTION,LINK,MEDIA,TITLE,FIRST COMMENT,FIRST COMMENT DELAY,TOBI BACKGROUND,REEL OR STORY",
    );
  });

  it("starts both leading rows with ## so the importer ignores them", () => {
    const lines = buildCsv([], PREAMBLE).split("\r\n");
    expect(lines[0].startsWith("##")).toBe(true);
    expect(lines[1].startsWith("##")).toBe(true);
  });

  it("gives every row nine fields, including the comment rows", () => {
    const csv = buildCsv([row(), row()], PREAMBLE);
    for (const line of csv.split("\r\n").filter(Boolean)) {
      // No field in this fixture needs quoting, so a naive split is safe here.
      expect(line.split(",")).toHaveLength(COLUMN_COUNT);
    }
  });

  it("writes one data row per post, after the two comment rows", () => {
    expect(dataLines(buildCsv([row(), row(), row()], PREAMBLE))).toHaveLength(3);
  });

  it("separates rows with CRLF and ends with one", () => {
    const csv = buildCsv([row()], PREAMBLE);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect((csv.match(/\r\n/g) ?? []).length).toBe(3); // 2 comment rows + 1 data row
  });

  it("keeps a multi-line caption inside a single quoted field", () => {
    const csv = buildCsv([row({ caption: "Hook line.\n\nSecond line.\n\n#Tag" })], PREAMBLE);
    expect(csv).toContain('"Hook line.\n\nSecond line.\n\n#Tag"');
    // Embedded newlines must not create extra CSV records.
    expect((csv.match(/\r\n/g) ?? []).length).toBe(3);
  });

  it("emits just the two comment rows when there are no posts", () => {
    expect(dataLines(buildCsv([], PREAMBLE))).toHaveLength(0);
  });

  it("prefixes a UTF-8 BOM so Excel on Windows reads it as Unicode", () => {
    const buf = csvWithBom(buildCsv([row()], PREAMBLE));
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("round-trips the em dash in the version cell through the BOM encoding", () => {
    const buf = csvWithBom(buildCsv([row()], PREAMBLE));
    expect(buf.toString("utf8")).toContain("VERSION 9.9 — do not edit");
  });

  it("refuses to exceed Post Planner's 200-row limit", () => {
    const tooMany = Array.from({ length: MAX_DATA_ROWS + 1 }, () => row());
    expect(() => buildCsv(tooMany, PREAMBLE)).toThrow(/exceeds Post Planner's documented limit/);
  });

  it("accepts exactly 200 rows", () => {
    const atLimit = Array.from({ length: MAX_DATA_ROWS }, () => row());
    expect(dataLines(buildCsv(atLimit, PREAMBLE))).toHaveLength(MAX_DATA_ROWS);
  });
});

describe("reading the real template", () => {
  it("parses and validates the shipped spreadsheet", () => {
    const preamble = readTemplatePreamble();
    expect(preamble.row1[0].startsWith("##")).toBe(true);
    expect(preamble.version).toMatch(/^BULK UPLOAD VERSION /);
    expect(preamble.row1).toHaveLength(COLUMN_COUNT);
    expect(preamble.row2).toHaveLength(COLUMN_COUNT);
  });

  it("reads the real header row positionally", () => {
    expect(readTemplatePreamble().row2).toEqual([
      "## POSTING TIME",
      "CAPTION",
      "LINK",
      "MEDIA",
      "TITLE",
      "FIRST COMMENT",
      "FIRST COMMENT DELAY",
      "TOBI BACKGROUND",
      "REEL OR STORY",
    ]);
  });

  it("carries the version string through rather than hardcoding it", () => {
    // A version bump on their side should flow through, not break the build.
    expect(readTemplatePreamble().row1[1]).toBe(readTemplatePreamble().version);
  });

  it("fails loudly when the template is missing", () => {
    expect(() => readTemplatePreamble("reference/does-not-exist.xlsx")).toThrow(TemplateShapeError);
    expect(() => readTemplatePreamble("reference/does-not-exist.xlsx")).toThrow(/Post Planner may have changed/);
  });

  it("names the file it reads so a failure is traceable", () => {
    expect(TEMPLATE_PATH).toContain("sample_bulk_posts_import.xlsx");
  });
});
