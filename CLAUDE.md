# Follow the Money — how this actually runs

Read this before changing anything about the daily automation. `README.md`
covers the build tool itself (templates, schema, commands). This file covers
the system around it, and the handful of constraints that are not obvious and
that cost several days to find.

Abhiyan's role is review. The pipeline is expected to run unattended and put
ten posts a day on a Facebook page called **Follow the Money** — money first,
US audience, politics only ever as the angle.

---

## The daily flow

Two scheduled tasks, every morning, Edmonton time.

| | Task | Runs | Can it push? | Has a browser? |
| --- | --- | --- | --- | --- |
| **A** | `FTM Build & Publish (Task A)` | **4:51 AM** | **Yes** | No |
| **B** | `FTM Daily Post Build` (really Task B) | **5:42 AM** | No | **Yes** |

- `trig_01UQhvZvCzVKCfzGJi4xyh6M` — Task A, cloud, both repos attached
- `trig_01Qq197Tj3ngcTwUQcG2AUap` — Task B, bound to `LAPTOP-DGLF08U0`

**Task A** researches the day, writes ten posts, renders the cards, pushes the
images to `ftm-media`, publishes a verified sheet, and writes the sheet URL
into `<date>/run-log.txt`.

**Task B** reads that run-log, finds the sheet, drives Chrome to upload it into
Post Planner, and reads the queue back to confirm.

Posts then go out 11:00 AM – 10:00 PM, roughly every 75 minutes.

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
- **Task B depends on the laptop being reachable at 5:42 AM.** On 2026-11-12 it
  was not, and the task was auto-suspended with `device_absent`; it recovered
  only when the laptop came back. Giving Task B extra attempts (5:42, 7:42,
  9:42) would make this survivable — the prompt already refuses to upload twice,
  so repeat runs are harmless.
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

The test for a news story: **would a working American stop scrolling because
this touches their own money?**

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

## Parked, in order

1. **Card redesign.** Abhiyan says the current cards read as Claude-made — the
   serif/sans pairing, dark ground with one accent, centred balance, the
   italicised accent word, the small-caps kicker. That combination is the tell.
2. **Sharing other people's top finance posts**, the way Good Financial Cents
   does. Note the conflict: his engine is screenshots of other people's posts,
   which is strong for reach and risky for monetization, since Facebook
   penalises unoriginal content. Taking the *format* is free; taking the
   *sourcing method* is not.
3. **Moving the build to the evening.** Task A at 4:51 AM builds tomorrow from
   *yesterday's* news — an entire US trading day is missed. An evening build
   would be fresher and would also run when the laptop is reliably awake.
4. **Reels.** No faces at all: not his, not AI-generated. Video that presents
   the fact itself, built from the most viral story of the day's research.

Reference for the look: facebook.com/GoodFinancialCents. Its posts are plain
text on a solid background with the author's avatar and handle — barely designed
at all, which is the point.
