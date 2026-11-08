/**
 * Skeleton planning for a new day.
 *
 * Picks the template and palette for each of the day's slots so the feed stays
 * varied without you having to think about it: no template twice in a row, no
 * palette twice in a row, and no template used more than the mix rules allow.
 *
 * Deterministic for a given date — regenerating the same day produces the same
 * plan, so a half-filled file can be recreated without the layout shifting.
 */
import { PALETTE_ROTATION, type PaletteName } from "./design/palettes";
import { maxSameTemplatePerDay } from "./mix";
import { TEMPLATE_NAMES, type TemplateName } from "./schema";
import { DAILY_SLOTS } from "./slots";

/**
 * Template order for a day, weighted toward the formats that carry a money
 * story best. `headline` and `stats` are the workhorses; `versus` and `steps`
 * are occasional change-ups.
 */
const TEMPLATE_CYCLE: TemplateName[] = [
  "headline",
  "stats",
  "line_chart",
  "breaking",
  "bar_compare",
  "headline",
  "stats",
  "versus",
  "line_chart",
  "steps",
  "headline",
  "stats",
  "bar_compare",
  "breaking",
  "line_chart",
];

/** Small deterministic hash so each date starts at a different offset. */
function dateSeed(dateKey: string): number {
  let h = 0;
  for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export type PlannedSlot = {
  index: number;
  /** "01" … "15" — stable, sortable, and usable in a filename. */
  id: string;
  slot: string;
  template: TemplateName;
  palette: PaletteName;
};

/**
 * Plan one day's worth of slots.
 *
 * The template choice walks a weighted cycle and skips any pick that would
 * break a mix rule, falling back to the first template that does not. Palettes
 * simply rotate, which guarantees no two neighbours match.
 */
export function planDay(
  dateKey: string,
  slots: readonly string[] = DAILY_SLOTS,
): PlannedSlot[] {
  const seed = dateSeed(dateKey);
  const cap = maxSameTemplatePerDay(slots.length);
  const used = new Map<TemplateName, number>();
  const out: PlannedSlot[] = [];

  let prevTemplate: TemplateName | null = null;
  let prevPalette: PaletteName | null = null;

  slots.forEach((slot, index) => {
    const template = pickTemplate(seed + index, prevTemplate, used, cap);
    used.set(template, (used.get(template) ?? 0) + 1);

    const palette = pickPalette(seed + index, prevPalette);

    out.push({
      index,
      id: String(index + 1).padStart(2, "0"),
      slot,
      template,
      palette,
    });

    prevTemplate = template;
    prevPalette = palette;
  });

  return out;
}

function pickTemplate(
  cursor: number,
  previous: TemplateName | null,
  used: Map<TemplateName, number>,
  cap: number,
): TemplateName {
  const start = cursor % TEMPLATE_CYCLE.length;

  // First pass: honour both rules — not a repeat, not over the daily cap.
  for (let i = 0; i < TEMPLATE_CYCLE.length; i++) {
    const candidate = TEMPLATE_CYCLE[(start + i) % TEMPLATE_CYCLE.length];
    if (candidate === previous) continue;
    if ((used.get(candidate) ?? 0) >= cap) continue;
    return candidate;
  }

  // Second pass: if even the scaled cap cannot cover the day, relax the cap —
  // but never the no-repeat rule, which matters far more to how the feed reads.
  let best: TemplateName = TEMPLATE_NAMES[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const candidate of TEMPLATE_NAMES) {
    if (candidate === previous) continue;
    const count = used.get(candidate) ?? 0;
    if (count < bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function pickPalette(cursor: number, previous: PaletteName | null): PaletteName {
  if (!previous) return PALETTE_ROTATION[cursor % PALETTE_ROTATION.length];
  const i = PALETTE_ROTATION.indexOf(previous);
  return PALETTE_ROTATION[(i + 1) % PALETTE_ROTATION.length];
}

/**
 * An empty `data` block for a template, with the right shape and arity so the
 * file validates structurally the moment you start typing into it.
 */
export function blankData(template: TemplateName): Record<string, unknown> {
  switch (template) {
    case "headline":
      return { dek: "" };
    case "stats":
      return {
        stats: [
          { label: "", value: "", delta: "", direction: "flat" },
          { label: "", value: "", delta: "", direction: "flat" },
          { label: "", value: "", delta: "", direction: "flat" },
        ],
      };
    case "line_chart":
      return {
        series_label: "",
        x_labels: ["", "", "", "", "", ""],
        y_values: [0, 0, 0, 0, 0, 0],
        value_prefix: "",
        value_suffix: "",
      };
    case "bar_compare":
      return {
        unit: "",
        bars: [
          { label: "", value: 0, display: "" },
          { label: "", value: 0, display: "" },
        ],
      };
    case "versus":
      return {
        option_a: { label: "", amount: "", sub: "" },
        option_b: { label: "", amount: "", sub: "" },
        pill: "Vote in comments",
      };
    case "steps":
      return {
        steps: [
          { icon: "chart", label: "", detail: "" },
          { icon: "bank", label: "", detail: "" },
          { icon: "person", label: "", detail: "" },
        ],
      };
    case "breaking":
      return {
        badge: "DEVELOPING",
        impacts: [
          { sector: "", change: "", direction: "flat" },
          { sector: "", change: "", direction: "flat" },
        ],
      };
  }
}
