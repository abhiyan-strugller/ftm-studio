/** Template 1 — kicker, oversized serif headline, short dek. */
import { DEK_TIERS, fitText, HEADLINE_HERO_TIERS } from "../fit";
import { FONT_SANS } from "../fonts";
import { CONTENT_W, Kicker, SourceLine } from "../frame";
import { Headline } from "../headline";
import type { Palette } from "../palettes";
import type { PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "headline" }>;

export function HeadlineTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  const size = fitText(doc.headline, HEADLINE_HERO_TIERS);
  const dek = doc.data.dek;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      {doc.kicker ? <Kicker palette={palette}>{doc.kicker}</Kicker> : null}

      <Headline
        palette={palette}
        text={doc.headline}
        accentWord={doc.accent_word}
        fontSize={size}
      />

      {dek ? (
        <div
          style={{
            display: "flex",
            width: CONTENT_W,
            marginTop: 36,
            paddingTop: 30,
            borderTopWidth: 1,
            borderTopStyle: "solid",
            borderTopColor: palette.rule,
            fontFamily: FONT_SANS,
            fontWeight: 400,
            fontSize: fitText(dek, DEK_TIERS),
            lineHeight: 1.42,
            color: palette.muted,
          }}
        >
          {dek}
        </div>
      ) : null}

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
