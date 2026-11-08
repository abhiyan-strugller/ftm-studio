/**
 * Slot maths for our own publishing queue.
 *
 * We do not use Facebook's `scheduled_publish_time`, so a post's slot is just a
 * `scheduled_for` timestamp we own and can drag around freely.
 */
import { ET_ZONE } from "./types";
import { addDaysToDateKey, slotInstant, todayKey, zonedDateKey } from "./time";

/** A slot on a specific ET day, resolved to a UTC instant. */
export type SlotRef = {
  /** ET calendar day, "YYYY-MM-DD". */
  dateKey: string;
  /** "HH:MM" in ET. */
  slot: string;
  /** UTC instant the slot fires at. */
  at: Date;
};

export type SlotOccupancy = {
  /** ISO timestamps already taken. Compared at minute resolution. */
  taken: Set<number>;
};

/** Build an occupancy set from existing `scheduled_for` values. */
export function occupancyFrom(scheduledFor: Array<string | null | undefined>): SlotOccupancy {
  const taken = new Set<number>();
  for (const iso of scheduledFor) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) taken.add(minuteKey(t));
  }
  return { taken };
}

function minuteKey(ms: number): number {
  return Math.floor(ms / 60_000);
}

export function isSlotTaken(occupancy: SlotOccupancy, at: Date): boolean {
  return occupancy.taken.has(minuteKey(at.getTime()));
}

/**
 * Every slot for one ET day, in order.
 */
export function slotsForDay(
  dateKey: string,
  slots: string[],
  timeZone: string = ET_ZONE,
): SlotRef[] {
  return slots.map((slot) => ({ dateKey, slot, at: slotInstant(dateKey, slot, timeZone) }));
}

/**
 * The next slot at or after `now` that nothing else is scheduled into.
 *
 * Walks forward day by day, so it naturally rolls into tomorrow once today's
 * slots are gone or taken. Returns `null` only if every slot inside
 * `horizonDays` is occupied.
 */
export function nextFreeSlot(
  now: Date,
  slots: string[],
  occupancy: SlotOccupancy,
  opts: { timeZone?: string; horizonDays?: number } = {},
): SlotRef | null {
  const timeZone = opts.timeZone ?? ET_ZONE;
  const horizon = opts.horizonDays ?? 21;
  if (slots.length === 0) return null;

  let dateKey = zonedDateKey(now, timeZone);
  for (let d = 0; d < horizon; d++) {
    for (const ref of slotsForDay(dateKey, slots, timeZone)) {
      if (ref.at.getTime() <= now.getTime()) continue;
      if (isSlotTaken(occupancy, ref.at)) continue;
      return ref;
    }
    dateKey = addDaysToDateKey(dateKey, 1);
  }
  return null;
}

/**
 * Empty slots on one ET day — what the planner renders as "+ Add" placeholders
 * and what "Fill empty slots from evergreen" targets.
 */
export function emptySlotsForDay(
  dateKey: string,
  slots: string[],
  occupancy: SlotOccupancy,
  opts: { timeZone?: string; now?: Date; futureOnly?: boolean } = {},
): SlotRef[] {
  const timeZone = opts.timeZone ?? ET_ZONE;
  const now = opts.now ?? new Date();
  return slotsForDay(dateKey, slots, timeZone).filter((ref) => {
    if (isSlotTaken(occupancy, ref.at)) return false;
    if (opts.futureOnly && ref.at.getTime() <= now.getTime()) return false;
    return true;
  });
}

/** Which configured slot (if any) a timestamp lines up with on its ET day. */
export function slotForInstant(
  at: Date,
  slots: string[],
  timeZone: string = ET_ZONE,
): SlotRef | null {
  const dateKey = zonedDateKey(at, timeZone);
  const target = minuteKey(at.getTime());
  for (const ref of slotsForDay(dateKey, slots, timeZone)) {
    if (minuteKey(ref.at.getTime()) === target) return ref;
  }
  return null;
}

/** Tomorrow's ET date key, for `/plan`. */
export function tomorrowKey(now: Date = new Date(), timeZone: string = ET_ZONE): string {
  return addDaysToDateKey(todayKey(now, timeZone), 1);
}
