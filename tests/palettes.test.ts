import { describe, expect, it } from "vitest";
import { PALETTES, PALETTE_NAMES, PALETTE_ROTATION, getPalette, nextPalette } from "@/lib/design/palettes";
import { contrastRatio, hueDistance, WCAG_AA_NORMAL } from "@/lib/design/contrast";

const palettes = Object.values(PALETTES);

describe("palette contrast", () => {
  it.each(palettes)("$name keeps body text above 4.5:1", (p) => {
    expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(palettes)("$name keeps muted ink above 4.5:1", (p) => {
    expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(palettes)("$name keeps the accent above 4.5:1", (p) => {
    // The accent carries the italic headline word, so it is real text.
    expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(palettes)("$name keeps pill text legible on the accent", (p) => {
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });

  it.each(palettes)("$name keeps up and down deltas above 4.5:1", (p) => {
    expect(contrastRatio(p.up, p.bg)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    expect(contrastRatio(p.down, p.bg)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
  });
});

describe("direction colours are distinguishable", () => {
  // The bug this guards: on Midnight, `down` used to be derived from the
  // orange accent, so +3.4% and -2.1% rendered as nearly the same colour.
  // Hue, not contrast ratio, is the right measure. Contrast ratio compares
  // luminance: a mid green and a mid red can sit a few percent apart on it
  // and still be unmistakable to the eye.
  it.each(palettes)("$name separates up and down by hue", (p) => {
    expect(hueDistance(p.up, p.down)).toBeGreaterThan(60);
  });

  it.each(palettes)("$name does not reuse the accent as the down colour", (p) => {
    expect(p.down.toLowerCase()).not.toBe(p.accent.toLowerCase());
  });
});

describe("palette rotation", () => {
  it("covers every palette exactly once", () => {
    expect([...PALETTE_ROTATION].sort()).toEqual([...PALETTE_NAMES].sort());
  });

  it("never returns the palette it was given", () => {
    for (const name of PALETTE_NAMES) {
      expect(nextPalette(name)).not.toBe(name);
    }
  });

  it("wraps around the end of the rotation", () => {
    const last = PALETTE_ROTATION[PALETTE_ROTATION.length - 1];
    expect(nextPalette(last)).toBe(PALETTE_ROTATION[0]);
  });

  it("falls back to a valid palette for unknown input", () => {
    expect(getPalette("not-a-palette").name).toBe("night");
    expect(getPalette(null).name).toBe("night");
    expect(nextPalette("nonsense" as never)).toBe(PALETTE_ROTATION[0]);
  });
});
