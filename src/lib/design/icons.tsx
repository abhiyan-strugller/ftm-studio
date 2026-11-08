/**
 * Stroke icons for the `steps` template. Deliberately plain line art on a
 * 32x32 grid — no fills, no photography, nothing that reads as clip art.
 *
 * Stroke weight is tuned for the 36px render size used by the steps template:
 * anything lighter than ~2.2 greys out, and shapes with many short segments
 * collapse into a smudge, which is why `gate` and `store` are drawn with as few
 * strokes as the idea allows.
 */
import type { StepIcon } from "../schema";

type IconProps = { size: number; color: string };

function Frame({
  size,
  color,
  strokeWidth = 2.2,
  children,
}: IconProps & { strokeWidth?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function StepIconGlyph({ icon, size, color }: { icon: StepIcon } & IconProps) {
  switch (icon) {
    case "ship":
      return (
        <Frame size={size} color={color}>
          <path d="M4 20 L28 20 L24 27 L8 27 Z" />
          <path d="M8 20 L8 13 L21 13 L21 20" />
          <path d="M14 13 L14 6 L22 9 L14 11" />
        </Frame>
      );
    case "gate":
      // Toll/customs barrier: two posts, two bars. The previous X-braced version
      // had five crossing strokes and filled in solid at 36px.
      return (
        <Frame size={size} color={color} strokeWidth={2.6}>
          <path d="M7 28 L7 8" />
          <path d="M25 28 L25 8" />
          <path d="M3 14 L29 14" />
          <path d="M3 21 L29 21" />
        </Frame>
      );
    case "store":
      // Awning / body / door. The awning is a closed shape so the silhouette
      // survives the heavier stroke instead of reading as a bare box.
      return (
        <Frame size={size} color={color} strokeWidth={2.6}>
          <path d="M4 13 L7 6 L25 6 L28 13 Z" />
          <path d="M6 13 L6 27 L26 27 L26 13" />
          <path d="M13 27 L13 19 L19 19 L19 27" />
        </Frame>
      );
    case "person":
      return (
        <Frame size={size} color={color}>
          <circle cx={16} cy={11} r={5} />
          <path d="M6 28 C6 21 10 18 16 18 C22 18 26 21 26 28" />
        </Frame>
      );
    case "bank":
      return (
        <Frame size={size} color={color}>
          <path d="M4 13 L16 5 L28 13" />
          <path d="M7 13 L7 24" />
          <path d="M13 13 L13 24" />
          <path d="M19 13 L19 24" />
          <path d="M25 13 L25 24" />
          <path d="M4 27 L28 27" />
        </Frame>
      );
    case "chart":
      return (
        <Frame size={size} color={color}>
          <path d="M5 27 L5 5" />
          <path d="M5 27 L28 27" />
          <path d="M9 21 L15 14 L20 18 L27 8" />
          <circle cx={27} cy={8} r={2} />
        </Frame>
      );
    case "shield":
      return (
        <Frame size={size} color={color}>
          <path d="M16 4 L27 8 C27 19 22 25 16 28 C10 25 5 19 5 8 Z" />
          <path d="M11 16 L15 20 L22 12" />
        </Frame>
      );
    case "globe":
      return (
        <Frame size={size} color={color}>
          <circle cx={16} cy={16} r={12} />
          <path d="M4 16 L28 16" />
          <path d="M16 4 C21 9 21 23 16 28 C11 23 11 9 16 4 Z" />
        </Frame>
      );
  }
}
