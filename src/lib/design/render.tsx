/**
 * PNG rendering entry point.
 *
 * `next/og` (Satori + resvg) rasterises the flexbox composition at 1080x1350 —
 * Facebook's tallest feed-friendly portrait ratio.
 */
import { ImageResponse } from "next/og";
import { CANVAS_H, CANVAS_W } from "./frame";
import { loadFonts } from "./fonts";
import { PostComposition } from "./templates";
import type { PostDoc } from "../schema";

export async function renderPost(doc: PostDoc): Promise<ImageResponse> {
  const fonts = await loadFonts();
  return new ImageResponse(<PostComposition doc={doc} />, {
    width: CANVAS_W,
    height: CANVAS_H,
    fonts,
  });
}

/** Same render, as raw PNG bytes — used by the sample script and the uploader. */
export async function renderPostBytes(doc: PostDoc): Promise<Buffer> {
  const res = await renderPost(doc);
  return Buffer.from(await res.arrayBuffer());
}
