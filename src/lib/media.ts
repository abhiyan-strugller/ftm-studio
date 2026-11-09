/**
 * Public image URLs.
 *
 * Post Planner's servers fetch the MEDIA url themselves, so it has to be a
 * real public address ending in an image extension — a filename, a Google
 * Drive share link or a Dropbox link are all rejected, and the file has to
 * stay online until the post publishes.
 *
 * This is the ONE place a media URL is built. `build-day` writes it into the
 * CSV and `publish-media` verifies it after upload; both call `mediaUrlFor`,
 * so the two can never drift into producing different strings for the same
 * image.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export const MEDIA_CONFIG_PATH = path.join("config", "media.json");

export type MediaConfig = {
  /** No trailing slash; `<baseUrl>/<date>/<file>.png`. */
  baseUrl: string;
};

export function loadMediaConfig(configPath: string = MEDIA_CONFIG_PATH): MediaConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (err) {
    throw new Error(
      `Could not read ${configPath}: ${err instanceof Error ? err.message : String(err)}\n` +
        `It should contain: { "baseUrl": "https://<user>.github.io/ftm-media" }`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain a JSON object with a "baseUrl".`);
  }

  const raw = (parsed as Record<string, unknown>).baseUrl;
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`${configPath}: "baseUrl" must be a non-empty string.`);
  }

  const baseUrl = raw.trim().replace(/\/+$/, "");
  if (!/^https:\/\//.test(baseUrl)) {
    throw new Error(
      `${configPath}: "baseUrl" must start with https:// — Post Planner will not fetch ` +
        `an http:// or relative URL. Got ${JSON.stringify(baseUrl)}.`,
    );
  }
  return { baseUrl };
}

/**
 * The public URL for one rendered card.
 *
 * `date` is the ET calendar day the post belongs to, which is also the folder
 * name in the media repo.
 */
export function mediaUrlFor(baseUrl: string, date: string, fileName: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(date)}/${encodeURIComponent(fileName)}`;
}

/** Post Planner needs the URL to end in a media extension it recognises. */
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".mp4"];

export function assertUsableMediaUrl(url: string): void {
  if (!/^https:\/\//.test(url)) {
    throw new Error(`Media URL must be https://, got ${JSON.stringify(url)}`);
  }
  const withoutQuery = url.split(/[?#]/)[0].toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => withoutQuery.endsWith(ext))) {
    throw new Error(
      `Media URL must end in one of ${ALLOWED_EXTENSIONS.join(", ")} — got ${JSON.stringify(url)}`,
    );
  }
}
