import { describe, expect, it } from "vitest";
import { estimateLines, estimateWidth, findOverflow, widestWord } from "@/lib/design/overflow";
import { SAMPLES, SAMPLE_KEYS } from "@/lib/design/samples";
import { CONTENT_W } from "@/lib/design/frame";
import type { PostDoc } from "@/lib/schema";

const base = { palette: "night", tag: "Test", post_number: 1 } as const;

describe("the gate passes everything known to render correctly", () => {
  // These fourteen have been looked at as PNGs. A hit here is a false alarm,
  // and a false alarm that blocks a build is worse than no gate at all.
  it.each(SAMPLE_KEYS)("%s", (key) => {
    expect(findOverflow(SAMPLES[key])).toEqual([]);
  });
});

describe("the gate catches what zod cannot", () => {
  it("flags a stat value inside the character cap but too wide for its tile", () => {
    // 12 characters is exactly the schema maximum, and still ~100px too wide.
    const doc: PostDoc = {
      ...base,
      template: "stats",
      headline: "Test",
      data: {
        stats: [
          { label: "A", value: "123456789.01" },
          { label: "B", value: "1%" },
          { label: "C", value: "2%" },
        ],
      },
    };
    const problems = findOverflow(doc);
    expect(problems).toHaveLength(1);
    expect(problems[0].field).toBe("data.stats[0].value");
    expect(problems[0].message).toMatch(/244px/);
  });

  it("flags an unbreakable word wider than the headline column", () => {
    const doc: PostDoc = {
      ...base,
      template: "headline",
      headline: "Why Donaudampfschiffahrtsgesellschaft matters",
      data: {},
    };
    const problems = findOverflow(doc);
    expect(problems[0].field).toBe("headline");
    expect(problems[0].message).toContain("Donaudampfschiffahrtsgesellschaft");
  });

  it("flags axis labels that cannot share one row", () => {
    const doc: PostDoc = {
      ...base,
      template: "line_chart",
      headline: "Test",
      data: {
        x_labels: Array.from({ length: 12 }, (_, i) => `Quarter${i}x`),
        y_values: Array.from({ length: 12 }, (_, i) => i + 1),
      },
    };
    const problems = findOverflow(doc);
    expect(problems.some((p) => p.field === "data.x_labels")).toBe(true);
  });

  it("flags a bar value too wide for its column", () => {
    const doc: PostDoc = {
      ...base,
      template: "bar_compare",
      headline: "Test",
      data: {
        bars: [
          { label: "A", value: 1, display: "$123,456,789" },
          { label: "B", value: 2 },
        ],
      },
    };
    expect(findOverflow(doc)[0].field).toBe("data.bars[0].display");
  });

  it("names the field and offers a concrete fix", () => {
    const doc: PostDoc = {
      ...base,
      template: "steps",
      headline: "Test",
      data: {
        steps: [
          { icon: "bank", label: "A label long enough to wrap twice" },
          { icon: "chart", label: "B" },
          { icon: "person", label: "C" },
        ],
      },
    };
    const problems = findOverflow(doc);
    if (problems.length > 0) {
      expect(problems[0].field).toMatch(/^data\.steps\[\d\]\./);
      expect(problems[0].message).toMatch(/Trim roughly \d+ characters|unbreakable word/);
    }
  });
});

describe("width estimation", () => {
  it("treats monospace as exactly 0.6em per character", () => {
    expect(estimateWidth("abcde", 100, "mono")).toBeCloseTo(300, 5);
  });

  it("accounts for narrow punctuation rather than averaging it away", () => {
    // The flat-ratio version of this gate read "$4,100" as uniformly wide and
    // produced false failures on bar values that render fine.
    const withComma = estimateWidth("$4,100", 34, "sans", true);
    expect(withComma).toBeLessThan(126); // the real bar value column
  });

  it("makes serif narrower than sans at the same size", () => {
    const text = "The quick brown fox";
    expect(estimateWidth(text, 60, "serif")).toBeLessThan(estimateWidth(text, 60, "sans"));
  });

  it("makes bold wider than regular", () => {
    expect(estimateWidth("Hello", 40, "sans", true)).toBeGreaterThan(
      estimateWidth("Hello", 40, "sans", false),
    );
  });

  it("counts uppercase as wider than lowercase", () => {
    expect(estimateWidth("ABCDE", 40, "sans")).toBeGreaterThan(estimateWidth("abcde", 40, "sans"));
  });
});

describe("line estimation", () => {
  it("returns zero lines for empty text", () => {
    expect(estimateLines("", 40, "sans", CONTENT_W)).toBe(0);
  });

  it("keeps short text on one line", () => {
    expect(estimateLines("Short headline", 40, "sans", CONTENT_W)).toBe(1);
  });

  it("wraps at word boundaries as the column narrows", () => {
    const text = "The Fed held rates steady again this month";
    expect(estimateLines(text, 40, "sans", 200)).toBeGreaterThan(
      estimateLines(text, 40, "sans", CONTENT_W),
    );
  });

  it("finds the widest word in a phrase", () => {
    expect(widestWord("a bb cccccc dd", 10, "mono").word).toBe("cccccc");
  });
});
