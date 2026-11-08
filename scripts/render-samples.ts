/**
 * Render every template with both sample datasets.
 *
 *   npm run samples
 *
 * Writes `<template>.<short|long>.json` and `.png` into /samples. This is the
 * visual QA loop: look at all fourteen PNGs, and any headline that clips or
 * block that overflows shows up immediately.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SAMPLES, SAMPLE_KEYS } from "../src/lib/design/samples";
import { PostDocSchema } from "../src/lib/schema";

const OUT = path.join(process.cwd(), "samples");

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });

  // Imported lazily so a font/Satori problem reports after the directory exists.
  const { renderPostBytes } = await import("../src/lib/design/render");

  let failures = 0;
  for (const key of SAMPLE_KEYS) {
    const doc = SAMPLES[key];

    // Samples double as schema fixtures — a sample that no longer validates is
    // a sign the schema and the templates have drifted apart.
    const parsed = PostDocSchema.safeParse(doc);
    if (!parsed.success) {
      failures++;
      console.error(`  ${key.padEnd(22)} SCHEMA FAIL`);
      for (const issue of parsed.error.issues) {
        console.error(`      ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }

    await writeFile(path.join(OUT, `${key}.json`), JSON.stringify(doc, null, 2) + "\n", "utf8");

    try {
      const png = await renderPostBytes(parsed.data);
      await writeFile(path.join(OUT, `${key}.png`), png);
      console.log(`  ${key.padEnd(22)} ${(png.length / 1024).toFixed(0)} KB`);
    } catch (err) {
      failures++;
      console.error(`  ${key.padEnd(22)} RENDER FAIL: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} sample(s) failed.`);
    process.exit(1);
  }
  console.log(`\n${SAMPLE_KEYS.length} samples written to /samples.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
