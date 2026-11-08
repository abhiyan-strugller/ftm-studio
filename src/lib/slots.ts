/**
 * The daily publishing grid.
 *
 * Post Planner does the actual scheduling; this module only decides what time
 * each of the day's posts is *labelled* with, so the CSV lands them in the right
 * order at sensible hours. Times are authored as US Eastern wall-clock and
 * converted through `time.ts`, which handles the twice-yearly offset change.
 */
import { ET_ZONE } from "./types";
import { parseSlot, slotInstant, zonedDateKey } from "./time";

/**
 * The 15 slots a day is built around — hourly, 07:00 to 21:00 Eastern.
 *
 * This is the one place to change the cadence: everything else (skeleton
 * generation, CSV times, the contact sheet) reads the list from here, and the
 * daily target is simply its length.
 */
export const DAILY_SLOTS: readonly string[] = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
] as const;

/** Posts per day. Derived, so it can never drift from the slot list. */
export const DAILY_TARGET = DAILY_SLOTS.length;

/** A slot on a specific ET day, resolved to a UTC instant. */
export type SlotRef = {
  /** ET calendar day, "YYYY-MM-DD". */
  dateKey: string;
  /** "HH:MM" in ET. */
  slot: string;
  /** The UTC instant that wall-clock time refers to. */
  at: Date;
};

/** Every slot for one ET day, in order. */
export function slotsForDay(
  dateKey: string,
  slots: readonly string[] = DAILY_SLOTS,
  timeZone: string = ET_ZONE,
): SlotRef[] {
  return slots.map((slot) => ({ dateKey, slot, at: slotInstant(dateKey, slot, timeZone) }));
}

/** The nth slot of a day, or the last one if the day has more posts than slots. */
export function slotAt(
  dateKey: string,
  index: number,
  slots: readonly string[] = DAILY_SLOTS,
  timeZone: string = ET_ZONE,
): SlotRef {
  const all = slotsForDay(dateKey, slots, timeZone);
  if (all.length === 0) throw new Error("No slots configured");
  return all[Math.min(Math.max(index, 0), all.length - 1)];
}

/** Which configured slot (if any) a timestamp lines up with on its ET day. */
export function slotForInstant(
  at: Date,
  slots: readonly string[] = DAILY_SLOTS,
  timeZone: string = ET_ZONE,
): SlotRef | null {
  const dateKey = zonedDateKey(at, timeZone);
  const target = Math.floor(at.getTime() / 60_000);
  for (const ref of slotsForDay(dateKey, slots, timeZone)) {
    if (Math.floor(ref.at.getTime() / 60_000) === target) return ref;
  }
  return null;
}

/** Reject a malformed slot list early, with a message naming the bad entry. */
export function assertValidSlots(slots: readonly string[]): void {
  if (slots.length === 0) throw new Error("Slot list is empty");
  const seen = new Set<string>();
  for (const slot of slots) {
    parseSlot(slot); // throws with the offending value
    if (seen.has(slot)) throw new Error(`Duplicate slot time: ${slot}`);
    seen.add(slot);
  }
}
