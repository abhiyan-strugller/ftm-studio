/**
 * How a stat delta is drawn: which way the arrow points, and what colour it is.
 *
 * Two separate questions, deliberately kept apart:
 *   - the ARROW shows what the number did. It always follows `direction`.
 *   - the COLOUR shows whether that was good for the reader. It follows
 *     `direction` *and* `polarity`.
 *
 * For most stats higher is better (wages, savings yield). For inflation,
 * prices, rent and fees, lower is better — a falling CPI is good news, so a
 * "down" delta must take the positive colour. Polarity is always explicit in
 * the day file; it is never guessed from the label.
 */
import type { Direction, Polarity } from "../schema";
import type { Palette } from "./palettes";

export type DeltaTone = "positive" | "negative" | "neutral";

/** Good, bad, or neither — for the reader, not for the number. */
export function deltaTone(direction: Direction | undefined, polarity: Polarity = "higher_is_good"): DeltaTone {
  if (direction !== "up" && direction !== "down") return "neutral";
  const rose = direction === "up";
  const good = polarity === "lower_is_good" ? !rose : rose;
  return good ? "positive" : "negative";
}

/** The arrow direction. Polarity is taken only to make clear it is ignored. */
export function deltaArrow(direction: Direction | undefined, _polarity?: Polarity): Direction {
  return direction ?? "flat";
}

/**
 * Everything the stats tile needs to draw one delta.
 *
 * `palette.up` is the positive colour and `palette.down` the negative one; the
 * names predate polarity and describe the default `higher_is_good` case.
 */
export function deltaStyle(
  stat: { direction?: Direction; polarity?: Polarity },
  palette: Palette,
): { arrow: Direction; color: string; tone: DeltaTone } {
  const tone = deltaTone(stat.direction, stat.polarity);
  const color = tone === "positive" ? palette.up : tone === "negative" ? palette.down : palette.muted;
  return { arrow: deltaArrow(stat.direction, stat.polarity), color, tone };
}
