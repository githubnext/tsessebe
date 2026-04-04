/**
 * Tests for Timedelta and TimedeltaAccessor.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series, Timedelta, TimedeltaAccessor } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a Series from ms values + optional nulls. */
function ms(...values: (number | null)[]): Series<import("../../src/types.ts").Scalar> {
  return new Series({ data: values });
}

// ─── Timedelta construction ───────────────────────────────────────────────────

describe("Timedelta construction", () => {
  test("default unit is ms", () => {
    expect(new Timedelta(1000).total_seconds()).toBe(1);
  });

  test("unit: ms", () => {
    expect(new Timedelta(500, "ms").toMilliseconds()).toBe(500);
  });

  test("unit: s", () => {
    expect(new Timedelta(2, "s").toMilliseconds()).toBe(2000);
  });

  test("unit: m", () => {
    expect(new Timedelta(3, "m").toMilliseconds()).toBe(180_000);
  });

  test("unit: min", () => {
    expect(new Timedelta(3, "min").toMilliseconds()).toBe(180_000);
  });

  test("unit: h", () => {
    expect(new Timedelta(2, "h").toMilliseconds()).toBe(7_200_000);
  });

  test("unit: D", () => {
    expect(new Timedelta(1, "D").toMilliseconds()).toBe(86_400_000);
  });

  test("unit: d lowercase", () => {
    expect(new Timedelta(1, "d").toMilliseconds()).toBe(86_400_000);
  });

  test("unit: W", () => {
    expect(new Timedelta(1, "W").toMilliseconds()).toBe(604_800_000);
  });

  test("unit: w lowercase", () => {
    expect(new Timedelta(1, "w").toMilliseconds()).toBe(604_800_000);
  });
});

// ─── string parsing ────────────────────────────────────────────────────────────

describe("Timedelta string parsing", () => {
  test("'1 days 01:30:00'", () => {
    const td = new Timedelta("1 days 01:30:00");
    expect(td.total_seconds()).toBe(91800);
  });

  test("'0 days 00:00:00'", () => {
    expect(new Timedelta("0 days 00:00:00").toMilliseconds()).toBe(0);
  });

  test("'2 days 00:00:00'", () => {
    expect(new Timedelta("2 days 00:00:00").days).toBe(2);
  });

  test("negative pandas string '-1 days +22:00:00'", () => {
    // -1 day + 22 hours = -2h → -7200000 ms
    expect(new Timedelta("-1 days +22:00:00").toMilliseconds()).toBe(-7_200_000);
  });

  test("pandas string with fractional seconds '0 days 00:00:01.500'", () => {
    expect(new Timedelta("0 days 00:00:01.500").toMilliseconds()).toBe(1500);
  });

  test("'5 hours'", () => {
    expect(new Timedelta("5 hours").total_seconds()).toBe(18000);
  });

  test("'30 minutes'", () => {
    expect(new Timedelta("30 minutes").total_seconds()).toBe(1800);
  });

  test("'1.5 days'", () => {
    expect(new Timedelta("1.5 days").total_seconds()).toBe(129600);
  });

  test("'90 seconds'", () => {
    expect(new Timedelta("90 seconds").total_seconds()).toBe(90);
  });

  test("'2 weeks'", () => {
    expect(new Timedelta("2 weeks").days).toBe(14);
  });

  test("pure integer string '5000'", () => {
    expect(new Timedelta("5000").toMilliseconds()).toBe(5000);
  });

  test("invalid string throws", () => {
    expect(() => new Timedelta("not a timedelta")).toThrow();
  });

  test("Timedelta.parse delegates to constructor", () => {
    expect(Timedelta.parse("1 days 00:00:00").days).toBe(1);
  });
});

// ─── component accessors ───────────────────────────────────────────────────────

describe("Timedelta.days", () => {
  test("exact 1 day", () => {
    expect(new Timedelta(1, "D").days).toBe(1);
  });

  test("1 day + 1 second → days=1", () => {
    expect(new Timedelta(86_401_000, "ms").days).toBe(1);
  });

  test("zero ms → days=0", () => {
    expect(new Timedelta(0).days).toBe(0);
  });

  test("negative 1 day → days=-1", () => {
    expect(new Timedelta(-1, "D").days).toBe(-1);
  });

  test("-1 day + 1 second → days=-1", () => {
    const td = new Timedelta(-86_399_000, "ms");
    expect(td.days).toBe(-1);
  });
});

describe("Timedelta.seconds", () => {
  test("exact 30 seconds", () => {
    expect(new Timedelta(30, "s").seconds).toBe(30);
  });

  test("1 day + 90 seconds → seconds=90", () => {
    expect(new Timedelta(86_490_000, "ms").seconds).toBe(90);
  });

  test("negative: -1 day + 1 second", () => {
    const td = new Timedelta(-86_399_000, "ms");
    expect(td.seconds).toBe(1);
  });

  test("seconds component is always 0..86399", () => {
    expect(new Timedelta(172799000).seconds).toBe(86399);
  });
});

describe("Timedelta.microseconds", () => {
  test("500 ms → microseconds=500000", () => {
    expect(new Timedelta(500, "ms").microseconds).toBe(500_000);
  });

  test("1000 ms → microseconds=0 (falls into next second)", () => {
    expect(new Timedelta(1000, "ms").microseconds).toBe(0);
  });

  test("750 ms → 750000 microseconds", () => {
    expect(new Timedelta(750, "ms").microseconds).toBe(750_000);
  });
});

describe("Timedelta.milliseconds", () => {
  test("1500 ms → 500 ms component", () => {
    expect(new Timedelta(1500, "ms").milliseconds).toBe(500);
  });

  test("exact seconds → 0 ms", () => {
    expect(new Timedelta(3, "s").milliseconds).toBe(0);
  });
});

// ─── total_seconds ─────────────────────────────────────────────────────────────

describe("Timedelta.total_seconds", () => {
  test("1 hour", () => {
    expect(new Timedelta(1, "h").total_seconds()).toBe(3600);
  });

  test("500 ms", () => {
    expect(new Timedelta(500, "ms").total_seconds()).toBe(0.5);
  });

  test("negative 2 minutes", () => {
    expect(new Timedelta(-2, "m").total_seconds()).toBe(-120);
  });

  test("zero", () => {
    expect(new Timedelta(0).total_seconds()).toBe(0);
  });
});

// ─── abs ───────────────────────────────────────────────────────────────────────

describe("Timedelta.abs", () => {
  test("positive is unchanged", () => {
    expect(new Timedelta(5, "s").abs().total_seconds()).toBe(5);
  });

  test("negative becomes positive", () => {
    expect(new Timedelta(-3, "h").abs().total_seconds()).toBe(10800);
  });

  test("zero is zero", () => {
    expect(new Timedelta(0).abs().toMilliseconds()).toBe(0);
  });
});

// ─── arithmetic ────────────────────────────────────────────────────────────────

describe("Timedelta arithmetic", () => {
  test("add", () => {
    const a = new Timedelta(1, "h");
    const b = new Timedelta(30, "m");
    expect(a.add(b).total_seconds()).toBe(5400);
  });

  test("sub", () => {
    const a = new Timedelta(2, "h");
    const b = new Timedelta(30, "m");
    expect(a.sub(b).total_seconds()).toBe(5400);
  });

  test("mul", () => {
    expect(new Timedelta(10, "s").mul(3).total_seconds()).toBe(30);
  });

  test("mul by fraction", () => {
    expect(new Timedelta(10, "s").mul(0.5).total_seconds()).toBe(5);
  });

  test("divScalar", () => {
    expect(new Timedelta(1, "h").divScalar(2).total_seconds()).toBe(1800);
  });

  test("divTimedelta", () => {
    const a = new Timedelta(2, "h");
    const b = new Timedelta(1, "h");
    expect(a.divTimedelta(b)).toBe(2);
  });

  test("neg", () => {
    expect(new Timedelta(5, "s").neg().total_seconds()).toBe(-5);
  });

  test("double neg is identity", () => {
    expect(new Timedelta(5, "s").neg().neg().total_seconds()).toBe(5);
  });
});

// ─── comparison ────────────────────────────────────────────────────────────────

describe("Timedelta comparison", () => {
  const a = new Timedelta(1, "h");
  const b = new Timedelta(2, "h");
  const a2 = new Timedelta(3600, "s");

  test("eq: same value", () => {
    expect(a.eq(a2)).toBe(true);
  });

  test("eq: different values", () => {
    expect(a.eq(b)).toBe(false);
  });

  test("ne", () => {
    expect(a.ne(b)).toBe(true);
  });

  test("lt", () => {
    expect(a.lt(b)).toBe(true);
    expect(b.lt(a)).toBe(false);
  });

  test("le: less than", () => {
    expect(a.le(b)).toBe(true);
  });

  test("le: equal", () => {
    expect(a.le(a2)).toBe(true);
  });

  test("gt", () => {
    expect(b.gt(a)).toBe(true);
    expect(a.gt(b)).toBe(false);
  });

  test("ge: greater than", () => {
    expect(b.ge(a)).toBe(true);
  });

  test("ge: equal", () => {
    expect(a.ge(a2)).toBe(true);
  });
});

// ─── toString ──────────────────────────────────────────────────────────────────

describe("Timedelta.toString", () => {
  test("zero", () => {
    expect(new Timedelta(0).toString()).toBe("0 days 00:00:00");
  });

  test("1 day", () => {
    expect(new Timedelta(1, "D").toString()).toBe("1 day 00:00:00");
  });

  test("2 days", () => {
    expect(new Timedelta(2, "D").toString()).toBe("2 days 00:00:00");
  });

  test("1 day 1 hour 30 min", () => {
    const td = new Timedelta(1, "D").add(new Timedelta(90, "m"));
    expect(td.toString()).toBe("1 day 01:30:00");
  });

  test("negative with time component", () => {
    // -86399 s = -1 day + 1 second → "-1 days +00:00:01"
    const td = new Timedelta(-86_399_000, "ms");
    expect(td.toString()).toBe("-1 days +00:00:01");
  });

  test("with milliseconds", () => {
    expect(new Timedelta(1500, "ms").toString()).toBe("0 days 00:00:01.500");
  });
});

// ─── fromMilliseconds ─────────────────────────────────────────────────────────

describe("Timedelta.fromMilliseconds", () => {
  test("round-trip", () => {
    expect(Timedelta.fromMilliseconds(5000).total_seconds()).toBe(5);
  });

  test("negative", () => {
    expect(Timedelta.fromMilliseconds(-3600000).total_seconds()).toBe(-3600);
  });
});

// ─── TimedeltaAccessor construction ──────────────────────────────────────────

describe("TimedeltaAccessor construction", () => {
  test("accessible via series.timedelta", () => {
    expect(ms(1000).timedelta).toBeInstanceOf(TimedeltaAccessor);
  });

  test("null is null", () => {
    expect(ms(null).timedelta.total_seconds().values[0]).toBeNull();
  });

  test("string values are parsed", () => {
    const s = new Series({ data: ["1 days 00:00:00"] });
    expect(s.timedelta.days.values[0]).toBe(1);
  });

  test("unparseable string gives null", () => {
    const s = new Series({ data: ["not-a-td"] });
    expect(s.timedelta.total_seconds().values[0]).toBeNull();
  });

  test("boolean gives null", () => {
    const s = new Series({ data: [true] });
    expect(s.timedelta.total_seconds().values[0]).toBeNull();
  });

  test("Date gives null", () => {
    const s = new Series({ data: [new Date()] });
    expect(s.timedelta.total_seconds().values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.total_seconds ────────────────────────────────────────

describe("TimedeltaAccessor.total_seconds", () => {
  test("basic", () => {
    const s = ms(1000, 60_000, 3_600_000);
    expect(s.timedelta.total_seconds().values).toEqual([1, 60, 3600]);
  });

  test("null propagates", () => {
    const s = ms(1000, null, 2000);
    const vals = s.timedelta.total_seconds().values;
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBeNull();
    expect(vals[2]).toBe(2);
  });

  test("negative values", () => {
    expect(ms(-3600000).timedelta.total_seconds().values[0]).toBe(-3600);
  });

  test("fractional ms", () => {
    expect(ms(500).timedelta.total_seconds().values[0]).toBe(0.5);
  });
});

// ─── TimedeltaAccessor.days ──────────────────────────────────────────────────

describe("TimedeltaAccessor.days", () => {
  test("less than 1 day → 0", () => {
    expect(ms(3_600_000).timedelta.days.values[0]).toBe(0);
  });

  test("exactly 1 day → 1", () => {
    expect(ms(86_400_000).timedelta.days.values[0]).toBe(1);
  });

  test("2.5 days → 2", () => {
    expect(ms(216_000_000).timedelta.days.values[0]).toBe(2);
  });

  test("negative: -1 day + 1s → -1", () => {
    expect(ms(-86_399_000).timedelta.days.values[0]).toBe(-1);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.days.values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.seconds ───────────────────────────────────────────────

describe("TimedeltaAccessor.seconds", () => {
  test("30 seconds", () => {
    expect(ms(30_000).timedelta.seconds.values[0]).toBe(30);
  });

  test("1 day + 60s → seconds=60", () => {
    expect(ms(86_460_000).timedelta.seconds.values[0]).toBe(60);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.seconds.values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.microseconds ─────────────────────────────────────────

describe("TimedeltaAccessor.microseconds", () => {
  test("500 ms → 500000 µs", () => {
    expect(ms(500).timedelta.microseconds.values[0]).toBe(500_000);
  });

  test("exact second → 0", () => {
    expect(ms(1000).timedelta.microseconds.values[0]).toBe(0);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.microseconds.values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.milliseconds ─────────────────────────────────────────

describe("TimedeltaAccessor.milliseconds", () => {
  test("1500 ms → 500 ms component", () => {
    expect(ms(1500).timedelta.milliseconds.values[0]).toBe(500);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.milliseconds.values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.abs ───────────────────────────────────────────────────

describe("TimedeltaAccessor.abs", () => {
  test("positive unchanged", () => {
    expect(ms(5000).timedelta.abs().values[0]).toBe(5000);
  });

  test("negative becomes positive", () => {
    expect(ms(-5000).timedelta.abs().values[0]).toBe(5000);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.abs().values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.neg ───────────────────────────────────────────────────

describe("TimedeltaAccessor.neg", () => {
  test("negate positive", () => {
    expect(ms(5000).timedelta.neg().values[0]).toBe(-5000);
  });

  test("negate negative", () => {
    expect(ms(-3000).timedelta.neg().values[0]).toBe(3000);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.neg().values[0]).toBeNull();
  });
});

// ─── TimedeltaAccessor.floor / ceil / round ──────────────────────────────────

describe("TimedeltaAccessor.floor", () => {
  test("floor to nearest second", () => {
    expect(ms(1500).timedelta.floor(1000).values[0]).toBe(1000);
  });

  test("floor already on boundary", () => {
    expect(ms(3000).timedelta.floor(1000).values[0]).toBe(3000);
  });

  test("floor negative: -1500ms floor-1000 → -2000", () => {
    expect(ms(-1500).timedelta.floor(1000).values[0]).toBe(-2000);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.floor(1000).values[0]).toBeNull();
  });
});

describe("TimedeltaAccessor.ceil", () => {
  test("ceil to nearest second", () => {
    expect(ms(1500).timedelta.ceil(1000).values[0]).toBe(2000);
  });

  test("ceil already on boundary", () => {
    expect(ms(3000).timedelta.ceil(1000).values[0]).toBe(3000);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.ceil(1000).values[0]).toBeNull();
  });
});

describe("TimedeltaAccessor.round", () => {
  test("round 1500ms to nearest second → 2000", () => {
    expect(ms(1500).timedelta.round(1000).values[0]).toBe(2000);
  });

  test("round 1400ms to nearest second → 1000", () => {
    expect(ms(1400).timedelta.round(1000).values[0]).toBe(1000);
  });

  test("null → null", () => {
    expect(ms(null).timedelta.round(1000).values[0]).toBeNull();
  });
});

// ─── index preservation ───────────────────────────────────────────────────────

describe("index preservation", () => {
  test("total_seconds preserves index", () => {
    const s = new Series({ data: [1000, 2000, 3000], index: ["a", "b", "c"] });
    expect(s.timedelta.total_seconds().index.values).toEqual(["a", "b", "c"]);
  });

  test("days preserves index", () => {
    const s = new Series({ data: [86_400_000, 172_800_000], index: [10, 20] });
    expect(s.timedelta.days.index.values).toEqual([10, 20]);
  });
});

// ─── string-input accessors ───────────────────────────────────────────────────

describe("string input via timedelta accessor", () => {
  test("total_seconds from string series", () => {
    const s = new Series({ data: ["1 days 00:00:00", "30 minutes", "2 hours"] });
    const vals = s.timedelta.total_seconds().values;
    expect(vals[0]).toBe(86400);
    expect(vals[1]).toBe(1800);
    expect(vals[2]).toBe(7200);
  });

  test("days from string series", () => {
    const s = new Series({ data: ["2 days 00:00:00", "0 days 12:00:00"] });
    const vals = s.timedelta.days.values;
    expect(vals[0]).toBe(2);
    expect(vals[1]).toBe(0);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property: total_seconds round-trip", () => {
  test("fromMilliseconds(ms).total_seconds() === ms / 1000", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }), (n) => {
        expect(Timedelta.fromMilliseconds(n).total_seconds()).toBe(n / 1000);
      }),
    );
  });
});

describe("property: component decomposition identity", () => {
  test("days * 86400 + seconds + ms/1000 === total_seconds", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10_000_000_000, max: 10_000_000_000 }), (n) => {
        const td = Timedelta.fromMilliseconds(n);
        const reconstructed = td.days * 86400 + td.seconds + td.milliseconds / 1000;
        expect(Math.abs(reconstructed - td.total_seconds())).toBeLessThan(0.001);
      }),
    );
  });
});

describe("property: add/sub roundtrip", () => {
  test("td.add(other).sub(other) equals td", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (a, b) => {
          const tdA = Timedelta.fromMilliseconds(a);
          const tdB = Timedelta.fromMilliseconds(b);
          expect(tdA.add(tdB).sub(tdB).toMilliseconds()).toBe(a);
        },
      ),
    );
  });
});
