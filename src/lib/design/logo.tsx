/**
 * The Follow the Money mark: a rising line-chart arrow with a gold dot at the
 * origin. Drawn as inline SVG so it renders identically in Satori (post PNGs)
 * and in the browser (planner chrome).
 *
 * Geometry is fixed: polyline 8,80 -> 44,52 -> 70,66 -> 120,18 inside a
 * 150x96 viewBox, with the arrowhead at the top right.
 */
import type { Palette } from "./palettes";

export const LOGO_VIEWBOX = "0 0 150 96";
export const BRAND_GREEN = "#2BD47D";
export const BRAND_GOLD = "#F2B632";

/**
 * Brand green reads well on dark grounds but goes muddy on cream/sand, so light
 * palettes borrow their own accent for the stroke. The gold origin dot is
 * constant either way.
 */
export function logoStroke(palette: Palette): string {
  return palette.dark ? BRAND_GREEN : palette.accent;
}

type LogoProps = {
  width: number;
  stroke?: string;
  dot?: string;
};

export function Logo({ width, stroke = BRAND_GREEN, dot = BRAND_GOLD }: LogoProps) {
  const height = Math.round((width * 96) / 150);
  return (
    <svg
      width={width}
      height={height}
      viewBox={LOGO_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points="8,80 44,52 70,66 120,18"
        stroke={stroke}
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polygon points="102,12 134,6 128,38" fill={stroke} />
      <circle cx={8} cy={80} r={9} fill={dot} />
    </svg>
  );
}
