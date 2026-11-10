/**
 * Publish a day's rendered cards to public hosting.
 *
 *   npm run publish-media -- --date 2026-11-10
 *   npm run publish-media -- --date 2026-11-10 --dry-run   # print the git commands, run none
 *
 * Post Planner's servers fetch the MEDIA url themselves, so the images have to
 * live somewhere public and stay there until the post publishes. This pushes
 * `output/<date>/*.png` into a SEPARATE public repo (`ftm-media`) served by
 * GitHub Pages. `ftm-studio` itself stays private — only the finished images
 * are exposed, never the day files, captions or source.
 *
 * **Plain git only. No `gh`, no GitHub REST API.** A scheduled cloud session is
 * bound to its configured repositories and gets HTTP 403 on user-level API
 * paths (`/user`, `/users/<name>`, repo creation), so anything beyond
 * ls-remote/clone/fetch/commit/push dies there. Hence:
 *   - the owner comes from `config/media.json`, never from `gh api user`;
 *   - existence is tested with `git ls-remote`, never `gh repo view`;
 *   - a missing repo is an error, never `gh repo create` — creating the repo
 *     and turning on Pages are one-time human steps (see README).
 *
 * The URL it verifies is built by the same `mediaUrlFor` helper that writes the
 * CSV, so a URL that passes here is exactly the one Post Planner will fetch.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MEDIA_CONFIG_PATH,
  assertUsableMediaUrl,
  loadMediaConfig,
  mediaUrlFor,
  requireMediaOwner,
} from "../src/lib/media";

const MEDIA_REPO = "ftm-media";
/** Local working clone of the media repo. Gitignored; safe to delete. */
const WORK_DIR = ".media-repo";

type Args = { date: string; skipVerify: boolean; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  let date = "";
  let skipVerify = false;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") date = argv[++i] ?? "";
    else if (arg.startsWith("--date=")) date = arg.slice(7);
    else if (arg === "--no-verify") skipVerify = true;
    else if (arg === "--dry-run") dryRun = true;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Pass a date: npm run publish-media -- --date 2026-11-10");
  }
  return { date, skipVerify, dryRun };
}

/** Set by --dry-run: print each git command instead of running it. */
let DRY_RUN = false;

function show(args: string[], cwd?: string): void {
  const where = cwd ? `(${path.relative(process.cwd(), cwd) || "."}) ` : "";
  console.log(`  $ ${where}git ${args.join(" ")}`);
}

function spawnGit(args: string[], cwd?: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * Run git. Every external command this script issues goes through `git` or
 * `tryGit`, and both print it first — so the log is the full command record.
 */
function git(args: string[], cwd?: string): string {
  show(args, cwd);
  if (DRY_RUN) return "";
  try {
    return spawnGit(args, cwd);
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const detail = (e.stderr || e.stdout || e.message || "").toString().trim();
    throw new Error(`\`git ${args.join(" ")}\` failed:\n${detail}`);
  }
}

/** Same as `git`, but a non-zero exit is an expected answer rather than a fault. */
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

async function main(): Promise<void> {
  const { date, skipVerify, dryRun } = parseArgs(process.argv.slice(2));
  DRY_RUN = dryRun;
  const media = loadMediaConfig();
  const owner = requireMediaOwner(media);
  const slug = `${owner}/${MEDIA_REPO}`;
  const remote = `https://github.com/${slug}.git`;

  // --- What are we publishing? ---------------------------------------------
  const srcDir = path.join(process.cwd(), "output", date);
  if (!existsSync(srcDir)) {
    throw new Error(`No output/${date}/ — run \`npm run build-day -- --input input/${date}.json\` first.`);
  }
  const pngs = (await readdir(srcDir)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  if (pngs.length === 0) throw new Error(`output/${date}/ contains no PNGs.`);

  console.log(
    `Publishing ${pngs.length} image(s) from output/${date}/ to ${slug}${dryRun ? "  [dry run — nothing is executed]" : ""}\n`,
  );

  // --- The repo must already exist -----------------------------------------
  // ls-remote speaks plain git, so it works on a laptop and in a cloud session
  // alike. A just-created empty repo succeeds with no output; that is fine.
  const probe = tryGit(["ls-remote", "--heads", remote]);
  if (!probe.ok) {
    throw new Error(
      `Cannot reach ${remote}\n${probe.out}\n\n` +
        `Either the repo does not exist or this environment has no access to it.\n` +
        `This job will not create it. Do it once, by hand:\n` +
        `  1. Create a PUBLIC repo named "${MEDIA_REPO}" under ${owner} on github.com.\n` +
        `  2. Settings → Pages → Deploy from a branch → main, / (root).\n` +
        `  3. For scheduled cloud runs, add ${slug} to the environment's repositories.\n` +
        `If the owner is wrong, fix "owner" in ${MEDIA_CONFIG_PATH}.`,
    );
  }
  const remoteHasMain = dryRun || /\srefs\/heads\/main$/m.test(probe.out);
  console.log(`  repo      ${slug} (reachable${remoteHasMain ? "" : ", empty"})`);

  // --- Local working clone --------------------------------------------------
  const work = path.join(process.cwd(), WORK_DIR);

  if (!existsSync(path.join(work, ".git"))) {
    git(["clone", remote, WORK_DIR]);
  } else {
    // Discard anything local: this directory is a cache, not a workspace.
    git(["remote", "set-url", "origin", remote], work);
    git(["fetch", "origin"], work);
    if (remoteHasMain) git(["reset", "--hard", "origin/main"], work);
  }

  // An empty remote clones with no commits and no branch; start `main`.
  if (!remoteHasMain) git(["checkout", "-B", "main"], work);

  // --- Copy the day in ------------------------------------------------------
  const destDir = path.join(work, date);
  if (!dryRun) {
    await mkdir(destDir, { recursive: true });
    for (const file of pngs) {
      await copyFile(path.join(srcDir, file), path.join(destDir, file));
    }

    // Give the repo root something explanatory; also what Pages serves at /.
    await writeFile(
      path.join(work, "README.md"),
      [
        "# ftm-media",
        "",
        "Public image hosting for **Follow the Money** posts.",
        "",
        "This repository is public **by necessity**: Post Planner's servers fetch each",
        "post's image by URL when it publishes, so the files have to be reachable",
        "without authentication. Only finished, already-approved post images live here.",
        "",
        "The generator itself — day files, captions, drafts, sources — is in the private",
        "`ftm-studio` repository and is never published.",
        "",
        "One folder per publishing day. Files are written by `npm run publish-media`",
        "in `ftm-studio`; nothing here is edited by hand.",
        "",
      ].join("\n"),
      "utf8",
    );
  }
  console.log(`  copy      ${pngs.length} PNG(s) → ${WORK_DIR}/${date}/${dryRun ? " (skipped in dry run)" : ""}`);

  git(["add", "-A"], work);
  const staged = tryGit(["diff", "--cached", "--name-only"], work).out;
  if (!dryRun && !staged) {
    console.log("  commit    nothing changed");
  } else {
    git(
      ["-c", `user.name=${owner}`, "-c", "user.email=noreply@github.com", "commit", "-m", `Add post images for ${date}`],
      work,
    );
    git(["push", "-u", "origin", "main"], work);
    if (!dryRun) console.log(`  push      ${staged.split("\n").length} file(s) to ${slug}@main`);
  }

  // GitHub Pages is deliberately NOT touched: enabling it is a REST call, and
  // the verify step below catches a repo whose Pages was never switched on.

  // --- Verify every URL -----------------------------------------------------
  const urls = pngs.map((file) => ({ file, url: mediaUrlFor(media.baseUrl, date, file) }));
  for (const { url } of urls) assertUsableMediaUrl(url);

  if (skipVerify || dryRun) {
    console.log(`\n  verify    skipped (${dryRun ? "--dry-run" : "--no-verify"})`);
    for (const { url } of urls) console.log(`            ${url}`);
    return;
  }

  // A Pages deploy takes a while; poll rather than failing immediately.
  console.log("\n  verify    waiting for GitHub Pages to serve the images…");
  const deadline = Date.now() + 5 * 60_000;
  let pending = [...urls];
  const failures: Array<{ file: string; url: string; reason: string }> = [];
  let attempt = 0;

  while (pending.length > 0 && Date.now() < deadline) {
    attempt++;
    const stillPending: typeof pending = [];
    for (const item of pending) {
      const result = await check(item.url);
      if (result.ok) {
        console.log(`            200  ${result.type.padEnd(10)} ${item.url}`);
      } else {
        stillPending.push(item);
      }
    }
    pending = stillPending;
    if (pending.length > 0) {
      if (Date.now() + 15_000 >= deadline) break;
      if (attempt === 1) console.log(`            ${pending.length} not live yet; retrying…`);
      await sleep(15_000);
    }
  }

  for (const item of pending) {
    const result = await check(item.url);
    failures.push({ file: item.file, url: item.url, reason: result.reason });
  }

  if (failures.length > 0) {
    console.error(`\n  ${failures.length} URL(s) are NOT serving a usable image.`);
    console.error("  A dead URL is a failed post — do not upload the CSV until these work.");
    console.error(`  If every one is a 404, check Pages is on for ${slug} (Settings → Pages → main, root).\n`);
    for (const f of failures) console.error(`    ${f.file}: ${f.reason}\n      ${f.url}`);
    process.exit(1);
  }

  console.log(`\nAll ${urls.length} image(s) are live under ${media.baseUrl}/${date}/`);
  console.log(`The MEDIA column in output/${date}/postplanner.csv already points at them.`);
}

/** A usable image URL answers 200 with an `image/*` content type. */
async function check(url: string): Promise<{ ok: boolean; type: string; reason: string }> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { ok: false, type, reason: `HTTP ${res.status} ${res.statusText}` };
    if (!type.toLowerCase().startsWith("image/")) {
      return { ok: false, type, reason: `HTTP 200 but content-type was "${type}", not an image` };
    }
    return { ok: true, type: type.split(";")[0], reason: "" };
  } catch (err) {
    return { ok: false, type: "", reason: `request failed: ${err instanceof Error ? err.message : err}` };
  }
}

main().catch((err) => {
  console.error(`\npublish-media failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
