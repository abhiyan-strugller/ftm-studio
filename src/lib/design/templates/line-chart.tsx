/**
 * Template 3 — headline plus a real SVG line chart from a data array.
 *
 * Geometry is computed in TypeScript and the value callouts are HTML divs
 * positioned over the SVG, because Satori's `<text>` support is thinner than
 * its shape support.
 */
import {
  chartBounds,
  fitText,
  formatChartValue,
  HEADLINE_COMPACT_TIERS,
} from "../fit";
import { FONT_MONO, FONT_SANS } from "../fonts";
import { CONTENT_W, Kicker, MONO_LABEL, rgba, SourceLine } from "../frame";
import { Headline } from "../headline";
import type { Palette } from "../palettes";
import type { PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "line_chart" }>;

const CHART_W = CONTENT_W;
const CHART_H = 390;
const INSET_X = 14;
const INSET_TOP = 58; // room for the callout above the line
const INSET_BOTTOM = 18;
const GRID_LINES = 4;

export function LineChartTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  const values = doc.data.y_values;
  const labels = doc.data.x_labels;
  const { min, max } = chartBounds(values);
  const span = max - min || 1;

  const plotW = CHART_W - INSET_X * 2;
  const plotH = CHART_H - INSET_TOP - INSET_BOTTOM;

  const points = values.map((v, i) => {
    const x = values.length === 1 ? INSET_X + plotW / 2 : INSET_X + (i / (values.length - 1)) * plotW;
    const y = INSET_TOP + (1 - (v - min) / span) * plotH;
    return { x, y, v };
  });

  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints =
    `${points[0].x.toFixed(1)},${(CHART_H - INSET_BOTTOM).toFixed(1)} ` +
    linePoints +
    ` ${points[points.length - 1].x.toFixed(1)},${(CHART_H - INSET_BOTTOM).toFixed(1)}`;

  const first = points[0];
  const last = points[points.length - 1];
  const prefix = doc.data.value_prefix ?? "";
  const suffix = doc.data.value_suffix ?? "";

  /** Keep a callout inside the canvas instead of letting it hang off an edge. */
  const calloutLeft = (x: number, width: number) =>
    Math.max(0, Math.min(CHART_W - width, x - width / 2));

  const CALLOUT_W = 164;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      {doc.kicker ? <Kicker palette={palette}>{doc.kicker}</Kicker> : null}

      <Headline
        palette={palette}
        text={doc.headline}
        accentWord={doc.accent_word}
        fontSize={fitText(doc.headline, HEADLINE_COMPACT_TIERS)}
      />

      {doc.data.series_label ? (
        <div
          style={{
            display: "flex",
            ...MONO_LABEL,
            fontSize: 17,
            color: palette.muted,
            marginTop: 30,
          }}
        >
          {doc.data.series_label}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          position: "relative",
          width: CHART_W,
          height: CHART_H,
          marginTop: doc.data.series_label ? 14 : 36,
        }}
      >
        <svg
          width={CHART_W}
          height={CHART_H}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="ftm-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.accent} stopOpacity={0.3} />
              <stop offset="100%" stopColor={palette.accent} stopOpacity={0} />
            </linearGradient>
          </defs>

          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const y = INSET_TOP + (i / GRID_LINES) * plotH;
            return (
              <line
                key={i}
                x1={0}
                y1={y}
                x2={CHART_W}
                y2={y}
                stroke={palette.rule}
                strokeWidth={1}
              />
            );
          })}

          <polygon points={areaPoints} fill="url(#ftm-area)" />
          <polyline
            points={linePoints}
            stroke={palette.accent}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          <circle cx={first.x} cy={first.y} r={9} fill={palette.bg} stroke={palette.accent} strokeWidth={4} />
          <circle cx={last.x} cy={last.y} r={11} fill={palette.accent} />
        </svg>

        {/* First / last value callouts */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: calloutLeft(first.x, CALLOUT_W),
            top: Math.max(0, first.y - 48),
            width: CALLOUT_W,
            justifyContent: "flex-start",
            fontFamily: FONT_SANS,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "-0.02em",
            color: palette.muted,
          }}
        >
          {formatChartValue(first.v, prefix, suffix)}
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: calloutLeft(last.x, CALLOUT_W),
            top: Math.max(0, last.y - 52),
            width: CALLOUT_W,
            justifyContent: "flex-end",
            fontFamily: FONT_SANS,
            fontWeight: 800,
            fontSize: 32,
            letterSpacing: "-0.02em",
            color: palette.text,
          }}
        >
          {formatChartValue(last.v, prefix, suffix)}
        </div>
      </div>

      {/* X axis labels */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          width: CHART_W,
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: rgba(palette.text, 0.14),
        }}
      >
        {labels.map((label, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              fontFamily: FONT_MONO,
              fontWeight: 400,
              fontSize: 17,
              letterSpacing: "0.04em",
              color: palette.muted,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
