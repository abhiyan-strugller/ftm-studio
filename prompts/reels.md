# Reels spec — Follow the Money

How a Reel gets made, what it may never contain, and how it ships. The goal is
reach: Reels are Facebook's main distribution surface for pages nobody follows
yet, which is exactly our situation.

## Format (v1: the "money trail" reel)

The moving version of the plain card. 1080x1920 MP4, 20–40 seconds, built by
`npm run render-reel -- --input input/reels/<slug>.json`:

THE LOOK — HAND-PAINTED (since 2026-11-22). `render-reel` is
`scripts/render-reel-paint.py`. Each slide becomes a scene of p5.brush
watercolour and ink over big Inter type on warm paper (#f3ecdc): a wash behind
the hook number, a red marker underline, an accent bar beside body copy, a
painted speech bubble around the closing question. The template is
`reel-template/index.html` and is DATA-DRIVEN — it reads the same reel doc, so
no per-story code is ever written. Text is laid out in a centred flex column
and the paint is positioned from the MEASURED text boxes, so it can never
overlap however long the lines run. Paint strokes are seeded from the slug, so
no two reels look alike. Render it with `--stills` first to eyeball each scene.
The old slide renderer survives as `npm run render-reel-slides`, and the
painted one falls back to it automatically if Chrome/playwright is missing.

- 4–9 slides, source line pinned at the bottom, FOLLOW THE MONEY wordmark and
  an accent progress bar on top of every scene.

CHARTS — put the numbers on screen. Any slide may carry an optional `chart`
block and the renderer paints it (bars grow one after another, the key bar in
red and hatched, labels as crisp DOM text, an ink axis, and a trend stroke
across the tops on a `bars` chart):

```json
{"kind":"body","lines":["Up 6% — the first rise since 2022."],
 "chart":{"type":"bars","unit":"$","highlight":"2026",
          "data":[["2022",64.05],["2025",55.18],["2026",58.63]]}}
{"kind":"body","lines":["The bird set the tone."],
 "chart":{"type":"rank","unit":"%","highlight":"16-lb turkey",
          "data":[["16-lb turkey",10],["Cranberries",9],["Dinner rolls",7]]}}
```

`type` is `bars` (a series over time) or `rank` (biggest movers). `unit` is
`$`, `%` or omitted. `highlight` names the row to put in red. ONLY ever chart
figures that are literally in the post — never fill in a missing year to make
a series look neater. 2–5 rows reads best; keep labels short.

ILLUSTRATION — the renderer picks a painted motif by matching words in the
reel's title and lines: turkey, cart, bag, car, house, fuel, coin, candles,
bank, paycheck, chip, plane, cash (the fallback). It draws on the hook scene.
Nothing to configure — write the story and the right drawing turns up.
- Slide beats mirror the caption DNA: HOOK (one huge number) → 3–4 body beats
  (what happened → the hidden part → who wins, who pays → "this is your
  money") → "My take:" (green, opinionated) → end card (question + "Follow
  for the money trail.").
- Scenes fade to blank paper at their edges, so the cuts between separately
  rendered scene files are invisible. Budget ~3 min to render on 2 cores.
- Safe areas are built in: nothing in the top 170px or bottom 260px, so the
  Reels UI never covers the text.
- Audio: an ORIGINAL procedural bed (`scripts/gen-reel-bed.py`, seeded per
  reel). We own every sample, so there is nothing to Content-ID.
- The source line sits on every slide. Figures follow prompts/research.md:
  period + already-released + named source, one-outlet rule included.

The reel is chosen from the day's research: the single most viral-worthy
story of the sweep — usually the one with the biggest number and the clearest
villain/victim pair.

## Hard rules (strike avoidance — zero tolerance)

- **No faces.** Not Abhiyan's, not AI-generated people, no stock footage or
  photos of people. Typography and our own marks only.
- **No copyrighted anything**: no commercial music (the procedural bed or
  verified royalty-free-for-commercial only), no film/TV clips, no other
  creators' videos or screenshots of their posts, no news footage, no logos
  beyond our own, no meme templates. If an asset's license takes more than a
  sentence to explain, it doesn't go in.
- **No reused content**: every reel is rendered from our own JSON — never a
  compilation, never re-uploaded media. Facebook's monetization rules punish
  unoriginal content; this page is built for payouts.
- Everything in caption.md still applies: no predictions, no buy/sell advice,
  no manufactured urgency, respectful on tragedy.
- CapCut Pro (Abhiyan's subscription, web) is an allowed POLISH tool — e.g. a
  TTS voiceover track or transition pass — but only CapCut's
  commercially-licensed assets, and the automated pipeline must never depend
  on driving its UI: code renders the reel; CapCut is optional garnish.

## Cadence and shipping

- **6 reels a day** (raised from 4 on 2026-11-22; cards at 08/14/20, a reel on every one of the six slots — 9 posts/day total, under the 12-post cap).
  Under the intraday model reels run every day, one per slot (see prompts/intraday.md).
- The day's 6 reels each come from that cycle's freshest, most-viewed sweep story
  (they can share a story with a card — different format, different slot) and
  spread across the day between card slots: roughly 9:30 AM, 1:30 PM,
  6:00 PM, 8:30 PM ET.
- Scheduling rides the EXISTING pipeline, wired end to end since 2026-11-15:
  the day file takes a top-level `reels: [{ "slug", "scheduled_at" }]` block;
  `build-day` copies each rendered MP4 from output/reels/<slug>/ into
  output/<date>/, adds a sheet row with the video's Pages URL, the caption
  and source from input/reels/<slug>.json, and `reel` in the REEL OR STORY
  column; `publish-media` ships MP4s with the PNGs. Nothing else to do —
  Task B uploads the sheet as usual.
- Reel slots, planner zone (Mountain): **10:15, 12:45, 16:45, 20:30** —
  between card slots, and never earlier than 10:15, because Task B's last
  retry runs at 9:42 and the past-row guard would refuse a sheet whose
  earliest row had already passed.
- The reel's caption ends with a question, THEN a hashtag block on its own
  line. Reels carry more hashtags than cards — aim for 10-13: a mix of
  broad-reach tags (#StockMarket #Investing #PersonalFinance #MoneyTok
  #WallStreet), 3-5 specific to the story (#Nvidia #FederalReserve
  #AnthropicIPO…), and always #FollowTheMoney last. Keep them real and
  topical — this is reach, not spam; no #fyp-style filler, nothing unrelated
  to the money angle. The source link still goes in FIRST COMMENT, same as
  cards.
- Size watch: ~2.5MB per reel ≈ 40MB/week in ftm-media. Fine for months;
  when the repo nears ~1GB, move reel hosting to a second public repo
  (ftm-media-reels) — same Pages setup, never delete anything unpublished.

## CapCut integration (logged in, verified Nov 14)

Abhiyan's CapCut web account is signed in on his Chrome (1TB space, credits
active). Its Voice Studio TTS is the sanctioned way to add a voiceover layer:
generate the narration from the reel's slide text, export the audio, drop it
beside the reel JSON as voice.wav for the renderer to mix. UI-driven, so it
stays an enhancement pass — the code renderer must always produce a complete,
shippable reel without it.

## Review

Until Abhiyan says otherwise, each reel's MP4 goes to him with the day's
report before its sheet row ships. When he's comfortable, the render + row
moves fully into Task A and his role is the morning report only.


MUSIC (since 2026-11-22): every reel gets its own catchy bed — a melodic
pentatonic hook, bassline and groove (kick/hats/clap), in one of several styles
(pulse, bounce, lofi, drive, anthem) chosen from the slug's seed, so no two
reels sound alike. It is still fully procedural and numpy-free. Nothing to set
in the doc.

CARDS are painted too now (see CLAUDE.md): a card doc may carry `accent`
(gold/green), an optional `chart` (same schema as below) and an optional `big`
stat, and render-card-paint.py draws it in the same watercolour style.
