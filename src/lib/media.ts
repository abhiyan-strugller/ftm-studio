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
  /**
   * GitHub account that owns the `ftm-media` repo. Read from config rather than
   * asked of the GitHub API: a scheduled cloud session cannot call user-level
   * endpoints such as `/user`, so the owner has to be known up front.
   * `undefined` when absent — `build-day` does not need it, `publish-media`
   * insists on it via `requireMediaOwner`.
   */
  owner?: string;
};

/** GitHub's login rules: 1–39 chars, alphanumerics and single inner hyphens. */
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

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

  const rawOwner = (parsed as Record<string, unknown>).owner;
  let owner: string | undefined;
  if (rawOwner !== undefined) {
    if (typeof rawOwner !== "string" || !GITHUB_LOGIN.test(rawOwner.trim())) {
      throw new Error(
        `${configPath}: "owner" must be a GitHub username, e.g. "abhiyan-strugller". ` +
          `Got ${JSON.stringify(rawOwner)}.`,
      );
    }
    owner = rawOwner.trim();
  }

  return owner === undefined ? { baseUrl } : { baseUrl, owner };
}

/** The media repo owner, or a clear error saying where to put it. */
export function requireMediaOwner(config: MediaConfig, configPath: string = MEDIA_CONFIG_PATH): string {
  if (!config.owner) {
    throw new Error(
      `${configPath} has no "owner". Add the GitHub account that owns the ftm-media repo ` +
        `beside "baseUrl", e.g.
  "owner": "abhiyan-strugller"`,
    );
  }
  return config.owner;
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
