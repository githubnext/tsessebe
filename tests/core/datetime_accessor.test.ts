/**
 * Tests for DatetimeAccessor — the Series.dt accessor.
 *
 * Tests cover: calendar components, boolean properties, formatting,
 * normalization, floor/ceil/round, null propagation, and property-based
 * invariants using fast-check.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";

// ─── top-level regex constants ────────────────────────────────────────────────
const RE_FOUR_DIGIT_YEAR = /^\d{4}$/;

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSeries(dates: Array<Date | null>): Series<Date | null> {
  return new Series<Date | null>({ data: dates });
}

// ─── calendar components ──────────────────────────────────────────────────────

describe("DatetimeAccessor calendar components", () => {
  const base = new Date("2024-07-15T10:30:45.123Z");
  const s = makeSeries([base]);

  test("year()", () => {
    expect(s.dt.year().toArray()).toEqual([base.getFullYear()]);
  });

  test("month() is 1-indexed", () => {
    expect(s.dt.month().toArray()).toEqual([base.getMonth() + 1]);
  });

  test("day()", () => {
    expect(s.dt.day().toArray()).toEqual([base.getDate()]);
  });

  test("hour()", () => {
    expect(s.dt.hour().toArray()).toEqual([base.getHours()]);
  });

  test("minute()", () => {
    expect(s.dt.minute().toArray()).toEqual([base.getMinutes()]);
  });

  test("second()", () => {
    expect(s.dt.second().toArray()).toEqual([base.getSeconds()]);
  });

  test("millisecond()", () => {
    expect(s.dt.millisecond().toArray()).toEqual([base.getMilliseconds()]);
  });

  test("microsecond() always 0", () => {
    expect(s.dt.microsecond().toArray()).toEqual([0]);
  });

  test("nanosecond() always 0", () => {
    expect(s.dt.nanosecond().toArray()).toEqual([0]);
  });

  test("dayofweek() Monday=0, Sunday=6", () => {
    // 2024-07-15 is a Monday → 0
    const monday = makeSeries([new Date("2024-07-15")]);
    expect(monday.dt.dayofweek().toArray()).toEqual([0]);

    // 2024-07-14 is a Sunday → 6
    const sunday = makeSeries([new Date("2024-07-14")]);
    expect(sunday.dt.dayofweek().toArray()).toEqual([6]);
  });

  test("weekday() is alias for dayofweek()", () => {
    const s2 = makeSeries([new Date("2024-07-16")]); // Tuesday
    expect(s2.dt.weekday().toArray()).toEqual([1]);
  });

  test("dayofyear()", () => {
    const jan1 = makeSeries([new Date("2024-01-01")]);
    expect(jan1.dt.dayofyear().toArray()).toEqual([1]);

    const dec31 = makeSeries([new Date("2024-12-31")]);
    expect(dec31.dt.dayofyear().toArray()).toEqual([366]); // 2024 is leap year
  });

  test("quarter()", () => {
    const q1 = makeSeries([new Date("2024-01-01"), new Date("2024-03-31")]);
    expect(q1.dt.quarter().toArray()).toEqual([1, 1]);

    const q2 = makeSeries([new Date("2024-04-01"), new Date("2024-06-30")]);
    expect(q2.dt.quarter().toArray()).toEqual([2, 2]);

    const q3 = makeSeries([new Date("2024-07-01"), new Date("2024-09-30")]);
    expect(q3.dt.quarter().toArray()).toEqual([3, 3]);

    const q4 = makeSeries([new Date("2024-10-01"), new Date("2024-12-31")]);
    expect(q4.dt.quarter().toArray()).toEqual([4, 4]);
  });

  test("days_in_month()", () => {
    const months = makeSeries([
      new Date("2024-01-01"), // 31
      new Date("2024-02-01"), // 29 (leap)
      new Date("2023-02-01"), // 28 (non-leap)
      new Date("2024-04-01"), // 30
    ]);
    expect(months.dt.days_in_month().toArray()).toEqual([31, 29, 28, 30]);
  });

  test("daysinmonth() is alias for days_in_month()", () => {
    const s2 = makeSeries([new Date("2024-02-01")]);
    expect(s2.dt.daysinmonth().toArray()).toEqual([29]);
  });
});

// ─── boolean properties ───────────────────────────────────────────────────────

describe("DatetimeAccessor boolean properties", () => {
  test("is_month_start()", () => {
    const s = makeSeries([new Date("2024-01-01"), new Date("2024-01-15")]);
    expect(s.dt.is_month_start().toArray()).toEqual([true, false]);
  });

  test("is_month_end()", () => {
    const s = makeSeries([new Date("2024-01-31"), new Date("2024-01-30")]);
    expect(s.dt.is_month_end().toArray()).toEqual([true, false]);
  });

  test("is_month_end() for February in leap year", () => {
    const s = makeSeries([new Date("2024-02-29")]);
    expect(s.dt.is_month_end().toArray()).toEqual([true]);
  });

  test("is_quarter_start()", () => {
    const s = makeSeries([
      new Date("2024-01-01"),
      new Date("2024-04-01"),
      new Date("2024-07-01"),
      new Date("2024-10-01"),
      new Date("2024-02-01"),
    ]);
    expect(s.dt.is_quarter_start().toArray()).toEqual([true, true, true, true, false]);
  });

  test("is_quarter_end()", () => {
    const s = makeSeries([
      new Date("2024-03-31"),
      new Date("2024-06-30"),
      new Date("2024-09-30"),
      new Date("2024-12-31"),
      new Date("2024-03-30"),
    ]);
    expect(s.dt.is_quarter_end().toArray()).toEqual([true, true, true, true, false]);
  });

  test("is_year_start()", () => {
    const s = makeSeries([new Date("2024-01-01"), new Date("2024-01-02")]);
    expect(s.dt.is_year_start().toArray()).toEqual([true, false]);
  });

  test("is_year_end()", () => {
    const s = makeSeries([new Date("2024-12-31"), new Date("2024-12-30")]);
    expect(s.dt.is_year_end().toArray()).toEqual([true, false]);
  });

  test("is_leap_year()", () => {
    const s = makeSeries([
      new Date("2024-06-01"), // 2024 is leap
      new Date("2023-06-01"), // 2023 is not
      new Date("2000-06-01"), // 2000 is leap
      new Date("1900-06-01"), // 1900 is not
    ]);
    expect(s.dt.is_leap_year().toArray()).toEqual([true, false, true, false]);
  });
});

// ─── null propagation ─────────────────────────────────────────────────────────

describe("DatetimeAccessor null propagation", () => {
  test("all methods propagate null", () => {
    const s = makeSeries([null, new Date("2024-01-01"), null]);
    expect(s.dt.year().toArray()).toEqual([null, 2024, null]);
    expect(s.dt.month().toArray()).toEqual([null, 1, null]);
    expect(s.dt.day().toArray()).toEqual([null, 1, null]);
    expect(s.dt.dayofweek().toArray()).toEqual([null, 0 /* Mon */, null]);
    expect(s.dt.is_month_start().toArray()).toEqual([null, true, null]);
    expect(s.dt.is_leap_year().toArray()).toEqual([null, true, null]);
    expect(s.dt.strftime("%Y").toArray()).toEqual([null, "2024", null]);
    expect(s.dt.normalize().toArray()).toEqual([null, new Date("2024-01-01"), null]);
  });
});

// ─── strftime ─────────────────────────────────────────────────────────────────

describe("DatetimeAccessor strftime", () => {
  const d = new Date("2024-03-15T09:05:03.007");
  const s = makeSeries([d]);

  test("%Y year", () => expect(s.dt.strftime("%Y").toArray()).toEqual(["2024"]));
  test("%y 2-digit year", () => expect(s.dt.strftime("%y").toArray()).toEqual(["24"]));
  test("%m zero-padded month", () => expect(s.dt.strftime("%m").toArray()).toEqual(["03"]));
  test("%d zero-padded day", () => expect(s.dt.strftime("%d").toArray()).toEqual(["15"]));
  test("%H hour", () => expect(s.dt.strftime("%H").toArray()).toEqual(["09"]));
  test("%M minute", () => expect(s.dt.strftime("%M").toArray()).toEqual(["05"]));
  test("%S second", () => expect(s.dt.strftime("%S").toArray()).toEqual(["03"]));
  test("%B full month", () => expect(s.dt.strftime("%B").toArray()).toEqual(["March"]));
  test("%b abbrev month", () => expect(s.dt.strftime("%b").toArray()).toEqual(["Mar"]));
  test("%A full weekday", () => expect(s.dt.strftime("%A").toArray()).toEqual(["Friday"]));
  test("%a abbrev weekday", () => expect(s.dt.strftime("%a").toArray()).toEqual(["Fri"]));
  test("%% literal percent", () => expect(s.dt.strftime("100%%").toArray()).toEqual(["100%"]));
  test("compound format", () =>
    expect(s.dt.strftime("%Y-%m-%d").toArray()).toEqual(["2024-03-15"]));
  test("datetime format", () =>
    expect(s.dt.strftime("%Y-%m-%d %H:%M:%S").toArray()).toEqual(["2024-03-15 09:05:03"]));
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe("DatetimeAccessor normalize", () => {
  test("strips time component", () => {
    const s = makeSeries([new Date("2024-07-15T14:23:55")]);
    const result = s.dt.normalize().toArray()[0] as Date;
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getDate()).toBe(15);
  });

  test("midnight stays midnight", () => {
    const d = new Date("2024-07-15T00:00:00.000");
    const s = makeSeries([d]);
    const result = s.dt.normalize().toArray()[0] as Date;
    expect(result.getTime()).toBe(new Date(2024, 6, 15).getTime());
  });
});

// ─── floor/ceil/round ─────────────────────────────────────────────────────────

describe("DatetimeAccessor floor/ceil/round", () => {
  const d = new Date("2024-03-15T14:37:28.750");

  test("floor(H) truncates to hour", () => {
    const s = makeSeries([d]);
    const result = s.dt.floor("H").toArray()[0] as Date;
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test("floor(T) truncates to minute", () => {
    const s = makeSeries([d]);
    const result = s.dt.floor("T").toArray()[0] as Date;
    expect(result.getMinutes()).toBe(37);
    expect(result.getSeconds()).toBe(0);
  });

  test("ceil(H) rounds up to next hour", () => {
    const s = makeSeries([d]);
    const result = s.dt.ceil("H").toArray()[0] as Date;
    expect(result.getHours()).toBe(15);
    expect(result.getMinutes()).toBe(0);
  });

  test("ceil on exact boundary stays the same", () => {
    const exact = new Date("2024-03-15T14:00:00.000");
    const s = makeSeries([exact]);
    const result = s.dt.ceil("H").toArray()[0] as Date;
    expect(result.getTime()).toBe(exact.getTime());
  });

  test("round(T) rounds to nearest minute", () => {
    // 37:28 → rounds down to 37:00
    const s = makeSeries([d]);
    const result = s.dt.round("T").toArray()[0] as Date;
    expect(result.getMinutes()).toBe(37);
    expect(result.getSeconds()).toBe(0);
  });

  test("round(T) rounds up at 30s", () => {
    const d2 = new Date("2024-03-15T14:37:30.000");
    const s = makeSeries([d2]);
    const result = s.dt.round("T").toArray()[0] as Date;
    expect(result.getMinutes()).toBe(38);
  });

  test("floor(D) normalizes to midnight", () => {
    const s = makeSeries([d]);
    const result = s.dt.floor("D").toArray()[0] as Date;
    expect(result.getHours()).toBe(0);
    expect(result.getDate()).toBe(15);
  });
});

// ─── total_seconds ────────────────────────────────────────────────────────────

describe("DatetimeAccessor total_seconds", () => {
  test("unix epoch → 0", () => {
    const s = makeSeries([new Date("1970-01-01T00:00:00.000Z")]);
    expect(s.dt.total_seconds().toArray()).toEqual([0]);
  });

  test("known timestamp", () => {
    const d = new Date("2024-01-01T00:00:00.000Z");
    const s = makeSeries([d]);
    const expected = Math.floor(d.getTime() / 1000);
    expect(s.dt.total_seconds().toArray()).toEqual([expected]);
  });
});

// ─── date() ──────────────────────────────────────────────────────────────────

describe("DatetimeAccessor date", () => {
  test("returns Date at midnight", () => {
    const s = makeSeries([new Date("2024-07-15T18:30:00")]);
    const result = s.dt.date().toArray()[0] as Date;
    expect(result.getHours()).toBe(0);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(6); // 0-indexed
    expect(result.getFullYear()).toBe(2024);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("DatetimeAccessor property-based", () => {
  const anyDate = fc.date({ min: new Date("1970-01-01"), max: new Date("2099-12-31") });

  test("month() is in 1..12", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const m = s.dt.month().toArray()[0] as number;
        return m >= 1 && m <= 12;
      }),
    );
  });

  test("day() is in 1..31", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const day = s.dt.day().toArray()[0] as number;
        return day >= 1 && day <= 31;
      }),
    );
  });

  test("dayofweek() is in 0..6", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const dow = s.dt.dayofweek().toArray()[0] as number;
        return dow >= 0 && dow <= 6;
      }),
    );
  });

  test("quarter() is in 1..4", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const q = s.dt.quarter().toArray()[0] as number;
        return q >= 1 && q <= 4;
      }),
    );
  });

  test("days_in_month() is in 28..31", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const dim = s.dt.days_in_month().toArray()[0] as number;
        return dim >= 28 && dim <= 31;
      }),
    );
  });

  test("normalize() preserves year/month/day", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const norm = s.dt.normalize().toArray()[0] as Date;
        return (
          norm.getFullYear() === d.getFullYear() &&
          norm.getMonth() === d.getMonth() &&
          norm.getDate() === d.getDate() &&
          norm.getHours() === 0 &&
          norm.getMinutes() === 0 &&
          norm.getSeconds() === 0 &&
          norm.getMilliseconds() === 0
        );
      }),
    );
  });

  test("strftime(%Y) returns 4-digit year string", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const y = s.dt.strftime("%Y").toArray()[0] as string;
        return RE_FOUR_DIGIT_YEAR.test(y);
      }),
    );
  });

  test("floor(H) is idempotent", () => {
    fc.assert(
      fc.property(anyDate, (d) => {
        const s = makeSeries([d]);
        const once = s.dt.floor("H").toArray()[0] as Date;
        const twice = makeSeries([once]).dt.floor("H").toArray()[0] as Date;
        return once.getTime() === twice.getTime();
      }),
    );
  });
});
