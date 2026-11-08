/**
 * Timezone helpers built on `Intl` only — no date library.
 *
 * Everything in the database is UTC. Slots are authored as wall-clock times in
 * US Eastern, which means two things have to be handled explicitly:
 *   - the UTC offset changes twice a year (EST -05:00 / EDT -04:00)
 *   - on the spring-forward day a wall-clock time can be skipped, and on the
 *     fall-back day it can occur twice
 *
 * `zonedWallTimeToUtc` resolves both by converging on the offset that actually
 * applies at the resulting instant.
 */
import { ET_ZONE } from "./types";

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partFormatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partFormatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock parts of `instant` as seen in `timeZone`. */
export function getZonedParts(instant: Date, timeZone: string): Parts {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (EDT => -4h). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Zero out sub-second noise so the result is an exact offset.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock time in `timeZone` to the UTC instant it refers to.
 *
 * Two passes are enough for every real zone: the first guess may use the wrong
 * side of a DST transition, the second lands on the correct offset. Ambiguous
 * fall-back times resolve to the first (daylight) occurrence; skipped
 * spring-forward times resolve forward past the gap, which is what you want for
 * a publishing slot — it fires as soon as that wall time exists.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = ET_ZONE,
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let offset = zoneOffsetMs(new Date(target), timeZone);
  let instant = target - offset;
  const refined = zoneOffsetMs(new Date(instant), timeZone);
  if (refined !== offset) {
    offset = refined;
    instant = target - offset;
  }
  return new Date(instant);
}

/** "YYYY-MM-DD" for `instant` as seen in `timeZone`. */
export function zonedDateKey(instant: Date, timeZone: string = ET_ZONE): string {
  const p = getZonedParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD". */
export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`Bad date key: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Parse "HH:MM". */
export function parseSlot(slot: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(slot.trim());
  if (!m) throw new Error(`Bad slot time: ${slot}`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new Error(`Slot out of range: ${slot}`);
  return { hour, minute };
}

export function isValidSlot(slot: string): boolean {
  try {
    parseSlot(slot);
    return true;
  } catch {
    return false;
  }
}

/** Normalise and sort a slot list, dropping duplicates and anything malformed. */
export function normalizeSlots(slots: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of slots) {
    if (!isValidSlot(raw)) continue;
    const { hour, minute } = parseSlot(raw);
    const key = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.sort();
}

/** The UTC instant of `slot` on the ET calendar day `dateKey`. */
export function slotInstant(dateKey: string, slot: string, timeZone: string = ET_ZONE): Date {
  const { year, month, day } = parseDateKey(dateKey);
  const { hour, minute } = parseSlot(slot);
  return zonedWallTimeToUtc(year, month, day, hour, minute, timeZone);
}

/** Shift an ET calendar day by whole days, staying on calendar dates (DST-safe). */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  // Noon UTC is far from any DST boundary, so ±days never slips a date.
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Monday-start week containing `dateKey`, as seven ET date keys. */
export function weekDateKeys(dateKey: string): string[] {
  const { year, month, day } = parseDateKey(dateKey);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7; // Monday = 0
  const monday = addDaysToDateKey(dateKey, -back);
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(monday, i));
}

/** All ET date keys in the calendar month containing `dateKey`. */
export function monthDateKeys(dateKey: string): string[] {
  const { year, month } = parseDateKey(dateKey);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: days },
    (_, i) => `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function formatTimeInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

export function formatZoneAbbreviation(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(instant);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

export function formatDateInZone(
  instant: Date,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(instant);
}

/** The browser's own zone, used for the small "your time" labels. */
export function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ET_ZONE;
  } catch {
    return ET_ZONE;
  }
}

/** Today's ET date key. */
export function todayKey(now: Date = new Date(), timeZone: string = ET_ZONE): string {
  return zonedDateKey(now, timeZone);
}
