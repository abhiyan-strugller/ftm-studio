/** Template 6 — headline plus 3-5 numbered steps with inline stroke icons. */
import { fitText, HEADLINE_COMPACT_TIERS, STEP_LABEL_TIERS } from "../fit";
import { FONT_SANS } from "../fonts";
import { CONTENT_W, Kicker, MONO_LABEL, rgba, SourceLine } from "../frame";
import { Headline } from "../headline";
import { StepIconGlyph } from "../icons";
import type { Palette } from "../palettes";
import type { PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "steps" }>;

const BADGE = 64;

export function StepsTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  const steps = doc.data.steps;
  const rowGap = steps.length <= 3 ? 30 : steps.length === 4 ? 22 : 16;
  const rowPad = steps.length <= 3 ? 24 : steps.length === 4 ? 20 : 16;

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
          flexDirection: "column",
          width: CONTENT_W,
          marginTop: 44,
          rowGap,
        }}
      >
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              width: CONTENT_W,
              padding: rowPad,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: palette.rule,
              borderRadius: 10,
            }}
          >
            {/* Step number */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: BADGE,
                height: BADGE,
                borderRadius: 999,
                backgroundColor: rgba(palette.accent, palette.dark ? 0.16 : 0.12),
                ...MONO_LABEL,
                fontSize: 26,
                letterSpacing: "0",
                color: palette.accent,
              }}
            >
              {String(i + 1)}
            </div>

            {/* Icon */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 52,
                marginLeft: 20,
              }}
            >
              <StepIconGlyph icon={step.icon} size={36} color={palette.muted} />
            </div>

            {/* Label + detail */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: CONTENT_W - rowPad * 2 - BADGE - 52 - 40,
                marginLeft: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  fontSize: fitText(step.label, STEP_LABEL_TIERS),
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  color: palette.text,
                }}
              >
                {step.label}
              </div>
              {step.detail ? (
                <div
                  style={{
                    display: "flex",
                    marginTop: 6,
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    lineHeight: 1.35,
                    color: palette.muted,
                  }}
                >
                  {step.detail}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {doc.source_line ? <SourceLine palette={palette}>{doc.source_line}</SourceLine> : null}
    </div>
  );
}
