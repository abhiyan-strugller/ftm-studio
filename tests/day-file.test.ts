import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DayFileError, issueNumberFor, parseDayFile, toPostDoc } from "@/lib/day";
import { PostDocSchema, findPlaceholders } from "@/lib/schema";
import { findOverflow } from "@/lib/design/overflow";

const EXAMPLE = JSON.parse(
  readFileSync(path.join(process.cwd(), "input", "example.json"), "utf8"),
);

/** A minimal valid post, cloned and broken per test. */
function post(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "01",
    template: "headline",
    palette: "night",
    tag: "Rates",
    headline: "A headline",
    caption: "A caption",
    scheduled_at: "2026-11-09T12:00:00.000Z",
    data: {},
    ...overrides,
  };
}

function day(posts: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return { date: "2026-11-09", start_number: 101, posts, ...extra };
}

/** Collect the problem strings from a parse that is expected to fail. */
function problems(input: unknown): string[] {
  try {
    parseDayFile(input);
  } catch (err) {
    if (err instanceof DayFileError) return err.problems;
    throw err;
  }
  throw new Error("expected parseDayFile to throw");
}

describe("the shipped example day", () => {
  it("parses", () => {
    expect(() => parseDayFile(EXAMPLE)).not.toThrow();
  });

  it("covers all seven templates", () => {
    const parsed = parseDayFile(EXAMPLE);
    expect(new Set(parsed.posts.map((p) => p.template)).size).toBe(7);
  });

  it("projects every post onto a valid renderable document", () => {
    const parsed = parseDayFile(EXAMPLE);
    parsed.posts.forEach((_, i) => {
      expect(PostDocSchema.safeParse(toPostDoc(parsed, i)).success).toBe(true);
    });
  });

  it("renders without clipping", () => {
    const parsed = parseDayFile(EXAMPLE);
    parsed.posts.forEach((p, i) => {
      expect(findOverflow(toPostDoc(parsed, i)), `post ${p.id}`).toEqual([]);
    });
  });

  it("has no unfilled placeholders", () => {
    expect(findPlaceholders(EXAMPLE)).toEqual([]);
  });
});

describe("errors name the post by id", () => {
  it("prefixes every problem with the post id", () => {
    const found = problems(day([post({ id: "07", palette: "chartreuse" })]));
    expect(found[0]).toMatch(/^posts\[07\]\.palette:/);
  });

  it("reaches into nested template data", () => {
    const found = problems(
      day([
        post({
          id: "04",
          template: "stats",
          data: { stats: [{ label: "A", value: "" }, { label: "B", value: "2" }, { label: "C", value: "3" }] },
        }),
      ]),
    );
    expect(found.some((p) => p.startsWith("posts[04].data.stats[0].value:"))).toBe(true);
  });

  it("falls back to an index when the post has no usable id", () => {
    const broken = post();
    delete broken.id;
    expect(problems(day([broken]))[0]).toMatch(/^posts\[#0\]\./);
  });

  it("reports every bad post, not just the first", () => {
    const found = problems(
      day([
        post({ id: "01", palette: "nope" }),
        post({ id: "02", tag: "" }),
        post({ id: "03", scheduled_at: "soon" }),
      ]),
    );
    expect(found.map((p) => p.slice(0, 10))).toEqual(
      expect.arrayContaining(["posts[01].", "posts[02].", "posts[03]."]),
    );
  });

  it("rejects duplicate ids", () => {
    const found = problems(day([post({ id: "01" }), post({ id: "01" })]));
    expect(found).toContain("posts[01].id: duplicate id");
  });

  it("rejects an id that would not be filename-safe", () => {
    expect(problems(day([post({ id: "a/b" })]))[0]).toMatch(/^posts\[a\/b\]\.id:/);
  });

  it("rejects a malformed date", () => {
    expect(problems(day([post()], { date: "9 Nov 2026" }))).toContain(
      'date: expected YYYY-MM-DD, got "9 Nov 2026"',
    );
  });

  it("rejects a non-ISO scheduled_at", () => {
    expect(problems(day([post({ scheduled_at: "2026-11-09 07:00" })]))[0]).toMatch(
      /^posts\[01\]\.scheduled_at:/,
    );
  });

  it("rejects an unknown template outright", () => {
    expect(problems(day([post({ template: "carousel" })])).length).toBeGreaterThan(0);
  });
});

describe("issue numbering", () => {
  it("counts up from start_number", () => {
    const parsed = parseDayFile(day([post({ id: "01" }), post({ id: "02" }), post({ id: "03" })]));
    expect([0, 1, 2].map((i) => issueNumberFor(parsed, i))).toEqual([101, 102, 103]);
  });

  it("defaults start_number to 1 when absent", () => {
    const d = day([post()]);
    delete (d as Record<string, unknown>).start_number;
    expect(issueNumberFor(parseDayFile(d), 0)).toBe(1);
  });

  it("honours a per-post override without disturbing its neighbours", () => {
    const parsed = parseDayFile(
      day([post({ id: "01" }), post({ id: "02", post_number: 999 }), post({ id: "03" })]),
    );
    expect([0, 1, 2].map((i) => issueNumberFor(parsed, i))).toEqual([101, 999, 103]);
  });

  it("puts the issue number on the rendered document", () => {
    const parsed = parseDayFile(day([post(), post({ id: "02" })]));
    expect(toPostDoc(parsed, 1).post_number).toBe(102);
  });
});

describe("toPostDoc", () => {
  it("maps `source` onto the card's source line", () => {
    const parsed = parseDayFile(day([post({ source: "Source: BLS" })]));
    expect(toPostDoc(parsed, 0).source_line).toBe("Source: BLS");
  });

  it("does not leak caption or scheduling onto the card", () => {
    const parsed = parseDayFile(day([post()]));
    const doc = toPostDoc(parsed, 0) as Record<string, unknown>;
    expect(doc.caption).toBeUndefined();
    expect(doc.scheduled_at).toBeUndefined();
  });
});
