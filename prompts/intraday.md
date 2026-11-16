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

## What a cycle produces

**One card + one reel**, both from the same fresh story:
- Card: the `plain` template, caption in the house shape (fact → number →
  "My take:" → question), per `caption.md`.
- Reel: per `reels.md` — hook (count-up number), 3-4 beats, "My take:", end
  question, 10-13 hashtags, varied style. Skip `voice` in automated cycles.
- Both scheduled for the SAME near-future slot (see below). They can share a
  story — different format, same moment.

## Timing — near-future, never past

A build cycle runs at :40 and schedules its post for the top of the next hour,
in America/Edmonton; the upload cycle runs at :55 and puts it in Post Planner:

| Build fires (A) | Upload fires (B) | Posts at (slot) |
| --- | --- | --- |
| 10:40 | 10:55 | 11:00 |
| 13:40 | 13:55 | 14:00 |
| 16:40 | 16:55 | 17:00 |
| 19:40 | 19:55 | 20:00 |
| 22:40 | 22:55 | 23:00 |

Five cycles → ~5 cards + 5 reels a day, 11:00 to 23:00 ("until night"). The
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

Each cycle is a mini-build: write `input/<date>.json` with just this cycle's 1
post (id = slot HHMM) + a `reels` block of 1 reel (both at the slot time), then
`build-day` → `publish-media` → `publish-sheet` exactly as before. The sheet is
content-addressed (`sheets/<date>-<hash>.csv`), so several sheets per day
coexist. Append the cycle's sheet URL, sha256 and slot time as a new line to
`<date>/run-log.txt` (never overwrite — the file accumulates the day's cycles),
tagged with the slot, e.g. `CYCLE 14:00 SHEET_URL …`. The uploader reads the
LAST cycle line and uploads that sheet.

## Build each cycle fresh

Do NOT reuse a previous cycle's card or reel. Each slot is its own story (or a
genuinely newer angle on a developing one — e.g. a market drop that deepens).
Check the day's earlier run-log lines so you don't repeat the same story twice
in a day unless it has materially moved.
