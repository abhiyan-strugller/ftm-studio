/**
 * Template 8 — `plain`: a text post on a solid ground.
 *
 * Modelled on the screenshot-of-a-text-post cards that dominate the biggest
 * finance pages: one ground, one ink, one sans face, a blank line between
 * thoughts, and the page's own name at the top where the original author's
 * handle would sit. Deliberately NOT framed by the standard chrome — no top
 * bar, no glow, no kicker, no serif, no italic accent. The absence of design
 * is the design, so this file must stay boring.
 *
 * The shared `headline` field is the opening line; `data.paragraphs` follow.
 * All lines render at the same size and weight, like a real text post.
 */
import { fitText, PLAIN_BODY_TIERS } from "../fit";
import { FONT_SANS } from "../fonts";
import { Logo, BRAND_GREEN, BRAND_GOLD } from "../logo";
import type { Palette } from "../palettes";
import type { PostDoc } from "../../schema";

type Doc = Extract<PostDoc, { template: "plain" }>;

export const PLAIN_CANVAS_W = 1080;
export const PLAIN_CANVAS_H = 1350;
export const PLAIN_PAD = 84;
export const PLAIN_CONTENT_W = PLAIN_CANVAS_W - PLAIN_PAD * 2; // 912

/**
 * The palette picks dark vs light only; the inks are fixed. A tinted ground
 * reads as "designed", so the plain card uses near-black and plain white.
 */
export function plainColors(dark: boolean) {
  return dark
    ? { bg: "#0A0A0A", text: "#F5F5F5", muted: "#9A9A9A", avatarRing: "#2A2A2A" }
    : { bg: "#FFFFFF", text: "#161616", muted: "#6F6F6F", avatarRing: "#E4E4E4" };
}

export function plainBodySize(doc: Doc): number {
  const total = [doc.headline, ...doc.data.paragraphs].join(" ").length;
  return fitText("x".repeat(total), PLAIN_BODY_TIERS);
}

export function PlainTemplate({ doc, palette }: { doc: Doc; palette: Palette }) {
  const c = plainColors(palette.dark);
  const size = plainBodySize(doc);
  const gap = Math.round(size * 0.85);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: PLAIN_CANVAS_W,
        height: PLAIN_CANVAS_H,
        padding: PLAIN_PAD,
        backgroundColor: c.bg,
        color: c.text,
        fontFamily: FONT_SANS,
      }}
    >
      {/* Header: avatar + page name, the way a text post carries its author. */}
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 92,
            height: 92,
            borderRadius: 46,
            backgroundColor: "#0E2238",
            borderWidth: 2,
            borderStyle: "solid",
            borderColor: c.avatarRing,
          }}
        >
          <Logo width={52} stroke={BRAND_GREEN} dot={BRAND_GOLD} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: c.text }}>
            Follow the Money
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 400, color: c.muted, marginTop: 4 }}>
            Money · Policy · You
          </div>
        </div>
      </div>

      {/* Body: the post itself, vertically centred in the remaining space. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: PLAIN_CONTENT_W,
          flexGrow: 1,
          paddingTop: 40,
          paddingBottom: 32,
        }}
      >
        {[doc.headline, ...doc.data.paragraphs].map((para, i, all) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: PLAIN_CONTENT_W,
              fontSize: size,
              fontWeight: 600,
              lineHeight: 1.36,
              letterSpacing: "-0.01em",
              color: c.text,
              marginBottom: i === all.length - 1 ? 0 : gap,
            }}
          >
            {para}
          </div>
        ))}
      </div>

      {/* Footer: the source, small and quiet. Facts carry their origin. */}
      {doc.source_line ? (
        <div style={{ display: "flex", fontSize: 21, fontWeight: 400, color: c.muted }}>
          {doc.source_line}
        </div>
      ) : null}
    </div>
  );
}
