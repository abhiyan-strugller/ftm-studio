import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  getZonedParts,
  parseSlot,
  slotInstant,
  zonedDateKey,
  zonedWallTimeToUtc,
} from "@/lib/time";
import { DAILY_SLOTS, DAILY_TARGET, assertValidSlots, slotAt, slotForInstant } from "@/lib/slots";
import { ET_ZONE } from "@/lib/types";

/** What a UTC instant looks like on the Eastern wall clock. */
function etWall(iso: string): string {
  const p = getZonedParts(new Date(iso), ET_ZONE);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

describe("the daily slot grid", () => {
  it("has 15 hourly slots from 07:00 to 21:00", () => {
    expect(DAILY_SLOTS).toHaveLength(15);
    expect(DAILY_TARGET).toBe(15);
    expect(DAILY_SLOTS[0]).toBe("07:00");
    expect(DAILY_SLOTS[DAILY_SLOTS.length - 1]).toBe("21:00");
  });

  it("is strictly ascending with no duplicates", () => {
    expect(() => assertValidSlots(DAILY_SLOTS)).not.toThrow();
    const sorted = [...DAILY_SLOTS].sort();
    expect([...DAILY_SLOTS]).toEqual(sorted);
    expect(new Set(DAILY_SLOTS).size).toBe(DAILY_SLOTS.length);
  });

  it("rejects a malformed or duplicated slot, naming the value", () => {
    expect(() => assertValidSlots(["07:00", "25:00"])).toThrow(/25:00/);
    expect(() => assertValidSlots(["07:00", "07:00"])).toThrow(/Duplicate/);
    expect(() => assertValidSlots([])).toThrow(/empty/);
  });

  it("clamps slotAt rather than returning undefined past the end", () => {
    expect(slotAt("2026-11-09", 0).slot).toBe("07:00");
    expect(slotAt("2026-11-09", 99).slot).toBe("21:00");
    expect(slotAt("2026-11-09", -5).slot).toBe("07:00");
  });
});

describe("Eastern wall-clock conversion", () => {
  it("resolves a standard-time slot at UTC-5", () => {
    // 9 Nov 2026 is after the autumn switch, so Eastern is EST (UTC-5).
    expect(slotInstant("2026-11-09", "07:00").toISOString()).toBe("2026-11-09T12:00:00.000Z");
  });

  it("resolves a daylight-time slot at UTC-4", () => {
    // 9 Jul 2026 is EDT (UTC-4).
    expect(slotInstant("2026-07-09", "07:00").toISOString()).toBe("2026-07-09T11:00:00.000Z");
  });

  it("round-trips every slot back to the wall-clock time it was authored as", () => {
    for (const dateKey of ["2026-01-15", "2026-03-08", "2026-07-09", "2026-11-01", "2026-11-09"]) {
      for (const slot of DAILY_SLOTS) {
        const { hour, minute } = parseSlot(slot);
        const instant = slotInstant(dateKey, slot);
        const parts = getZonedParts(instant, ET_ZONE);
        expect(`${dateKey} ${slot}`).toBe(
          `${dateKey} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
        );
        expect(parts.hour).toBe(hour);
        expect(parts.minute).toBe(minute);
      }
    }
  });
});

describe("DST boundaries", () => {
  // In 2026 US DST starts 08 March and ends 01 November.
  it("keeps the same wall-clock hour either side of the spring change", () => {
    expect(etWall(slotInstant("2026-03-07", "12:00").toISOString())).toBe("2026-03-07 12:00");
    expect(etWall(slotInstant("2026-03-09", "12:00").toISOString())).toBe("2026-03-09 12:00");
    // ...which means the UTC instants differ by 23 hours, not 24.
    const before = slotInstant("2026-03-07", "12:00").getTime();
    const after = slotInstant("2026-03-08", "12:00").getTime();
    expect((after - before) / 3_600_000).toBe(23);
  });

  it("keeps the same wall-clock hour either side of the autumn change", () => {
    const before = slotInstant("2026-10-31", "12:00").getTime();
    const after = slotInstant("2026-11-01", "12:00").getTime();
    expect((after - before) / 3_600_000).toBe(25);
    expect(etWall(slotInstant("2026-11-01", "12:00").toISOString())).toBe("2026-11-01 12:00");
  });

  it("resolves a skipped spring-forward time forward, never backward", () => {
    // 02:30 on 08 March 2026 does not exist in Eastern time.
    const instant = zonedWallTimeToUtc(2026, 3, 8, 2, 30, ET_ZONE);
    const parts = getZonedParts(instant, ET_ZONE);
    expect(parts.day).toBe(8);
    // It must land at or after 03:00, i.e. past the gap rather than at 01:30.
    expect(parts.hour).toBeGreaterThanOrEqual(3);
  });

  it("resolves an ambiguous fall-back time to a real instant on the right day", () => {
    // 01:30 on 01 November 2026 happens twice in Eastern time.
    const instant = zonedWallTimeToUtc(2026, 11, 1, 1, 30, ET_ZONE);
    const parts = getZonedParts(instant, ET_ZONE);
    expect(parts.day).toBe(1);
    expect(parts.hour).toBe(1);
    expect(parts.minute).toBe(30);
  });

  it("steps calendar days across a DST change without slipping a date", () => {
    expect(addDaysToDateKey("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDaysToDateKey("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDaysToDateKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysToDateKey("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateKey("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("matching an instant back to its slot", () => {
  it("finds the slot a scheduled time sits on", () => {
    const at = slotInstant("2026-11-09", "13:00");
    expect(slotForInstant(at)?.slot).toBe("13:00");
    expect(zonedDateKey(at, ET_ZONE)).toBe("2026-11-09");
  });

  it("returns null for a time between slots", () => {
    const at = new Date(slotInstant("2026-11-09", "13:00").getTime() + 7 * 60_000);
    expect(slotForInstant(at)).toBeNull();
  });
});
