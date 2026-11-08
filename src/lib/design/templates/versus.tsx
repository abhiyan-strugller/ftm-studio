/** Template 5 — "A or B": two cards with amounts, plus a vote pill. */
import { fitText, HEADLINE_COMPACT_TIERS, VERSUS_AMOUNT_TIERS } from "../fit";
import { FONT_SANS, FONT_SERIF } from "../fonts";
import { CONTENT_W, Kicker, MONO_LABEL, SourceLine } from "../frame";
import { Headline } from "../headline";
import type { Palette } from "../palettes";
import type { PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "versus" }>;

const OR_W = 86;
const CARD_W = Math.floor((CONTENT_W - OR_W) / 2); // 425

function Side({
  palette,
  side,
  highlight,
}: {
  palette: Palette;
  side: { label: string; amount: string; sub?: string };
  highlight: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: CARD_W,
        height: 330,
        padding: 32,
        backgroundColor: palette.surface,
        borderWidth: highlight ? 2 : 1,
        borderStyle: "solid",
        borderColor: highlight ? palette.accent : palette.rule,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          ...MONO_LABEL,
          fontSize: 18,
          lineHeight: 1.35,
          color: highlight ? palette.accent : palette.muted,
        }}
      >
        {side.label}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: FONT_SANS,
            fontWeight: 800,
            fontSize: fitText(side.amount, VERSUS_AMOUNT_TIERS),
            letterSpacing: "-0.035em",
            lineHeight: 1,
            color: palette.text,
          }}
        >
          {side.amount}
        </div>
        {side.sub ? (
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontFamily: FONT_SANS,
              fontSize: 22,
              lineHeight: 1.35,
              color: palette.muted,
            }}
          >
            {side.sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function VersusTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
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
          alignItems: "center",
          width: CONTENT_W,
          marginTop: 44,
        }}
      >
        <Side palette={palette} side={doc.data.option_a} highlight />
        <div
          style={{
            display: "flex",
            width: OR_W,
            justifyContent: "center",
            fontFamily: FONT_SERIF,
            fontStyle: "italic",
            fontSize: 44,
            color: palette.muted,
          }}
        >
          or
        </div>
        <Side palette={palette} side={doc.data.option_b} highlight={false} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: CONTENT_W,
          marginTop: 36,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 28,
            paddingRight: 28,
            borderRadius: 999,
            backgroundColor: palette.accent,
            ...MONO_LABEL,
            fontSize: 19,
            color: palette.onAccent,
          }}
        >
          {doc.data.pill ?? "Vote in comments"}
        </div>
      </div>

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
