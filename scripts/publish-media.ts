/**
 * Publish a day's rendered cards to public hosting.
 *
 *   npm run publish-media -- --date 2026-11-10
 *
 * Post Planner's servers fetch the MEDIA url themselves, so the images have to
 * live somewhere public and stay there until the post publishes. This pushes
 * `output/<date>/*.png` into a SEPARATE public repo (`ftm-media`) served by
 * GitHub Pages. `ftm-studio` itself stays private — only the finished images
 * are exposed, never the day files, captions or source.
 *
 * The URL it verifies is built by the same `mediaUrlFor` helper that writes the
 * CSV, so a URL that passes here is exactly the one Post Planner will fetch.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadMediaConfig, mediaUrlFor, assertUsableMediaUrl } from "../src/lib/media";

const MEDIA_REPO = "ftm-media";
/** Local working clone of the media repo. Gitignored; safe to delete. */
const WORK_DIR = ".media-repo";

type Args = { date: string; skipVerify: boolean };

function parseArgs(argv: string[]): Args {
  let date = "";
  let skipVerify = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--date") date = argv[++i] ?? "";
    else if (arg.startsWith("--date=")) date = arg.slice(7);
    else if (arg === "--no-verify") skipVerify = true;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Pass a date: npm run publish-media -- --date 2026-11-10");
  }
  return { date, skipVerify };
}

/** gh is not on PATH under Git Bash on Windows, so fall back to its install dir. */
function findGh(): string {
  const candidates = [
    "gh",
    "C:\\Program Files\\GitHub CLI\\gh.exe",
    "C:\\Program Files (x86)\\GitHub CLI\\gh.exe",
  ];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "pipe" });
      return candidate;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    "GitHub CLI not found. Install it with `winget install GitHub.cli`, then run `gh auth login`.",
  );
}

function run(cmd: string, args: string[], cwd?: string): string {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const detail = (e.stderr || e.stdout || e.message || "").toString().trim();
    throw new Error(`\`${cmd} ${args.join(" ")}\` failed:\n${detail}`);
  }
}

/** Same as `run`, but a non-zero exit is an expected answer rather than a fault. */
function tryRun(cmd: string, args: string[], cwd?: string): { ok: boolean; out: string } {
  try {
    return { ok: true, out: execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() };
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string };
    return { ok: false, out: ((e.stderr || e.stdout) ?? "").toString().trim() };
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const { date, skipVerify } = parseArgs(process.argv.slice(2));
  const media = loadMediaConfig();
  const gh = findGh();

  // --- What are we publishing? ---------------------------------------------
  const srcDir = path.join(process.cwd(), "output", date);
  if (!existsSync(srcDir)) {
    throw new Error(`No output/${date}/ — run \`npm run build-day -- --input input/${date}.json\` first.`);
  }
  const pngs = (await readdir(srcDir)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  if (pngs.length === 0) throw new Error(`output/${date}/ contains no PNGs.`);

  const owner = run(gh, ["api", "user", "--jq", ".login"]);
  const slug = `${owner}/${MEDIA_REPO}`;
  console.log(`Publishing ${pngs.length} image(s) from output/${date}/ to ${slug}\n`);

  // --- Ensure the public repo exists ---------------------------------------
  if (tryRun(gh, ["repo", "view", slug, "--json", "name"]).ok) {
    console.log(`  repo      ${slug} (exists)`);
  } else {
    run(gh, [
      "repo",
      "create",
      slug,
      "--public",
      "--description",
      "Public image hosting for Follow the Money posts. Fetched by Post Planner at publish time.",
    ]);
    console.log(`  repo      ${slug} (created, public)`);
  }

  // --- Local working clone --------------------------------------------------
  const work = path.join(process.cwd(), WORK_DIR);
  const remote = `https://github.com/${slug}.git`;

  if (!existsSync(path.join(work, ".git"))) {
    run("git", ["clone", remote, WORK_DIR]);
    console.log(`  clone     ${WORK_DIR}/`);
  } else {
    // Discard anything local: this directory is a cache, not a workspace.
    tryRun("git", ["fetch", "origin"], work);
    tryRun("git", ["reset", "--hard", "origin/main"], work);
    console.log(`  clone     ${WORK_DIR}/ (refreshed)`);
  }

  // A freshly created repo has no commits and therefore no branch yet.
  if (!tryRun("git", ["rev-parse", "--abbrev-ref", "HEAD"], work).out) {
    run("git", ["checkout", "-b", "main"], work);
  }
  const branch = tryRun("git", ["rev-parse", "--abbrev-ref", "HEAD"], work).out;
  if (branch !== "main") run("git", ["branch", "-M", "main"], work);

  // --- Copy the day in ------------------------------------------------------
  const destDir = path.join(work, date);
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

  run("git", ["add", "-A"], work);
  const staged = tryRun("git", ["diff", "--cached", "--name-only"], work).out;
  if (!staged) {
    console.log("  commit    nothing changed");
  } else {
    run("git", ["-c", `user.name=${owner}`, "-c", "user.email=noreply@github.com", "commit", "-m", `Add post images for ${date}`], work);
    run("git", ["push", "-u", "origin", "main"], work);
    console.log(`  push      ${staged.split("\n").length} file(s) to ${slug}@main`);
  }

  // --- GitHub Pages ---------------------------------------------------------
  const pages = tryRun(gh, ["api", `repos/${slug}/pages`]);
  if (pages.ok) {
    console.log("  pages     already enabled");
  } else {
    const created = tryRun(gh, [
      "api",
      `repos/${slug}/pages`,
      "-X",
      "POST",
      "-f",
      "source[branch]=main",
      "-f",
      "source[path]=/",
    ]);
    console.log(created.ok ? "  pages     enabled (main, root)" : `  pages     could not enable automatically:\n            ${created.out}`);
  }

  // --- Verify every URL -----------------------------------------------------
  const urls = pngs.map((file) => ({ file, url: mediaUrlFor(media.baseUrl, date, file) }));
  for (const { url } of urls) assertUsableMediaUrl(url);

  if (skipVerify) {
    console.log("\n  verify    skipped (--no-verify)");
    for (const { url } of urls) console.log(`            ${url}`);
    return;
  }

  // A first Pages deploy takes a while; poll rather than failing immediately.
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
    console.error("  A dead URL is a failed post — do not upload the CSV until these work.\n");
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
