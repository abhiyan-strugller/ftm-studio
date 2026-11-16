# Follow the Money — how this actually runs

Read this before changing anything about the daily automation. `README.md`
covers the build tool itself (templates, schema, commands). This file covers
the system around it, and the handful of constraints that are not obvious and
that cost several days to find.

Abhiyan's role is review. The pipeline runs unattended and posts to a Facebook
page called **Follow the Money** — money first, **US + Canada** audience,
politics only ever as the angle.

---

## The model — INTRADAY, fresh every ~3 hours (since 2026-11-17)

This is the current model. It replaced the old once-a-day batch (which built
the whole next day the evening before). Abhiyan wanted the page to carry
**today's** most-viewed money news, not yesterday's — so instead of one big
build, a fresh post is researched and published roughly every 3 hours, minutes
before it goes out. `prompts/intraday.md` is the full spec; read it first.

**Per day:** ~5 cards + ~5 reels, one of each per cycle, five cycles.
**Each cycle** researches the freshest, most-viewed money story RIGHT NOW
(US + Canada — markets falling/spiking, a cyberattack or outage with a dollar
cost, a rate/inflation/jobs print, a CEO money story, anything viral touching a
paycheck, rent, groceries, savings, a card rate or a job), builds 1 `plain`
card + 1 reel from it, publishes them, and the uploader puts them into Post
Planner for a slot ~20 min out.

Two scheduled tasks, both fire every ~3 hours, Edmonton time — same split, same
reason as always (push needs the cloud, browser needs the laptop):

| | Task | Fires (Edmonton) | Can it push? | Has a browser? |
| --- | --- | --- | --- | --- |
| **A** | `FTM Build & Publish (Task A)` — the BUILD cycle | **:40 at 7, 10, 13, 16, 19** | **Yes** | No |
| **B** | `FTM Daily Post Build` — the UPLOAD cycle | **:55 at 7, 10, 13, 16, 19** | No | **Yes** |

Slots are 8:00 / 11:00 / 14:00 / 17:00 / 20:00 Edmonton — 9 AM to 9 PM New
York, so the East-coast morning is covered. Build fires at :40 and
schedules the top of the next hour; upload fires at :55, 5 min before the slot.
The slot must be FUTURE when the uploader runs — the past-row guard aborts a
passed row (see the 2026-11-10 incident). That is why the build always targets
the top of the hour after it fires (:40 → next :00), never a time in the past.

**Build cycle (A)** researches now, writes `input/<date>.json` with ONE post
(id = the slot in HHMM, e.g. `"1400"`, so its card is `1400-plain.png` and
never collides with another cycle) plus a `reels` block of one reel at the same
slot, renders, pushes media to `ftm-media`, publishes a content-addressed sheet
(`sheets/<date>-<hash>.csv`), and APPENDS a `CYCLE <slot> SHEET_URL …` line to
`<date>/run-log.txt` (never overwrites — the file accumulates the day's
cycles).

**Upload cycle (B)** reads the LAST `CYCLE …` line in today's run-log, checks
the queue first (never double-uploads), injects that sheet into Post Planner,
and reads the queue back.

- `trig_01UQhvZvCzVKCfzGJi4xyh6M` — Task A (build), cloud, both repos attached
- `trig_01Qq197Tj3ngcTwUQcG2AUap` — Task B (upload), bound to `LAPTOP-DGLF08U0`

**Collision rule (critical):** a day has many cycles sharing one
`ftm-media/<date>/` folder. Card id = slot HHMM and reel slug = `<date>-<topic>`
keep every cycle's media uniquely named; `publish-media` only ever adds files,
so each already-published post keeps pointing at its own bytes. Never reuse a
slot id or a reel slug within a day.

**History:** the old model (evening build at 8:47 PM building tomorrow; morning
upload 5:42/7:42/9:42) ran 2026-11-14 → 2026-11-16. Before that, a 4:51 AM
build that posted a day late. The intraday switch (2026-11-17) is what finally
made the news same-day.

### Why two tasks and not one

**This is the central constraint. Do not try to merge them.**

Post Planner has **no public API** — no Zapier, no Make, no n8n, no webhooks.
The only way a post gets in is a browser. A browser means Abhiyan's laptop,
which means the task must be device-bound.

But a device-bound routine **cannot have repositories attached**, and without
attached repos a cloud session cannot push to GitHub — the git proxy refuses
with *"not in this session's authorized repository set"*. The web UI offers no
Repository field for that kind of task, and the API refuses to edit it at all
(*"editing a device-bound routine's content requires a device proof"*).

So: push access and browser access are mutually exclusive in one task. Three
days were lost to this, because every run built the posts perfectly and then
died at the final step with an error that looked like a credentials problem.

Things that look like fixes and are not:

- **`/web-setup`** fixes the *account* credential. It does not add repos to an
  existing routine. (It is still required — without it even an attached repo
  gets read-only access.)
- **Pushing from `device_bash`** does not work. `device_bash` is **not** the
  Windows laptop; it is a separate Linux VM that only shares the mounted
  folders. It has no credential helper. The folder is shared, the credentials
  are not. Claude Code running natively on Windows *can* push, which makes this
  easy to get wrong.
- **Editing Task B through the API** is refused outright. Only the Claude
  desktop app on the bound laptop can change its prompt.

---

## The 2026-11-10 incident

Ten wrong posts went live on the page. Worth understanding, because three of
the guards in this repo exist because of it.

The sheet was pushed to a reused filename (`today.csv`). GitHub served
yesterday's cached copy. The check asked only *"does this URL return 200?"* —
true, of the wrong file. Post Planner received yesterday's captions at
yesterday's times, and **a past-dated row publishes immediately**, so all ten
fired at once.

`scripts/publish-sheet.ts` now enforces:

1. **Content-addressed names** — `sheets/<date>-<sha256[:10]>.csv`. A name can
   never refer to different bytes than before, so a cache hit is always a hit
   on the right content.
2. **Byte verification** — re-downloads and compares sha256 against the local
   file. A 200 is not evidence; a digest match is.
3. **A past-row guard** — any row whose time has already passed aborts the
   publish, resolved in the planner's zone rather than the machine's.

Do not weaken these for convenience.

---

## Timezone — the code is correct

`America/Edmonton` resolves to **UTC-6** here. US Eastern is UTC-5 in winter,
so the gap is **one hour, not two**. A 07:00 ET slot writes to the CSV as
`6:00`.

Verified end to end on 2026-11-11: the CSV said `11:00`, Post Planner's queue
showed 11:00 AM, Facebook published at 11:00 AM, and all ten ran on schedule.

An earlier README section claimed 07:00 ET writes as `5:00`. It was wrong, and
**three separate runs flagged correct output as a bug because of it**. If the
times look wrong, do not edit the CSV or the conversion — compare a published
post's timestamp on the page against its row in `postplanner.csv`. That is the
only thing that settles it.

---

## Post Planner

- Bulk upload is **positional**, not keyed by header name — the header row is a
  `##` comment row and is skipped like any other.
- `POSTING TIME` is text: `MM/DD/YYYY`, **two spaces**, `H:MM`, 24-hour, hour
  not zero-padded.
- `MEDIA` must be a full public URL ending in an image extension. Filenames,
  Google Drive and Dropbox links are all rejected — which is the only reason
  GitHub Pages is in this stack at all.
- The spreadsheet input **cannot** be driven by a file-upload tool. Inject it
  with javascript: fetch the CSV, build a `File` and a `DataTransfer`, assign
  `input.files`, dispatch `input` and `change`.
- The planned-posts list sometimes does not render in a narrow window. Widen it
  or open a fresh tab rather than concluding the queue is empty.

---

## Rules that are not negotiable

- **Never post to Facebook directly.** Posting happens only through Post
  Planner. Neither repo may ever be given Facebook API ability. This is
  deliberate: Abhiyan believes API-scheduled automation risks the page, and
  Post Planner is a reviewed Meta partner app.
- **Never invent a number, date, quote or source.** Every statistic names the
  period it covers on the card, comes from a release that has already happened,
  and carries a named source.
- **Never delete old folders from `ftm-media`.** Post Planner fetches images at
  publish time, not upload time.
- **Read the queue back after uploading.** Skipping that check is exactly how
  ten wrong posts went live.
- **A republished sheet does not fix Post Planner.** Task B runs 51 minutes
  after the old Task A slot ran — on 2026-11-14 it had already uploaded the
  morning sheet before the evening rebuild replaced it. Publishing a
  superseding sheet changes nothing in the queue: the queued posts must be
  deleted in Post Planner (bulk-select the day in List view → Bulk action →
  Delete) and the new sheet injected, then the queue read back. Done by hand
  with Abhiyan's approval that night; remember it any time a sheet is
  replaced after Task B has run.
- Trending but unconfirmed stories are not posted. Flag them labelled
  UNCONFIRMED, say where they are circulating, and let him decide.

---

## Known gaps

- **Task A cannot verify GitHub Pages** — `github.io` is blocked by its egress
  proxy. It verifies the raw blobs instead. Task B checks the Pages URLs, which
  is what Post Planner actually fetches.
- **Task A often cannot WebFetch primary sources** (bls.gov, cnbc.com and
  others are blocked at its proxy) and confirms figures from search results
  instead. Worth spot-checking the headline number of the lead post.
- **Task B depends on the laptop being awake when a cycle fires** (:55 at 10,
  13, 16, 19, 22). If it is asleep/offline at a slot, that slot is simply
  missed — the next cycle is independent, so one miss doesn't cascade. A missed
  slot never double-posts (the uploader checks the queue first). On the old
  morning-only model a single 5:42 AM absence (2026-11-12, `device_absent`)
  cost the whole day; the intraday spread makes a miss cost one post, not the
  day. Keep Chrome + the Claude desktop app open through the posting window.
- **Reel audio is numpy-free** — `scripts/gen-reel-bed.py` is pure Python
  standard library, so a render can never fail on a missing dependency. (It
  needed numpy until 2026-11-16, when a scheduled run only survived by
  improvising a pip install; the dependency was then removed entirely. The
  old `requirements.txt` / `setup:py` are vestigial.)
- **`bar_compare` has no polarity field** and the longest bar takes the accent
  colour. Never chart a quantity where smaller is better; invert it into one
  where bigger genuinely is better.

---

## The niche, and what earns a post

**Money first, always.** Stocks, crypto, cash and savings, banks and rates. Big
world events — wars, cyberattacks, outages, lockdowns — are covered only through
what they do to money: who gains, who pays. Politics is the angle, never the
subject. A post about a political decision is really a post about someone's
rent or paycheck.

The test for a news story: **would a working American or Canadian stop
scrolling because this touches their own money?** Cover both countries — the
Fed and the Bank of Canada, US and Canadian banks, groceries and housing on
both sides of the border; name CAD vs USD when it matters, and don't let a
day run all-US.

Earns a post:

- It lands on a paycheck, rent, groceries, a card rate, savings or a job
- Somebody wins and somebody pays, and you can name both
- A true number that genuinely surprises
- Something hidden becoming visible

Rejected however big:

- "Markets closed mixed" — a move with no human consequence
- Process stories with nobody in them
- Anything where you cannot finish the sentence *"this means YOU will pay/get…"*

**Gripping is not clickbait, and the difference protects monetization.** Lead
with a real number and a real consequence. No all-caps, no manufactured
urgency, no predictions, no buy/sell advice, no doom-mongering, no engagement
bait. Respectful on wars and tragedies.

Caption shape that works: the fact, then the number, then *"My take:"* with an
actual opinion, then a question. The question matters — comments are weighted
far more heavily than reactions.

---

## What Good Financial Cents actually does

Studied 2026-11-14. 890K followers. Jeff Rose, CFP. This is the reference
Abhiyan picked, and the findings are not what either of us expected.

**His posts are not designed at all.** Every one is a screenshot of a short
text post — black ground, white text, or the reverse. Plain sans. No colour, no
charts, no icons, no borders, no logo. The only "design" is the original
author's avatar and handle at the top, which makes it read as a genuine
screenshot of a real person.

Measured engagement on live posts:

| Post | Reactions | Comments | Shares |
| --- | --- | --- | --- |
| `@BillWIIdin` — "The salary nobody warns you about. $160,000 a year…" | 662 | 45 | 61 |
| `klyssamoore` — "$1,262.50 is all that stands between me and a paid off car" | 1.4K | 95 | 3 |
| Widow forced to sell over property taxes | 282 | 100 | 28 |

Comment counts are enormous relative to reactions. That is the signal Facebook
rewards, and it comes from his captions, which are always first-person and
always take a side: *"I'm sorry, but if you're earning $160,000 a year and
calling yourself poor…"*, *"I have a serious problem with a 74-year-old widow…"*

**The conflict to keep in view.** His engine is reposting other people's words
as screenshots. Superb for reach, and in direct tension with monetization —
Facebook penalises unoriginal and reused content. He can afford it because he
is not paid by Facebook; he funnels 890K followers to his own business.
Abhiyan is building toward Facebook payouts.

So: **take the format, not the sourcing.** Plain text, large type, solid
ground, a blank line between sentences, nothing decorative — that is free, and
it is the opposite of the current cards. The opinionated caption voice is free
too. The reposting is what would cost the thing he is building toward.

**Distribution, honestly.** The page has 3 followers. An A/B test of card
formats cannot produce a usable signal at that scale, and card design is
probably not the binding constraint — getting posts in front of people who do
not follow the page is. Worth deciding which problem is actually being solved
before optimising the other.

---

## Done since, and what remains parked

Done 2026-11-14 (same-day, interactive sessions with Abhiyan):

- **Card redesign** — the `plain` template (Good Financial Cents style) is the
  default for all posts. No serif, no kicker, no accent italic, no chrome.
- **Evening build** — Task A moved to 8:47 PM building tomorrow; Task B given
  three morning attempts. See "The daily flow".
- **Research upgrade** — `prompts/research.md`: ~100-candidate sweep across
  wire news, rates, a named CEO watchlist (Musk, Nvidia, Zuckerberg, Altman,
  Amodei, Bezos, Buffett, Dimon), cyber→money, investigations, and the
  viral/social layer; one-outlet rule; UNCONFIRMED protocol. First sweep:
  `research/2026-11-14-deep-sweep.md` — includes the Monday Nov 16 shortlist
  and the running Nvidia money-trail thread.

Parked, in order:

1. **Sharing other people's top finance posts**, the way Good Financial Cents
   does. The conflict stands: strong for reach, risky for monetization, since
   Facebook penalises unoriginal content. Post Planner's Content → streams is
   the tool when Abhiyan starts this (big pages surveyed in the Nov 14 sweep).
   Taking the *format* is free; taking the *sourcing method* is not.
2. **Reels — IN PROGRESS (started 2026-11-14).** `prompts/reels.md` is the
   spec; `npm run render-reel` builds one from `input/reels/<slug>.json`.
   No faces at all: not his, not AI-generated. 4 reels/day on 4 days/week
   (16/week). Audio is procedurally generated in-repo — never licensed music.
   Ships through the normal sheet with REEL OR STORY = `reel`. First demo:
   the Nvidia money trail. Remaining: Abhiyan's sign-off on the look, then
   fold the 4-reel render + sheet rows into Task A; optional CapCut Voice
   Studio voiceover layer (his account is signed in on his Chrome).

Awareness: a different Facebook page named "Follow the Money" (562K fans)
already exists — matters for search, verification and any paid growth later.

Reference for the look: facebook.com/GoodFinancialCents. Its posts are plain
text on a solid background with the author's avatar and handle — barely designed
at all, which is the point.
