/**
 * Content-mix warnings.
 *
 * The feed gets repetitive fast if the same template or palette lands twice in
 * a row. These are warnings, never blocks: the day still builds, the contact
 * sheet just tells you what looks samey before you upload it.
 */
import type { PaletteName } from "./design/palettes";
import { TEMPLATE_LABELS, TEMPLATE_NAMES, type TemplateName } from "./schema";
import { PALETTES } from "./design/palettes";

export type MixItem = {
  id: string;
  /** Sort key — the scheduled instant, or creation order for unscheduled items. */
  at: number;
  template: TemplateName | null;
  palette: PaletteName | null;
};

export type MixWarning = {
  kind: "template_repeat" | "template_overused" | "palette_repeat";
  message: string;
  /** Post ids the warning points at. */
  ids: string[];
};

/**
 * How many times one template may appear in a day before it is worth warning
 * about.
 *
 * This has to scale with the day: 15 posts across 7 templates means something
 * MUST appear three times, so a hard-coded ceiling of 2 would fire on every
 * single day and train you to ignore it. The floor stays at 2 so a short day
 * still gets the original, stricter behaviour.
 */
export function maxSameTemplatePerDay(postCount: number): number {
  return Math.max(2, Math.ceil(postCount / TEMPLATE_NAMES.length));
}

/** Counts by template for one day's items — drives the content-mix bar. */
export function templateCounts(items: MixItem[]): Array<{ template: TemplateName; count: number }> {
  const counts = new Map<TemplateName, number>();
  for (const item of items) {
    if (!item.template) continue;
    counts.set(item.template, (counts.get(item.template) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([template, count]) => ({ template, count }))
    .sort((a, b) => b.count - a.count || a.template.localeCompare(b.template));
}

/**
 * Warnings for one day's schedule, given the item that immediately precedes the
 * day (so a repeat across a midnight boundary is still caught).
 */
export function mixWarnings(items: MixItem[], precededBy?: MixItem | null): MixWarning[] {
  const ordered = [...items].sort((a, b) => a.at - b.at);
  const warnings: MixWarning[] = [];

  // One template dominating the day.
  const cap = maxSameTemplatePerDay(ordered.length);
  for (const { template, count } of templateCounts(ordered)) {
    if (count > cap) {
      warnings.push({
        kind: "template_overused",
        message: `${TEMPLATE_LABELS[template]} appears ${count}× today (comfortable max ${cap}).`,
        ids: ordered.filter((i) => i.template === template).map((i) => i.id),
      });
    }
  }

  // Back-to-back repeats of template or palette.
  const chain = precededBy ? [precededBy, ...ordered] : ordered;
  for (let i = 1; i < chain.length; i++) {
    const prev = chain[i - 1];
    const cur = chain[i];
    if (cur.template && prev.template === cur.template) {
      warnings.push({
        kind: "template_repeat",
        message: `${TEMPLATE_LABELS[cur.template]} runs back-to-back.`,
        ids: [prev.id, cur.id],
      });
    }
    if (cur.palette && prev.palette === cur.palette) {
      warnings.push({
        kind: "palette_repeat",
        message: `${PALETTES[cur.palette].label} palette runs back-to-back.`,
        ids: [prev.id, cur.id],
      });
    }
  }

  return warnings;
}

/** Ids that should render a warning outline on their card. */
export function warnedIds(warnings: MixWarning[]): Set<string> {
  const s = new Set<string>();
  for (const w of warnings) for (const id of w.ids) s.add(id);
  return s;
}
