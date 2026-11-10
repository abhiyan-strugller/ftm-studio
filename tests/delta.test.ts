import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { deltaArrow, deltaStyle, deltaTone } from "@/lib/design/delta";
import { StatsTemplate } from "@/lib/design/templates/stats";
import { BreakingTemplate } from "@/lib/design/templates/breaking";
import { PALETTES } from "@/lib/design/palettes";
import {
  DIRECTIONS,
  ImpactSchema,
  POLARITIES,
  StatTileSchema,
  type Direction,
  type Polarity,
} from "@/lib/schema";

const palette = Object.values(PALETTES)[0];
const POSITIVE = palette.up;
const NEGATIVE = palette.down;

/** Every rendered arrow component (it carries `direction` and `color` props), in tree order. */
function arrowsIn(node: ReactNode): Array<{ direction: Direction; color: string }> {
  const found: Array<{ direction: Direction; color: string }> = [];
  const walk = (n: ReactNode): void => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<Record<string, unknown>>;
    if (typeof el.type === "function" && "direction" in el.props && "color" in el.props) {
      found.push({ direction: el.props.direction as Direction, color: el.props.color as string });
    }
    walk(el.props.children as ReactNode);
  };
  walk(node);
  return found;
}

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

describe("breaking-card impacts follow the same rule", () => {
  function render(polarity?: Polarity) {
    const doc = {
      template: "breaking",
      headline: "Energy prices jump",
      data: {
        badge: "DEVELOPING",
        impacts: [
          { sector: "Natural gas futures", change: "+3.4%", direction: "up", polarity },
          { sector: "Retail stocks", change: "-1.2%", direction: "down", polarity },
          { sector: "Power bills", change: "watch", direction: "flat", polarity },
        ],
      },
    } as unknown as Parameters<typeof BreakingTemplate>[0]["doc"];
    return arrowsIn(BreakingTemplate({ doc, palette }));
  }

  it("higher_is_good (and the default): a rise is positive, a fall negative", () => {
    for (const p of [undefined, "higher_is_good"] as const) {
      expect(render(p).map((a) => a.color)).toEqual([POSITIVE, NEGATIVE, palette.muted]);
    }
  });

  it("lower_is_good: a rise is negative, a fall positive", () => {
    expect(render("lower_is_good").map((a) => a.color)).toEqual([NEGATIVE, POSITIVE, palette.muted]);
  });

  it("the arrow never changes with polarity", () => {
    for (const p of [undefined, ...POLARITIES] as Array<Polarity | undefined>) {
      expect(render(p).map((a) => a.direction)).toEqual(["up", "down", "flat"]);
    }
  });

  it("the accent border on each impact row flips with the arrow colour", () => {
    // The row's left border uses the same colour; collect it from the tree.
    const borders = (polarity: Polarity): string[] => {
      const doc = {
        template: "breaking",
        headline: "x",
        data: {
          badge: "CONFIRMED",
          impacts: [
            { sector: "Gas", change: "+3%", direction: "up", polarity },
            { sector: "Rent", change: "-1%", direction: "down", polarity },
          ],
        },
      } as unknown as Parameters<typeof BreakingTemplate>[0]["doc"];
      const out: string[] = [];
      const walk = (n: ReactNode): void => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (!isValidElement(n)) return;
        const props = (n as ReactElement<Record<string, unknown>>).props;
        const style = props.style as Record<string, unknown> | undefined;
        if (style && typeof style.borderLeftColor === "string") out.push(style.borderLeftColor);
        walk(props.children as ReactNode);
      };
      walk(BreakingTemplate({ doc, palette }));
      return out;
    };
    expect(borders("higher_is_good")).toEqual([POSITIVE, NEGATIVE]);
    expect(borders("lower_is_good")).toEqual([NEGATIVE, POSITIVE]);
  });

  describe("polarity in the impact schema", () => {
    const base = { sector: "Gas", change: "+3.4%", direction: "up" };

    it("is optional", () => {
      expect(ImpactSchema.parse(base).polarity).toBeUndefined();
    });

    it.each(POLARITIES)("accepts %s", (polarity) => {
      expect(ImpactSchema.parse({ ...base, polarity }).polarity).toBe(polarity);
    });

    it.each(["lowerIsGood", "lower-is-good", "LOWER_IS_GOOD", "inverse", true])("rejects %j", (polarity) => {
      expect(() => ImpactSchema.parse({ ...base, polarity })).toThrow();
    });
  });
});
