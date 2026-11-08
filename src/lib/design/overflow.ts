/**
 * Pre-render overflow gate.
 *
 * WHAT THIS IS, HONESTLY: Satori exposes no text-measurement hook, so nothing
 * here measures real glyphs. `fit.ts` picks a font size from character count to
 * *prevent* overflow; this module estimates whether that choice actually fits
 * the box it has to live in, using the per-character advance table in
 * `metrics.ts`.
 *
 * Those widths sit slightly above reality, so the gate errs toward a false alarm
 * rather than silently exporting a clipped card. They are calibrated against
 * the fourteen sample posts in `samples.ts`, every one of which has been
 * visually confirmed to render correctly and must therefore pass clean.
 *
 * Two classes of failure this catches that zod cannot:
 *   1. a single unbreakable word wider than its column (no wrap point exists)
 *   2. text that fits its character cap but not its *pixel* box — a 12-char
 *      stat value is inside the schema limit and still too wide for the tile
 */
import {
  BAR_LABEL_TIERS,
  DEK_TIERS,
  fitText,
  HEADLINE_BREAKING_TIERS,
  HEADLINE_COMPACT_TIERS,
  HEADLINE_HERO_TIERS,
  IMPACT_SECTOR_TIERS,
  STAT_VALUE_TIERS,
  STEP_LABEL_TIERS,
  VERSUS_AMOUNT_TIERS,
  splitWords,
} from "./fit";
import { CONTENT_W } from "./frame";
import { advanceEm } from "./metrics";
import type { Family } from "./overflow-types";
import type { PostDoc } from "../schema";

export type { Family };

export function estimateWidth(
  text: string,
  fontSize: number,
  family: Family,
  bold = false,
): number {
  return advanceEm(text, family, bold) * fontSize;
}

/** Greedy word wrap, returning the line count a column would need. */
export function estimateLines(
  text: string,
  fontSize: number,
  family: Family,
  maxWidth: number,
  bold = false,
): number {
  const words = splitWords(text);
  if (words.length === 0) return 0;
  const space = fontSize * (family === "serif" ? 0.25 : 0.3);

  let lines = 1;
  let used = 0;
  for (const word of words) {
    const w = estimateWidth(word, fontSize, family, bold);
    if (used === 0) {
      used = w;
    } else if (used + space + w <= maxWidth) {
      used += space + w;
    } else {
      lines++;
      used = w;
    }
  }
  return lines;
}

/** The widest single word — if this exceeds the column, nothing can wrap it. */
export function widestWord(
  text: string,
  fontSize: number,
  family: Family,
  bold = false,
): { word: string; width: number } {
  let word = "";
  let width = 0;
  for (const w of splitWords(text)) {
    const candidate = estimateWidth(w, fontSize, family, bold);
    if (candidate > width) {
      width = candidate;
      word = w;
    }
  }
  return { word, width };
}

export type OverflowProblem = {
  /** Dotted field path within the post, e.g. `data.stats[1].value`. */
  field: string;
  message: string;
};

type Check = {
  field: string;
  text: string;
  fontSize: number;
  family: Family;
  maxWidth: number;
  bold?: boolean;
  /** Lines the design allows before the block pushes its neighbours out. */
  maxLines?: number;
};

function runChecks(checks: Check[]): OverflowProblem[] {
  const problems: OverflowProblem[] = [];
  for (const c of checks) {
    if (!c.text) continue;

    const { word, width } = widestWord(c.text, c.fontSize, c.family, c.bold);
    if (width > c.maxWidth) {
      problems.push({
        field: c.field,
        message:
          `"${word}" is one unbreakable word about ${Math.round(width)}px wide at ` +
          `${c.fontSize}px, but the column is only ${Math.round(c.maxWidth)}px. ` +
          `Shorten the word or the field.`,
      });
      continue;
    }

    if (c.maxLines !== undefined) {
      const lines = estimateLines(c.text, c.fontSize, c.family, c.maxWidth, c.bold);
      if (lines > c.maxLines) {
        const trim = Math.max(1, Math.round(c.text.length * (1 - c.maxLines / lines)));
        problems.push({
          field: c.field,
          message:
            `needs about ${lines} lines at ${c.fontSize}px but only ${c.maxLines} fit. ` +
            `Trim roughly ${trim} characters.`,
        });
      }
    }
  }
  return problems;
}

// Box widths, mirroring the constants the templates lay out with.
const STAT_TILE_INNER = Math.floor((CONTENT_W - 48) / 3) - 52;
const VERSUS_CARD_INNER = Math.floor((CONTENT_W - 86) / 2) - 64;
const BAR_LABEL_W = 260 - 16;
const BAR_VALUE_W = 150 - 24;
const STEP_TEXT_W = CONTENT_W - 48 - 64 - 52 - 40;
const IMPACT_SECTOR_W = CONTENT_W - 44 - 230;
const IMPACT_CHANGE_W = 230 - 32;

/**
 * Every field that can overflow, for one post. An empty array means the post is
 * safe to render.
 */
export function findOverflow(doc: PostDoc): OverflowProblem[] {
  const checks: Check[] = [];
  const extra: OverflowProblem[] = [];

  const headlineTiers =
    doc.template === "headline"
      ? HEADLINE_HERO_TIERS
      : doc.template === "breaking"
        ? HEADLINE_BREAKING_TIERS
        : HEADLINE_COMPACT_TIERS;

  checks.push({
    field: "headline",
    text: doc.headline,
    fontSize: fitText(doc.headline, headlineTiers),
    family: "serif",
    maxWidth: CONTENT_W,
    // The hero headline owns the whole column; the others share it.
    maxLines: doc.template === "headline" ? 6 : 4,
  });

  if (doc.kicker) {
    checks.push({
      field: "kicker",
      text: doc.kicker,
      fontSize: 22,
      family: "mono",
      maxWidth: CONTENT_W,
      maxLines: 1,
      bold: true,
    });
  }
  if (doc.source_line) {
    checks.push({
      field: "source",
      text: doc.source_line,
      fontSize: 20,
      family: "sans",
      maxWidth: CONTENT_W,
      maxLines: 1,
    });
  }

  switch (doc.template) {
    case "headline":
      if (doc.data.dek) {
        checks.push({
          field: "data.dek",
          text: doc.data.dek,
          fontSize: fitText(doc.data.dek, DEK_TIERS),
          family: "sans",
          maxWidth: CONTENT_W,
          maxLines: 4,
        });
      }
      break;

    case "stats":
      doc.data.stats.forEach((stat, i) => {
        checks.push({
          field: `data.stats[${i}].value`,
          text: stat.value,
          fontSize: fitText(stat.value, STAT_VALUE_TIERS),
          family: "sans",
          maxWidth: STAT_TILE_INNER,
          bold: true,
        });
        checks.push({
          field: `data.stats[${i}].label`,
          text: stat.label,
          fontSize: 17,
          family: "mono",
          maxWidth: STAT_TILE_INNER,
          maxLines: 3,
          bold: true,
        });
        if (stat.delta) {
          checks.push({
            field: `data.stats[${i}].delta`,
            text: stat.delta,
            fontSize: 24,
            family: "sans",
            maxWidth: STAT_TILE_INNER - 24,
            maxLines: 1,
          });
        }
      });
      if (doc.data.footnote) {
        checks.push({
          field: "data.footnote",
          text: doc.data.footnote,
          fontSize: 21,
          family: "sans",
          maxWidth: CONTENT_W,
          maxLines: 2,
        });
      }
      break;

    case "line_chart": {
      if (doc.data.series_label) {
        checks.push({
          field: "data.series_label",
          text: doc.data.series_label,
          fontSize: 17,
          family: "mono",
          maxWidth: CONTENT_W,
          maxLines: 1,
          bold: true,
        });
      }
      // Axis labels share one row and cannot wrap.
      const axisWidth = doc.data.x_labels.reduce(
        (sum, l) => sum + estimateWidth(l, 17, "mono"),
        0,
      );
      const minGap = 8 * Math.max(0, doc.data.x_labels.length - 1);
      if (axisWidth + minGap > CONTENT_W) {
        extra.push({
          field: "data.x_labels",
          message:
            `${doc.data.x_labels.length} axis labels need about ` +
            `${Math.round(axisWidth + minGap)}px but the chart is ${CONTENT_W}px wide. ` +
            `Use shorter labels or fewer points.`,
        });
      }
      break;
    }

    case "bar_compare":
      doc.data.bars.forEach((bar, i) => {
        checks.push({
          field: `data.bars[${i}].label`,
          text: bar.label,
          fontSize: fitText(bar.label, BAR_LABEL_TIERS),
          family: "sans",
          maxWidth: BAR_LABEL_W,
          maxLines: 2,
          bold: true,
        });
        checks.push({
          field: `data.bars[${i}].display`,
          text: bar.display ?? bar.value.toLocaleString("en-US"),
          fontSize: 34,
          family: "sans",
          maxWidth: BAR_VALUE_W,
          maxLines: 1,
          bold: true,
        });
      });
      if (doc.data.unit) {
        checks.push({
          field: "data.unit",
          text: doc.data.unit,
          fontSize: 17,
          family: "mono",
          maxWidth: CONTENT_W,
          maxLines: 1,
          bold: true,
        });
      }
      break;

    case "versus":
      (["option_a", "option_b"] as const).forEach((key) => {
        const side = doc.data[key];
        checks.push({
          field: `data.${key}.amount`,
          text: side.amount,
          fontSize: fitText(side.amount, VERSUS_AMOUNT_TIERS),
          family: "sans",
          maxWidth: VERSUS_CARD_INNER,
          bold: true,
        });
        checks.push({
          field: `data.${key}.label`,
          text: side.label,
          fontSize: 18,
          family: "mono",
          maxWidth: VERSUS_CARD_INNER,
          maxLines: 2,
          bold: true,
        });
        if (side.sub) {
          checks.push({
            field: `data.${key}.sub`,
            text: side.sub,
            fontSize: 22,
            family: "sans",
            maxWidth: VERSUS_CARD_INNER,
            maxLines: 2,
          });
        }
      });
      if (doc.data.pill) {
        checks.push({
          field: "data.pill",
          text: doc.data.pill,
          fontSize: 19,
          family: "mono",
          maxWidth: CONTENT_W - 120,
          maxLines: 1,
          bold: true,
        });
      }
      break;

    case "steps":
      doc.data.steps.forEach((step, i) => {
        checks.push({
          field: `data.steps[${i}].label`,
          text: step.label,
          fontSize: fitText(step.label, STEP_LABEL_TIERS),
          family: "sans",
          maxWidth: STEP_TEXT_W,
          maxLines: 1,
          bold: true,
        });
        if (step.detail) {
          checks.push({
            field: `data.steps[${i}].detail`,
            text: step.detail,
            fontSize: 20,
            family: "sans",
            maxWidth: STEP_TEXT_W,
            maxLines: 2,
          });
        }
      });
      break;

    case "breaking":
      doc.data.impacts.forEach((impact, i) => {
        checks.push({
          field: `data.impacts[${i}].sector`,
          text: impact.sector,
          fontSize: fitText(impact.sector, IMPACT_SECTOR_TIERS),
          family: "sans",
          maxWidth: IMPACT_SECTOR_W,
          maxLines: 2,
          bold: true,
        });
        checks.push({
          field: `data.impacts[${i}].change`,
          text: impact.change,
          fontSize: 32,
          family: "sans",
          maxWidth: IMPACT_CHANGE_W,
          maxLines: 1,
          bold: true,
        });
      });
      if (doc.data.impacts_label) {
        checks.push({
          field: "data.impacts_label",
          text: doc.data.impacts_label,
          fontSize: 19,
          family: "mono",
          maxWidth: CONTENT_W,
          maxLines: 1,
          bold: true,
        });
      }
      break;
  }

  return [...runChecks(checks), ...extra];
}
