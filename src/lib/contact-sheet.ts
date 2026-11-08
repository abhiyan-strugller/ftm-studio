/**
 * The contact sheet: `output/<date>/index.html`.
 *
 * One page showing every card in the day next to its caption, slot time, source
 * and any warning — so the whole day is reviewable by scrolling once, instead of
 * opening fifteen PNGs and fifteen JSON blocks side by side.
 *
 * Self-contained and offline: relative image paths, inline CSS, no fonts or
 * scripts fetched from anywhere. Open it by double-clicking the file.
 */
import type { MixWarning } from "./mix";
import { TEMPLATE_LABELS, type TemplateName } from "./schema";
import type { PaletteName } from "./design/palettes";

export type SheetEntry = {
  id: string;
  template: TemplateName;
  palette: PaletteName;
  /** Issue number printed on the card. */
  postNumber: number;
  headline: string;
  caption: string;
  source?: string;
  /** ET slot label, e.g. "7:00 AM". */
  time: string;
  /** PNG filename, relative to the contact sheet. */
  image: string;
  /** Unfilled [NUMBER]-style placeholders found anywhere in the post. */
  placeholders: string[];
};

export type SheetData = {
  date: string;
  entries: SheetEntry[];
  warnings: MixWarning[];
  /** Set when only a subset was rebuilt, so the page says so plainly. */
  subsetOf?: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Captions are plain text with meaningful line breaks. */
function captionHtml(caption: string): string {
  return escapeHtml(caption).replace(/\r?\n/g, "<br>");
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

const STYLES = `
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9;
    --panel: #ffffff;
    --ink: #0d1b2f;
    --muted: #5a6677;
    --rule: #dfe3ea;
    --warn-bg: #fff6e0;
    --warn-ink: #7a5300;
    --warn-rule: #e8c877;
    --accent: #0f7a4a;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #070e1a;
      --panel: #0d1b2f;
      --ink: #e9eef2;
      --muted: #9fb0bf;
      --rule: #1e2a36;
      --warn-bg: #2a2008;
      --warn-ink: #f2b632;
      --warn-rule: #5c4a14;
      --accent: #2bd47d;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 24px 80px;
    background: var(--bg); color: var(--ink);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  header { max-width: 1180px; margin: 0 auto 28px; }
  h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.02em; }
  .sub { color: var(--muted); font-size: 14px; }
  .mono {
    font-family: ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, monospace;
    text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px;
  }
  .warnings {
    max-width: 1180px; margin: 0 auto 28px; padding: 14px 18px;
    background: var(--warn-bg); color: var(--warn-ink);
    border: 1px solid var(--warn-rule); border-radius: 10px;
  }
  .warnings ul { margin: 8px 0 0; padding-left: 20px; }
  .card {
    max-width: 1180px; margin: 0 auto 22px; display: flex; gap: 24px;
    background: var(--panel); border: 1px solid var(--rule);
    border-radius: 12px; padding: 20px; align-items: flex-start;
  }
  .card img {
    width: 280px; height: auto; flex: none;
    border: 1px solid var(--rule); border-radius: 6px; display: block;
  }
  .meta { flex: 1; min-width: 0; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
  .chip {
    display: inline-block; padding: 3px 9px; border-radius: 999px;
    border: 1px solid var(--rule); color: var(--muted);
  }
  .chip.time { color: var(--accent); border-color: var(--accent); }
  h2 { margin: 2px 0 10px; font-size: 19px; line-height: 1.3; letter-spacing: -0.01em; }
  .caption {
    white-space: normal; background: transparent; border-left: 3px solid var(--rule);
    padding: 2px 0 2px 14px; margin: 0 0 10px; color: var(--ink);
  }
  .counts { color: var(--muted); font-size: 13px; }
  .source { color: var(--muted); font-size: 13px; margin-top: 6px; }
  .flag {
    margin-top: 10px; padding: 8px 12px; border-radius: 8px;
    background: var(--warn-bg); color: var(--warn-ink);
    border: 1px solid var(--warn-rule); font-size: 13px;
  }
  @media (max-width: 760px) {
    .card { flex-direction: column; }
    .card img { width: 100%; max-width: 420px; }
  }
`;

export function renderContactSheet(data: SheetData): string {
  const { date, entries, warnings } = data;

  const warningsBlock =
    warnings.length > 0
      ? `<section class="warnings">
    <strong>Content mix</strong>
    <ul>
      ${warnings.map((w) => `<li>${escapeHtml(w.message)} <span class="mono">${escapeHtml(w.ids.join(", "))}</span></li>`).join("\n      ")}
    </ul>
  </section>`
      : "";

  const subsetNote = data.subsetOf
    ? `<p class="sub">Partial rebuild — showing ${entries.length} of ${data.subsetOf} posts. The CSV was not rewritten.</p>`
    : "";

  const cards = entries
    .map(
      (e) => `  <article class="card">
    <img src="${escapeHtml(e.image)}" alt="Rendered post ${escapeHtml(e.id)}: ${escapeHtml(e.headline)}" loading="lazy">
    <div class="meta">
      <div class="row">
        <span class="chip time mono">${escapeHtml(e.time)}</span>
        <span class="chip mono">${escapeHtml(e.id)}</span>
        <span class="chip mono">No. ${String(e.postNumber).padStart(3, "0")}</span>
        <span class="chip mono">${escapeHtml(TEMPLATE_LABELS[e.template])}</span>
        <span class="chip mono">${escapeHtml(e.palette)}</span>
      </div>
      <h2>${escapeHtml(e.headline)}</h2>
      <p class="caption">${captionHtml(e.caption)}</p>
      <div class="counts">${wordCount(e.caption)} words · ${e.caption.length} characters</div>
      ${e.source ? `<div class="source">${escapeHtml(e.source)}</div>` : ""}
      ${
        e.placeholders.length > 0
          ? `<div class="flag"><strong>Unfilled placeholders:</strong> ${escapeHtml(e.placeholders.join(", "))}</div>`
          : ""
      }
    </div>
  </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Follow the Money — ${escapeHtml(date)}</title>
<style>${STYLES}</style>
</head>
<body>
<header>
  <h1>Follow the Money — ${escapeHtml(date)}</h1>
  <p class="sub">${entries.length} post${entries.length === 1 ? "" : "s"}. Review here, then upload the PNGs and <code>postplanner.csv</code> to Post Planner.</p>
  ${subsetNote}
</header>
${warningsBlock}
${cards}
</body>
</html>
`;
}
