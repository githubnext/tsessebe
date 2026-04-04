/**
 * Tests for DateTimeAccessor (Series.dt).
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DateTimeAccessor, Series } from "../../src/index.ts";

// ─── helper ───────────────────────────────────────────────────────────────────

function s(data: (string | Date | number | null)[]): Series<import("../../src/index.ts").Scalar> {
  return new Series({ data });
}

// ─── construction ─────────────────────────────────────────────────────────────

describe("DateTimeAccessor construction", () => {
  test("accessible via series.dt", () => {
    const series = s(["2021-01-01"]);
    expect(series.dt).toBeInstanceOf(DateTimeAccessor);
  });

  test("accepts Date objects", () => {
    const d = new Date(2021, 0, 15); // Jan 15 2021
    expect(s([d]).dt.year.values[0]).toBe(2021);
  });

  test("accepts ISO string values", () => {
    expect(s(["2022-06-30"]).dt.year.values[0]).toBe(2022);
  });

  test("accepts numeric timestamps", () => {
    const ms = new Date("2020-03-01").getTime();
    expect(s([ms]).dt.year.values[0]).toBe(2020);
  });

  test("null propagates as null", () => {
    expect(s([null]).dt.year.values[0]).toBeNull();
  });

  test("undefined propagates as null", () => {
    expect(s([undefined as unknown as null]).dt.year.values[0]).toBeNull();
  });

  test("invalid string propagates as null", () => {
    expect(s(["not-a-date"]).dt.year.values[0]).toBeNull();
  });
});

// ─── calendar components ──────────────────────────────────────────────────────

describe("calendar components", () => {
  const iso = "2021-03-15T14:30:45.123";

  test("year", () => {
    expect(s([iso]).dt.year.values[0]).toBe(2021);
  });

  test("month", () => {
    expect(s([iso]).dt.month.values[0]).toBe(3);
  });

  test("day", () => {
    expect(s([iso]).dt.day.values[0]).toBe(15);
  });

  test("hour", () => {
    expect(s([iso]).dt.hour.values[0]).toBe(14);
  });

  test("minute", () => {
    expect(s([iso]).dt.minute.values[0]).toBe(30);
  });

  test("second", () => {
    expect(s([iso]).dt.second.values[0]).toBe(45);
  });

  test("millisecond", () => {
    expect(s([iso]).dt.millisecond.values[0]).toBe(123);
  });

  test("quarter — Q1", () => {
    expect(s(["2021-01-01"]).dt.quarter.values[0]).toBe(1);
  });
  test("quarter — Q2", () => {
    expect(s(["2021-04-01"]).dt.quarter.values[0]).toBe(2);
  });
  test("quarter — Q3", () => {
    expect(s(["2021-07-01"]).dt.quarter.values[0]).toBe(3);
  });
  test("quarter — Q4", () => {
    expect(s(["2021-10-01"]).dt.quarter.values[0]).toBe(4);
  });

  test("dayofyear — Jan 1", () => {
    expect(s(["2021-01-01"]).dt.dayofyear.values[0]).toBe(1);
  });
  test("dayofyear — Feb 1", () => {
    expect(s(["2021-02-01"]).dt.dayofyear.values[0]).toBe(32);
  });
  test("day_of_year alias", () => {
    expect(s(["2021-01-01"]).dt.day_of_year.values[0]).toBe(1);
  });
});

// ─── dayofweek ────────────────────────────────────────────────────────────────

describe("dayofweek (Mon=0, Sun=6)", () => {
  // 2021-01-04 is Monday
  test("Monday = 0", () => {
    expect(s(["2021-01-04"]).dt.dayofweek.values[0]).toBe(0);
  });
  test("Tuesday = 1", () => {
    expect(s(["2021-01-05"]).dt.dayofweek.values[0]).toBe(1);
  });
  test("Wednesday = 2", () => {
    expect(s(["2021-01-06"]).dt.dayofweek.values[0]).toBe(2);
  });
  test("Thursday = 3", () => {
    expect(s(["2021-01-07"]).dt.dayofweek.values[0]).toBe(3);
  });
  test("Friday = 4", () => {
    expect(s(["2021-01-08"]).dt.dayofweek.values[0]).toBe(4);
  });
  test("Saturday = 5", () => {
    expect(s(["2021-01-09"]).dt.dayofweek.values[0]).toBe(5);
  });
  test("Sunday = 6", () => {
    expect(s(["2021-01-10"]).dt.dayofweek.values[0]).toBe(6);
  });

  test("day_of_week alias", () => {
    expect(s(["2021-01-04"]).dt.day_of_week.values[0]).toBe(0);
  });
  test("weekday alias", () => {
    expect(s(["2021-01-04"]).dt.weekday.values[0]).toBe(0);
  });
});

// ─── week numbers ─────────────────────────────────────────────────────────────

describe("ISO week number", () => {
  test("first week of 2021", () => {
    expect(s(["2021-01-04"]).dt.week.values[0]).toBe(1);
  });
  test("last week of 2020 falls on Jan 1 2021", () => {
    // Jan 1 2021 is Friday — belongs to week 53 of 2020
    expect(s(["2021-01-01"]).dt.week.values[0]).toBe(53);
  });
  test("weekofyear alias", () => {
    expect(s(["2021-01-04"]).dt.weekofyear.values[0]).toBe(1);
  });
});

// ─── boolean flags ────────────────────────────────────────────────────────────

describe("boolean flags", () => {
  test("is_month_start — first of month", () => {
    expect(s(["2021-03-01"]).dt.is_month_start.values[0]).toBe(1);
    expect(s(["2021-03-15"]).dt.is_month_start.values[0]).toBe(0);
  });

  test("is_month_end — last of month", () => {
    expect(s(["2021-01-31"]).dt.is_month_end.values[0]).toBe(1);
    expect(s(["2021-02-28"]).dt.is_month_end.values[0]).toBe(1);
    expect(s(["2020-02-29"]).dt.is_month_end.values[0]).toBe(1);
    expect(s(["2021-01-15"]).dt.is_month_end.values[0]).toBe(0);
  });

  test("is_quarter_start", () => {
    expect(s(["2021-01-01"]).dt.is_quarter_start.values[0]).toBe(1);
    expect(s(["2021-04-01"]).dt.is_quarter_start.values[0]).toBe(1);
    expect(s(["2021-07-01"]).dt.is_quarter_start.values[0]).toBe(1);
    expect(s(["2021-10-01"]).dt.is_quarter_start.values[0]).toBe(1);
    expect(s(["2021-03-01"]).dt.is_quarter_start.values[0]).toBe(0);
  });

  test("is_quarter_end", () => {
    expect(s(["2021-03-31"]).dt.is_quarter_end.values[0]).toBe(1);
    expect(s(["2021-06-30"]).dt.is_quarter_end.values[0]).toBe(1);
    expect(s(["2021-09-30"]).dt.is_quarter_end.values[0]).toBe(1);
    expect(s(["2021-12-31"]).dt.is_quarter_end.values[0]).toBe(1);
    expect(s(["2021-01-31"]).dt.is_quarter_end.values[0]).toBe(0);
  });

  test("is_year_start", () => {
    expect(s(["2021-01-01"]).dt.is_year_start.values[0]).toBe(1);
    expect(s(["2021-01-02"]).dt.is_year_start.values[0]).toBe(0);
  });

  test("is_year_end", () => {
    expect(s(["2021-12-31"]).dt.is_year_end.values[0]).toBe(1);
    expect(s(["2021-12-30"]).dt.is_year_end.values[0]).toBe(0);
  });

  test("is_leap_year — leap", () => {
    expect(s(["2020-06-15"]).dt.is_leap_year.values[0]).toBe(1);
    expect(s(["2000-01-01"]).dt.is_leap_year.values[0]).toBe(1);
  });
  test("is_leap_year — non-leap", () => {
    expect(s(["2021-06-15"]).dt.is_leap_year.values[0]).toBe(0);
    expect(s(["1900-01-01"]).dt.is_leap_year.values[0]).toBe(0);
  });

  test("is_weekday", () => {
    expect(s(["2021-01-04"]).dt.is_weekday.values[0]).toBe(1); // Monday
    expect(s(["2021-01-09"]).dt.is_weekday.values[0]).toBe(0); // Saturday
    expect(s(["2021-01-10"]).dt.is_weekday.values[0]).toBe(0); // Sunday
  });

  test("is_weekend", () => {
    expect(s(["2021-01-09"]).dt.is_weekend.values[0]).toBe(1); // Saturday
    expect(s(["2021-01-10"]).dt.is_weekend.values[0]).toBe(1); // Sunday
    expect(s(["2021-01-04"]).dt.is_weekend.values[0]).toBe(0); // Monday
  });
});

// ─── days_in_month ────────────────────────────────────────────────────────────

describe("days_in_month", () => {
  test("January — 31 days", () => {
    expect(s(["2021-01-15"]).dt.days_in_month.values[0]).toBe(31);
  });
  test("February — non-leap 28 days", () => {
    expect(s(["2021-02-10"]).dt.days_in_month.values[0]).toBe(28);
  });
  test("February — leap 29 days", () => {
    expect(s(["2020-02-10"]).dt.days_in_month.values[0]).toBe(29);
  });
  test("April — 30 days", () => {
    expect(s(["2021-04-05"]).dt.days_in_month.values[0]).toBe(30);
  });
  test("daysinmonth alias", () => {
    expect(s(["2021-01-15"]).dt.daysinmonth.values[0]).toBe(31);
  });
});

// ─── string representations ───────────────────────────────────────────────────

describe("date() and time()", () => {
  test("date() returns YYYY-MM-DD", () => {
    expect(s(["2021-03-15T14:30:45"]).dt.date().values[0]).toBe("2021-03-15");
  });
  test("date() propagates null", () => {
    expect(s([null]).dt.date().values[0]).toBeNull();
  });

  test("time() returns HH:MM:SS", () => {
    expect(s(["2021-03-15T14:30:45"]).dt.time().values[0]).toBe("14:30:45");
  });
  test("time() propagates null", () => {
    expect(s([null]).dt.time().values[0]).toBeNull();
  });
});

describe("strftime", () => {
  const iso = "2021-03-15T14:05:09.007";

  test("%Y-%m-%d", () => {
    expect(s([iso]).dt.strftime("%Y-%m-%d").values[0]).toBe("2021-03-15");
  });
  test("%H:%M:%S", () => {
    expect(s([iso]).dt.strftime("%H:%M:%S").values[0]).toBe("14:05:09");
  });
  test("%I:%M %p (12h clock)", () => {
    // 14 = 02 PM
    expect(s([iso]).dt.strftime("%I:%M %p").values[0]).toBe("02:05 PM");
  });
  test("%y two-digit year", () => {
    expect(s([iso]).dt.strftime("%y").values[0]).toBe("21");
  });
  test("%j day of year", () => {
    // March 15 = 74th day of 2021 (non-leap)
    expect(s([iso]).dt.strftime("%j").values[0]).toBe("074");
  });
  test("%A full weekday name", () => {
    expect(s(["2021-01-04"]).dt.strftime("%A").values[0]).toBe("Monday");
  });
  test("%a abbreviated weekday name", () => {
    expect(s(["2021-01-04"]).dt.strftime("%a").values[0]).toBe("Mon");
  });
  test("%B full month name", () => {
    expect(s([iso]).dt.strftime("%B").values[0]).toBe("March");
  });
  test("%b abbreviated month name", () => {
    expect(s([iso]).dt.strftime("%b").values[0]).toBe("Mar");
  });
  test("%f microseconds padded to 6", () => {
    // 7ms = 007000 microseconds
    expect(s([iso]).dt.strftime("%f").values[0]).toBe("007000");
  });
  test("%% literal percent", () => {
    expect(s([iso]).dt.strftime("100%%").values[0]).toBe("100%");
  });
  test("null propagates as null", () => {
    expect(s([null]).dt.strftime("%Y").values[0]).toBeNull();
  });
});

// ─── epoch utilities ──────────────────────────────────────────────────────────

describe("total_seconds and timestamp_ms", () => {
  test("total_seconds returns floor of ms/1000", () => {
    const d = new Date("2021-01-01T00:00:00.000Z");
    const expected = Math.floor(d.getTime() / 1000);
    expect(s([d]).dt.total_seconds().values[0]).toBe(expected);
  });

  test("timestamp_ms returns getTime()", () => {
    const d = new Date("2021-01-01T00:00:00.000Z");
    expect(s([d]).dt.timestamp_ms().values[0]).toBe(d.getTime());
  });
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe("normalize", () => {
  test("floors to midnight", () => {
    const d = new Date("2021-03-15T14:30:45");
    const result = s([d]).dt.normalize().values[0];
    expect(result).toBeInstanceOf(Date);
    const normalized = result as Date;
    expect(normalized.getHours()).toBe(0);
    expect(normalized.getMinutes()).toBe(0);
    expect(normalized.getSeconds()).toBe(0);
    expect(normalized.getDate()).toBe(15);
    expect(normalized.getMonth()).toBe(2);
    expect(normalized.getFullYear()).toBe(2021);
  });
  test("null propagates", () => {
    expect(s([null]).dt.normalize().values[0]).toBeNull();
  });
});

// ─── vectorized behavior ──────────────────────────────────────────────────────

describe("vectorized behavior", () => {
  test("multiple dates processed correctly", () => {
    const dates = ["2021-01-01", "2021-06-15", "2021-12-31"];
    const years = s(dates).dt.year.values;
    expect(years).toEqual([2021, 2021, 2021]);
    const months = s(dates).dt.month.values;
    expect(months).toEqual([1, 6, 12]);
    const days = s(dates).dt.day.values;
    expect(days).toEqual([1, 15, 31]);
  });

  test("null mixed in series", () => {
    const data = ["2021-01-01", null, "2021-12-31"];
    const years = s(data).dt.year.values;
    expect(years[0]).toBe(2021);
    expect(years[1]).toBeNull();
    expect(years[2]).toBe(2021);
  });

  test("index preserved", () => {
    const series = new Series({ data: ["2021-01-01"], index: ["a"] });
    expect(series.dt.year.index.values).toEqual(["a"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based tests", () => {
  test("year is always 4-digit number for valid dates", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1970-01-01"), max: new Date("2099-12-31") }), (d) => {
        const year = s([d]).dt.year.values[0];
        expect(typeof year).toBe("number");
        expect((year as number) >= 1970).toBe(true);
        expect((year as number) <= 2099).toBe(true);
      }),
    );
  });

  test("month is always between 1 and 12", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1970-01-01"), max: new Date("2099-12-31") }), (d) => {
        const month = s([d]).dt.month.values[0] as number;
        expect(month >= 1 && month <= 12).toBe(true);
      }),
    );
  });

  test("dayofweek is always 0-6", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1970-01-01"), max: new Date("2099-12-31") }), (d) => {
        const dow = s([d]).dt.dayofweek.values[0] as number;
        expect(dow >= 0 && dow <= 6).toBe(true);
      }),
    );
  });

  test("days_in_month is 28, 29, 30 or 31", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1900-01-01"), max: new Date("2099-12-31") }), (d) => {
        const dim = s([d]).dt.days_in_month.values[0] as number;
        expect([28, 29, 30, 31].includes(dim)).toBe(true);
      }),
    );
  });

  test("quarter is always 1-4", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1970-01-01"), max: new Date("2099-12-31") }), (d) => {
        const q = s([d]).dt.quarter.values[0] as number;
        expect(q >= 1 && q <= 4).toBe(true);
      }),
    );
  });

  test("ISO week is always 1-53", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("1970-01-01"), max: new Date("2099-12-31") }), (d) => {
        const w = s([d]).dt.week.values[0] as number;
        expect(w >= 1 && w <= 53).toBe(true);
      }),
    );
  });

  test("strftime round-trips YYYY-MM-DD through date()", () => {
    fc.assert(
      fc.property(fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }), (d) => {
        const strResult = s([d]).dt.strftime("%Y-%m-%d").values[0] as string;
        const dateResult = s([d]).dt.date().values[0] as string;
        expect(strResult).toBe(dateResult);
      }),
    );
  });
});
