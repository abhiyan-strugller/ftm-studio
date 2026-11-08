/**
 * Single source of truth for post shapes.
 *
 * The zod schemas here validate three different things, deliberately with the
 * same definitions so they can never drift:
 *   1. what the Anthropic model returns for a draft (`DraftOutputSchema`)
 *   2. what the planner saves when you hand-edit template fields
 *   3. what `/api/render` accepts in its base64url `data` parameter
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
// What the caption model returns
// ---------------------------------------------------------------------------

/**
 * The model does not know the issue number, so `post_number` is absent here and
 * filled in from the database row before rendering.
 */
const DraftBase = {
  palette: z.enum(PALETTE_NAMES),
  tag: Trimmed.min(1).max(18),
  headline: Trimmed.min(1).max(180),
  accent_word: Trimmed.max(40).optional(),
  kicker: Trimmed.max(48).optional(),
  source_line: Trimmed.max(90).optional(),
  caption: Trimmed.min(1).max(1400),
  hashtags: z.array(Trimmed.min(2).max(32)).min(2).max(4),
};

export const DraftOutputSchema = z.discriminatedUnion("template", [
  z.object({ ...DraftBase, template: z.literal("headline"), data: HeadlineDataSchema }),
  z.object({ ...DraftBase, template: z.literal("stats"), data: StatsDataSchema }),
  z.object({ ...DraftBase, template: z.literal("line_chart"), data: LineChartDataSchema }),
  z.object({ ...DraftBase, template: z.literal("bar_compare"), data: BarCompareDataSchema }),
  z.object({ ...DraftBase, template: z.literal("versus"), data: VersusDataSchema }),
  z.object({ ...DraftBase, template: z.literal("steps"), data: StepsDataSchema }),
  z.object({ ...DraftBase, template: z.literal("breaking"), data: BreakingDataSchema }),
]);

export type DraftOutput = z.infer<typeof DraftOutputSchema>;

/** Cross-field checks the schema itself cannot express. */
export function validateDraftShape(draft: DraftOutput): string[] {
  const problems: string[] = [];
  if (draft.template === "line_chart") {
    if (draft.data.x_labels.length !== draft.data.y_values.length) {
      problems.push(
        `line_chart: ${draft.data.x_labels.length} x labels but ${draft.data.y_values.length} y values`,
      );
    }
  }
  if (draft.accent_word && !draft.headline.toLowerCase().includes(draft.accent_word.toLowerCase())) {
    // Not fatal — the renderer just skips the italic treatment.
    problems.push(`accent_word "${draft.accent_word}" does not appear in the headline`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Placeholder detection
// ---------------------------------------------------------------------------

/**
 * The caption prompt tells the model to emit `[NUMBER]`-style placeholders rather
 * than invent a figure. Anything matching gets surfaced in Telegram and in the
 * planner so a post can never go out with a hole in it.
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

// ---------------------------------------------------------------------------
// base64url transport for /api/render
// ---------------------------------------------------------------------------

export function encodeDocParam(doc: PostDoc): string {
  const json = JSON.stringify(doc);
  const b64 = Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDocParam(param: string): PostDoc {
  const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return PostDocSchema.parse(JSON.parse(json));
}
