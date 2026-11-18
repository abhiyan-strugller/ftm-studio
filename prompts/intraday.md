# Intraday spec — same-day, fresh every 3 hours

The model since 2026-11-17. Follow the Money stopped posting a fixed daily
batch built the night before. Instead, a fresh post goes out roughly every 3
hours, each one researched minutes before it posts, so the page always carries
**today's** most-viewed money news — never yesterday's.

This file governs a single CYCLE. `research.md` still defines how to judge a
story; this file defines the lighter, faster, fresher shape of each run.

## Audience: US + Canada

Follow the Money now speaks to **both the US and Canada**. Every cycle, look at
both:
- US: the Fed, US banks and card rates, US jobs/CPI, Wall Street, US gas.
- Canada: the Bank of Canada, CAD, Canadian banks, Canadian grocery and
  housing costs, TSX, provincial money news.
Pick whichever story is biggest and freshest that hour; across a day the mix
should not be all-US. When a figure is Canadian, say so and use CAD; when US,
USD. A story that hits both (a cross-border bank, a continent-wide outage, a
commodity price) is ideal.

## What each cycle looks for

**The freshest, most-viewed thing right now in the money niche.** Not a
timeless explainer — the news. Each cycle, search for what is breaking and
being viewed TODAY:
- markets falling or spiking (a named index, stock, or crypto, with the move)
- a cyberattack or outage with a dollar cost or a "who pays" (our core beat)
- a rate decision, inflation print, jobs number, big layoff
- a CEO/company money story (the watchlist in research.md)
- anything going viral that touches a paycheck, rent, groceries, savings, a
  card rate or a job

Freshness is the whole point: the story must have broken or moved **today**
(or, late at night, within the last ~18 hours). Re-pull live prices at build
time. If genuinely nothing fresh clears the stakes bar this cycle (rare), use
the single strongest story of the last 24h and say so in the run-log — never
pad with an evergreen on the intraday schedule; evergreens are gone.

## The strikes rule is UNCHANGED and absolute

Most-viewed news is found by SEARCH and READING, then written in our own
words. We never repost, screenshot, or reproduce anyone's article, image,
headline, video, or post. Cards are our typography; reels are our typography +
our procedurally-generated audio (no numpy, no licensed music, no faces). Every
figure still names its period and a reliable named source (one-outlet rule from
research.md applies). Paraphrase, never copy. This is how the page stays
monetizable and strike-free while chasing breaking news.

## What a cycle produces — depends on the slot

To stay under Post Planner's **12-posts-per-24-hours PER-PROFILE cap** (hit on
2026-11-17, when 5 cards + 5 reels overlapped the old model's posts in the
rolling window and the day's later posts failed), Follow the Money posts
**7 items a day: 3 cards + 4 reels**, split across the 5 slots by this FIXED
map. Build exactly what your slot calls for — never more, never less:

| Slot (Edmonton) | Builds |
| --- | --- |
| 08:00 | card + reel |
| 11:00 | reel only |
| 14:00 | card only |
| 17:00 | reel only |
| 20:00 | card + reel |

Cards at 08:00, 14:00, 20:00 (3) + reels at 08:00, 11:00, 17:00, 20:00 (4) = 7.

- Card: the `plain` template, caption in the house shape (fact → number →
  "My take:" → question), per `caption.md`.
- Reel: per `reels.md` — hook (count-up number), 3-4 beats, "My take:", end
  question, 10-13 hashtags, varied style. Skip `voice` in automated cycles.
- On a **card+reel** slot both share the same fresh story — different format,
  same moment. A **reel-only** slot writes `input/<date>.json` with an EMPTY
  `posts` list (just the `reels` block). A **card-only** slot writes the one
  post and omits the `reels` block. build-day accepts all three; only a day
  file with neither a card nor a reel is rejected.

## Timing — near-future, never past

A build cycle runs at :40 and schedules its post for the top of the next hour,
in America/Edmonton; the upload cycle runs at :55 and puts it in Post Planner:

| Build fires (A) | Upload fires (B) | Posts at (Edmonton) | = New York | Builds |
| --- | --- | --- | --- | --- |
| 7:40 | 7:55 | 8:00 | 9:00 AM | card + reel |
| 10:40 | 10:55 | 11:00 | 12:00 PM | reel only |
| 13:40 | 13:55 | 14:00 | 3:00 PM | card only |
| 16:40 | 16:55 | 17:00 | 6:00 PM | reel only |
| 19:40 | 19:55 | 20:00 | 9:00 PM | card + reel |

Five cycles → 3 cards + 4 reels a day (7 total), covering the US/Canada East-coast
morning through evening (the grid was shifted 3h earlier on Abhiyan's call:
starting at 11:00 Edmonton would have meant noon in New York, losing the
whole morning). The
slot must always be in the FUTURE when the uploader runs (the past-row guard
aborts otherwise), which is why the build leads the slot by 20 min and the
uploader runs 5 min before the slot. Never schedule a slot that has already
passed — always the top of the hour after the build fires.

## No collisions between cycles (critical)

All of a day's cycles write into the same `output/<date>/` and the same
`ftm-media/<date>/` folder, and a card's published image URL is
`<date>/<post.id>-<template>.png`. So every cycle MUST use media names that no
other cycle will reuse, or an earlier cycle's live post will silently show a
later cycle's image:
- **Card `id` = the slot in HHMM** (24h): the 14:00 cycle's post id is
  `"1400"` → `1400-plain.png`. Unique per slot, every day.
- **Reel slug** already carries the date and topic
  (`<date>-<topic>`); keep it unique — never reuse a slug from an earlier
  cycle the same day.
publish-media only ever ADDS files; it never deletes, so each cycle's media
accumulates and every already-published post keeps pointing at its own bytes.

## Per-cycle sheet and hand-off

Each cycle is a mini-build: write `input/<date>.json` with just this slot's
content per the map — a card (id = slot HHMM), a `reels` block of 1 reel, or
both — then `build-day` → `publish-media` → `publish-sheet` exactly as before.
publish-media runs in the cloud where GitHub Pages (github.io) is blocked by
the egress proxy, so run it `--no-verify` and confirm the raw blobs instead.
The sheet is content-addressed (`sheets/<date>-<hash>.csv`), so several sheets
per day coexist and hold 1 or 2 rows depending on the slot. Append the cycle's
sheet URL, sha256, slot time and composition as a new line to
`<date>/run-log.txt` (never overwrite — the file accumulates the day's cycles),
e.g. `CYCLE 11:00 SHEET_URL …  SHA256 …  1reel` (composition is `1card`,
`1reel`, or `1card+1reel`). The uploader reads the LAST cycle line and uploads
that sheet's rows.

## Build each cycle fresh

Do NOT reuse a previous cycle's card or reel. Each slot is its own story (or a
genuinely newer angle on a developing one — e.g. a market drop that deepens).
Check the day's earlier run-log lines so you don't repeat the same story twice
in a day unless it has materially moved.
