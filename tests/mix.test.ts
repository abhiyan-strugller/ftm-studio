import { describe, expect, it } from "vitest";
import {
  maxSameTemplatePerDay,
  mixWarnings,
  templateCounts,
  warnedIds,
  type MixItem,
} from "@/lib/mix";
import { planDay } from "@/lib/plan-day";
import { DAILY_SLOTS } from "@/lib/slots";
import { TEMPLATE_NAMES } from "@/lib/schema";

function item(id: string, at: number, template: MixItem["template"], palette: MixItem["palette"]): MixItem {
  return { id, at, template, palette };
}

describe("the repeat threshold scales with day length", () => {
  it("keeps the original strictness on a short day", () => {
    expect(maxSameTemplatePerDay(4)).toBe(2);
    expect(maxSameTemplatePerDay(7)).toBe(2);
  });

  it("allows what the arithmetic forces on a 15-post day", () => {
    // 15 posts over 7 templates means something must appear 3 times.
    expect(maxSameTemplatePerDay(15)).toBe(3);
    expect(maxSameTemplatePerDay(15)).toBe(Math.ceil(15 / TEMPLATE_NAMES.length));
  });
});

describe("mix warnings", () => {
  it("flags back-to-back template repeats", () => {
    const warnings = mixWarnings([
      item("01", 1, "headline", "night"),
      item("02", 2, "headline", "cream"),
    ]);
    expect(warnings.map((w) => w.kind)).toContain("template_repeat");
    expect(warnedIds(warnings)).toEqual(new Set(["01", "02"]));
  });

  it("flags back-to-back palette repeats", () => {
    const warnings = mixWarnings([
      item("01", 1, "headline", "night"),
      item("02", 2, "stats", "night"),
    ]);
    expect(warnings.map((w) => w.kind)).toContain("palette_repeat");
  });

  it("says nothing when neighbours differ", () => {
    expect(
      mixWarnings([
        item("01", 1, "headline", "night"),
        item("02", 2, "stats", "cream"),
        item("03", 3, "versus", "forest"),
      ]),
    ).toEqual([]);
  });

  it("catches a repeat across the previous day's last post", () => {
    const warnings = mixWarnings(
      [item("01", 10, "headline", "night")],
      item("prev", 1, "headline", "cream"),
    );
    expect(warnings.map((w) => w.kind)).toContain("template_repeat");
    expect(warnings[0].ids).toContain("prev");
  });

  it("sorts by scheduled time, not array order", () => {
    // Same two posts, supplied out of order: still adjacent once sorted.
    const warnings = mixWarnings([
      item("02", 200, "stats", "cream"),
      item("01", 100, "stats", "night"),
    ]);
    expect(warnings.map((w) => w.kind)).toContain("template_repeat");
  });

  it("flags one template dominating, using the scaled cap", () => {
    // Four of seven posts are `stats`; the cap for a 7-post day is 2.
    const items = [
      item("01", 1, "stats", "night"),
      item("02", 2, "headline", "cream"),
      item("03", 3, "stats", "forest"),
      item("04", 4, "versus", "ice"),
      item("05", 5, "stats", "sand"),
      item("06", 6, "steps", "midnight"),
      item("07", 7, "stats", "night"),
    ];
    const overused = mixWarnings(items).filter((w) => w.kind === "template_overused");
    expect(overused).toHaveLength(1);
    expect(overused[0].message).toMatch(/Stats appears 4×/);
  });

  it("ignores items with no template or palette yet", () => {
    const warnings = mixWarnings([
      item("01", 1, null, null),
      item("02", 2, null, null),
    ]);
    expect(warnings).toEqual([]);
  });
});

describe("templateCounts", () => {
  it("counts and orders by frequency", () => {
    const counts = templateCounts([
      item("01", 1, "stats", "night"),
      item("02", 2, "stats", "cream"),
      item("03", 3, "headline", "forest"),
    ]);
    expect(counts[0]).toEqual({ template: "stats", count: 2 });
    expect(counts[1]).toEqual({ template: "headline", count: 1 });
  });
});

describe("planDay produces a day that passes its own mix rules", () => {
  const dates = ["2026-11-09", "2026-01-01", "2026-07-04", "2026-03-08"];

  it.each(dates)("never repeats a template or palette back to back on %s", (date) => {
    const planned = planDay(date, DAILY_SLOTS);
    expect(planned).toHaveLength(15);
    for (let i = 1; i < planned.length; i++) {
      expect(planned[i].template).not.toBe(planned[i - 1].template);
      expect(planned[i].palette).not.toBe(planned[i - 1].palette);
    }
  });

  it.each(dates)("stays within the scaled template cap on %s", (date) => {
    const planned = planDay(date, DAILY_SLOTS);
    const cap = maxSameTemplatePerDay(planned.length);
    const counts = new Map<string, number>();
    for (const p of planned) counts.set(p.template, (counts.get(p.template) ?? 0) + 1);
    for (const [template, count] of counts) {
      expect(count, `${template} on ${date}`).toBeLessThanOrEqual(cap);
    }
  });

  it("is deterministic for a given date", () => {
    expect(planDay("2026-11-09", DAILY_SLOTS)).toEqual(planDay("2026-11-09", DAILY_SLOTS));
  });

  it("gives different dates different shapes", () => {
    const a = planDay("2026-11-09", DAILY_SLOTS).map((p) => p.template).join();
    const b = planDay("2026-11-10", DAILY_SLOTS).map((p) => p.template).join();
    expect(a).not.toBe(b);
  });

  it("produces zero-padded, slot-aligned ids", () => {
    const planned = planDay("2026-11-09", DAILY_SLOTS);
    expect(planned[0].id).toBe("01");
    expect(planned[14].id).toBe("15");
    expect(planned.map((p) => p.slot)).toEqual([...DAILY_SLOTS]);
  });
});
