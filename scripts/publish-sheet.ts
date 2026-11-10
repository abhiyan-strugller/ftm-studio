/**
 * Publish a day's Post Planner sheet to public hosting, safely.
 *
 *   npm run publish-sheet -- --date 2026-11-10
 *   npm run publish-sheet -- --date 2026-11-10 --dry-run
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-11-10 ten wrong posts went live. The sheet was pushed to a REUSED
 * filename (`today.csv`); GitHub served yesterday's cached copy; the check
 * asked only "does this URL return 200?" — which the stale file satisfied —
 * so the upload proceeded with yesterday's captions and yesterday's (past)
 * times, and Post Planner fired all ten at once.
 *
 * Two rules follow from that, and this script enforces both:
 *
 *   1. CONTENT-ADDRESSED NAME. The published file is `sheets/<date>-<hash>.csv`
 *      where <hash> is the first 10 hex of the sha256 of its own bytes. A name
 *      can therefore never refer to different content than it did before, so a
 *      cache hit is always a hit on the right bytes. Changed sheet, new name.
 *
 *   2. VERIFY BYTES, NOT STATUS. The check re-downloads the URL and compares
 *      the sha256 of what came back against the file on disk. HTTP 200 proves
 *      nothing; only a digest match does.
 *
 * It serves from raw.githubusercontent.com, not GitHub Pages: raw is available
 * immediately after a push, while Pages lags behind a build and a CDN cache.
 * Pages is still correct for the IMAGES (they are fetched by Post Planner much
 * later, and they already live under a dated folder), so publish-media keeps
 * using it. The sheet is needed seconds after the push, so it uses raw.
 *
 * Plain git only — no `gh`, no GitHub REST API. See publish-media.ts.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_CONFIG_PATH, loadMediaConfig, requireMediaOwner } from "../src/lib/media";
import { loadPostPlannerZone } from "../src/lib/postplanner";
import { slotInstant } from "../src/lib/time";

const MEDIA_REPO = "ftm-media";
const WORK_DIR = ".media-repo";
/** How long to wait for raw.githubusercontent to serve a just-pushed blob. */
const VERIFY_ATTEMPTS = 10;
const VERIFY_INTERVAL_MS = 6_000;

type Args = { date: string; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  let date = "";
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") date = argv[++i] ?? "";
    else if (arg.startsWith("--date=")) date = arg.slice(7);
    else if (arg === "--dry-run") dryRun = true;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Pass a date: npm run publish-sheet -- --date 2026-11-10");
  }
  return { date, dryRun };
}

let DRY_RUN = false;

function show(args: string[], cwd?: string): void {
  const where = cwd ? `(${path.relative(process.cwd(), cwd) || "."}) ` : "";
  console.log(`  $ ${where}git ${args.join(" ")}`);
}

function spawnGit(args: string[], cwd?: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function git(args: string[], cwd?: string): string {
  show(args, cwd);
  if (DRY_RUN) return "";
  try {
    return spawnGit(args, cwd);
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    throw new Error(`\`git ${args.join(" ")}\` failed:\n${(e.stderr || e.stdout || e.message || "").toString().trim()}`);
  }
}

function tryGit(args: string[], cwd?: string): { ok: boolean; out: string } {
  show(args, cwd);
  if (DRY_RUN) return { ok: true, out: "" };
  try {
    return { ok: true, out: spawnGit(args, cwd) };
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string };
    return { ok: false, out: ((e.stderr || e.stdout) ?? "").toString().trim() };
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const sha256 = (buf: Buffer | Uint8Array): string => createHash("sha256").update(buf).digest("hex");

/**
 * Minimal RFC 4180 reader. Captions legitimately contain commas, quotes and
 * newlines, so a sheet cannot be split on newlines — doing exactly that is how
 * an earlier version of this guard read a caption fragment as a POSTING TIME.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * Refuse to publish a sheet whose rows are already in the past. This is the
 * second half of the 2026-11-10 failure: Post Planner treats a past POSTING
 * TIME as "send now", so a stale sheet does not sit harmlessly in the queue —
 * it empties itself onto the page immediately.
 */
function assertRowsAreFuture(csv: string, date: string, zone: string): number {
  const rows = parseCsv(csv).filter((cells) => cells.length > 1 && !(cells[0] ?? "").startsWith("##"));
  if (rows.length === 0) throw new Error("Sheet has no data rows.");

  const stale: string[] = [];
  const wrongDay: string[] = [];
  const [y, m, d] = date.split("-").map(Number);
  for (const cells of rows) {
    const stamp = (cells[0] ?? "").trim();
    const match = stamp.match(/^(\d{2})\/(\d{2})\/(\d{4})\s\s(\d{1,2}):(\d{2})$/);
    if (!match) throw new Error(`Row has a malformed POSTING TIME: ${stamp || "(empty)"}`);
    const [, mm, dd, yyyy, hh, mi] = match;
    if (Number(yyyy) !== y || Number(mm) !== m || Number(dd) !== d) wrongDay.push(stamp);
    // The stamps are wall-clock times in the PLANNER's zone, so they are
    // resolved in that zone — not in whatever zone this machine happens to
    // run in. A cloud container runs in UTC; comparing there would call every
    // Mountain-morning row stale and refuse a perfectly good sheet.
    const when = slotInstant(`${yyyy}-${mm}-${dd}`, `${hh.padStart(2, "0")}:${mi}`, zone);
    if (when.getTime() <= Date.now()) stale.push(`${stamp} ${zone}`);
  }
  if (wrongDay.length) {
    throw new Error(`Sheet is dated ${date} but contains rows for another day: ${wrongDay.join(", ")}`);
  }
  if (stale.length) {
    throw new Error(
      `${stale.length} row(s) are already in the past: ${stale.join(", ")}\n` +
        `Post Planner publishes a past-dated row immediately, all at once.\n` +
        `Re-time the day (edit input/${date}.json) and rebuild before publishing.`,
    );
  }
  return rows.length;
}

async function main(): Promise<void> {
  const { date, dryRun } = parseArgs(process.argv.slice(2));
  DRY_RUN = dryRun;
  const owner = requireMediaOwner(loadMediaConfig());
  const slug = `${owner}/${MEDIA_REPO}`;
  const remote = `https://github.com/${slug}.git`;

  const localCsv = path.join(process.cwd(), "output", date, "postplanner.csv");
  if (!existsSync(localCsv)) {
    throw new Error(`No output/${date}/postplanner.csv — run \`npm run build-day\` first.`);
  }
  const bytes = await readFile(localCsv);
  const digest = sha256(bytes);
  const zone = loadPostPlannerZone();
  const rowCount = assertRowsAreFuture(bytes.toString("utf8"), date, zone);

  const name = `${date}-${digest.slice(0, 10)}.csv`;
  const rel = `sheets/${name}`;
  const url = `https://raw.githubusercontent.com/${owner}/${MEDIA_REPO}/main/${rel}`;

  console.log(`Publishing ${rowCount} row(s) from output/${date}/postplanner.csv${dryRun ? "  [dry run]" : ""}`);
  console.log(`  sha256    ${digest}`);
  console.log(`  zone      ${zone} (POSTING TIME is read in this zone)`);
  console.log(`  name      ${rel}   (content-addressed — this name can only ever hold these bytes)\n`);

  const probe = tryGit(["ls-remote", "--heads", remote]);
  if (!probe.ok) throw new Error(`Cannot reach ${remote}\n${probe.out}\nCheck "owner" in ${MEDIA_CONFIG_PATH}.`);

  const work = path.join(process.cwd(), WORK_DIR);
  if (!existsSync(path.join(work, ".git"))) {
    git(["clone", remote, WORK_DIR]);
  } else {
    git(["remote", "set-url", "origin", remote], work);
    git(["fetch", "origin"], work);
    git(["reset", "--hard", "origin/main"], work);
  }

  if (!dryRun) {
    await mkdir(path.join(work, "sheets"), { recursive: true });
    await writeFile(path.join(work, rel), bytes);
  }

  git(["add", rel], work);
  const staged = tryGit(["diff", "--cached", "--quiet"], work);
  if (staged.ok && !dryRun) {
    console.log(`\n  commit    nothing to commit — these exact bytes are already published`);
  } else {
    git(["commit", "-m", `sheet: ${date} (${rowCount} rows, ${digest.slice(0, 10)})`], work);
    git(["push", "origin", "main"], work);
  }

  if (dryRun) {
    console.log(`\n  verify    skipped (--dry-run)`);
    console.log(`\n  ${url}`);
    return;
  }

  // --- Verify the BYTES, not the status code -------------------------------
  console.log(`\n  verify    re-downloading and comparing sha256…`);
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
      if (res.ok) {
        const served = sha256(new Uint8Array(await res.arrayBuffer()));
        if (served === digest) {
          console.log(`            sha256 matches — served bytes are the bytes we built\n`);
          console.log(`  ${url}\n`);
          console.log(`Upload that URL to Post Planner. ${rowCount} rows, first slot still in the future.`);
          return;
        }
        throw new Error(
          `URL answered 200 but served DIFFERENT bytes.\n  expected ${digest}\n  got      ${served}\n` +
            `A content-addressed name should make this impossible; do not upload this sheet.`,
        );
      }
      console.log(`            attempt ${attempt}/${VERIFY_ATTEMPTS}: HTTP ${res.status}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("DIFFERENT bytes")) throw err;
      console.log(`            attempt ${attempt}/${VERIFY_ATTEMPTS}: ${(err as Error).message}`);
    }
    if (attempt < VERIFY_ATTEMPTS) await sleep(VERIFY_INTERVAL_MS);
  }
  throw new Error(`${url} never served the expected bytes. Nothing was uploaded to Post Planner.`);
}

main().catch((err) => {
  console.error(`\n${(err as Error).message}\n`);
  process.exit(1);
});
