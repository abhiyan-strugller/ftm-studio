/**
 * The shared post frame every template sits inside.
 *
 * Satori renders a flexbox subset only — no CSS grid, no backdrop-filter — so
 * the whole composition is nested flex rows and columns with explicit sizes.
 */
import { hexToRgb } from "./contrast";
import { FONT_MONO, FONT_SANS } from "./fonts";
import { Logo, BRAND_GOLD, logoStroke } from "./logo";
import type { Palette } from "./palettes";

export const CANVAS_W = 1080;
export const CANVAS_H = 1350;
export const PAD = 72;
export const CONTENT_W = CANVAS_W - PAD * 2; // 936

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const MONO_LABEL = {
  fontFamily: FONT_MONO,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.18em",
};

/** Zero-padded issue number for the "NO. ###" header. */
export function issueNumber(n: number): string {
  return String(n).padStart(3, "0");
}

function TopBar({ palette, tag, postNumber }: { palette: Palette; tag: string; postNumber: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      <div
        style={{
          display: "flex",
          ...MONO_LABEL,
          fontSize: 21,
          color: palette.muted,
        }}
      >
        {`Follow the Money · ${tag} · No. ${issueNumber(postNumber)}`}
      </div>
      <div
        style={{
          display: "flex",
          width: CONTENT_W,
          height: 1,
          marginTop: 18,
          backgroundColor: palette.rule,
        }}
      />
    </div>
  );
}

function BottomBar({ palette }: { palette: Palette }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: CONTENT_W }}>
      <div
        style={{
          display: "flex",
          width: CONTENT_W,
          height: 1,
          marginBottom: 20,
          backgroundColor: palette.rule,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: CONTENT_W,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
          <Logo width={46} stroke={logoStroke(palette)} dot={BRAND_GOLD} />
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              fontFamily: FONT_SANS,
              fontWeight: 600,
              fontSize: 25,
              color: palette.text,
              letterSpacing: "-0.01em",
            }}
          >
            Follow the Money
          </div>
        </div>
        <div
          style={{
            display: "flex",
            ...MONO_LABEL,
            fontWeight: 400,
            fontSize: 19,
            color: palette.muted,
          }}
        >
          Money · Policy · You
        </div>
      </div>
    </div>
  );
}

/**
 * A soft accent glow in one corner. Dark grounds only — on cream or sand it
 * muddies the paper rather than adding depth.
 */
function Glow({ palette }: { palette: Palette }) {
  if (!palette.dark) return null;
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top: -340,
        right: -260,
        width: 820,
        height: 820,
        borderRadius: 410,
        backgroundImage: `radial-gradient(circle at center, ${rgba(
          palette.accent,
          0.26,
        )} 0%, ${rgba(palette.accent, 0.08)} 42%, ${rgba(palette.accent, 0)} 70%)`,
      }}
    />
  );
}

export function Frame({
  palette,
  tag,
  postNumber,
  children,
}: {
  palette: Palette;
  tag: string;
  postNumber: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        width: CANVAS_W,
        height: CANVAS_H,
        padding: PAD,
        backgroundColor: palette.bg,
        color: palette.text,
        fontFamily: FONT_SANS,
      }}
    >
      <Glow palette={palette} />
      <TopBar palette={palette} tag={tag} postNumber={postNumber} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: CONTENT_W,
          flexGrow: 1,
          paddingTop: 36,
          paddingBottom: 36,
        }}
      >
        {children}
      </div>
      <BottomBar palette={palette} />
    </div>
  );
}

/** Small uppercase mono kicker above a headline. */
export function Kicker({ palette, children }: { palette: Palette; children: string }) {
  return (
    <div
      style={{
        display: "flex",
        ...MONO_LABEL,
        fontSize: 22,
        color: palette.accent,
        marginBottom: 22,
      }}
    >
      {children}
    </div>
  );
}

/** "Source: …" line, always the last thing above the bottom bar. */
export function SourceLine({ palette, children }: { palette: Palette; children: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: FONT_SANS,
        fontSize: 20,
        color: palette.muted,
        marginTop: 28,
      }}
    >
      {children}
    </div>
  );
}
