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

- **4 reels a week** (default days: Mon, Wed, Fri, Sat — Abhiyan can change).
- Scheduling rides the EXISTING pipeline: Post Planner's bulk sheet supports
  video, and the REEL OR STORY column set to `reel` publishes it as a Reel
  (confirmed from reference/sample_bulk_posts_import.xlsx, which shows a
  queued .mov with `reel`). So: host the MP4 publicly (ftm-media, like the
  card PNGs), add a sheet row with the video URL + posting time + `reel`,
  and Task B's upload puts it in the queue like any post.
- Best slot: evening ET (reel rows replace or add to a day's 10 at ~7–9 PM
  ET), one reel per day maximum.
- The reel's caption ends with a question; the source link goes in FIRST
  COMMENT, same as cards.

## Review

Until Abhiyan says otherwise, each reel's MP4 goes to him with the day's
report before its sheet row ships. When he's comfortable, the render + row
moves fully into Task A and his role is the morning report only.
