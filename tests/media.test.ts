import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertUsableMediaUrl,
  loadMediaConfig,
  mediaUrlFor,
  MEDIA_CONFIG_PATH,
  requireMediaOwner,
} from "@/lib/media";

function writeConfig(contents: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ftm-media-"));
  const file = path.join(dir, "media.json");
  writeFileSync(file, typeof contents === "string" ? contents : JSON.stringify(contents), "utf8");
  return file;
}

describe("mediaUrlFor", () => {
  it("builds <base>/<date>/<file>", () => {
    expect(mediaUrlFor("https://u.github.io/ftm-media", "2026-11-09", "01-headline.png")).toBe(
      "https://u.github.io/ftm-media/2026-11-09/01-headline.png",
    );
  });

  it("tolerates a trailing slash on the base", () => {
    expect(mediaUrlFor("https://u.github.io/ftm-media/", "2026-11-09", "a.png")).toBe(
      "https://u.github.io/ftm-media/2026-11-09/a.png",
    );
  });

  it("is the single source of truth shared by build-day and publish-media", () => {
    // Both callers pass the same three inputs, so the same URL must come back.
    const a = mediaUrlFor("https://u.github.io/ftm-media", "2026-11-09", "07-breaking.png");
    const b = mediaUrlFor("https://u.github.io/ftm-media", "2026-11-09", "07-breaking.png");
    expect(a).toBe(b);
  });

  it("percent-encodes anything surprising in a filename", () => {
    expect(mediaUrlFor("https://u.github.io/m", "2026-11-09", "a b.png")).toContain("a%20b.png");
  });
});

describe("assertUsableMediaUrl", () => {
  it("accepts an https URL ending in a supported extension", () => {
    expect(() =>
      assertUsableMediaUrl("https://u.github.io/ftm-media/2026-11-09/01-headline.png"),
    ).not.toThrow();
  });

  it.each([".jpg", ".jpeg", ".gif", ".mp4"])("accepts %s", (ext) => {
    expect(() => assertUsableMediaUrl(`https://u.github.io/m/a${ext}`)).not.toThrow();
  });

  it("rejects a bare filename — Post Planner fetches the URL itself", () => {
    expect(() => assertUsableMediaUrl("01-headline.png")).toThrow(/must be https/);
  });

  it("rejects http", () => {
    expect(() => assertUsableMediaUrl("http://u.github.io/m/a.png")).toThrow(/must be https/);
  });

  it("rejects a URL with no media extension", () => {
    // Exactly the shape a Drive or Dropbox share link has.
    expect(() => assertUsableMediaUrl("https://drive.google.com/file/d/abc123/view")).toThrow(
      /must end in/,
    );
  });

  it("ignores a query string when checking the extension", () => {
    expect(() => assertUsableMediaUrl("https://u.github.io/m/a.png?v=2")).not.toThrow();
  });
});

describe("loadMediaConfig", () => {
  it("reads the committed config", () => {
    const config = loadMediaConfig(MEDIA_CONFIG_PATH);
    expect(config.baseUrl).toMatch(/^https:\/\//);
    expect(config.baseUrl.endsWith("/")).toBe(false);
  });

  it("strips a trailing slash", () => {
    expect(loadMediaConfig(writeConfig({ baseUrl: "https://x.io/m/" })).baseUrl).toBe("https://x.io/m");
  });

  it("rejects a non-https base", () => {
    expect(() => loadMediaConfig(writeConfig({ baseUrl: "http://x.io/m" }))).toThrow(/must start with https/);
  });

  it("rejects a missing or empty baseUrl", () => {
    expect(() => loadMediaConfig(writeConfig({}))).toThrow(/non-empty string/);
    expect(() => loadMediaConfig(writeConfig({ baseUrl: "  " }))).toThrow(/non-empty string/);
  });

  it("rejects malformed JSON, naming the file", () => {
    expect(() => loadMediaConfig(writeConfig("{ nope"))).toThrow(/Could not read/);
  });

  it("rejects a JSON array", () => {
    expect(() => loadMediaConfig(writeConfig(["https://x.io"]))).toThrow(/must contain a JSON object/);
  });

  it("explains the expected shape when the file is missing", () => {
    expect(() => loadMediaConfig("config/not-here.json")).toThrow(/baseUrl/);
  });
});

describe("media repo owner", () => {
  it("is set in the committed config", () => {
    expect(requireMediaOwner(loadMediaConfig(MEDIA_CONFIG_PATH))).toBe("abhiyan-strugller");
  });

  it("reads owner beside baseUrl", () => {
    const config = loadMediaConfig(writeConfig({ baseUrl: "https://x.io/m", owner: " someone " }));
    expect(config.owner).toBe("someone");
  });

  it("leaves owner undefined when absent, so build-day still works", () => {
    expect(loadMediaConfig(writeConfig({ baseUrl: "https://x.io/m" })).owner).toBeUndefined();
  });

  it("fails clearly when publish-media needs an owner that is not there", () => {
    const config = loadMediaConfig(writeConfig({ baseUrl: "https://x.io/m" }));
    expect(() => requireMediaOwner(config)).toThrow(/no "owner"/);
  });

  it.each(["", "has space", "-leading", "trailing-", "a/b", 42])("rejects owner %j", (owner) => {
    expect(() => loadMediaConfig(writeConfig({ baseUrl: "https://x.io/m", owner }))).toThrow(
      /must be a GitHub username/,
    );
  });
});

describe("publish-media runs plain git only", () => {
  // Cloud sessions get HTTP 403 on user-level GitHub API paths. Any `gh` call
  // here would break scheduled runs, so the script may only ever spawn git.
  const source = readFileSync(path.join("scripts", "publish-media.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("spawns nothing but git", () => {
    const spawned = [...code.matchAll(/execFileSync\(\s*("[^"]*"|\w+)/g)].map((m) => m[1]);
    expect(spawned.length).toBeGreaterThan(0);
    expect(new Set(spawned)).toEqual(new Set(['"git"']));
    expect(code).not.toMatch(/\b(exec|execSync|spawn|spawnSync)\(/);
  });

  it("never calls gh, the user API, or repo creation/view", () => {
    expect(code).not.toMatch(/["'`]gh["'`]|gh\.exe|api\s+user|repo\s*create|repo\s*view/i);
    expect(code).not.toMatch(/["']repo["'],\s*["'](create|view)["']/);
    expect(code).not.toMatch(/api\.github\.com/);
  });
});
