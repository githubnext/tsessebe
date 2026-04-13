/**
 * Tests for DateOffset — calendar-aware date arithmetic.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  BusinessDay,
  Day,
  Hour,
  Milli,
  Minute,
  MonthBegin,
  MonthEnd,
  Second,
  Week,
  YearBegin,
  YearEnd,
} from "../../src/index.ts";
import type { DateOffset } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a UTC Date from an ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ). */
const utc = (s: string): Date => new Date(s.includes("T") ? s : `${s}T00:00:00Z`);

/** Format a UTC date as YYYY-MM-DD. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format a UTC date as YYYY-MM-DD HH:MM:SS. */
function isoDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ─── Day ─────────────────────────────────────────────────────────────────────

describe("Day", () => {
  it("applies positive n", () => {
    expect(isoDate(new Day(3).apply(utc("2024-01-01")))).toBe("2024-01-04");
    expect(isoDate(new Day(31).apply(utc("2024-01-01")))).toBe("2024-02-01");
  });

  it("applies negative n", () => {
    expect(isoDate(new Day(-1).apply(utc("2024-01-01")))).toBe("2023-12-31");
    expect(isoDate(new Day(-5).apply(utc("2024-01-10")))).toBe("2024-01-05");
  });

  it("applies n=0 → no change", () => {
    const d = utc("2024-06-15");
    expect(new Day(0).apply(d).getTime()).toBe(d.getTime());
  });

  it("rollforward and rollback are no-ops", () => {
    const d = utc("2024-03-07");
    expect(new Day(1).rollforward(d).getTime()).toBe(d.getTime());
    expect(new Day(1).rollback(d).getTime()).toBe(d.getTime());
  });

  it("onOffset always true", () => {
    expect(new Day(1).onOffset(utc("2024-01-01"))).toBe(true);
    expect(new Day(1).onOffset(utc("2024-12-31"))).toBe(true);
  });

  it("name is 'Day'", () => {
    expect(new Day().name).toBe("Day");
  });

  it("multiply", () => {
    expect(new Day(2).multiply(3).n).toBe(6);
  });

  it("negate", () => {
    expect(new Day(5).negate().n).toBe(-5);
  });

  it("Day.of factory", () => {
    expect(Day.of(7).n).toBe(7);
  });

  it("property: additive over days", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (a, b) => {
          const d = utc("2024-06-01");
          const combined = new Day(a + b).apply(d);
          const chained = new Day(b).apply(new Day(a).apply(d));
          return combined.getTime() === chained.getTime();
        },
      ),
    );
  });
});

// ─── Hour ────────────────────────────────────────────────────────────────────

describe("Hour", () => {
  it("applies positive hours", () => {
    expect(isoDateTime(new Hour(2).apply(utc("2024-01-01T10:00:00Z")))).toBe("2024-01-01 12:00:00");
  });

  it("crosses day boundary", () => {
    expect(isoDate(new Hour(25).apply(utc("2024-01-01")))).toBe("2024-01-02");
  });

  it("applies negative hours", () => {
    expect(isoDateTime(new Hour(-3).apply(utc("2024-01-01T02:00:00Z")))).toBe(
      "2023-12-31 23:00:00",
    );
  });

  it("name is 'Hour'", () => {
    expect(new Hour().name).toBe("Hour");
  });

  it("onOffset always true", () => {
    expect(new Hour(1).onOffset(utc("2024-06-15"))).toBe(true);
  });
});

// ─── Minute ──────────────────────────────────────────────────────────────────

describe("Minute", () => {
  it("applies minutes", () => {
    expect(isoDateTime(new Minute(90).apply(utc("2024-01-01T00:00:00Z")))).toBe(
      "2024-01-01 01:30:00",
    );
  });

  it("applies negative minutes", () => {
    expect(isoDateTime(new Minute(-5).apply(utc("2024-01-01T00:04:00Z")))).toBe(
      "2023-12-31 23:59:00",
    );
  });

  it("name is 'Minute'", () => {
    expect(new Minute().name).toBe("Minute");
  });
});

// ─── Second ──────────────────────────────────────────────────────────────────

describe("Second", () => {
  it("applies seconds", () => {
    const d = utc("2024-01-01T00:00:50Z");
    expect(new Second(15).apply(d).toISOString()).toBe("2024-01-01T00:01:05.000Z");
  });

  it("name is 'Second'", () => {
    expect(new Second().name).toBe("Second");
  });
});

// ─── Milli ───────────────────────────────────────────────────────────────────

describe("Milli", () => {
  it("applies milliseconds", () => {
    const d = utc("2024-01-01T00:00:00Z");
    expect(new Milli(500).apply(d).getTime()).toBe(d.getTime() + 500);
  });

  it("name is 'Milli'", () => {
    expect(new Milli().name).toBe("Milli");
  });
});

// ─── Week ────────────────────────────────────────────────────────────────────

describe("Week — no weekday alignment", () => {
  it("applies n weeks", () => {
    expect(isoDate(new Week(2).apply(utc("2024-01-01")))).toBe("2024-01-15");
  });

  it("applies negative weeks", () => {
    expect(isoDate(new Week(-1).apply(utc("2024-01-15")))).toBe("2024-01-08");
  });

  it("n=0 is no-op", () => {
    const d = utc("2024-06-15");
    expect(new Week(0).apply(d).getTime()).toBe(d.getTime());
  });

  it("rollforward and rollback are no-ops (no weekday)", () => {
    const d = utc("2024-03-07");
    expect(new Week(1).rollforward(d).getTime()).toBe(d.getTime());
    expect(new Week(1).rollback(d).getTime()).toBe(d.getTime());
  });

  it("onOffset always true (no weekday)", () => {
    expect(new Week(1).onOffset(utc("2024-01-01"))).toBe(true);
  });
});

describe("Week — weekday alignment (Monday = 0)", () => {
  // 2024-01-15 is a Monday (UTCDay = 1, pandas weekday = 0)
  const mon = utc("2024-01-15");
  // 2024-01-17 is a Wednesday (UTCDay = 3, pandas weekday = 2)
  const wed = utc("2024-01-17");

  it("from Monday (on anchor), n=1 → next Monday", () => {
    expect(isoDate(new Week(1, { weekday: 0 }).apply(mon))).toBe("2024-01-22");
  });

  it("from Wednesday (off anchor), n=1 → next Monday", () => {
    expect(isoDate(new Week(1, { weekday: 0 }).apply(wed))).toBe("2024-01-22");
  });

  it("from Wednesday, n=2 → Monday two weeks ahead", () => {
    expect(isoDate(new Week(2, { weekday: 0 }).apply(wed))).toBe("2024-01-29");
  });

  it("from Monday, n=-1 → prev Monday", () => {
    expect(isoDate(new Week(-1, { weekday: 0 }).apply(mon))).toBe("2024-01-08");
  });

  it("from Wednesday, n=-1 → previous Monday", () => {
    expect(isoDate(new Week(-1, { weekday: 0 }).apply(wed))).toBe("2024-01-15");
  });

  it("rollforward from Wednesday → same week's Monday (future)", () => {
    // Monday of the week containing Wed: rollforward goes to next Mon
    const rolled = new Week(1, { weekday: 0 }).rollforward(wed);
    expect(isoDate(rolled)).toBe("2024-01-22");
  });

  it("rollforward from Monday (already on anchor) → unchanged", () => {
    const rolled = new Week(1, { weekday: 0 }).rollforward(mon);
    expect(rolled.getTime()).toBe(mon.getTime());
  });

  it("rollback from Wednesday → most recent Monday", () => {
    const rolled = new Week(1, { weekday: 0 }).rollback(wed);
    expect(isoDate(rolled)).toBe("2024-01-15");
  });

  it("rollback from Monday → unchanged", () => {
    const rolled = new Week(1, { weekday: 0 }).rollback(mon);
    expect(rolled.getTime()).toBe(mon.getTime());
  });

  it("onOffset: Monday → true, Wednesday → false", () => {
    const wk = new Week(1, { weekday: 0 });
    expect(wk.onOffset(mon)).toBe(true);
    expect(wk.onOffset(wed)).toBe(false);
  });

  it("name is 'Week'", () => {
    expect(new Week().name).toBe("Week");
  });
});

// ─── MonthEnd ────────────────────────────────────────────────────────────────

describe("MonthEnd", () => {
  it("from mid-month, n=1 → end of same month", () => {
    expect(isoDate(new MonthEnd(1).apply(utc("2024-01-15")))).toBe("2024-01-31");
  });

  it("from mid-month, n=2 → end of next month", () => {
    expect(isoDate(new MonthEnd(2).apply(utc("2024-01-15")))).toBe("2024-02-29");
  });

  it("from month-end, n=1 → end of next month", () => {
    expect(isoDate(new MonthEnd(1).apply(utc("2024-01-31")))).toBe("2024-02-29");
  });

  it("from month-end, n=2", () => {
    expect(isoDate(new MonthEnd(2).apply(utc("2024-01-31")))).toBe("2024-03-31");
  });

  it("handles leap year Feb end", () => {
    expect(isoDate(new MonthEnd(1).apply(utc("2024-01-31")))).toBe("2024-02-29");
    expect(isoDate(new MonthEnd(1).apply(utc("2023-01-31")))).toBe("2023-02-28");
  });

  it("negative n from mid-month", () => {
    expect(isoDate(new MonthEnd(-1).apply(utc("2024-01-15")))).toBe("2023-12-31");
    expect(isoDate(new MonthEnd(-2).apply(utc("2024-01-15")))).toBe("2023-11-30");
  });

  it("negative n from month-end", () => {
    expect(isoDate(new MonthEnd(-1).apply(utc("2024-01-31")))).toBe("2023-12-31");
  });

  it("n=0 → no change", () => {
    const d = utc("2024-06-15");
    expect(new MonthEnd(0).apply(d).getTime()).toBe(d.getTime());
  });

  it("rollforward from mid-month → end of same month", () => {
    expect(isoDate(new MonthEnd(1).rollforward(utc("2024-01-15")))).toBe("2024-01-31");
  });

  it("rollforward from month-end → same date", () => {
    const d = utc("2024-01-31");
    expect(new MonthEnd(1).rollforward(d).getTime()).toBe(d.getTime());
  });

  it("rollback from mid-month → end of prev month", () => {
    expect(isoDate(new MonthEnd(1).rollback(utc("2024-01-15")))).toBe("2023-12-31");
  });

  it("rollback from month-end → same date", () => {
    const d = utc("2024-01-31");
    expect(new MonthEnd(1).rollback(d).getTime()).toBe(d.getTime());
  });

  it("onOffset: month-end → true, mid-month → false", () => {
    expect(new MonthEnd(1).onOffset(utc("2024-01-31"))).toBe(true);
    expect(new MonthEnd(1).onOffset(utc("2024-01-15"))).toBe(false);
    expect(new MonthEnd(1).onOffset(utc("2024-02-29"))).toBe(true);
    expect(new MonthEnd(1).onOffset(utc("2023-02-28"))).toBe(true);
    expect(new MonthEnd(1).onOffset(utc("2024-02-28"))).toBe(false);
  });

  it("name is 'MonthEnd'", () => {
    expect(new MonthEnd().name).toBe("MonthEnd");
  });

  it("negate", () => {
    expect(new MonthEnd(3).negate().n).toBe(-3);
  });

  it("multiply", () => {
    expect(new MonthEnd(2).multiply(4).n).toBe(8);
  });

  it("property: anchor dates are stable under rollforward/rollback", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (offsetMs) => {
        const d = utc("2024-01-31");
        const d2 = new Date(d.getTime() + offsetMs);
        const rf = new MonthEnd(1).rollforward(d2);
        return new MonthEnd(1).onOffset(rf);
      }),
    );
  });
});

// ─── MonthBegin ──────────────────────────────────────────────────────────────

describe("MonthBegin", () => {
  it("from mid-month, n=1 → first of next month", () => {
    expect(isoDate(new MonthBegin(1).apply(utc("2024-01-15")))).toBe("2024-02-01");
  });

  it("from first of month (on anchor), n=1 → first of next month", () => {
    expect(isoDate(new MonthBegin(1).apply(utc("2024-01-01")))).toBe("2024-02-01");
  });

  it("from mid-month, n=2 → first of month+2", () => {
    expect(isoDate(new MonthBegin(2).apply(utc("2024-01-15")))).toBe("2024-03-01");
  });

  it("negative n from mid-month", () => {
    expect(isoDate(new MonthBegin(-1).apply(utc("2024-01-15")))).toBe("2024-01-01");
    expect(isoDate(new MonthBegin(-2).apply(utc("2024-01-15")))).toBe("2023-12-01");
  });

  it("negative n from first of month", () => {
    expect(isoDate(new MonthBegin(-1).apply(utc("2024-01-01")))).toBe("2023-12-01");
  });

  it("n=0 → no change", () => {
    const d = utc("2024-06-15");
    expect(new MonthBegin(0).apply(d).getTime()).toBe(d.getTime());
  });

  it("rollforward from mid-month → first of next month", () => {
    expect(isoDate(new MonthBegin(1).rollforward(utc("2024-01-15")))).toBe("2024-02-01");
  });

  it("rollforward from first of month → unchanged", () => {
    const d = utc("2024-01-01");
    expect(new MonthBegin(1).rollforward(d).getTime()).toBe(d.getTime());
  });

  it("rollback from mid-month → first of same month", () => {
    expect(isoDate(new MonthBegin(1).rollback(utc("2024-01-15")))).toBe("2024-01-01");
  });

  it("rollback from first of month → unchanged", () => {
    const d = utc("2024-01-01");
    expect(new MonthBegin(1).rollback(d).getTime()).toBe(d.getTime());
  });

  it("onOffset: first of month → true, other dates → false", () => {
    expect(new MonthBegin(1).onOffset(utc("2024-01-01"))).toBe(true);
    expect(new MonthBegin(1).onOffset(utc("2024-01-02"))).toBe(false);
  });

  it("name is 'MonthBegin'", () => {
    expect(new MonthBegin().name).toBe("MonthBegin");
  });
});

// ─── YearEnd ─────────────────────────────────────────────────────────────────

describe("YearEnd", () => {
  it("from mid-year, n=1 → Dec-31 same year", () => {
    expect(isoDate(new YearEnd(1).apply(utc("2024-01-15")))).toBe("2024-12-31");
  });

  it("from Dec-31 (on anchor), n=1 → Dec-31 next year", () => {
    expect(isoDate(new YearEnd(1).apply(utc("2024-12-31")))).toBe("2025-12-31");
  });

  it("from mid-year, n=2 → Dec-31 year+1", () => {
    expect(isoDate(new YearEnd(2).apply(utc("2024-01-15")))).toBe("2025-12-31");
  });

  it("negative n from mid-year", () => {
    expect(isoDate(new YearEnd(-1).apply(utc("2024-01-15")))).toBe("2023-12-31");
  });

  it("negative n from Dec-31", () => {
    expect(isoDate(new YearEnd(-1).apply(utc("2024-12-31")))).toBe("2023-12-31");
  });

  it("n=0 → no change", () => {
    const d = utc("2024-06-15");
    expect(new YearEnd(0).apply(d).getTime()).toBe(d.getTime());
  });

  it("rollforward from mid-year → Dec-31 same year", () => {
    expect(isoDate(new YearEnd(1).rollforward(utc("2024-07-04")))).toBe("2024-12-31");
  });

  it("rollforward from Dec-31 → unchanged", () => {
    const d = utc("2024-12-31");
    expect(new YearEnd(1).rollforward(d).getTime()).toBe(d.getTime());
  });

  it("rollback from mid-year → Dec-31 prev year", () => {
    expect(isoDate(new YearEnd(1).rollback(utc("2024-07-04")))).toBe("2023-12-31");
  });

  it("rollback from Dec-31 → unchanged", () => {
    const d = utc("2024-12-31");
    expect(new YearEnd(1).rollback(d).getTime()).toBe(d.getTime());
  });

  it("onOffset: Dec-31 → true, other → false", () => {
    expect(new YearEnd(1).onOffset(utc("2024-12-31"))).toBe(true);
    expect(new YearEnd(1).onOffset(utc("2024-12-30"))).toBe(false);
  });

  it("name is 'YearEnd'", () => {
    expect(new YearEnd().name).toBe("YearEnd");
  });

  it("property: rollforward result is always Dec-31", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }),
        (rawDate) => {
          const d = new Date(
            Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate()),
          );
          const rf = new YearEnd(1).rollforward(d);
          return rf.getUTCMonth() === 11 && rf.getUTCDate() === 31;
        },
      ),
    );
  });
});

// ─── YearBegin ───────────────────────────────────────────────────────────────

describe("YearBegin", () => {
  it("from mid-year, n=1 → Jan-1 next year", () => {
    expect(isoDate(new YearBegin(1).apply(utc("2024-07-04")))).toBe("2025-01-01");
  });

  it("from Jan-1 (on anchor), n=1 → Jan-1 next year", () => {
    expect(isoDate(new YearBegin(1).apply(utc("2024-01-01")))).toBe("2025-01-01");
  });

  it("negative n from mid-year", () => {
    expect(isoDate(new YearBegin(-1).apply(utc("2024-07-04")))).toBe("2024-01-01");
    expect(isoDate(new YearBegin(-2).apply(utc("2024-07-04")))).toBe("2023-01-01");
  });

  it("negative n from Jan-1", () => {
    expect(isoDate(new YearBegin(-1).apply(utc("2024-01-01")))).toBe("2023-01-01");
  });

  it("n=0 → no change", () => {
    const d = utc("2024-06-15");
    expect(new YearBegin(0).apply(d).getTime()).toBe(d.getTime());
  });

  it("rollforward from mid-year → Jan-1 next year", () => {
    expect(isoDate(new YearBegin(1).rollforward(utc("2024-07-04")))).toBe("2025-01-01");
  });

  it("rollforward from Jan-1 → unchanged", () => {
    const d = utc("2024-01-01");
    expect(new YearBegin(1).rollforward(d).getTime()).toBe(d.getTime());
  });

  it("rollback from mid-year → Jan-1 same year", () => {
    expect(isoDate(new YearBegin(1).rollback(utc("2024-07-04")))).toBe("2024-01-01");
  });

  it("rollback from Jan-1 → unchanged", () => {
    const d = utc("2024-01-01");
    expect(new YearBegin(1).rollback(d).getTime()).toBe(d.getTime());
  });

  it("onOffset: Jan-1 → true, other → false", () => {
    expect(new YearBegin(1).onOffset(utc("2024-01-01"))).toBe(true);
    expect(new YearBegin(1).onOffset(utc("2024-01-02"))).toBe(false);
  });

  it("name is 'YearBegin'", () => {
    expect(new YearBegin().name).toBe("YearBegin");
  });
});

// ─── BusinessDay ─────────────────────────────────────────────────────────────

describe("BusinessDay", () => {
  // 2024-01-12 = Friday, 2024-01-13 = Saturday, 2024-01-14 = Sunday
  const fri = utc("2024-01-12");
  const sat = utc("2024-01-13");
  const sun = utc("2024-01-14");
  const mon = utc("2024-01-15");
  const tue = utc("2024-01-16");
  const thu = utc("2024-01-11");

  it("from Friday, n=1 → Monday", () => {
    expect(isoDate(new BusinessDay(1).apply(fri))).toBe("2024-01-15");
  });

  it("from Friday, n=3 → Wednesday", () => {
    expect(isoDate(new BusinessDay(3).apply(fri))).toBe("2024-01-17");
  });

  it("from Friday, n=-1 → Thursday", () => {
    expect(isoDate(new BusinessDay(-1).apply(fri))).toBe("2024-01-11");
  });

  it("from Monday, n=5 → next Monday", () => {
    expect(isoDate(new BusinessDay(5).apply(mon))).toBe("2024-01-22");
  });

  it("from Monday, n=-1 → Friday", () => {
    expect(isoDate(new BusinessDay(-1).apply(mon))).toBe("2024-01-12");
  });

  it("from Saturday, n=1 → Monday", () => {
    expect(isoDate(new BusinessDay(1).apply(sat))).toBe("2024-01-15");
  });

  it("from Sunday, n=1 → Monday", () => {
    expect(isoDate(new BusinessDay(1).apply(sun))).toBe("2024-01-15");
  });

  it("from Saturday, n=-1 → Friday", () => {
    expect(isoDate(new BusinessDay(-1).apply(sat))).toBe("2024-01-12");
  });

  it("n=0 → no change", () => {
    expect(new BusinessDay(0).apply(fri).getTime()).toBe(fri.getTime());
  });

  it("rollforward from weekday → unchanged", () => {
    expect(new BusinessDay(1).rollforward(thu).getTime()).toBe(thu.getTime());
    expect(new BusinessDay(1).rollforward(tue).getTime()).toBe(tue.getTime());
  });

  it("rollforward from Saturday → Monday", () => {
    expect(isoDate(new BusinessDay(1).rollforward(sat))).toBe("2024-01-15");
  });

  it("rollforward from Sunday → Monday", () => {
    expect(isoDate(new BusinessDay(1).rollforward(sun))).toBe("2024-01-15");
  });

  it("rollback from weekday → unchanged", () => {
    expect(new BusinessDay(1).rollback(fri).getTime()).toBe(fri.getTime());
    expect(new BusinessDay(1).rollback(mon).getTime()).toBe(mon.getTime());
  });

  it("rollback from Saturday → Friday", () => {
    expect(isoDate(new BusinessDay(1).rollback(sat))).toBe("2024-01-12");
  });

  it("rollback from Sunday → Friday", () => {
    expect(isoDate(new BusinessDay(1).rollback(sun))).toBe("2024-01-12");
  });

  it("onOffset: weekdays → true, weekend → false", () => {
    const bday = new BusinessDay(1);
    expect(bday.onOffset(mon)).toBe(true);
    expect(bday.onOffset(fri)).toBe(true);
    expect(bday.onOffset(sat)).toBe(false);
    expect(bday.onOffset(sun)).toBe(false);
  });

  it("name is 'BusinessDay'", () => {
    expect(new BusinessDay().name).toBe("BusinessDay");
  });

  it("negate", () => {
    expect(new BusinessDay(2).negate().n).toBe(-2);
  });

  it("multiply", () => {
    expect(new BusinessDay(3).multiply(2).n).toBe(6);
  });

  it("property: rollforward result is always a weekday", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        (rawDate) => {
          const d = new Date(
            Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate()),
          );
          const rf = new BusinessDay(1).rollforward(d);
          const dow = rf.getUTCDay();
          return dow >= 1 && dow <= 5;
        },
      ),
    );
  });

  it("property: business days are symmetric across week boundaries", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (n) => {
        const d = utc("2024-06-03"); // Monday
        const forward = new BusinessDay(n).apply(d);
        const back = new BusinessDay(-n).apply(forward);
        return back.getTime() === d.getTime();
      }),
    );
  });
});

// ─── DateOffset interface polymorphism ───────────────────────────────────────

describe("DateOffset interface", () => {
  it("all offsets implement the interface", () => {
    const offsets: DateOffset[] = [
      new Day(1),
      new Hour(1),
      new Minute(1),
      new Second(1),
      new Milli(1),
      new Week(1),
      new MonthEnd(1),
      new MonthBegin(1),
      new YearEnd(1),
      new YearBegin(1),
      new BusinessDay(1),
    ];
    const d = utc("2024-06-15");
    for (const off of offsets) {
      const applied = off.apply(d);
      expect(applied).toBeInstanceOf(Date);
      expect(typeof off.onOffset(d)).toBe("boolean");
      expect(off.rollforward(d)).toBeInstanceOf(Date);
      expect(off.rollback(d)).toBeInstanceOf(Date);
      expect(typeof off.name).toBe("string");
      expect(typeof off.n).toBe("number");
    }
  });
});
