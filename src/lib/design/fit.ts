/**
 * Type fitting.
 *
 * Satori has no text-measurement callback we can loop on, so every variable
 * block picks its size from character count up front. The tiers below are
 * calibrated to the 936px content width (1080 canvas - 2x72 padding) and leave
 * headroom so the longest string each zod schema permits still fits without
 * clipping.
 */

export type SizeTier = [maxChars: number, fontSize: number];

/** First tier whose `maxChars` the text fits inside; last tier is the floor. */
export function fitText(text: string, tiers: SizeTier[]): number {
  const len = text.trim().length;
  for (const [maxChars, size] of tiers) {
    if (len <= maxChars) return size;
  }
  return tiers[tiers.length - 1][1];
}

/**
 * Headline sizes for the `headline` template, where the headline is the whole
 * composition and can take the full content column.
 */
export const HEADLINE_HERO_TIERS: SizeTier[] = [
  [38, 120],
  [62, 104],
  [92, 88],
  [128, 74],
  [180, 62],
];

/**
 * Headline sizes for templates that also carry stats / charts / steps, so the
 * headline gets roughly the top third.
 */
export const HEADLINE_COMPACT_TIERS: SizeTier[] = [
  [34, 80],
  [58, 68],
  [88, 58],
  [124, 50],
  [180, 44],
];

/** Breaking posts sit between the two: badge + headline + impact bullets. */
export const HEADLINE_BREAKING_TIERS: SizeTier[] = [
  [34, 88],
  [58, 76],
  [88, 64],
  [124, 54],
  [180, 46],
];

export const DEK_TIERS: SizeTier[] = [
  [80, 38],
  [140, 34],
  [220, 30],
];

/** Big numbers in stat tiles — three across, so each gets ~264px. */
export const STAT_VALUE_TIERS: SizeTier[] = [
  [4, 84],
  [6, 70],
  [8, 58],
  [12, 46],
];

export const VERSUS_AMOUNT_TIERS: SizeTier[] = [
  [4, 104],
  [5, 96],
  [7, 88],
  [10, 72],
  [14, 58],
];

export const STEP_LABEL_TIERS: SizeTier[] = [
  [20, 38],
  [27, 34],
  [34, 30],
];

export const BAR_LABEL_TIERS: SizeTier[] = [
  [14, 30],
  [20, 27],
  [26, 24],
];

export const IMPACT_SECTOR_TIERS: SizeTier[] = [
  [16, 36],
  [23, 32],
  [30, 28],
];

/**
 * Headlines are laid out as one flex item per word so that Satori wraps at word
 * boundaries — it has no inline formatting context, so a nested element would
 * become a block and break the line wherever the accent run starts.
 *
 * These two helpers therefore work in word space: split the headline, then find
 * which word (or run of words) should be italic in the accent colour.
 */
export function splitWords(headline: string): string[] {
  return headline.trim().split(/\s+/).filter(Boolean);
}

/** Strip surrounding punctuation so "money." still matches "money". */
function bareWord(w: string): string {
  return w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase();
}

/**
 * Index range `[start, end)` of the accent word inside `words`, or `null` when
 * the accent word is absent — in which case the headline simply renders without
 * the italic treatment rather than failing.
 *
 * Handles a multi-word accent phrase by matching the whole sequence.
 */
export function accentWordRange(
  words: string[],
  accentWord?: string,
): { start: number; end: number } | null {
  const target = accentWord?.trim();
  if (!target) return null;

  const needle = splitWords(target).map(bareWord).filter(Boolean);
  if (needle.length === 0) return null;

  const hay = words.map(bareWord);
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return { start: i, end: i + needle.length };
  }
  return null;
}

/** Nice axis bounds so a chart never draws a flat line against its own floor. */
export function chartBounds(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // Flat series: give it a visible band rather than dividing by zero.
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= pad;
    max += pad;
  } else {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }
  return { min, max };
}

/** Format a chart value for the highlighted first/last point labels. */
export function formatChartValue(v: number, prefix = "", suffix = ""): string {
  const abs = Math.abs(v);
  let body: string;
  if (abs >= 1000) body = v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  else if (abs >= 100) body = v.toFixed(0);
  else if (abs >= 10) body = v.toFixed(1);
  else body = v.toFixed(2);
  return `${prefix}${body}${suffix}`;
}
