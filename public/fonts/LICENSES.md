# Bundled fonts

All three families are licensed under the **SIL Open Font License 1.1**, which
permits bundling and redistribution inside this application.

| File(s)                                                  | Family           | Source |
| -------------------------------------------------------- | ---------------- | ------ |
| `InstrumentSerif-Regular.ttf`, `InstrumentSerif-Italic.ttf` | Instrument Serif | [google/fonts — ofl/instrumentserif](https://github.com/google/fonts/tree/main/ofl/instrumentserif) |
| `Inter-Regular.ttf`, `Inter-SemiBold.ttf`, `Inter-ExtraBold.ttf` | Inter (400/600/800) | [rsms/inter v4.1 release](https://github.com/rsms/inter/releases/tag/v4.1) — `extras/ttf/` |
| `JetBrainsMono-Regular.ttf`, `JetBrainsMono-SemiBold.ttf` | JetBrains Mono   | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono/tree/master/fonts/ttf) |

OFL-1.1 full text: <https://openfontlicense.org/open-font-license-official-text/>

## Why these files are committed

Satori (the renderer behind `next/og`) needs each face as an **`ArrayBuffer` of a
TTF or OTF** — it cannot load WOFF2, and it cannot fetch from Google Fonts at
render time on Vercel. The files also have to be inside the deployment bundle,
which is why `next.config.ts` lists `public/fonts/**` under
`outputFileTracingIncludes`.

Inter specifically must be the **static** faces: `google/fonts` only ships the
variable `Inter[opsz,wght].ttf`, which Satori renders at one weight regardless of
the `fontWeight` you ask for — so 600 and 800 would silently look like 400.

Re-fetch all of them with `npm run fonts`.
