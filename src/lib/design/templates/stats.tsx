/** Template 2 — headline plus three stat tiles with optional up/down deltas. */
import { fitText, HEADLINE_COMPACT_TIERS, STAT_VALUE_TIERS } from "../fit";
import { FONT_SANS } from "../fonts";
import { CONTENT_W, Kicker, MONO_LABEL, SourceLine } from "../frame";
import { Headline } from "../headline";
import type { Palette } from "../palettes";
import type { Direction, PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "stats" }>;

const TILE_GAP = 24;
const TILE_W = Math.floor((CONTENT_W - TILE_GAP * 2) / 3); // 296

/** Up/down arrow drawn as a glyph so it inherits the delta colour. */
function DeltaArrow({ direction, color, size }: { direction: Direction; color: string; size: number }) {
  if (direction === "flat") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2.4}>
        <path d="M3 8 L13 8" strokeLinecap="round" />
      </svg>
    );
  }
  const up = direction === "up";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      {up ? <polygon points="8,3 14,12 2,12" /> : <polygon points="8,13 14,4 2,4" />}
    </svg>
  );
}

function deltaColor(direction: Direction | undefined, palette: Palette): string {
  // Semantic direction colours, not the accent — see Palette.up/down.
  if (direction === "up") return palette.up;
  if (direction === "down") return palette.down;
  return palette.muted;
}

export function StatsTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      {doc.kicker ? <Kicker palette={palette}>{doc.kicker}</Kicker> : null}

      <Headline
        palette={palette}
        text={doc.headline}
        accentWord={doc.accent_word}
        fontSize={fitText(doc.headline, HEADLINE_COMPACT_TIERS)}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: CONTENT_W,
          marginTop: 52,
          columnGap: TILE_GAP,
        }}
      >
        {doc.data.stats.map((stat, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: TILE_W,
              height: 250,
              padding: 26,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: palette.rule,
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                ...MONO_LABEL,
                fontSize: 17,
                lineHeight: 1.35,
                color: palette.muted,
              }}
            >
              {stat.label}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: FONT_SANS,
                  fontWeight: 800,
                  fontSize: fitText(stat.value, STAT_VALUE_TIERS),
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: palette.text,
                }}
              >
                {stat.value}
              </div>

              {stat.delta ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 14,
                    columnGap: 8,
                  }}
                >
                  <DeltaArrow
                    direction={stat.direction ?? "flat"}
                    color={deltaColor(stat.direction, palette)}
                    size={16}
                  />
                  <div
                    style={{
                      display: "flex",
                      fontFamily: FONT_SANS,
                      fontWeight: 600,
                      fontSize: 24,
                      letterSpacing: "-0.01em",
                      color: deltaColor(stat.direction, palette),
                    }}
                  >
                    {stat.delta}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {doc.data.footnote ? (
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontFamily: FONT_SANS,
            fontSize: 21,
            lineHeight: 1.4,
            color: palette.muted,
          }}
        >
          {doc.data.footnote}
        </div>
      ) : null}

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
