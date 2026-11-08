/**
 * Post palettes. Each one is a complete ground/ink/accent set; the renderer never
 * mixes colours across palettes.
 *
 * `dark` drives two things: the subtle accent glow in one corner, and which
 * muted-ink value keeps contrast at or above 4.5:1 against the ground.
 */

export const PALETTE_NAMES = [
  "night",
  "cream",
  "forest",
  "ice",
  "sand",
  "midnight",
] as const;

export type PaletteName = (typeof PALETTE_NAMES)[number];

export type Palette = {
  name: PaletteName;
  label: string;
  bg: string;
  text: string;
  accent: string;
  dark: boolean;
  /** Secondary ink for deks and labels. Verified >= 4.5:1 against `bg`. */
  muted: string;
  /** Hairline rules and tile borders. Decorative, so not contrast-bound. */
  rule: string;
  /** Fill behind stat tiles / bars. Decorative. */
  surface: string;
  /** Ink to use *on top of* the accent colour (pills, badges). */
  onAccent: string;
  /**
   * Direction colours for deltas and impact rows.
   *
   * These are deliberately NOT derived from `accent`. On Midnight the accent is
   * orange, so an accent-coloured "up" and a salmon "down" rendered as the same
   * colour and the reader could not tell +3.4% from -2.1%. Direction is semantic
   * and has to stay readable in every palette, so it gets its own pair.
   */
  up: string;
  down: string;
};

/** Semantic direction colours, one pair per ground type. */
const DARK_UP = "#2BD47D";
const DARK_DOWN = "#FF6B6B";
const LIGHT_UP = "#0F7A4A";
const LIGHT_DOWN = "#B3261E";

export const PALETTES: Record<PaletteName, Palette> = {
  night: {
    name: "night",
    label: "Night",
    bg: "#070B10",
    text: "#E9EEF2",
    accent: "#2BD47D",
    dark: true,
    muted: "#9FB0BF",
    rule: "#1E2A36",
    surface: "#0E161F",
    onAccent: "#04140B",
    up: DARK_UP,
    down: DARK_DOWN,
  },
  cream: {
    name: "cream",
    label: "Cream",
    bg: "#F3EEE4",
    text: "#141414",
    accent: "#0F7A4A",
    dark: false,
    muted: "#55514A",
    rule: "#D8D0C0",
    surface: "#EAE3D5",
    onAccent: "#FFFFFF",
    up: LIGHT_UP,
    down: LIGHT_DOWN,
  },
  forest: {
    name: "forest",
    label: "Forest",
    bg: "#0C2219",
    text: "#EAF2EC",
    accent: "#2BD47D",
    dark: true,
    muted: "#9DB8A8",
    rule: "#1D3B2D",
    surface: "#122C21",
    onAccent: "#04140B",
    up: DARK_UP,
    down: DARK_DOWN,
  },
  ice: {
    name: "ice",
    label: "Ice",
    bg: "#E7EAF0",
    text: "#0B1220",
    // Spec said #2E6FFF; darkened to clear 4.5:1 on this light ground
    // (and to keep white pill text legible on the accent itself).
    accent: "#1F4FD8",
    dark: false,
    muted: "#4B5566",
    rule: "#CBD2DE",
    surface: "#DCE1EA",
    onAccent: "#FFFFFF",
    up: LIGHT_UP,
    down: LIGHT_DOWN,
  },
  sand: {
    name: "sand",
    label: "Sand",
    bg: "#EFE6D8",
    text: "#231A14",
    // Spec said #B4441F (4.48:1); nudged darker to clear 4.5:1.
    accent: "#9E3A16",
    dark: false,
    muted: "#5C4E42",
    rule: "#D6C9B6",
    surface: "#E6DACA",
    onAccent: "#FFFFFF",
    up: LIGHT_UP,
    down: LIGHT_DOWN,
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    bg: "#0A1424",
    text: "#E6ECF5",
    accent: "#FF7A59",
    dark: true,
    muted: "#9AAAC0",
    rule: "#1C2C44",
    surface: "#101E33",
    onAccent: "#1A0A04",
    up: DARK_UP,
    down: DARK_DOWN,
  },
};

export function getPalette(name: string | null | undefined): Palette {
  if (name && name in PALETTES) return PALETTES[name as PaletteName];
  return PALETTES.night;
}

/**
 * Default rotation order. The day builder walks this list so neighbouring posts
 * alternate dark/light grounds rather than repeating one look.
 */
export const PALETTE_ROTATION: PaletteName[] = [
  "night",
  "cream",
  "midnight",
  "sand",
  "forest",
  "ice",
];

/**
 * Pick the next palette, never repeating `previous`.
 * `seed` lets callers spread choices out when there is no previous post.
 */
export function nextPalette(previous: PaletteName | null | undefined, seed = 0): PaletteName {
  if (!previous) {
    return PALETTE_ROTATION[Math.abs(seed) % PALETTE_ROTATION.length];
  }
  const i = PALETTE_ROTATION.indexOf(previous);
  if (i < 0) return PALETTE_ROTATION[0];
  return PALETTE_ROTATION[(i + 1) % PALETTE_ROTATION.length];
}
