/**
 * The day file: `input/<date>.json`, one per publishing day.
 *
 * This is the only thing written by hand. Everything downstream — the PNGs, the
 * Post Planner CSV, the contact sheet — is derived from it, so validation is
 * strict and errors are addressed by **post id**, not array index. A message
 * like `posts[04].data.stats[1].value` tells you exactly which card to open.
 *
 * Naming note: the whole file is snake_case, matching the template fields the
 * renderer already uses (`x_labels`, `option_a`, `impacts_label`). One
 * convention per file beats a camelCase shell around a snake_case core.
 */
import { z } from "zod";
import { PALETTE_NAMES } from "./design/palettes";
import {
  BarCompareDataSchema,
  BreakingDataSchema,
  HeadlineDataSchema,
  LineChartDataSchema,
  StatsDataSchema,
  StepsDataSchema,
  VersusDataSchema,
  type PostDoc,
} from "./schema";

const Trimmed = z.string().trim();

/** Fields every post in a day file carries, whatever its template. */
const DayPostBase = {
  /** Short stable handle used in filenames and error messages, e.g. "04". */
  id: Trimmed.min(1).max(12).regex(/^[A-Za-z0-9_-]+$/, "use letters, digits, - or _ only"),
  palette: z.enum(PALETTE_NAMES),
  /** Top-bar category, e.g. MARKETS / CRYPTO / RATES / WORLD. */
  tag: Trimmed.min(1).max(18),
  headline: Trimmed.min(1).max(180),
  /** One word inside `headline`, set italic in the accent colour. */
  accent_word: Trimmed.max(40).optional(),
  kicker: Trimmed.max(48).optional(),
  /** Printed on the card. Include the "Source:" prefix yourself. */
  source: Trimmed.max(90).optional(),
  /** The Facebook caption. Goes in the CSV, never on the image. */
  caption: Trimmed.min(1).max(2200),
  /** ISO 8601 instant for the slot this post occupies. */
  scheduled_at: Trimmed.datetime({ offset: true }),
  /**
   * Overrides the issue number derived from `start_number` + position. Use it
   * when a post moves between days and you want its "NO. ###" to follow.
   */
  post_number: z.number().int().positive().max(99_999).optional(),
};

export const DayPostSchema = z.discriminatedUnion("template", [
  z.object({ ...DayPostBase, template: z.literal("headline"), data: HeadlineDataSchema }),
  z.object({ ...DayPostBase, template: z.literal("stats"), data: StatsDataSchema }),
  z.object({ ...DayPostBase, template: z.literal("line_chart"), data: LineChartDataSchema }),
  z.object({ ...DayPostBase, template: z.literal("bar_compare"), data: BarCompareDataSchema }),
  z.object({ ...DayPostBase, template: z.literal("versus"), data: VersusDataSchema }),
  z.object({ ...DayPostBase, template: z.literal("steps"), data: StepsDataSchema }),
  z.object({ ...DayPostBase, template: z.literal("breaking"), data: BreakingDataSchema }),
]);

export type DayPost = z.infer<typeof DayPostSchema>;

export const DayFileSchema = z.object({
  /** ET calendar day, "YYYY-MM-DD". */
  date: Trimmed.regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  /** First issue number of the day; each post takes the next one in order. */
  start_number: z.number().int().positive().max(99_999).default(1),
  posts: z.array(DayPostSchema).min(1),
});

export type DayFile = z.infer<typeof DayFileSchema>;

// ---------------------------------------------------------------------------
// Validation with id-addressed errors
// ---------------------------------------------------------------------------

export class DayFileError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(`Day file is not valid:\n  - ${problems.join("\n  - ")}`);
    this.name = "DayFileError";
    this.problems = problems;
  }
}

function formatPath(path: PropertyKey[]): string {
  return path.reduce<string>((acc, part) => {
    if (typeof part === "number") return `${acc}[${part}]`;
    return acc ? `${acc}.${String(part)}` : String(part);
  }, "");
}

/**
 * Parse a day file, reporting every problem at once and naming the post by id.
 *
 * Posts are validated individually rather than as one array so that a failure
 * in post 04 does not hide a different failure in post 09, and so the id is
 * available to label the message even when the rest of that post is malformed.
 */
export function parseDayFile(raw: unknown): DayFile {
  const problems: string[] = [];

  const envelope = z
    .object({
      date: z.string(),
      start_number: z.number().optional(),
      posts: z.array(z.unknown()),
    })
    .safeParse(raw);

  if (!envelope.success) {
    for (const issue of envelope.error.issues) {
      problems.push(`${formatPath(issue.path) || "(root)"}: ${issue.message}`);
    }
    throw new DayFileError(problems);
  }

  const seenIds = new Set<string>();
  const posts: DayPost[] = [];

  envelope.data.posts.forEach((rawPost, index) => {
    // Fall back to the index only when the post has no usable id to blame.
    const idGuess =
      rawPost && typeof rawPost === "object" && typeof (rawPost as { id?: unknown }).id === "string"
        ? (rawPost as { id: string }).id
        : `#${index}`;

    const parsed = DayPostSchema.safeParse(rawPost);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = formatPath(issue.path);
        problems.push(`posts[${idGuess}]${path ? `.${path}` : ""}: ${issue.message}`);
      }
      return;
    }

    if (seenIds.has(parsed.data.id)) {
      problems.push(`posts[${parsed.data.id}].id: duplicate id`);
      return;
    }
    seenIds.add(parsed.data.id);
    posts.push(parsed.data);
  });

  const date = envelope.data.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    problems.push(`date: expected YYYY-MM-DD, got "${date}"`);
  }
  if (posts.length === 0 && problems.length === 0) {
    problems.push("posts: the day file has no posts");
  }
  if (problems.length > 0) throw new DayFileError(problems);

  return {
    date,
    start_number: envelope.data.start_number ?? 1,
    posts,
  };
}

// ---------------------------------------------------------------------------
// Day post -> renderable document
// ---------------------------------------------------------------------------

/**
 * Issue number for a post: its explicit override, else `start_number` plus its
 * position in the day. Keeping this derived-but-overridable means the numbers
 * stay sequential without any hidden counter file to drift out of sync.
 */
export function issueNumberFor(day: DayFile, index: number): number {
  const post = day.posts[index];
  return post.post_number ?? day.start_number + index;
}

/** Project a day post onto the renderer's document shape. */
export function toPostDoc(day: DayFile, index: number): PostDoc {
  const post = day.posts[index];
  const shared = {
    palette: post.palette,
    tag: post.tag,
    post_number: issueNumberFor(day, index),
    headline: post.headline,
    accent_word: post.accent_word,
    kicker: post.kicker,
    source_line: post.source,
  };

  // Rebuilt per branch so the discriminated union narrows `data` correctly.
  switch (post.template) {
    case "headline":
      return { ...shared, template: "headline", data: post.data };
    case "stats":
      return { ...shared, template: "stats", data: post.data };
    case "line_chart":
      return { ...shared, template: "line_chart", data: post.data };
    case "bar_compare":
      return { ...shared, template: "bar_compare", data: post.data };
    case "versus":
      return { ...shared, template: "versus", data: post.data };
    case "steps":
      return { ...shared, template: "steps", data: post.data };
    case "breaking":
      return { ...shared, template: "breaking", data: post.data };
  }
}
