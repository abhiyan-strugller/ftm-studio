/** Template 4 — headline plus 2-6 horizontal comparison bars. */
import { BAR_LABEL_TIERS, fitText, HEADLINE_COMPACT_TIERS } from "../fit";
import { FONT_SANS } from "../fonts";
import { CONTENT_W, Kicker, MONO_LABEL, rgba, SourceLine } from "../frame";
import { Headline } from "../headline";
import type { Palette } from "../palettes";
import type { PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "bar_compare" }>;

const LABEL_W = 260;
const VALUE_W = 150;
const TRACK_W = CONTENT_W - LABEL_W - VALUE_W - 32;

export function BarCompareTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  const bars = doc.data.bars;
  const peak = Math.max(...bars.map((b) => b.value), 0);
  // Taller bars when there are fewer rows, so the block always fills the column.
  const barHeight = bars.length <= 3 ? 46 : bars.length <= 4 ? 40 : 32;
  const rowGap = bars.length <= 3 ? 34 : bars.length <= 4 ? 28 : 22;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      {doc.kicker ? <Kicker palette={palette}>{doc.kicker}</Kicker> : null}

      <Headline
        palette={palette}
        text={doc.headline}
        accentWord={doc.accent_word}
        fontSize={fitText(doc.headline, HEADLINE_COMPACT_TIERS)}
      />

      {doc.data.unit ? (
        <div
          style={{
            display: "flex",
            ...MONO_LABEL,
            fontSize: 17,
            color: palette.muted,
            marginTop: 30,
          }}
        >
          {doc.data.unit}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: CONTENT_W,
          marginTop: doc.data.unit ? 20 : 44,
          rowGap,
        }}
      >
        {bars.map((bar, i) => {
          const ratio = peak > 0 ? bar.value / peak : 0;
          const fillW = Math.max(6, Math.round(ratio * TRACK_W));
          // The leading row gets the accent; the rest read as context.
          const isLead = bar.value === peak;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: CONTENT_W,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: LABEL_W,
                  paddingRight: 16,
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  fontSize: fitText(bar.label, BAR_LABEL_TIERS),
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                  color: palette.text,
                }}
              >
                {bar.label}
              </div>

              <div
                style={{
                  display: "flex",
                  width: TRACK_W,
                  height: barHeight,
                  backgroundColor: rgba(palette.text, 0.07),
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: fillW,
                    height: barHeight,
                    backgroundColor: isLead ? palette.accent : rgba(palette.text, 0.3),
                    borderRadius: 4,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  width: VALUE_W,
                  paddingLeft: 24,
                  justifyContent: "flex-end",
                  fontFamily: FONT_SANS,
                  fontWeight: 800,
                  fontSize: 34,
                  letterSpacing: "-0.03em",
                  color: palette.text,
                }}
              >
                {bar.display ?? bar.value.toLocaleString("en-US")}
              </div>
            </div>
          );
        })}
      </div>

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
