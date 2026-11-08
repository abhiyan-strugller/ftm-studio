/**
 * Write a skeleton day file.
 *
 *   npm run new-day -- --date 2026-11-09
 *   npm run new-day -- --date 2026-11-09 --start 101
 *
 * Produces `input/<date>.json` with one entry per slot, each pre-filled with
 * its scheduled time, a template, and a palette chosen so the day never repeats
 * either back to back. Every text field is empty and waiting for you.
 *
 * Refuses to overwrite an existing file unless `--force` is passed — a day you
 * have already written is not something to lose to a mistyped date.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { blankData, planDay } from "../src/lib/plan-day";
import { DAILY_SLOTS } from "../src/lib/slots";
import { slotInstant } from "../src/lib/time";
import { ET_ZONE } from "../src/lib/types";

type Args = { date: string; start: number; force: boolean };

function parseArgs(argv: string[]): Args {
  let date = "";
  let start = 1;
  let force = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") date = argv[++i] ?? "";
    else if (arg === "--start") start = Number(argv[++i]);
    else if (arg === "--force") force = true;
    else if (arg.startsWith("--date=")) date = arg.slice(7);
    else if (arg.startsWith("--start=")) start = Number(arg.slice(8));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Pass a date: npm run new-day -- --date 2026-11-09");
  }
  if (!Number.isInteger(start) || start < 1) {
    throw new Error(`--start must be a positive whole number, got "${start}"`);
  }
  return { date, start, force };
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const { date, start, force } = parseArgs(process.argv.slice(2));

  const outDir = path.join(process.cwd(), "input");
  const outFile = path.join(outDir, `${date}.json`);
  await mkdir(outDir, { recursive: true });

  if (!force && (await exists(outFile))) {
    throw new Error(`input/${date}.json already exists. Pass --force to overwrite it.`);
  }

  const planned = planDay(date, DAILY_SLOTS);

  const posts = planned.map((p) => ({
    id: p.id,
    template: p.template,
    palette: p.palette,
    tag: "",
    headline: "",
    accent_word: "",
    kicker: "",
    source: "",
    caption: "",
    scheduled_at: slotInstant(date, p.slot, ET_ZONE).toISOString(),
    data: blankData(p.template),
  }));

  const day = { date, start_number: start, posts };
  await writeFile(outFile, JSON.stringify(day, null, 2) + "\n", "utf8");

  console.log(`Wrote input/${date}.json — ${posts.length} slots, issue ${start}-${start + posts.length - 1}.`);
  console.log("\nTemplate plan:");
  for (const p of planned) {
    console.log(`  ${p.id}  ${p.slot} ET  ${p.template.padEnd(12)} ${p.palette}`);
  }
  console.log("\nFill in the text fields, then: npm run build-day -- --input input/" + date + ".json");
}

main().catch((err) => {
  console.error(`\nnew-day failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
