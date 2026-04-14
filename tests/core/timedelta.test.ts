/**
 * Tests for Timedelta and TimedeltaIndex.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Timedelta, TimedeltaIndex } from "../../src/core/timedelta.ts";

// ─── Timedelta construction ──────────────────────────────────────────────────

describe("Timedelta.fromComponents", () => {
  it("zero by default", () => {
    expect(Timedelta.fromComponents({}).totalMilliseconds).toBe(0);
  });

  it("days only", () => {
    expect(Timedelta.fromComponents({ days: 2 }).totalMilliseconds).toBe(2 * 86_400_000);
  });

  it("hours only", () => {
    expect(Timedelta.fromComponents({ hours: 3 }).totalMilliseconds).toBe(3 * 3_600_000);
  });

  it("minutes only", () => {
    expect(Timedelta.fromComponents({ minutes: 90 }).totalMilliseconds).toBe(90 * 60_000);
  });

  it("seconds only", () => {
    expect(Timedelta.fromComponents({ seconds: 120 }).totalMilliseconds).toBe(120_000);
  });

  it("milliseconds only", () => {
    expect(Timedelta.fromComponents({ milliseconds: 500 }).totalMilliseconds).toBe(500);
  });

  it("weeks", () => {
    expect(Timedelta.fromComponents({ weeks: 1 }).totalMilliseconds).toBe(7 * 86_400_000);
  });

  it("mixed components", () => {
    const td = Timedelta.fromComponents({ days: 1, hours: 2, minutes: 3, seconds: 4 });
    expect(td.totalMilliseconds).toBe(1 * 86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4 * 1_000);
  });

  it("negative components", () => {
    expect(Timedelta.fromComponents({ hours: -1 }).totalMilliseconds).toBe(-3_600_000);
  });

  it("throws on non-finite", () => {
    expect(() => Timedelta.fromMilliseconds(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("Timedelta.fromMilliseconds", () => {
  it("round-trips", () => {
    expect(Timedelta.fromMilliseconds(12345).totalMilliseconds).toBe(12345);
  });
  it("truncates fractional", () => {
    expect(Timedelta.fromMilliseconds(1000.9).totalMilliseconds).toBe(1000);
  });
});

// ─── Timedelta.parse ─────────────────────────────────────────────────────────

describe("Timedelta.parse", () => {
  it("pandas-style simple", () => {
    const td = Timedelta.parse("1 days 02:03:04");
    expect(td.days).toBe(1);
    expect(td.hours).toBe(2);
    expect(td.minutes).toBe(3);
    expect(td.seconds).toBe(4);
  });

  it("pandas-style with ms", () => {
    const td = Timedelta.parse("0 days 00:00:00.500");
    expect(td.milliseconds).toBe(500);
  });

  it("pandas-style singular 'day'", () => {
    const td = Timedelta.parse("1 day 00:00:00");
    expect(td.days).toBe(1);
  });

  it("pandas-style negative", () => {
    const td = Timedelta.parse("-1 days 01:00:00");
    expect(td.totalMilliseconds).toBe(-(86_400_000 + 3_600_000));
  });

  it("HH:MM:SS", () => {
    const td = Timedelta.parse("02:30:00");
    expect(td.totalMinutes).toBe(150);
  });

  it("HH:MM:SS negative", () => {
    const td = Timedelta.parse("-01:00:00");
    expect(td.totalHours).toBe(-1);
  });

  it("HH:MM:SS with ms", () => {
    const td = Timedelta.parse("00:00:01.250");
    expect(td.totalMilliseconds).toBe(1250);
  });

  it("ISO P1DT2H", () => {
    const td = Timedelta.parse("P1DT2H");
    expect(td.totalHours).toBe(26);
  });

  it("ISO PT90M", () => {
    const td = Timedelta.parse("PT90M");
    expect(td.totalMinutes).toBe(90);
  });

  it("ISO -P1D", () => {
    const td = Timedelta.parse("-P1D");
    expect(td.totalDays).toBe(-1);
  });

  it("ISO PT1.5H", () => {
    const td = Timedelta.parse("PT1.5H");
    expect(td.totalMinutes).toBe(90);
  });

  it("throws on garbage", () => {
    expect(() => Timedelta.parse("not a duration")).toThrow(SyntaxError);
  });
});

// ─── component accessors ─────────────────────────────────────────────────────

describe("component accessors", () => {
  const td = Timedelta.fromComponents({
    days: 1,
    hours: 2,
    minutes: 3,
    seconds: 4,
    milliseconds: 567,
  });

  it("days", () => {
    expect(td.days).toBe(1);
  });
  it("hours", () => {
    expect(td.hours).toBe(2);
  });
  it("minutes", () => {
    expect(td.minutes).toBe(3);
  });
  it("seconds", () => {
    expect(td.seconds).toBe(4);
  });
  it("milliseconds", () => {
    expect(td.milliseconds).toBe(567);
  });

  it("negative days", () => {
    const neg = Timedelta.fromComponents({ hours: -25 });
    expect(neg.days).toBe(-1);
  });
});

// ─── total-unit conversions ───────────────────────────────────────────────────

describe("total conversions", () => {
  it("totalDays", () => {
    expect(Timedelta.fromComponents({ days: 2 }).totalDays).toBe(2);
  });
  it("totalHours", () => {
    expect(Timedelta.fromComponents({ days: 1, hours: 6 }).totalHours).toBe(30);
  });
  it("totalMinutes", () => {
    expect(Timedelta.fromComponents({ hours: 1, minutes: 30 }).totalMinutes).toBe(90);
  });
  it("totalSeconds", () => {
    expect(Timedelta.fromComponents({ minutes: 2, seconds: 30 }).totalSeconds).toBe(150);
  });
});

// ─── arithmetic ───────────────────────────────────────────────────────────────

describe("arithmetic", () => {
  const h1 = Timedelta.fromComponents({ hours: 1 });
  const h2 = Timedelta.fromComponents({ hours: 2 });

  it("add", () => {
    expect(h1.add(h2).totalHours).toBe(3);
  });
  it("sub", () => {
    expect(h2.sub(h1).totalHours).toBe(1);
  });
  it("mul", () => {
    expect(h1.mul(3).totalHours).toBe(3);
  });
  it("negate", () => {
    expect(h1.negate().totalHours).toBe(-1);
  });
  it("abs of negative", () => {
    expect(Timedelta.fromComponents({ hours: -3 }).abs().totalHours).toBe(3);
  });
  it("abs of positive unchanged", () => {
    expect(h2.abs().totalHours).toBe(2);
  });
  it("divBy", () => {
    expect(h2.divBy(h1)).toBe(2);
  });
  it("divBy zero throws", () => {
    expect(() => h1.divBy(Timedelta.fromMilliseconds(0))).toThrow(RangeError);
  });
});

// ─── comparison ───────────────────────────────────────────────────────────────

describe("comparison", () => {
  const h1 = Timedelta.fromComponents({ hours: 1 });
  const h2 = Timedelta.fromComponents({ hours: 2 });

  it("compareTo less", () => {
    expect(h1.compareTo(h2)).toBeLessThan(0);
  });
  it("compareTo equal", () => {
    expect(h1.compareTo(h1)).toBe(0);
  });
  it("compareTo greater", () => {
    expect(h2.compareTo(h1)).toBeGreaterThan(0);
  });
  it("equals true", () => {
    expect(h1.equals(Timedelta.fromComponents({ hours: 1 }))).toBe(true);
  });
  it("equals false", () => {
    expect(h1.equals(h2)).toBe(false);
  });
});

// ─── toString / toISOString ───────────────────────────────────────────────────

describe("toString", () => {
  it("simple", () => {
    const td = Timedelta.fromComponents({ days: 1, hours: 2, minutes: 3, seconds: 4 });
    expect(td.toString()).toBe("1 days 02:03:04");
  });

  it("zero", () => {
    expect(Timedelta.fromMilliseconds(0).toString()).toBe("0 days 00:00:00");
  });

  it("with milliseconds", () => {
    const td = Timedelta.fromComponents({ milliseconds: 500 });
    expect(td.toString()).toBe("0 days 00:00:00.500");
  });

  it("negative", () => {
    const td = Timedelta.fromComponents({ hours: -25 });
    expect(td.toString()).toBe("-1 days 01:00:00");
  });

  it("parse round-trip", () => {
    const original = Timedelta.fromComponents({ days: 3, hours: 7, minutes: 22, seconds: 11 });
    const parsed = Timedelta.parse(original.toString());
    expect(parsed.totalMilliseconds).toBe(original.totalMilliseconds);
  });
});

describe("toISOString", () => {
  it("P1DT2H", () => {
    expect(Timedelta.fromComponents({ days: 1, hours: 2 }).toISOString()).toBe("P1DT2H");
  });
  it("zero is PT0S", () => {
    expect(Timedelta.fromMilliseconds(0).toISOString()).toBe("PT0S");
  });
  it("negative", () => {
    expect(Timedelta.fromComponents({ hours: -1 }).toISOString()).toBe("-PT1H");
  });
  it("seconds with ms", () => {
    expect(Timedelta.fromComponents({ seconds: 1, milliseconds: 500 }).toISOString()).toBe(
      "PT1.500S",
    );
  });
});

// ─── TimedeltaIndex ───────────────────────────────────────────────────────────

describe("TimedeltaIndex.fromTimedeltas", () => {
  const td0 = Timedelta.fromComponents({ hours: 0 });
  const td1 = Timedelta.fromComponents({ hours: 1 });
  const td2 = Timedelta.fromComponents({ hours: 2 });
  const idx = TimedeltaIndex.fromTimedeltas([td0, td1, td2]);

  it("size", () => {
    expect(idx.size).toBe(3);
  });
  it("at(0)", () => {
    expect(idx.at(0).totalHours).toBe(0);
  });
  it("at(2)", () => {
    expect(idx.at(2).totalHours).toBe(2);
  });
  it("out of bounds throws", () => {
    expect(() => idx.at(5)).toThrow(RangeError);
  });
  it("toArray copies", () => {
    expect(idx.toArray()).toHaveLength(3);
  });
});

describe("TimedeltaIndex.fromRange", () => {
  it("basic ascending", () => {
    const idx = TimedeltaIndex.fromRange(
      Timedelta.fromComponents({ hours: 0 }),
      Timedelta.fromComponents({ hours: 4 }),
      Timedelta.fromComponents({ hours: 1 }),
    );
    expect(idx.size).toBe(5);
    expect(idx.at(4).totalHours).toBe(4);
  });

  it("descending", () => {
    const idx = TimedeltaIndex.fromRange(
      Timedelta.fromComponents({ hours: 4 }),
      Timedelta.fromComponents({ hours: 0 }),
      Timedelta.fromComponents({ hours: -1 }),
    );
    expect(idx.size).toBe(5);
    expect(idx.at(0).totalHours).toBe(4);
  });

  it("zero step throws", () => {
    expect(() =>
      TimedeltaIndex.fromRange(
        Timedelta.fromMilliseconds(0),
        Timedelta.fromMilliseconds(1000),
        Timedelta.fromMilliseconds(0),
      ),
    ).toThrow(RangeError);
  });
});

describe("TimedeltaIndex.fromStrings", () => {
  it("parses strings", () => {
    const idx = TimedeltaIndex.fromStrings(["0 days 01:00:00", "0 days 02:00:00"]);
    expect(idx.size).toBe(2);
    expect(idx.at(1).totalHours).toBe(2);
  });
});

describe("TimedeltaIndex operations", () => {
  const vals = [
    Timedelta.fromComponents({ hours: 3 }),
    Timedelta.fromComponents({ hours: 1 }),
    Timedelta.fromComponents({ hours: 2 }),
    Timedelta.fromComponents({ hours: 1 }),
  ];
  const idx = TimedeltaIndex.fromTimedeltas(vals);

  it("sort ascending", () => {
    const sorted = idx.sort();
    expect(sorted.at(0).totalHours).toBe(1);
    expect(sorted.at(3).totalHours).toBe(3);
  });

  it("sort descending", () => {
    const sorted = idx.sort({ ascending: false });
    expect(sorted.at(0).totalHours).toBe(3);
  });

  it("unique removes duplicates", () => {
    expect(idx.unique().size).toBe(3);
  });

  it("shift adds delta", () => {
    const shifted = idx.shift(Timedelta.fromComponents({ hours: 10 }));
    expect(shifted.at(0).totalHours).toBe(13);
  });

  it("min", () => {
    expect(idx.min().totalHours).toBe(1);
  });

  it("max", () => {
    expect(idx.max().totalHours).toBe(3);
  });

  it("min on empty throws", () => {
    expect(() => TimedeltaIndex.fromTimedeltas([]).min()).toThrow(RangeError);
  });

  it("max on empty throws", () => {
    expect(() => TimedeltaIndex.fromTimedeltas([]).max()).toThrow(RangeError);
  });

  it("filter", () => {
    const f = idx.filter((td) => td.totalHours > 1);
    expect(f.size).toBe(2);
  });

  it("toStrings", () => {
    const strs = TimedeltaIndex.fromTimedeltas([
      Timedelta.fromComponents({ hours: 1 }),
    ]).toStrings();
    expect(strs[0]).toBe("0 days 01:00:00");
  });

  it("rename", () => {
    const renamed = idx.rename("duration");
    expect(renamed.name).toBe("duration");
  });

  it("default name null", () => {
    expect(idx.name).toBeNull();
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("property tests", () => {
  const arbMs = fc.integer({ min: -10_000_000, max: 10_000_000 });

  it("add is commutative", () => {
    fc.assert(
      fc.property(arbMs, arbMs, (a, b) => {
        const ta = Timedelta.fromMilliseconds(a);
        const tb = Timedelta.fromMilliseconds(b);
        return ta.add(tb).totalMilliseconds === tb.add(ta).totalMilliseconds;
      }),
    );
  });

  it("sub is anti-commutative", () => {
    fc.assert(
      fc.property(arbMs, arbMs, (a, b) => {
        const ta = Timedelta.fromMilliseconds(a);
        const tb = Timedelta.fromMilliseconds(b);
        return ta.sub(tb).totalMilliseconds === -tb.sub(ta).totalMilliseconds;
      }),
    );
  });

  it("negate double-inverts", () => {
    fc.assert(
      fc.property(arbMs, (ms) => {
        const td = Timedelta.fromMilliseconds(ms);
        return td.negate().negate().totalMilliseconds === td.totalMilliseconds;
      }),
    );
  });

  it("abs is non-negative", () => {
    fc.assert(
      fc.property(arbMs, (ms) => {
        return Timedelta.fromMilliseconds(ms).abs().totalMilliseconds >= 0;
      }),
    );
  });

  it("mul scalar identity", () => {
    fc.assert(
      fc.property(arbMs, (ms) => {
        const td = Timedelta.fromMilliseconds(ms);
        return td.mul(1).totalMilliseconds === td.totalMilliseconds;
      }),
    );
  });

  it("parse(toString()) round-trips for positive", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (ms) => {
        const td = Timedelta.fromMilliseconds(ms);
        return Timedelta.parse(td.toString()).totalMilliseconds === td.totalMilliseconds;
      }),
    );
  });

  it("compareTo is consistent with equals", () => {
    fc.assert(
      fc.property(arbMs, arbMs, (a, b) => {
        const ta = Timedelta.fromMilliseconds(a);
        const tb = Timedelta.fromMilliseconds(b);
        return ta.equals(tb) === (ta.compareTo(tb) === 0);
      }),
    );
  });

  it("fromRange size matches formula", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 20 }),
        (startH, count) => {
          const start = Timedelta.fromComponents({ hours: startH });
          const step = Timedelta.fromComponents({ hours: 1 });
          const stop = Timedelta.fromComponents({ hours: startH + count - 1 });
          const idx = TimedeltaIndex.fromRange(start, stop, step);
          return idx.size === count;
        },
      ),
    );
  });
});
