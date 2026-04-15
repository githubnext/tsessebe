/**
 * Tests for Timestamp — the pandas.Timestamp equivalent in tsb.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Timedelta } from "../../src/core/timedelta.ts";
import { Timestamp } from "../../src/core/timestamp.ts";

// ─── Construction ────────────────────────────────────────────────────────────

describe("Timestamp — construction", () => {
  it("from ISO string with Z", () => {
    const ts = new Timestamp("2024-01-15T10:30:00Z");
    expect(ts.year).toBe(2024);
    expect(ts.month).toBe(1);
    expect(ts.day).toBe(15);
    expect(ts.hour).toBe(10);
    expect(ts.minute).toBe(30);
    expect(ts.second).toBe(0);
    expect(ts.tz).toBe("UTC");
  });

  it("from ISO string no timezone (naive)", () => {
    const ts = new Timestamp("2024-06-15T12:00:00");
    expect(ts.year).toBe(2024);
    expect(ts.month).toBe(6);
    expect(ts.day).toBe(15);
    expect(ts.hour).toBe(12);
    expect(ts.tz).toBeNull();
  });

  it("from date-only string", () => {
    const ts = new Timestamp("2024-03-20");
    expect(ts.year).toBe(2024);
    expect(ts.month).toBe(3);
    expect(ts.day).toBe(20);
    expect(ts.hour).toBe(0);
    expect(ts.tz).toBeNull();
  });

  it("from ISO string with fractional seconds (ms)", () => {
    const ts = new Timestamp("2024-01-15T10:30:00.123Z");
    expect(ts.millisecond).toBe(123);
  });

  it("from ISO string with +offset", () => {
    // +05:30 means IST — 10:30 IST = 05:00 UTC
    const ts = new Timestamp("2024-01-15T10:30:00+05:30");
    expect(ts._utcMs).toBe(new Timestamp("2024-01-15T05:00:00Z")._utcMs);
  });

  it("from JS Date", () => {
    const d = new Date("2024-01-15T10:30:00Z");
    const ts = new Timestamp(d);
    expect(ts._utcMs).toBe(d.getTime());
  });

  it("from milliseconds number (default unit)", () => {
    const ms = Date.UTC(2024, 0, 15, 10, 30, 0);
    const ts = new Timestamp(ms);
    expect(ts.year).toBe(2024);
    expect(ts._utcMs).toBe(ms);
  });

  it("from seconds (unit=s)", () => {
    const secs = 1705312200; // 2024-01-15T10:30:00Z
    const ts = new Timestamp(secs, { unit: "s" });
    expect(ts._utcMs).toBe(secs * 1000);
  });

  it("from microseconds (unit=us)", () => {
    const us = 1705312200_000_000;
    const ts = new Timestamp(us, { unit: "us" });
    expect(ts._utcMs).toBe(1705312200_000);
  });

  it("from another Timestamp (copy)", () => {
    const t1 = new Timestamp("2024-01-15T10:30:00Z");
    const t2 = new Timestamp(t1);
    expect(t2._utcMs).toBe(t1._utcMs);
    expect(t2._tz).toBe(t1._tz);
  });

  it("copy with tz override", () => {
    const t1 = new Timestamp("2024-01-15T10:30:00Z");
    const t2 = new Timestamp(t1, { tz: "America/New_York" });
    expect(t2._utcMs).toBe(t1._utcMs);
    expect(t2._tz).toBe("America/New_York");
  });

  it("fromComponents — basic", () => {
    const ts = Timestamp.fromComponents({ year: 2024, month: 6, day: 15, hour: 12 });
    expect(ts.year).toBe(2024);
    expect(ts.month).toBe(6);
    expect(ts.day).toBe(15);
    expect(ts.hour).toBe(12);
    expect(ts.minute).toBe(0);
  });

  it("fromComponents — with microseconds", () => {
    const ts = Timestamp.fromComponents({
      year: 2024,
      month: 1,
      day: 1,
      microsecond: 500,
    });
    expect(ts.microsecond).toBe(500);
  });

  it("Timestamp.now() returns a timestamp close to now", () => {
    const before = Date.now();
    const ts = Timestamp.now();
    const after = Date.now();
    expect(ts._utcMs).toBeGreaterThanOrEqual(before);
    expect(ts._utcMs).toBeLessThanOrEqual(after);
  });

  it("Timestamp.now('UTC') is tz-aware", () => {
    expect(Timestamp.now("UTC").tz).toBe("UTC");
  });

  it("Timestamp.today() has hour=0", () => {
    const ts = Timestamp.today();
    expect(ts.hour).toBe(0);
    expect(ts.minute).toBe(0);
    expect(ts.second).toBe(0);
  });

  it("Timestamp.fromtimestamp()", () => {
    const ts = Timestamp.fromtimestamp(1705312200);
    expect(ts._utcMs).toBe(1705312200_000);
  });

  it("Timestamp.fromisoformat()", () => {
    const ts = Timestamp.fromisoformat("2024-06-15T12:00:00Z");
    expect(ts.year).toBe(2024);
    expect(ts.tz).toBe("UTC");
  });

  it("throws on unparseable string", () => {
    expect(() => new Timestamp("not-a-date")).toThrow();
  });
});

// ─── Component accessors ─────────────────────────────────────────────────────

describe("Timestamp — component accessors", () => {
  const ts = new Timestamp("2024-06-15T12:30:45.123Z");

  it("year", () => expect(ts.year).toBe(2024));
  it("month", () => expect(ts.month).toBe(6));
  it("day", () => expect(ts.day).toBe(15));
  it("hour", () => expect(ts.hour).toBe(12));
  it("minute", () => expect(ts.minute).toBe(30));
  it("second", () => expect(ts.second).toBe(45));
  it("millisecond", () => expect(ts.millisecond).toBe(123));

  it("microsecond = millisecond * 1000 for no sub-ms precision", () => {
    expect(ts.microsecond).toBe(123_000);
  });

  it("nanosecond defaults to 0", () => expect(ts.nanosecond).toBe(0));

  it("dayofweek — Saturday", () => {
    // 2024-06-15 is a Saturday (0=Mon…6=Sun in pandas, so Sat=5).
    expect(ts.dayofweek).toBe(5);
  });

  it("weekday is alias for dayofweek", () => {
    expect(ts.weekday).toBe(ts.dayofweek);
  });

  it("dayofyear", () => {
    // 2024 is a leap year; June 15 = 167th day.
    expect(ts.dayofyear).toBe(167);
  });

  it("quarter", () => expect(ts.quarter).toBe(2));

  it("week", () => {
    // ISO week 24 in 2024.
    expect(ts.week).toBe(24);
  });

  it("tz", () => expect(ts.tz).toBe("UTC"));
  it("tzinfo is alias for tz", () => expect(ts.tzinfo).toBe(ts.tz));
  it("freq is always null", () => expect(ts.freq).toBeNull());
});

// ─── Boolean properties ───────────────────────────────────────────────────────

describe("Timestamp — boolean properties", () => {
  it("is_leap_year — 2024 (leap)", () => {
    expect(new Timestamp("2024-01-01T00:00:00Z").is_leap_year).toBe(true);
  });
  it("is_leap_year — 2023 (not leap)", () => {
    expect(new Timestamp("2023-01-01T00:00:00Z").is_leap_year).toBe(false);
  });
  it("is_leap_year — 1900 (not leap, divisible by 100)", () => {
    expect(new Timestamp("1900-01-01T00:00:00Z").is_leap_year).toBe(false);
  });
  it("is_leap_year — 2000 (leap, divisible by 400)", () => {
    expect(new Timestamp("2000-01-01T00:00:00Z").is_leap_year).toBe(true);
  });

  it("is_month_start — true on 1st", () => {
    expect(new Timestamp("2024-06-01T00:00:00Z").is_month_start).toBe(true);
  });
  it("is_month_start — false on 2nd", () => {
    expect(new Timestamp("2024-06-02T00:00:00Z").is_month_start).toBe(false);
  });

  it("is_month_end — true on last day", () => {
    expect(new Timestamp("2024-06-30T00:00:00Z").is_month_end).toBe(true);
  });
  it("is_month_end — false on 29th of June", () => {
    expect(new Timestamp("2024-06-29T00:00:00Z").is_month_end).toBe(false);
  });
  it("is_month_end — Feb 29 in leap year", () => {
    expect(new Timestamp("2024-02-29T00:00:00Z").is_month_end).toBe(true);
  });

  it("is_quarter_start — Q1 Jan 1", () => {
    expect(new Timestamp("2024-01-01T00:00:00Z").is_quarter_start).toBe(true);
  });
  it("is_quarter_start — Q2 Apr 1", () => {
    expect(new Timestamp("2024-04-01T00:00:00Z").is_quarter_start).toBe(true);
  });
  it("is_quarter_start — false on Apr 2", () => {
    expect(new Timestamp("2024-04-02T00:00:00Z").is_quarter_start).toBe(false);
  });

  it("is_quarter_end — Q1 Mar 31", () => {
    expect(new Timestamp("2024-03-31T00:00:00Z").is_quarter_end).toBe(true);
  });
  it("is_quarter_end — Q2 Jun 30", () => {
    expect(new Timestamp("2024-06-30T00:00:00Z").is_quarter_end).toBe(true);
  });

  it("is_year_start — Jan 1", () => {
    expect(new Timestamp("2024-01-01T00:00:00Z").is_year_start).toBe(true);
  });
  it("is_year_start — false on Jan 2", () => {
    expect(new Timestamp("2024-01-02T00:00:00Z").is_year_start).toBe(false);
  });

  it("is_year_end — Dec 31", () => {
    expect(new Timestamp("2024-12-31T00:00:00Z").is_year_end).toBe(true);
  });
  it("is_year_end — false on Dec 30", () => {
    expect(new Timestamp("2024-12-30T00:00:00Z").is_year_end).toBe(false);
  });
});

// ─── Conversion methods ───────────────────────────────────────────────────────

describe("Timestamp — conversion methods", () => {
  const ts = new Timestamp("2024-01-15T10:30:00Z");

  it("timestamp() returns unix seconds", () => {
    expect(ts.timestamp()).toBeCloseTo(ts._utcMs / 1000, 3);
  });

  it("date() returns year/month/day object", () => {
    const d = ts.date();
    expect(d.year).toBe(2024);
    expect(d.month).toBe(1);
    expect(d.day).toBe(15);
  });

  it("time() returns hour/minute/second/microsecond object", () => {
    const t = ts.time();
    expect(t.hour).toBe(10);
    expect(t.minute).toBe(30);
    expect(t.second).toBe(0);
  });

  it("toDate() returns a JS Date", () => {
    const d = ts.toDate();
    expect(d instanceof Date).toBe(true);
    expect(d.getTime()).toBe(ts._utcMs);
  });

  it("valueOf() returns milliseconds", () => {
    expect(ts.valueOf()).toBe(ts._utcMs);
  });
});

// ─── isoformat ────────────────────────────────────────────────────────────────

describe("Timestamp — isoformat", () => {
  it("naive timestamp omits tz suffix", () => {
    const ts = new Timestamp("2024-01-15T10:30:00");
    const s = ts.isoformat();
    expect(s).not.toContain("+");
    expect(s).not.toContain("Z");
  });

  it("UTC timestamp appends +00:00", () => {
    const ts = new Timestamp("2024-01-15T10:30:00Z");
    expect(ts.isoformat()).toContain("+00:00");
  });

  it("custom sep", () => {
    const ts = new Timestamp("2024-01-15T10:30:00Z");
    expect(ts.isoformat(" ")).toContain("2024-01-15 10:30:00");
  });

  it("timespec=seconds omits sub-second", () => {
    const ts = new Timestamp("2024-01-15T10:30:00.123Z");
    expect(ts.isoformat("T", "seconds")).toBe("2024-01-15T10:30:00+00:00");
  });

  it("timespec=milliseconds includes ms", () => {
    const ts = new Timestamp("2024-01-15T10:30:00.123Z");
    expect(ts.isoformat("T", "milliseconds")).toBe("2024-01-15T10:30:00.123+00:00");
  });

  it("auto with ms uses microseconds precision", () => {
    const ts = new Timestamp("2024-01-15T10:30:00.123Z");
    const s = ts.isoformat();
    expect(s).toContain("10:30:00.123000");
  });

  it("auto with no ms uses seconds precision", () => {
    const ts = new Timestamp("2024-01-15T10:30:00Z");
    const s = ts.isoformat();
    expect(s).toContain("10:30:00+00:00");
    expect(s).not.toContain(".");
  });

  it("toString delegates to isoformat", () => {
    const ts = new Timestamp("2024-01-15T10:30:00Z");
    expect(ts.toString()).toBe(ts.isoformat());
  });
});

// ─── strftime ────────────────────────────────────────────────────────────────

describe("Timestamp — strftime", () => {
  const ts = new Timestamp("2024-06-15T09:05:03.007Z");

  it("%Y — 4-digit year", () => expect(ts.strftime("%Y")).toBe("2024"));
  it("%y — 2-digit year", () => expect(ts.strftime("%y")).toBe("24"));
  it("%m — zero-padded month", () => expect(ts.strftime("%m")).toBe("06"));
  it("%d — zero-padded day", () => expect(ts.strftime("%d")).toBe("15"));
  it("%H — zero-padded hour (24h)", () => expect(ts.strftime("%H")).toBe("09"));
  it("%M — zero-padded minute", () => expect(ts.strftime("%M")).toBe("05"));
  it("%S — zero-padded second", () => expect(ts.strftime("%S")).toBe("03"));
  it("%f — microseconds zero-padded to 6", () => expect(ts.strftime("%f")).toBe("007000"));
  it("%A — full weekday name", () => expect(ts.strftime("%A")).toBe("Saturday"));
  it("%a — abbreviated weekday", () => expect(ts.strftime("%a")).toBe("Sat"));
  it("%B — full month name", () => expect(ts.strftime("%B")).toBe("June"));
  it("%b — abbreviated month", () => expect(ts.strftime("%b")).toBe("Jun"));
  it("%p — AM/PM", () => {
    const am = new Timestamp("2024-06-15T09:00:00Z");
    const pm = new Timestamp("2024-06-15T15:00:00Z");
    expect(am.strftime("%p")).toBe("AM");
    expect(pm.strftime("%p")).toBe("PM");
  });
  it("%Z — timezone name", () => {
    const tsUTC = new Timestamp("2024-06-15T09:00:00Z");
    expect(tsUTC.strftime("%Z")).toBe("UTC");
  });
  it("%z — UTC offset +HHMM", () => {
    const tsUTC = new Timestamp("2024-06-15T09:00:00Z");
    expect(tsUTC.strftime("%z")).toBe("+0000");
  });
  it("%% — literal percent", () => expect(ts.strftime("100%%")).toBe("100%"));
  it("%n — newline", () => expect(ts.strftime("a%nb")).toBe("a\nb"));
  it("combined format", () => {
    const tsSimple = new Timestamp("2024-06-15T09:05:03Z");
    expect(tsSimple.strftime("%Y-%m-%d %H:%M:%S")).toBe("2024-06-15 09:05:03");
  });
  it("%j — day of year", () => {
    // June 15 in 2024 (leap year) = 167
    expect(ts.strftime("%j")).toBe("167");
  });
  it("%I — 12-hour clock", () => {
    const noon = new Timestamp("2024-06-15T12:00:00Z");
    expect(noon.strftime("%I")).toBe("12");
    const pm1 = new Timestamp("2024-06-15T13:00:00Z");
    expect(pm1.strftime("%I")).toBe("01");
    const midnight = new Timestamp("2024-06-15T00:00:00Z");
    expect(midnight.strftime("%I")).toBe("12");
  });
  it("%w — JS weekday (0=Sun)", () => {
    // 2024-06-15 is Saturday → w=6
    expect(ts.strftime("%w")).toBe("6");
    // 2024-06-16 is Sunday → w=0
    expect(new Timestamp("2024-06-16T00:00:00Z").strftime("%w")).toBe("0");
  });
});

// ─── floor / ceil / round / normalize ────────────────────────────────────────

describe("Timestamp — rounding", () => {
  const ts = new Timestamp("2024-01-15T10:37:29.999Z");

  it("floor('H') truncates to hour", () => {
    expect(ts.floor("H").hour).toBe(10);
    expect(ts.floor("H").minute).toBe(0);
  });

  it("floor('T') truncates to minute", () => {
    expect(ts.floor("T").minute).toBe(37);
    expect(ts.floor("T").second).toBe(0);
  });

  it("floor('S') truncates to second", () => {
    expect(ts.floor("S").second).toBe(29);
    expect(ts.floor("S").millisecond).toBe(0);
  });

  it("floor('D') truncates to day", () => {
    expect(ts.floor("D").hour).toBe(0);
    expect(ts.floor("D").minute).toBe(0);
  });

  it("ceil('H') rounds up to next hour", () => {
    expect(ts.ceil("H").hour).toBe(11);
    expect(ts.ceil("H").minute).toBe(0);
  });

  it("ceil exactly on boundary stays same", () => {
    const onHour = new Timestamp("2024-01-15T10:00:00Z");
    expect(onHour.ceil("H").hour).toBe(10);
  });

  it("round('H') — 37 min → next hour", () => {
    expect(ts.round("H").hour).toBe(11);
  });

  it("round('H') — 29 min → same hour", () => {
    const ts2 = new Timestamp("2024-01-15T10:29:00Z");
    expect(ts2.round("H").hour).toBe(10);
  });

  it("normalize sets to midnight", () => {
    const n = ts.normalize();
    expect(n.hour).toBe(0);
    expect(n.minute).toBe(0);
    expect(n.second).toBe(0);
    expect(n.day).toBe(15);
  });

  it("preserves timezone after rounding", () => {
    const tsUTC = new Timestamp("2024-01-15T10:37:29Z");
    expect(tsUTC.floor("H").tz).toBe("UTC");
  });
});

// ─── Timezone operations ─────────────────────────────────────────────────────

describe("Timestamp — tz_localize", () => {
  it("attaches timezone to naive timestamp", () => {
    const naive = new Timestamp("2024-01-15T10:00:00");
    const aware = naive.tz_localize("UTC");
    expect(aware.tz).toBe("UTC");
    expect(aware.year).toBe(2024);
    expect(aware.hour).toBe(10);
  });

  it("throws when called on tz-aware timestamp", () => {
    const aware = new Timestamp("2024-01-15T10:00:00Z");
    expect(() => aware.tz_localize("UTC")).toThrow();
  });
});

describe("Timestamp — tz_convert", () => {
  it("converts UTC → same hour in different tz", () => {
    const utc = new Timestamp("2024-01-15T15:00:00Z");
    const ny = utc.tz_convert("America/New_York");
    // EST = UTC-5 → 10:00
    expect(ny.tz).toBe("America/New_York");
    expect(ny.hour).toBe(10);
    expect(ny._utcMs).toBe(utc._utcMs);
  });

  it("throws when called on naive timestamp", () => {
    const naive = new Timestamp("2024-01-15T10:00:00");
    expect(() => naive.tz_convert("UTC")).toThrow();
  });

  it("UTC offset is preserved for UTC tz", () => {
    const ts = new Timestamp("2024-06-15T00:00:00Z");
    const converted = ts.tz_convert("UTC");
    expect(converted.hour).toBe(0);
  });
});

// ─── Arithmetic ───────────────────────────────────────────────────────────────

describe("Timestamp — arithmetic", () => {
  const ts = new Timestamp("2024-01-15T10:00:00Z");

  it("add(Timedelta) returns a later Timestamp", () => {
    const later = ts.add(Timedelta.fromComponents({ hours: 2 }));
    expect(later.hour).toBe(12);
    expect(later.tz).toBe("UTC");
  });

  it("add one day", () => {
    const next = ts.add(Timedelta.fromComponents({ days: 1 }));
    expect(next.day).toBe(16);
  });

  it("sub(Timedelta) returns an earlier Timestamp", () => {
    const earlier = ts.sub(Timedelta.fromComponents({ hours: 3 }));
    expect(earlier.hour).toBe(7);
  });

  it("sub(Timestamp) returns a Timedelta", () => {
    const ts2 = new Timestamp("2024-01-15T12:00:00Z");
    const delta = ts2.sub(ts);
    expect(delta instanceof Timedelta).toBe(true);
    expect(delta.totalMilliseconds).toBe(2 * 3_600_000);
  });

  it("sub(Timestamp) negative delta when earlier is second arg", () => {
    const ts2 = new Timestamp("2024-01-14T10:00:00Z");
    const delta = ts2.sub(ts);
    expect(delta.totalMilliseconds).toBe(-86_400_000);
  });

  it("add then sub returns original", () => {
    const td = Timedelta.fromComponents({ days: 7 });
    const roundTrip = ts.add(td).sub(td);
    expect(roundTrip._utcMs).toBe(ts._utcMs);
  });
});

// ─── Comparisons ─────────────────────────────────────────────────────────────

describe("Timestamp — comparisons", () => {
  const earlier = new Timestamp("2024-01-15T10:00:00Z");
  const later = new Timestamp("2024-01-15T12:00:00Z");
  const same = new Timestamp("2024-01-15T10:00:00Z");

  it("eq — same instant", () => expect(earlier.eq(same)).toBe(true));
  it("eq — different instant", () => expect(earlier.eq(later)).toBe(false));
  it("ne — different", () => expect(earlier.ne(later)).toBe(true));
  it("lt — earlier < later", () => expect(earlier.lt(later)).toBe(true));
  it("lt — later not < earlier", () => expect(later.lt(earlier)).toBe(false));
  it("le — earlier <= later", () => expect(earlier.le(later)).toBe(true));
  it("le — same", () => expect(earlier.le(same)).toBe(true));
  it("gt — later > earlier", () => expect(later.gt(earlier)).toBe(true));
  it("ge — later >= earlier", () => expect(later.ge(earlier)).toBe(true));
  it("ge — same", () => expect(earlier.ge(same)).toBe(true));

  it("valueOf enables < > operators", () => {
    // Relies on valueOf() being called.
    expect(earlier < later).toBe(true);
    expect(later > earlier).toBe(true);
  });
});

// ─── Name helpers ──────────────────────────────────────────────────────────────

describe("Timestamp — day_name / month_name", () => {
  it("day_name — Monday", () => {
    // 2024-01-15 is a Monday.
    expect(new Timestamp("2024-01-15T00:00:00Z").day_name()).toBe("Monday");
  });
  it("day_name — Saturday", () => {
    expect(new Timestamp("2024-06-15T00:00:00Z").day_name()).toBe("Saturday");
  });
  it("day_name — Sunday", () => {
    expect(new Timestamp("2024-06-16T00:00:00Z").day_name()).toBe("Sunday");
  });

  it("month_name — January", () => {
    expect(new Timestamp("2024-01-01T00:00:00Z").month_name()).toBe("January");
  });
  it("month_name — December", () => {
    expect(new Timestamp("2024-12-01T00:00:00Z").month_name()).toBe("December");
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

describe("Timestamp — property tests", () => {
  it("round-trip: fromtimestamp → timestamp()", () => {
    fc.assert(
      fc.property(fc.integer({ min: -2_000_000_000, max: 4_000_000_000 }), (secs) => {
        const ts = Timestamp.fromtimestamp(secs);
        expect(Math.round(ts.timestamp())).toBe(secs);
      }),
    );
  });

  it("add then sub Timedelta is identity", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (baseMs, deltaMs) => {
          const ts = new Timestamp(baseMs);
          const td = Timedelta.fromMilliseconds(deltaMs);
          expect(ts.add(td).sub(td)._utcMs).toBe(baseMs);
        },
      ),
    );
  });

  it("sub(other) returns same ms as direct subtraction", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        (a, b) => {
          const ts1 = new Timestamp(a);
          const ts2 = new Timestamp(b);
          const delta = ts1.sub(ts2);
          expect(delta.totalMilliseconds).toBe(a - b);
        },
      ),
    );
  });

  it("floor(D) always gives hour=0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000_000_000 }), (ms) => {
        const ts = new Timestamp(ms);
        expect(ts.floor("D").hour).toBe(0);
        expect(ts.floor("D").minute).toBe(0);
        expect(ts.floor("D").second).toBe(0);
      }),
    );
  });

  it("dayofweek is in [0,6]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000_000_000 }), (ms) => {
        const dow = new Timestamp(ms).dayofweek;
        expect(dow).toBeGreaterThanOrEqual(0);
        expect(dow).toBeLessThanOrEqual(6);
      }),
    );
  });

  it("dayofyear is in [1,366]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000_000_000 }), (ms) => {
        const doy = new Timestamp(ms).dayofyear;
        expect(doy).toBeGreaterThanOrEqual(1);
        expect(doy).toBeLessThanOrEqual(366);
      }),
    );
  });

  it("quarter is in [1,4]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000_000_000 }), (ms) => {
        const q = new Timestamp(ms).quarter;
        expect(q).toBeGreaterThanOrEqual(1);
        expect(q).toBeLessThanOrEqual(4);
      }),
    );
  });

  it("tz_convert preserves UTC ms", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000_000_000 }),
        fc.constantFrom("UTC", "America/New_York", "Asia/Tokyo"),
        (ms, tz) => {
          const ts = new Timestamp(ms, { tz: "UTC" });
          const converted = ts.tz_convert(tz);
          expect(converted._utcMs).toBe(ms);
        },
      ),
    );
  });

  it("normalize is idempotent", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000_000_000 }), (ms) => {
        const ts = new Timestamp(ms);
        const n1 = ts.normalize();
        const n2 = n1.normalize();
        expect(n1._utcMs).toBe(n2._utcMs);
      }),
    );
  });
});
