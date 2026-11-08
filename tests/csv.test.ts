import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildCsv,
  csvWithBom,
  escapeCsvValue,
  formatCsvDate,
  formatCsvTime,
  loadColumnMap,
  DEFAULT_COLUMN_MAP,
  type ColumnMap,
  type CsvRow,
} from "@/lib/csv";

/** A stubbed mapping, so these tests do not depend on the real config file. */
const STUB: ColumnMap = {
  keys: ["date", "time", "text", "mediaUrl"],
  headings: { date: "When", time: "At", text: "Caption", mediaUrl: "Media" },
};

const rows: CsvRow[] = [
  {
    text: "Rates held steady.",
    mediaUrl: "01-headline.png",
    at: new Date("2026-11-09T12:00:00.000Z"), // 07:00 EST
  },
];

async function writeConfig(contents: unknown): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ftm-csv-"));
  const file = path.join(dir, "columns.json");
  await writeFile(file, typeof contents === "string" ? contents : JSON.stringify(contents), "utf8");
  return file;
}

describe("column mapping", () => {
  it("uses the headings from the config file", async () => {
    const file = await writeConfig({
      text: "Content",
      mediaUrl: "Image URL",
      date: "Date",
      time: "Time",
    });
    const map = await loadColumnMap(file);
    expect(map.headings.text).toBe("Content");
    expect(buildCsv([], map).split("\r\n")[0]).toBe("Content,Image URL,Date,Time");
  });

  it("takes column ORDER from the key order in the file", async () => {
    const file = await writeConfig({
      date: "Date",
      time: "Time",
      text: "Content",
      mediaUrl: "Image URL",
    });
    const map = await loadColumnMap(file);
    expect(map.keys).toEqual(["date", "time", "text", "mediaUrl"]);
    expect(buildCsv([], map).split("\r\n")[0]).toBe("Date,Time,Content,Image URL");
  });

  it("ignores underscore-prefixed documentation keys", async () => {
    const file = await writeConfig({
      _comment: "notes for humans",
      text: "A",
      mediaUrl: "B",
      date: "C",
      time: "D",
    });
    expect((await loadColumnMap(file)).keys).toHaveLength(4);
  });

  it("rejects an unknown field, naming it", async () => {
    const file = await writeConfig({ text: "A", mediaUrl: "B", date: "C", time: "D", colour: "E" });
    await expect(loadColumnMap(file)).rejects.toThrow(/unknown field "colour"/);
  });

  it("rejects a missing field, naming it", async () => {
    const file = await writeConfig({ text: "A", mediaUrl: "B", date: "C" });
    await expect(loadColumnMap(file)).rejects.toThrow(/missing: time/);
  });

  it("rejects an empty heading", async () => {
    const file = await writeConfig({ text: "", mediaUrl: "B", date: "C", time: "D" });
    await expect(loadColumnMap(file)).rejects.toThrow(/non-empty column heading/);
  });

  it("rejects malformed JSON with the path in the message", async () => {
    const file = await writeConfig("{ not json");
    await expect(loadColumnMap(file)).rejects.toThrow(/Could not read/);
  });

  it("rejects a JSON array", async () => {
    const file = await writeConfig(["text"]);
    await expect(loadColumnMap(file)).rejects.toThrow(/must contain a JSON object/);
  });

  it("matches the committed default", async () => {
    const map = await loadColumnMap(path.join("config", "postplanner-columns.json"));
    expect(map).toEqual(DEFAULT_COLUMN_MAP);
  });
});

describe("date and time columns", () => {
  it("formats US-style in Eastern time", () => {
    const at = new Date("2026-11-09T12:00:00.000Z");
    expect(formatCsvDate(at)).toBe("11/9/2026");
    expect(formatCsvTime(at)).toBe("7:00 AM");
  });

  it("uses the Eastern calendar day, not the UTC one", () => {
    // 02:00 UTC on the 10th is still 21:00 on the 9th in Eastern time.
    const at = new Date("2026-11-10T02:00:00.000Z");
    expect(formatCsvDate(at)).toBe("11/9/2026");
    expect(formatCsvTime(at)).toBe("9:00 PM");
  });

  it("tracks daylight saving", () => {
    // Same 21:00 ET slot in July is a different UTC instant.
    expect(formatCsvTime(new Date("2026-07-10T01:00:00.000Z"))).toBe("9:00 PM");
    expect(formatCsvDate(new Date("2026-07-10T01:00:00.000Z"))).toBe("7/9/2026");
  });

  it("uses a plain space before AM/PM, not a narrow no-break space", () => {
    const formatted = formatCsvTime(new Date("2026-11-09T12:00:00.000Z"));
    expect(formatted).not.toMatch(/ /);
    expect(formatted.includes(" AM")).toBe(true);
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
  it("writes one row per post in the mapped order", () => {
    const lines = buildCsv(rows, STUB).split("\r\n");
    expect(lines[0]).toBe("When,At,Caption,Media");
    expect(lines[1]).toBe("11/9/2026,7:00 AM,Rates held steady.,01-headline.png");
  });

  it("separates rows with CRLF and ends with one", () => {
    const csv = buildCsv(rows, STUB);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect((csv.match(/\r\n/g) ?? []).length).toBe(2); // header + one row
  });

  it("keeps a multi-line caption inside a single quoted field", () => {
    const csv = buildCsv(
      [{ ...rows[0], text: "Hook line.\n\nSecond line.\n\n#Tag" }],
      STUB,
    );
    expect(csv).toContain('"Hook line.\n\nSecond line.\n\n#Tag"');
    // The embedded newlines must not create extra CSV records.
    expect((csv.match(/\r\n/g) ?? []).length).toBe(2);
  });

  it("emits only a header when there are no posts", () => {
    expect(buildCsv([], STUB)).toBe("When,At,Caption,Media\r\n");
  });

  it("prefixes a UTF-8 BOM so Excel on Windows reads it as Unicode", () => {
    const buf = csvWithBom(buildCsv(rows, STUB));
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("round-trips a non-ASCII caption through the BOM encoding", () => {
    const buf = csvWithBom(buildCsv([{ ...rows[0], text: "Educational only — not advice" }], STUB));
    expect(buf.toString("utf8")).toContain("—");
  });
});
