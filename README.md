# FTM Studio

Makes the daily posts for the **Follow the Money** Facebook page.

You write one JSON file a day. This turns it into fifteen 1080×1350 images, a
Post Planner bulk-upload CSV, and a single web page for reviewing the lot
before it goes out. It also publishes the images so Post Planner can fetch
them.

**It never touches Facebook or Post Planner**, calls no AI service, and has no
API keys, passwords or `.env` file. Writing and building a day happens entirely
offline on your machine.

The one command that reaches the network is `publish-media`, which pushes the
finished images to a public GitHub repo so Post Planner's servers can fetch
them. It uses plain git with whatever credentials git already has; there is
still no secret to store.

---

## The daily routine

### 1. Start a day

```powershell
npm run new-day -- --date 2026-11-09
```

Creates `input/2026-11-09.json` with fifteen empty posts, one per time slot. The
template and colour palette for each are already chosen so the day never runs
the same look twice in a row — you only write words.

It prints the plan so you can see the shape of the day:

```
  01  07:00 ET  steps        sand
  02  08:00 ET  headline     forest
  03  09:00 ET  stats        ice
  ...
```

Issue numbers (the `NO. 104` in each image's header) run on from `--start`:

```powershell
npm run new-day -- --date 2026-11-09 --start 101
```

It will not overwrite a day you have already written. Add `--force` if you
really mean to start that day over.

### 2. Fill it in

Open `input/2026-11-09.json` in any editor. Each post looks like this:

```json
{
  "id": "01",
  "template": "headline",
  "palette": "night",
  "tag": "Rates",
  "kicker": "Federal Reserve",
  "headline": "The Fed held rates steady again",
  "accent_word": "steady",
  "source": "Source: Federal Reserve statement",
  "caption": "The Fed left rates where they are.\n\n...",
  "scheduled_at": "2026-11-09T12:00:00.000Z",
  "data": { "dek": "Your savings yield stays high for now." }
}
```

| Field | What it is |
| --- | --- |
| `id` | Short handle. Used in the filename and in every error message. Leave as generated. |
| `template` | Which layout. See the seven below. |
| `palette` | `night`, `cream`, `forest`, `ice`, `sand` or `midnight`. |
| `tag` | The category in the top bar: `Rates`, `Markets`, `Crypto`, `World`… |
| `kicker` | Optional small line above the headline. |
| `headline` | The big serif line on the image. |
| `accent_word` | One word from the headline to set in italic colour. Skipped silently if it is not in the headline. |
| `source` | Printed at the bottom of the image. Write the whole thing: `"Source: BLS"`. |
| `source_url` | Optional link to the story. **Never on the image** — it becomes the post's first comment, which is where a link belongs on Facebook. |
| `caption` | The Facebook caption. Goes in the CSV, never on the image. |
| `scheduled_at` | When it posts. Pre-filled from the slot; change it to move a post. |
| `data` | The fields specific to that template. |

`input/example.json` is a complete filled-in day with one of each template —
the fastest way to see what a real post looks like.

Write captions against **[`prompts/caption.md`](prompts/caption.md)**. That is
the editorial standard: money first, politics only as context, never invent a
number, no advice, no predictions, no engagement bait.

> If you don't have a figure yet, write `[NUMBER]` or `[PERCENT]` instead of
> guessing. The build finds those and warns you before you upload.

### 3. Build it

```powershell
npm run build-day -- --input input/2026-11-09.json
```

Writes `output/2026-11-09/`:

```
01-headline.png      ← one image per post, 1080×1350
02-stats.png
...
postplanner.csv      ← Post Planner bulk-upload sheet
index.html           ← review page
```

While you are still writing, rebuild a subset:

```powershell
npm run build-day -- --input input/2026-11-09.json --only 01,02,03
```

`--only` narrows everything — images, CSV rows and review page — so you can
produce a three-row sheet for a first trial upload before committing a full
day. The review page says it is a partial build so a subset is never mistaken
for a finished one.

### 4. Review

Open `output/2026-11-09/index.html` — double-click it, or:

```powershell
Invoke-Item .\output\2026-11-09\index.html
```

Every card appears next to its caption, slot time, source, word count, and any
warning. Scroll once and you have seen the whole day.

### 5. Publish the images

```powershell
npm run publish-media -- --date 2026-11-09
```

Post Planner's servers fetch each image by URL when the post publishes, so the
files have to be public. This pushes the day's PNGs to a **separate public
repo**, `ftm-media`, served by GitHub Pages, then checks every URL really
returns an image before telling you it worked.

It uses **plain git only** — `ls-remote`, `clone`/`fetch`, `commit`, `push` —
and never the `gh` CLI or the GitHub API, so it runs the same on your laptop
and in a scheduled cloud session (which is refused user-level API calls). Every
git command is printed as it runs; add `--dry-run` to see them without running
any.

```
  $ git ls-remote --heads https://github.com/abhiyan-strugller/ftm-media.git
  repo      abhiyan-strugller/ftm-media (reachable)
  ...
  push      8 file(s) to abhiyan-strugller/ftm-media@main
  verify    200  image/png  https://abhiyan-strugller.github.io/ftm-media/2026-11-09/01-headline.png
  ...
All 7 image(s) are live
```

If any URL does not come back as an image, the command **fails** and names it.
A dead URL is a failed post — do not upload the CSV until they all pass.

> **Why a second repo:** `ftm-studio` is private and stays private. Only the
> finished images are public, because Post Planner cannot authenticate to fetch
> them. Day files, captions, drafts and sources never leave the private repo.
>
> The images must stay online until the post publishes, so don't delete old
> folders from `ftm-media` until the day has gone out.

### 6. Upload

In Post Planner, import `output/<date>/postplanner.csv`. The images are already
hosted, so the sheet is the only thing to upload.

---

## When it refuses to build

The build checks everything before it writes anything, so you either get a
complete day or you get nothing — never a half-finished folder.

**Something is wrong with the file:**

```
Day file is not valid:
  - posts[02].data.stats: Array must contain exactly 3 element(s)
  - posts[03].palette: Invalid enum value. Expected 'night' | 'cream' | ...
  - posts[05].scheduled_at: Invalid datetime
```

Every line names the post by its `id`, so `posts[05]` is the post with
`"id": "05"` — not the fifth one in the file. All problems are listed at once.

**Text would not fit:**

```
Text would clip. Nothing was written.

  - posts[02].data.stats[0].value: "123456789.01" is one unbreakable word about
    347px wide at 46px, but the column is only 244px. Shorten the word or the field.
```

Shorten the field and build again.

**Warnings, which do not stop the build:**

```
Content mix:
  ! Headline appears 4× today (comfortable max 3).  (01, 06, 11, 14)
  ! Night palette runs back-to-back.  (04, 05)

Unfilled placeholders in 1 post(s) — fill before uploading:
  ! 07: [NUMBER]
```

These also appear at the top of `index.html`.

---

## The seven templates

| Template | Use it for | `data` fields |
| --- | --- | --- |
| `headline` | One big statement | `dek` |
| `stats` | Three numbers side by side | `stats` — exactly 3, each `label`, `value`, optional `delta` + `direction` |
| `line_chart` | A trend over time | `x_labels`, `y_values` (same length, 3–12), optional `value_prefix`/`value_suffix`, `series_label` |
| `bar_compare` | Comparing 2–6 things | `bars` — each `label`, `value`, optional `display`; optional `unit` |
| `versus` | A or B | `option_a`, `option_b` (each `label`, `amount`, optional `sub`), optional `pill` |
| `steps` | How something reaches your wallet | `steps` — 3–5, each `icon`, `label`, optional `detail` |
| `breaking` | World events | `badge` (`CONFIRMED`/`DEVELOPING`/`UNCONFIRMED`), `impacts` — 2–3, each `sector`, `change`, `direction` |

`direction` is `up`, `down` or `flat` and sets the arrow and colour — green for
up, red for down, in every palette.

Step icons: `ship`, `gate`, `store`, `person`, `bank`, `chart`, `shield`, `globe`.

To see all seven in both a short and a long version, look in `samples/` or run:

```powershell
npm run samples
```

---

## The CSV format

Built from Post Planner's real bulk-upload template, committed at
`reference/sample_bulk_posts_import.xlsx`. That file is the source of truth and
overrides their public docs wherever the two disagree.

Three things about it decide how the writer works:

1. **Any row whose first cell starts with `##` is ignored on import** — and
   their own header row is one of those (cell A2 is literally
   `## POSTING TIME`).
2. So **the importer never reads column names. Parsing is positional**: nine
   columns, fixed order, always present. Renaming a heading changes nothing,
   so there is no setting for it.
3. **POSTING TIME is text, not a date.** `MM/DD/YYYY`, two spaces, then `H:MM`
   on a 24-hour clock with the hour *not* zero-padded — exactly matching their
   own examples, `01/01/2030  8:15` and `07/04/2030  14:30`.

The generated file is:

| Row | Contents |
| --- | --- |
| 1 | Their comment-row explanation and version cell, read out of the template |
| 2 | Their header comment row, also read out of the template |
| 3+ | One row per post |

and each post row is:

| # | Column | What we put in it |
| --- | --- | --- |
| 1 | POSTING TIME | The slot, written on **Post Planner's clock — Mountain** (see below). **Never blank** — a blank cell silently turns a scheduled post into a queued one. |
| 2 | CAPTION | The caption, line breaks intact |
| 3 | LINK | Blank — their note warns a LINK must not end in a media file type |
| 4 | MEDIA | The public image URL |
| 5 | TITLE | Blank (Pinterest/YouTube only) |
| 6 | FIRST COMMENT | `Source: <name> — <url>`, when the post has a source |
| 7 | FIRST COMMENT DELAY | Blank — see below |
| 8 | TOBI BACKGROUND | Blank |
| 9 | REEL OR STORY | Blank |

Rows 1 and 2 are **read from the spreadsheet at build time**, not hardcoded, so
if Post Planner bumps the version it carries through. The nine column names and
the `##` markers *are* checked, and the build stops if they move: positional
parsing means a reordered column would quietly file your captions under LINK.

UTF-8 with BOM (row 1 contains an em dash), CRLF rows, RFC 4180 quoting, and a
hard stop past **200 data rows** — their documented per-file limit.

### A note on the first-comment delay

We leave this **blank**, which the template's row 5 shows means *immediately*.
The source link lives in that comment, so it should be there for the first
people who see the post rather than arriving minutes later.

If you ever do want a delay, set `FIRST_COMMENT_DELAY` in
`src/lib/postplanner.ts` to one of `ALLOWED_FIRST_COMMENT_DELAYS` —
**5, 10, 15, 30 or 60**, per their cell G3. Other values are not accepted,
so a plausible-looking `2` would silently not work.

### Where the image URL comes from

`config/media.json` holds the base, and the GitHub account that owns
`ftm-media`:

```json
{
  "baseUrl": "https://abhiyan-strugller.github.io/ftm-media",
  "owner": "abhiyan-strugller"
}
```

`owner` lives here because `publish-media` must not ask the GitHub API who you
are — that call is blocked in cloud sessions. `build-day` ignores it;
`publish-media` stops with a clear message if it is missing.

Both `build-day` and `publish-media` build URLs through the same
`mediaUrlFor()` helper in `src/lib/media.ts`, so the address written into the
CSV is always exactly the one that gets verified. Change the base here if the
images ever move hosts.

---

## Changing the times

All fifteen slots are in one place — `DAILY_SLOTS` in `src/lib/slots.ts`:

```ts
export const DAILY_SLOTS: readonly string[] = [
  "07:00", "08:00", "09:00", ... "21:00",
];
```

They are US Eastern wall-clock times and follow daylight saving automatically:
08:00 ET is 12:00 UTC in winter and 13:00 UTC in summer, and you never have to
think about it. Add or remove entries and the daily target follows — it is just
the length of that list.

### Post Planner reads times in Mountain, not Eastern

The Post Planner account schedules in **`America/Edmonton`** (its scheduler
field says so), and it reads a bare `8:15` in the CSV as 8:15 *in that zone*.
So the slot instant stays Eastern, but POSTING TIME is written in Edmonton
local time. The contact sheet still shows Eastern.

**The offset is one hour, not two, and the code is correct. Do not "fix" it.**

`America/Edmonton` resolves to **UTC-6** here, while US Eastern is UTC-5 in
winter, so the gap is a single hour:

| ET slot | UTC   | written to CSV |
| ------- | ----- | -------------- |
| 07:00   | 12:00 | `6:00`         |
| 11:00   | 16:00 | `10:00`        |
| 21:00   | 02:00 | `20:00`        |

Verified end to end against live posts on 2026-11-11: the CSV said `11:00`,
Post Planner's queue displayed 11:00 AM, and Facebook published at 11:00 AM.
Ten posts ran that day on schedule.

An earlier version of this section claimed 07:00 ET writes as `5:00`, assuming
Edmonton sat at UTC-7. That was wrong, and it cost real time: three separate
runs flagged correct output as a bug because it disagreed with this file.
Shifting the column to match it would move **every post an hour earlier**.

If you believe the times are wrong, do not edit the CSV or this table. Check a
published post's timestamp on the page against its row in `postplanner.csv`.
That comparison is the only thing that settles it.

The zone lives in `config/postplanner.json`:

```json
{ "timeZone": "America/Edmonton" }
```

If the account's zone ever changes, change it here — it must match what Post
Planner shows, or every post shifts. A missing file or key means
`America/Edmonton`; an unknown zone name stops the build.

---

## All the commands

| Command | What it does |
| --- | --- |
| `npm run new-day -- --date YYYY-MM-DD` | Start a day. `--start N` for issue numbers, `--force` to overwrite. |
| `npm run build-day -- --input input/<date>.json` | Build the upload folder. `--only 01,02,03` for a subset. |
| `npm run publish-media -- --date YYYY-MM-DD` | Push that day's images to the public `ftm-media` repo and verify every URL. |
| `npm run samples` | Re-render the 14 template samples into `samples/`. |
| `npm run test` | Unit tests. |
| `npm run build` | Type-checks the whole project. |
| `npm run fonts` | Re-download the bundled fonts. You will not normally need this. |

---

## Setup on a new machine

```powershell
git clone <repo> ftm-studio
cd ftm-studio
npm install
npm run build-day -- --input input/example.json
```

Needs Node 20 or newer. No configuration and no keys.

To publish images, git needs push access to `ftm-media`, and the repo has to
exist. **`publish-media` never creates it** — that is a one-time step by hand:

1. On github.com, create a **public** repo named `ftm-media` under the account
   in `config/media.json` → `owner`.
2. In that repo: **Settings → Pages → Deploy from a branch → `main`, `/ (root)`**.
3. For scheduled cloud runs, add `<owner>/ftm-media` to the environment's
   repositories, so the session's git credentials can push to it.

If the repo is missing or unreachable, `publish-media` fails on its first
command (`git ls-remote`) and prints these steps.

---

## How it fits together

```
input/<date>.json
        │
        │  validate        src/lib/day.ts         — errors name the post id
        │  check fit       src/lib/design/overflow.ts
        ▼
   render               src/lib/design/        — Satori draws the PNG from JSX
        │
        ├── <id>-<template>.png ──────────────┐
        ├── postplanner.csv   src/lib/csv.ts   │  shape from the real template
        │                     src/lib/postplanner.ts + src/lib/xlsx.ts
        └── index.html        src/lib/contact-sheet.ts
                                               │
                              publish-media ───┘
                                   │  push to the public ftm-media repo
                                   ▼
            https://<user>.github.io/ftm-media/<date>/<file>.png
                   (the same URL the CSV's MEDIA column holds —
                    both built by mediaUrlFor() in src/lib/media.ts)
```

The fonts in `public/fonts/` are committed on purpose: Satori needs them as
files on disk and cannot download them. See `public/fonts/LICENSES.md`.

There is a web page at `/` if you run `npm run dev`, but it only lists these
commands. Nothing is served and nothing is published from here.
