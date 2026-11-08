/**
 * Build one day's upload folder.
 *
 *   npm run build-day -- --input input/2026-11-09.json
 *   npm run build-day -- --input input/2026-11-09.json --only 01,03
 *
 * Writes `output/<date>/`:
 *   <id>-<template>.png   one 1080x1350 card per post
 *   postplanner.csv       one row per post, columns from config/
 *   index.html            contact sheet for reviewing the whole day at once
 *
 * Nothing is written until every post has passed both schema validation and the
 * overflow gate, so a run either produces a complete day or produces nothing.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseDayFile, toPostDoc, issueNumberFor, DayFileError } from "../src/lib/day";
import { findOverflow } from "../src/lib/design/overflow";
import { findPlaceholders } from "../src/lib/schema";
import { mixWarnings, type MixItem } from "../src/lib/mix";
import { buildCsv, csvWithBom, loadColumnMap, type CsvRow } from "../src/lib/csv";
import { renderContactSheet, type SheetEntry } from "../src/lib/contact-sheet";
import { formatTimeInZone } from "../src/lib/time";
import { ET_ZONE } from "../src/lib/types";

type Args = { input: string; only: string[] | null };

function parseArgs(argv: string[]): Args {
  let input = "";
  let only: string[] | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") input = argv[++i] ?? "";
    else if (arg === "--only") only = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith("--input=")) input = arg.slice(8);
    else if (arg.startsWith("--only=")) only = arg.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (!input) {
    throw new Error("Pass an input file: npm run build-day -- --input input/2026-11-09.json");
  }
  if (only !== null && only.length === 0) {
    throw new Error("--only needs at least one post id, e.g. --only 01,03");
  }
  return { input, only };
}

async function main(): Promise<void> {
  const { input, only } = parseArgs(process.argv.slice(2));

  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(input, "utf8"));
  } catch (err) {
    throw new Error(`Could not read ${input}: ${err instanceof Error ? err.message : err}`);
  }

  const day = parseDayFile(raw);
  const columnMap = await loadColumnMap();

  // Resolve --only against real ids so a typo fails loudly instead of silently
  // building nothing.
  let indices = day.posts.map((_, i) => i);
  if (only) {
    const known = new Set(day.posts.map((p) => p.id));
    const unknown = only.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new Error(
        `--only names ids not in the day file: ${unknown.join(", ")}. ` +
          `Available: ${day.posts.map((p) => p.id).join(", ")}`,
      );
    }
    const wanted = new Set(only);
    indices = indices.filter((i) => wanted.has(day.posts[i].id));
  }

  // --- Gate everything before writing anything -----------------------------
  const blocking: string[] = [];
  const docs = indices.map((i) => ({ index: i, doc: toPostDoc(day, i) }));

  for (const { index, doc } of docs) {
    const post = day.posts[index];
    for (const problem of findOverflow(doc)) {
      blocking.push(`posts[${post.id}].${problem.field}: ${problem.message}`);
    }
  }

  if (blocking.length > 0) {
    console.error("\nText would clip. Nothing was written.\n");
    for (const b of blocking) console.error(`  - ${b}`);
    console.error("");
    process.exit(1);
  }

  // --- Non-blocking review notes -------------------------------------------
  const mixItems: MixItem[] = day.posts.map((p) => ({
    id: p.id,
    at: new Date(p.scheduled_at).getTime(),
    template: p.template,
    palette: p.palette,
  }));
  const warnings = mixWarnings(mixItems);

  // --- Render ---------------------------------------------------------------
  const outDir = path.join(process.cwd(), "output", day.date);
  await mkdir(outDir, { recursive: true });

  // Imported lazily so font or Satori failures surface after validation, not
  // before the user has seen their schema errors.
  const { renderPostBytes } = await import("../src/lib/design/render");

  const entries: SheetEntry[] = [];
  const csvRows: CsvRow[] = [];

  for (const { index, doc } of docs) {
    const post = day.posts[index];
    const file = `${post.id}-${post.template}.png`;
    const png = await renderPostBytes(doc);
    await writeFile(path.join(outDir, file), png);

    const at = new Date(post.scheduled_at);
    const placeholders = findPlaceholders(post);

    entries.push({
      id: post.id,
      template: post.template,
      palette: post.palette,
      postNumber: issueNumberFor(day, index),
      headline: post.headline,
      caption: post.caption,
      source: post.source,
      time: formatTimeInZone(at, ET_ZONE),
      image: file,
      placeholders,
    });
    csvRows.push({ text: post.caption, mediaUrl: file, at });

    const flag = placeholders.length > 0 ? `  [placeholders: ${placeholders.join(", ")}]` : "";
    console.log(`  ${post.id}  ${post.template.padEnd(12)} ${(png.length / 1024).toFixed(0).padStart(4)} KB${flag}`);
  }

  // --- CSV ------------------------------------------------------------------
  // Deliberately skipped for a partial rebuild: a CSV holding 2 of 15 rows
  // looks exactly like a finished one and would be uploaded by mistake.
  if (only) {
    console.log("\n  postplanner.csv not written (--only builds a subset).");
  } else {
    await writeFile(path.join(outDir, "postplanner.csv"), csvWithBom(buildCsv(csvRows, columnMap)));
    console.log(`\n  postplanner.csv  ${csvRows.length} rows, columns: ${columnMap.keys.map((k) => columnMap.headings[k]).join(" | ")}`);
  }

  // --- Contact sheet --------------------------------------------------------
  const html = renderContactSheet({
    date: day.date,
    entries,
    warnings,
    subsetOf: only ? day.posts.length : undefined,
  });
  await writeFile(path.join(outDir, "index.html"), html, "utf8");

  // --- Summary --------------------------------------------------------------
  console.log(`  index.html       contact sheet`);

  if (warnings.length > 0) {
    console.log("\nContent mix:");
    for (const w of warnings) console.log(`  ! ${w.message}  (${w.ids.join(", ")})`);
  }

  const withPlaceholders = entries.filter((e) => e.placeholders.length > 0);
  if (withPlaceholders.length > 0) {
    console.log(`\nUnfilled placeholders in ${withPlaceholders.length} post(s) — fill before uploading:`);
    for (const e of withPlaceholders) console.log(`  ! ${e.id}: ${e.placeholders.join(", ")}`);
  }

  console.log(`\nWrote output/${day.date}/ (${entries.length} card${entries.length === 1 ? "" : "s"}).`);
  if (!only) {
    console.log(
      "Note: the media column holds each PNG's filename. If Post Planner needs a\n" +
        "public URL instead, update the mapping or prefix in config/postplanner-columns.json.",
    );
  }
  console.log(`Review: output/${day.date}/index.html`);
}

main().catch((err) => {
  if (err instanceof DayFileError) {
    console.error(`\n${err.message}\n`);
  } else {
    console.error(`\nbuild-day failed: ${err instanceof Error ? err.message : err}`);
  }
  process.exit(1);
});
