/**
 * Template 7 — world events, framed as money impact.
 *
 * The badge is load-bearing: CONFIRMED / DEVELOPING / UNCONFIRMED tells the
 * reader how solid the story is before they read the headline. UNCONFIRMED is
 * drawn as an outline in the warning colour so it never looks like a fact.
 */
import { fitText, HEADLINE_BREAKING_TIERS, IMPACT_SECTOR_TIERS } from "../fit";
import { FONT_SANS } from "../fonts";
import { CONTENT_W, Kicker, MONO_LABEL, rgba, SourceLine } from "../frame";
import { Headline } from "../headline";
import type { Palette } from "../palettes";
import type { Badge, Direction, PostDoc } from "../../schema";
import { deltaStyle } from "../delta";

type Doc = Extract<PostDoc, { template: "breaking" }>;

function badgeColors(badge: Badge, palette: Palette): { fg: string; bg: string; border: string } {
  if (badge === "CONFIRMED") {
    return { fg: palette.onAccent, bg: palette.accent, border: palette.accent };
  }
  const warn = palette.dark ? "#F2B632" : "#9A6B00";
  if (badge === "DEVELOPING") {
    return { fg: warn, bg: rgba(warn, 0.14), border: rgba(warn, 0.55) };
  }
  // UNCONFIRMED — outline only, nothing solid.
  return { fg: warn, bg: "transparent", border: warn };
}

function ImpactArrow({ direction, color }: { direction: Direction; color: string }) {
  if (direction === "flat") {
    return (
      <svg width={22} height={22} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={2.6}>
        <path d="M3 8 L13 8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={22} height={22} viewBox="0 0 16 16" fill={color}>
      {direction === "up" ? <polygon points="8,2 14,12 2,12" /> : <polygon points="8,14 14,4 2,4" />}
    </svg>
  );
}

export function BreakingTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  const badge = badgeColors(doc.data.badge, palette);
  const impacts = doc.data.impacts;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      <div style={{ display: "flex", flexDirection: "row", width: CONTENT_W, marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            paddingTop: 11,
            paddingBottom: 11,
            paddingLeft: 22,
            paddingRight: 22,
            borderRadius: 6,
            backgroundColor: badge.bg,
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: badge.border,
            ...MONO_LABEL,
            fontSize: 20,
            color: badge.fg,
          }}
        >
          {doc.data.badge}
        </div>
      </div>

      {doc.kicker ? <Kicker palette={palette}>{doc.kicker}</Kicker> : null}

      <Headline
        palette={palette}
        text={doc.headline}
        accentWord={doc.accent_word}
        fontSize={fitText(doc.headline, HEADLINE_BREAKING_TIERS)}
      />

      <div
        style={{
          display: "flex",
          ...MONO_LABEL,
          fontSize: 19,
          color: palette.muted,
          marginTop: 44,
          paddingTop: 24,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: palette.rule,
        }}
      >
        {doc.data.impacts_label ?? "What it means for your money"}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: CONTENT_W,
          marginTop: 24,
          rowGap: impacts.length > 2 ? 16 : 20,
        }}
      >
        {impacts.map((impact, i) => {
          // Arrow = what moved; colour = whether that helps the reader. Same
          // rule as the stats tiles, via the same helper.
          const { arrow, color } = deltaStyle(impact, palette);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: CONTENT_W,
                padding: 22,
                backgroundColor: palette.surface,
                borderLeftWidth: 4,
                borderLeftStyle: "solid",
                borderLeftColor: color,
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: CONTENT_W - 44 - 230,
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  fontSize: fitText(impact.sector, IMPACT_SECTOR_TIERS),
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  color: palette.text,
                }}
              >
                {impact.sector}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  columnGap: 10,
                }}
              >
                <ImpactArrow direction={arrow} color={color} />
                <div
                  style={{
                    display: "flex",
                    fontFamily: FONT_SANS,
                    fontWeight: 800,
                    fontSize: 32,
                    letterSpacing: "-0.03em",
                    color,
                  }}
                >
                  {impact.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
