import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { deltaArrow, deltaStyle, deltaTone } from "@/lib/design/delta";
import { StatsTemplate } from "@/lib/design/templates/stats";
import { PALETTES } from "@/lib/design/palettes";
import { DIRECTIONS, POLARITIES, StatTileSchema, type Direction, type Polarity } from "@/lib/schema";

const palette = Object.values(PALETTES)[0];
const POSITIVE = palette.up;
const NEGATIVE = palette.down;

describe("delta colour follows meaning, not direction", () => {
  describe("higher_is_good (the default)", () => {
    it("colours a rise positive", () => {
      expect(deltaStyle({ direction: "up" }, palette).color).toBe(POSITIVE);
      expect(deltaStyle({ direction: "up", polarity: "higher_is_good" }, palette).color).toBe(POSITIVE);
    });

    it("colours a fall negative", () => {
      expect(deltaStyle({ direction: "down" }, palette).color).toBe(NEGATIVE);
      expect(deltaStyle({ direction: "down", polarity: "higher_is_good" }, palette).color).toBe(NEGATIVE);
    });
  });

  describe("lower_is_good (inflation, prices, rent, fees)", () => {
    it("colours a rise negative — groceries +0.2pt is bad news", () => {
      expect(deltaStyle({ direction: "up", polarity: "lower_is_good" }, palette).color).toBe(NEGATIVE);
      expect(deltaTone("up", "lower_is_good")).toBe("negative");
    });

    it("colours a fall positive — headline CPI -0.1pt is good news", () => {
      expect(deltaStyle({ direction: "down", polarity: "lower_is_good" }, palette).color).toBe(POSITIVE);
      expect(deltaTone("down", "lower_is_good")).toBe("positive");
    });
  });

  it("leaves flat and missing directions neutral under either polarity", () => {
    for (const polarity of POLARITIES) {
      expect(deltaStyle({ direction: "flat", polarity }, palette).color).toBe(palette.muted);
      expect(deltaStyle({ polarity }, palette).color).toBe(palette.muted);
    }
  });

  it("flips the colour in every palette, not just one", () => {
    for (const p of Object.values(PALETTES)) {
      expect(deltaStyle({ direction: "down", polarity: "lower_is_good" }, p).color).toBe(p.up);
      expect(deltaStyle({ direction: "up", polarity: "lower_is_good" }, p).color).toBe(p.down);
    }
  });
});

describe("the arrow never changes with polarity", () => {
  it("deltaStyle's arrow is the real direction for every direction × polarity", () => {
    for (const direction of DIRECTIONS) {
      for (const polarity of [undefined, ...POLARITIES] as Array<Polarity | undefined>) {
        expect(deltaStyle({ direction, polarity }, palette).arrow).toBe(direction);
        expect(deltaArrow(direction, polarity)).toBe(direction);
      }
    }
  });

  /** Collect every rendered delta arrow (svg 16px with a direction prop) in tree order. */
  function arrowsIn(node: ReactNode): Array<{ direction: Direction; color: string }> {
    const found: Array<{ direction: Direction; color: string }> = [];
    const walk = (n: ReactNode): void => {
      if (Array.isArray(n)) return n.forEach(walk);
      if (!isValidElement(n)) return;
      const el = n as ReactElement<Record<string, unknown>>;
      if (typeof el.type === "function" && "direction" in el.props && el.props.size === 16) {
        found.push({ direction: el.props.direction as Direction, color: el.props.color as string });
      }
      walk(el.props.children as ReactNode);
    };
    walk(node);
    return found;
  }

  function render(polarity: Polarity) {
    const doc = {
      template: "stats",
      headline: "Inflation cooled",
      data: {
        stats: [
          { label: "Headline CPI", value: "2.9%", delta: "0.1 pt", direction: "down", polarity },
          { label: "Groceries", value: "1.8%", delta: "0.2 pt", direction: "up", polarity },
          { label: "Rent", value: "4.1%", delta: "0.3 pt", direction: "down", polarity },
        ],
      },
    } as unknown as Parameters<typeof StatsTemplate>[0]["doc"];
    return arrowsIn(StatsTemplate({ doc, palette }));
  }

  it("the stats template draws the same arrows under both polarities; only colour flips", () => {
    const higher = render("higher_is_good");
    const lower = render("lower_is_good");

    expect(higher.map((a) => a.direction)).toEqual(["down", "up", "down"]);
    expect(lower.map((a) => a.direction)).toEqual(["down", "up", "down"]);

    expect(higher.map((a) => a.color)).toEqual([NEGATIVE, POSITIVE, NEGATIVE]);
    expect(lower.map((a) => a.color)).toEqual([POSITIVE, NEGATIVE, POSITIVE]);
  });
});

describe("polarity in the schema", () => {
  const base = { label: "CPI", value: "2.9%", delta: "0.1 pt", direction: "down" };

  it("is optional and defaults to higher_is_good behaviour", () => {
    const parsed = StatTileSchema.parse(base);
    expect(parsed.polarity).toBeUndefined();
    expect(deltaTone(parsed.direction, parsed.polarity)).toBe("negative");
  });

  it.each(POLARITIES)("accepts %s", (polarity) => {
    expect(StatTileSchema.parse({ ...base, polarity }).polarity).toBe(polarity);
  });

  it.each(["lowerIsGood", "lower-is-good", "LOWER_IS_GOOD", "inverse", true])(
    "rejects %j — snake_case values only",
    (polarity) => {
      expect(() => StatTileSchema.parse({ ...base, polarity })).toThrow();
    },
  );
});
