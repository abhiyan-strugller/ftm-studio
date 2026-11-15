# Reels spec — Follow the Money

How a Reel gets made, what it may never contain, and how it ships. The goal is
reach: Reels are Facebook's main distribution surface for pages nobody follows
yet, which is exactly our situation.

## Format (v1: the "money trail" reel)

The moving version of the plain card. 1080x1920 MP4, 20–40 seconds, built by
`npm run render-reel -- --input input/reels/<slug>.json`:

- 4–9 slides, big Inter text on near-black / white, page header on top,
  source line pinned at the bottom. Slides alternate dark → light → dark —
  the cut itself is the pattern interrupt that keeps thumbs still.
- Slide beats mirror the caption DNA: HOOK (one huge number) → 3–4 body beats
  (what happened → the hidden part → who wins, who pays → "this is your
  money") → "My take:" (green, opinionated) → end card (question + "Follow
  for the money trail.").
- Slow push-in zoom per slide; thin brand-green progress bar along the top.
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

- **4 reels a day on 4 days a week — 16 a week** (Abhiyan's spec, Nov 14).
  Default reel days: Mon, Wed, Fri, Sat; he can change them.
- On a reel day, the 4 reels come from the day's 4 strongest sweep stories
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
- The reel's caption ends with a question; the source link goes in FIRST
  COMMENT, same as cards.
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
