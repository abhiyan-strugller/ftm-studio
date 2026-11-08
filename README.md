# FTM Studio

Makes the daily posts for the **Follow the Money** Facebook page.

You write one JSON file a day. This turns it into a folder you upload to Post
Planner: fifteen 1080×1350 images, a CSV with the captions and times, and a
single web page for reviewing the lot before it goes out.

**It runs entirely on your machine.** It does not connect to Facebook, does not
connect to Post Planner, does not call any AI service, and has no API keys,
passwords or `.env` file. Nothing it does is reversible by accident, because
nothing it does leaves your computer.

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
postplanner.csv      ← captions, image names, dates and times
index.html           ← review page
```

While you are still writing, rebuild just one or two cards:

```powershell
npm run build-day -- --input input/2026-11-09.json --only 01,03
```

`--only` deliberately does **not** rewrite `postplanner.csv`. A CSV with two of
fifteen rows looks exactly like a finished one, and uploading it would quietly
publish a near-empty day.

### 4. Review

Open `output/2026-11-09/index.html` — double-click it, or:

```powershell
Invoke-Item .\output\2026-11-09\index.html
```

Every card appears next to its caption, slot time, source, word count, and any
warning. Scroll once and you have seen the whole day.

### 5. Upload

In Post Planner, bulk-upload the PNGs from `output/<date>/` and import
`postplanner.csv`.

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

## Changing the CSV columns

The real Post Planner column headings are **not confirmed yet**, so they are not
baked into the code. They live in `config/postplanner-columns.json`:

```json
{
  "text": "Content",
  "mediaUrl": "Image URL",
  "date": "Date",
  "time": "Time"
}
```

Change the **values** to match Post Planner's own sample sheet. The **order of
the keys** is the order of the columns. The four keys on the left are fixed.

> **This file renames headings only.** It does not change what goes *in* the
> cells. Each column's value is built by the CSV writer.

### If Post Planner needs a URL instead of a filename

The media column currently holds the image **filename** (`01-headline.png`).
If Post Planner's importer expects a full public URL, **that is a code change,
not a config edit** — no heading rename will do it.

The value is set in one place, `scripts/build-day.ts`:

```ts
csvRows.push({ text: post.caption, mediaUrl: file, at });
```

Change `mediaUrl` to whatever Post Planner expects — most likely
`` `https://your-host/${day.date}/${file}` `` once the images are hosted
somewhere it can reach. The images would also need to be uploaded somewhere
public first; nothing in this project does that.

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

---

## All the commands

| Command | What it does |
| --- | --- |
| `npm run new-day -- --date YYYY-MM-DD` | Start a day. `--start N` for issue numbers, `--force` to overwrite. |
| `npm run build-day -- --input input/<date>.json` | Build the upload folder. `--only 01,03` for a subset. |
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

Needs Node 20 or newer. No configuration, no accounts, no keys.

---

## How it fits together

```
input/<date>.json
        │
        │  validate        src/lib/day.ts        — errors name the post id
        │  check fit       src/lib/design/overflow.ts
        ▼
   render               src/lib/design/   — Satori draws the PNG from JSX
        │
        ├── <id>-<template>.png
        ├── postplanner.csv   src/lib/csv.ts            — columns from config/
        └── index.html        src/lib/contact-sheet.ts
```

The fonts in `public/fonts/` are committed on purpose: Satori needs them as
files on disk and cannot download them. See `public/fonts/LICENSES.md`.

There is a web page at `/` if you run `npm run dev`, but it only lists these
commands. Nothing is served and nothing is published from here.
