/**
 * Single source of truth for post shapes.
 *
 * `PostDocSchema` describes one fully renderable card. It is the contract
 * between the day file you hand-write in `input/` and the Satori templates that
 * draw it, so a post that validates here is guaranteed to have every field the
 * renderer reaches for.
 *
 * Field length caps are not arbitrary: each one is the longest string its tier
 * ladder in `design/fit.ts` can typeset without clipping at 1080x1350.
 */
import { z } from "zod";
import { PALETTE_NAMES } from "./design/palettes";

export const TEMPLATE_NAMES = [
  "headline",
  "stats",
  "line_chart",
  "bar_compare",
  "versus",
  "steps",
  "breaking",
] as const;

export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export const TEMPLATE_LABELS: Record<TemplateName, string> = {
  headline: "Headline",
  stats: "Stats",
  line_chart: "Line chart",
  bar_compare: "Bar compare",
  versus: "Versus",
  steps: "Steps",
  breaking: "Breaking",
};

export const STEP_ICONS = [
  "ship",
  "gate",
  "store",
  "person",
  "bank",
  "chart",
  "shield",
  "globe",
] as const;
export type StepIcon = (typeof STEP_ICONS)[number];

export const DIRECTIONS = ["up", "down", "flat"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/**
 * Whether a rise is good news for the reader. Decides a stat delta's COLOUR
 * only — the arrow always shows the real direction. `lower_is_good` is for
 * inflation, prices, rent, fees: anything where falling helps the wallet.
 * Always explicit; never inferred from the label.
 */
export const POLARITIES = ["higher_is_good", "lower_is_good"] as const;
export type Polarity = (typeof POLARITIES)[number];

export const BADGES = ["CONFIRMED", "DEVELOPING", "UNCONFIRMED"] as const;
export type Badge = (typeof BADGES)[number];

// ---------------------------------------------------------------------------
// Per-template data
// ---------------------------------------------------------------------------

const Trimmed = z.string().trim();

export const HeadlineDataSchema = z.object({
  dek: Trimmed.max(220).optional(),
});

export const StatTileSchema = z.object({
  label: Trimmed.min(1).max(28),
  value: Trimmed.min(1).max(12),
  delta: Trimmed.max(12).optional(),
  direction: z.enum(DIRECTIONS).optional(),
  /** Default "higher_is_good". See POLARITIES. */
  polarity: z.enum(POLARITIES).optional(),
});

export const StatsDataSchema = z.object({
  stats: z.array(StatTileSchema).length(3),
  footnote: Trimmed.max(120).optional(),
});

export const LineChartDataSchema = z.object({
  x_labels: z.array(Trimmed.min(1).max(10)).min(3).max(12),
  y_values: z.array(z.number().finite()).min(3).max(12),
  value_prefix: Trimmed.max(3).optional(),
  value_suffix: Trimmed.max(4).optional(),
  series_label: Trimmed.max(40).optional(),
});

export const BarRowSchema = z.object({
  label: Trimmed.min(1).max(26),
  value: z.number().finite().nonnegative(),
  display: Trimmed.max(12).optional(),
});

export const BarCompareDataSchema = z.object({
  bars: z.array(BarRowSchema).min(2).max(6),
  /** Axis caption, e.g. "Median asking rent, one bedroom, USD per month". */
  unit: Trimmed.max(64).optional(),
});

export const VersusSideSchema = z.object({
  label: Trimmed.min(1).max(30),
  amount: Trimmed.min(1).max(14),
  sub: Trimmed.max(48).optional(),
});

export const VersusDataSchema = z.object({
  option_a: VersusSideSchema,
  option_b: VersusSideSchema,
  pill: Trimmed.max(32).optional(),
});

export const StepSchema = z.object({
  icon: z.enum(STEP_ICONS),
  label: Trimmed.min(1).max(34),
  detail: Trimmed.max(90).optional(),
});

export const StepsDataSchema = z.object({
  steps: z.array(StepSchema).min(3).max(5),
});

export const ImpactSchema = z.object({
  sector: Trimmed.min(1).max(30),
  change: Trimmed.min(1).max(16),
  direction: z.enum(DIRECTIONS),
});

export const BreakingDataSchema = z.object({
  badge: z.enum(BADGES),
  impacts: z.array(ImpactSchema).min(2).max(3),
  /** Defaults to "What it means for your money" when omitted. */
  impacts_label: Trimmed.max(56).optional(),
});

// ---------------------------------------------------------------------------
// The renderable document
// ---------------------------------------------------------------------------

/** Frame fields every template shares. */
const DocBase = {
  palette: z.enum(PALETTE_NAMES),
  /** Top-bar category, e.g. MARKETS / CRYPTO / RATES / WORLD. */
  tag: Trimmed.min(1).max(18),
  /** Issue number in the "NO. ###" header. */
  post_number: z.number().int().positive().max(99_999),
  headline: Trimmed.min(1).max(180),
  /** One word inside `headline` rendered italic in the accent colour. */
  accent_word: Trimmed.max(40).optional(),
  kicker: Trimmed.max(48).optional(),
  source_line: Trimmed.max(90).optional(),
};

export const PostDocSchema = z.discriminatedUnion("template", [
  z.object({ ...DocBase, template: z.literal("headline"), data: HeadlineDataSchema }),
  z.object({ ...DocBase, template: z.literal("stats"), data: StatsDataSchema }),
  z.object({ ...DocBase, template: z.literal("line_chart"), data: LineChartDataSchema }),
  z.object({ ...DocBase, template: z.literal("bar_compare"), data: BarCompareDataSchema }),
  z.object({ ...DocBase, template: z.literal("versus"), data: VersusDataSchema }),
  z.object({ ...DocBase, template: z.literal("steps"), data: StepsDataSchema }),
  z.object({ ...DocBase, template: z.literal("breaking"), data: BreakingDataSchema }),
]);

export type PostDoc = z.infer<typeof PostDocSchema>;

// ---------------------------------------------------------------------------
// Placeholder detection
// ---------------------------------------------------------------------------

/**
 * The caption spec in prompts/caption.md says to write `[NUMBER]`-style
 * placeholders rather than invent a figure. The day builder scans every field
 * for them so a post can never be exported with a hole still in it.
 */
export const PLACEHOLDER_PATTERN = /\[[A-Z][A-Z0-9 _/-]{1,24}\]/g;

export function findPlaceholders(doc: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      for (const m of v.matchAll(PLACEHOLDER_PATTERN)) found.add(m[0]);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(doc);
  return [...found].sort();
}
