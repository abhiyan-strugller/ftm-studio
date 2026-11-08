/** Database row shapes and planner view models. */
import type { PaletteName } from "./design/palettes";
import type { TemplateName, PostDoc } from "./schema";

export const POST_STATUSES = [
  "idea",
  "draft",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "rejected",
  "failed",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const STATUS_LABELS: Record<PostStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

/** Chip colours. Keep in sync with `status` in tailwind.config.ts. */
export const STATUS_COLORS: Record<PostStatus, string> = {
  idea: "#8A94A6",
  draft: "#F2B632",
  approved: "#3B82F6",
  scheduled: "#3B82F6",
  publishing: "#8B5CF6",
  published: "#2BD47D",
  failed: "#EF4444",
  rejected: "#6B7280",
};

/** A published post is immutable in the planner — it exists on Facebook already. */
export function isLocked(status: PostStatus): boolean {
  return status === "published" || status === "publishing";
}

export type PostRow = {
  id: string;
  created_at: string;
  updated_at: string;
  status: PostStatus;
  story_text: string | null;
  source_url: string | null;
  my_take: string | null;
  unconfirmed: boolean;
  is_evergreen: boolean;
  template: TemplateName | null;
  palette: PaletteName | null;
  data: Record<string, unknown> | null;
  caption: string | null;
  image_url: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  fb_post_id: string | null;
  error: string | null;
  post_number: number;
};

/** The `data` jsonb column holds the full renderable doc plus bookkeeping. */
export type PostData = {
  doc?: Omit<PostDoc, "post_number">;
  hashtags?: string[];
  flags?: string[];
  /** Raw model response kept for debugging a bad draft. */
  model?: string;
};

export type SettingsRow = {
  id: number;
  /** Daily slots as "HH:MM" in US Eastern, ascending. */
  slots: string[];
  /** IANA zone shown next to ET in the planner. */
  display_timezone: string;
  /** Posts per day you are aiming for. Usually `slots.length`. */
  daily_target: number;
  updated_at: string;
};

export const DEFAULT_SLOTS = ["08:00", "12:00", "18:00", "21:00"];
export const ET_ZONE = "America/New_York";

export type Settings = {
  slots: string[];
  displayTimezone: string;
  dailyTarget: number;
};

export const DEFAULT_SETTINGS: Settings = {
  slots: DEFAULT_SLOTS,
  displayTimezone: ET_ZONE,
  dailyTarget: DEFAULT_SLOTS.length,
};
