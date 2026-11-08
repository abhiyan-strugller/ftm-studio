/**
 * Serif headline with one italic accent word.
 *
 * Each word is its own flex item inside a wrapping row. That is what makes the
 * accent word possible: Satori lays nested elements out as flex boxes rather
 * than inline runs, so a `<span>` mid-sentence would force a line break. Word
 * items wrap exactly where a browser would.
 */
import { accentWordRange, splitWords } from "./fit";
import { FONT_SERIF } from "./fonts";
import { CONTENT_W } from "./frame";
import type { Palette } from "./palettes";

export function Headline({
  palette,
  text,
  accentWord,
  fontSize,
  width = CONTENT_W,
}: {
  palette: Palette;
  text: string;
  accentWord?: string;
  fontSize: number;
  width?: number;
}) {
  const words = splitWords(text);
  const range = accentWordRange(words, accentWord);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        width,
        // A space in Instrument Serif is ~0.25em; rowGap 0 keeps leading tight.
        columnGap: Math.round(fontSize * 0.25),
        rowGap: 0,
      }}
    >
      {words.map((word, i) => {
        const isAccent = range !== null && i >= range.start && i < range.end;
        return (
          <div
            key={`${i}-${word}`}
            style={{
              display: "flex",
              fontFamily: FONT_SERIF,
              fontWeight: 400,
              fontSize,
              lineHeight: 1.04,
              fontStyle: isAccent ? "italic" : "normal",
              color: isAccent ? palette.accent : palette.text,
            }}
          >
            {word}
          </div>
        );
      })}
    </div>
  );
}
