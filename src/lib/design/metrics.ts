/**
 * Approximate glyph advance widths, in em, for the three bundled families.
 *
 * Satori gives us no way to measure text before rendering, so the overflow gate
 * needs its own estimate. A single average-ratio-per-family is too crude — it
 * reads "$4,100" as uniformly wide when the comma is less than half the width
 * of a digit, which produced false failures on bar values that render fine.
 *
 * Per-character classes fix that at negligible cost. Values are tuned against
 * the fourteen verified sample renders and sit slightly ABOVE the real widths,
 * so the gate stays conservative: it would rather flag a card that fits than
 * pass one that clips.
 */
import type { Family } from "./overflow-types";

/** Width classes for Inter, in em at weight 400. */
const NARROW = new Set("iljItf.,:;'\"!|()[]{}·-".split(""));
const WIDE = new Set("mwMW@%—".split(""));

const W_NARROW = 0.3;
const W_WIDE = 0.8;
const W_UPPER = 0.68;
const W_DIGIT = 0.62;
const W_SPACE = 0.28;
const W_DEFAULT = 0.53;

/** Instrument Serif is markedly narrower than Inter at the same size. */
const SERIF_SCALE = 0.84;
/** JetBrains Mono is monospaced: every glyph is exactly this wide. */
const MONO_ADVANCE = 0.6;
/** Heavier weights add a little side bearing. */
const BOLD_SCALE = 1.06;

function charWidth(ch: string): number {
  if (ch === " ") return W_SPACE;
  if (NARROW.has(ch)) return W_NARROW;
  if (WIDE.has(ch)) return W_WIDE;
  if (ch >= "0" && ch <= "9") return W_DIGIT;
  if (ch >= "A" && ch <= "Z") return W_UPPER;
  return W_DEFAULT;
}

/** Estimated width of `text` in em for the given family and weight. */
export function advanceEm(text: string, family: Family, bold: boolean): number {
  if (family === "mono") {
    return text.length * MONO_ADVANCE * (bold ? 1.0 : 1.0); // monospace: weight does not change advance
  }
  let em = 0;
  for (const ch of text) em += charWidth(ch);
  if (family === "serif") em *= SERIF_SCALE;
  if (bold) em *= BOLD_SCALE;
  return em;
}
