/**
 * GET /api/render?template=...&data=<base64url JSON>&key=<RENDER_SECRET>
 *
 * Renders a 1080x1350 PNG post from JSON. Guarded by RENDER_SECRET: the URL is
 * handed to Facebook and to Telegram, so without a shared secret anyone who saw
 * one could burn our render budget rendering arbitrary payloads.
 *
 * `template` is redundant with the `template` field inside `data` — it is kept
 * because it makes logs and Storage paths readable, and it must agree.
 */
import { ZodError } from "zod";
import { env } from "@/lib/env";
import { renderPost } from "@/lib/design/render";
import { decodeDocParam } from "@/lib/schema";

// Node runtime: the fonts are read from disk with fs.
export const runtime = "nodejs";

function problem(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Constant-time-ish compare so the secret can't be probed byte by byte. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (!secretMatches(url.searchParams.get("key"), env.renderSecret)) {
    // Deliberately vague: a wrong key and a missing key look the same.
    return problem("Forbidden", 403);
  }

  const dataParam = url.searchParams.get("data");
  if (!dataParam) return problem("Missing `data` parameter", 400);

  let doc;
  try {
    doc = decodeDocParam(dataParam);
  } catch (err) {
    if (err instanceof ZodError) {
      return problem(
        `Invalid post data: ${err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        400,
      );
    }
    return problem("Could not decode `data` — expected base64url-encoded JSON", 400);
  }

  const declared = url.searchParams.get("template");
  if (declared && declared !== doc.template) {
    return problem(`template=${declared} does not match data.template=${doc.template}`, 400);
  }

  try {
    return await renderPost(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown render error";
    console.error("[render] failed", { template: doc.template, message });
    return problem(`Render failed: ${message}`, 500);
  }
}
