/**
 * Tests for stats/to_timedelta — convert scalars, arrays, and Series to Timedelta.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, Timedelta, formatTimedelta, parseFrac, toTimedelta } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function series(data: Scalar[]): Series<Scalar> {
  return new Series({ data });
}

// ─── Timedelta class ──────────────────────────────────────────────────────────

describe("Timedelta", () => {
  it("stores totalMs", () => {
    expect(new Timedelta(5000).totalMs).toBe(5000);
  });

  it("days accessor", () => {
    expect(new Timedelta(2 * 86_400_000 + 3 * 3_600_000).days).toBe(2);
  });

  it("hours accessor", () => {
    expect(new Timedelta(2 * 86_400_000 + 3 * 3_600_000).hours).toBe(3);
  });

  it("minutes accessor", () => {
    expect(new Timedelta(90 * 60_000).minutes).toBe(30);
  });

  it("seconds accessor", () => {
    expect(new Timedelta(65_000).seconds).toBe(5);
  });

  it("ms accessor", () => {
    expect(new Timedelta(1_500).ms).toBe(500);
  });

  it("abs()", () => {
    expect(new Timedelta(-5000).abs().totalMs).toBe(5000);
  });

  it("add()", () => {
    expect(new Timedelta(1000).add(new Timedelta(2000)).totalMs).toBe(3000);
  });

  it("subtract()", () => {
    expect(new Timedelta(5000).subtract(new Timedelta(2000)).totalMs).toBe(3000);
  });

  it("scale()", () => {
    expect(new Timedelta(1000).scale(3).totalMs).toBe(3000);
  });

  it("lt()", () => {
    expect(new Timedelta(1000).lt(new Timedelta(2000))).toBe(true);
    expect(new Timedelta(2000).lt(new Timedelta(1000))).toBe(false);
  });

  it("gt()", () => {
    expect(new Timedelta(2000).gt(new Timedelta(1000))).toBe(true);
  });

  it("eq()", () => {
    expect(new Timedelta(1000).eq(new Timedelta(1000))).toBe(true);
    expect(new Timedelta(1000).eq(new Timedelta(999))).toBe(false);
  });

  it("sign positive", () => {
    expect(new Timedelta(100).sign).toBe(1);
  });

  it("sign negative", () => {
    expect(new Timedelta(-100).sign).toBe(-1);
  });

  it("sign zero", () => {
    expect(new Timedelta(0).sign).toBe(1);
  });
});

// ─── null / missing ───────────────────────────────────────────────────────────

describe("toTimedelta — missing values", () => {
  it("returns null for null", () => {
    expect(toTimedelta(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toTimedelta(undefined)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(toTimedelta(Number.NaN)).toBeNull();
  });
});

// ─── Timedelta passthrough ────────────────────────────────────────────────────

describe("toTimedelta — Timedelta passthrough", () => {
  it("returns same Timedelta unchanged", () => {
    const td = new Timedelta(12345);
    expect(toTimedelta(td as unknown as Scalar)?.totalMs).toBe(12345);
  });
});

// ─── numeric inputs ───────────────────────────────────────────────────────────

describe("toTimedelta — numeric", () => {
  it("default unit ns", () => {
    expect(toTimedelta(1_000_000)?.totalMs).toBe(1); // 1e6 ns = 1 ms
  });

  it("unit ms", () => {
    expect(toTimedelta(1000, { unit: "ms" })?.totalMs).toBe(1000);
  });

  it("unit s", () => {
    expect(toTimedelta(2, { unit: "s" })?.totalMs).toBe(2000);
  });

  it("unit m", () => {
    expect(toTimedelta(1, { unit: "m" })?.totalMs).toBe(60_000);
  });

  it("unit h", () => {
    expect(toTimedelta(1, { unit: "h" })?.totalMs).toBe(3_600_000);
  });

  it("unit D", () => {
    expect(toTimedelta(1, { unit: "D" })?.totalMs).toBe(86_400_000);
  });

  it("unit W", () => {
    expect(toTimedelta(1, { unit: "W" })?.totalMs).toBe(7 * 86_400_000);
  });

  it("unit us", () => {
    expect(toTimedelta(1000, { unit: "us" })?.totalMs).toBe(1);
  });

  it("zero", () => {
    expect(toTimedelta(0, { unit: "ms" })?.totalMs).toBe(0);
  });
});

// ─── string — pandas format ───────────────────────────────────────────────────

describe("toTimedelta — pandas-style strings", () => {
  it("parses '0 days 00:00:01'", () => {
    const td = toTimedelta("0 days 00:00:01") as Timedelta;
    expect(td.totalMs).toBe(1000);
  });

  it("parses '1 days 02:03:04'", () => {
    const td = toTimedelta("1 days 02:03:04") as Timedelta;
    expect(td.totalMs).toBe(86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000);
  });

  it("parses '2 days 00:00:00.500000'", () => {
    const td = toTimedelta("2 days 00:00:00.500000") as Timedelta;
    expect(td.totalMs).toBe(2 * 86_400_000 + 500);
  });

  it("parses no-day clock '01:30:00'", () => {
    const td = toTimedelta("01:30:00") as Timedelta;
    expect(td.totalMs).toBe(90 * 60_000);
  });

  it("parses singular 'day'", () => {
    const td = toTimedelta("1 day 00:00:00") as Timedelta;
    expect(td.totalMs).toBe(86_400_000);
  });

  it("parses fractional '0:00:00.001'", () => {
    const td = toTimedelta("0:00:00.001") as Timedelta;
    expect(td.totalMs).toBe(1);
  });
});

// ─── string — ISO 8601 ────────────────────────────────────────────────────────

describe("toTimedelta — ISO 8601", () => {
  it("parses 'P1D'", () => {
    const td = toTimedelta("P1D") as Timedelta;
    expect(td.totalMs).toBe(86_400_000);
  });

  it("parses 'PT1H'", () => {
    const td = toTimedelta("PT1H") as Timedelta;
    expect(td.totalMs).toBe(3_600_000);
  });

  it("parses 'PT30M'", () => {
    const td = toTimedelta("PT30M") as Timedelta;
    expect(td.totalMs).toBe(30 * 60_000);
  });

  it("parses 'PT10S'", () => {
    const td = toTimedelta("PT10S") as Timedelta;
    expect(td.totalMs).toBe(10_000);
  });

  it("parses 'P1DT2H3M4S'", () => {
    const td = toTimedelta("P1DT2H3M4S") as Timedelta;
    expect(td.totalMs).toBe(86_400_000 + 2 * 3_600_000 + 3 * 60_000 + 4_000);
  });
});

// ─── string — human-readable ──────────────────────────────────────────────────

describe("toTimedelta — human-readable", () => {
  it("parses '1h'", () => {
    expect((toTimedelta("1h") as Timedelta).totalMs).toBe(3_600_000);
  });

  it("parses '30m'", () => {
    expect((toTimedelta("30m") as Timedelta).totalMs).toBe(30 * 60_000);
  });

  it("parses '1h 30m'", () => {
    expect((toTimedelta("1h 30m") as Timedelta).totalMs).toBe(90 * 60_000);
  });

  it("parses '500ms'", () => {
    expect((toTimedelta("500ms") as Timedelta).totalMs).toBe(500);
  });

  it("parses '1 day'", () => {
    expect((toTimedelta("1 day") as Timedelta).totalMs).toBe(86_400_000);
  });

  it("parses '2 weeks'", () => {
    expect((toTimedelta("2 weeks") as Timedelta).totalMs).toBe(14 * 86_400_000);
  });

  it("parses '1h 30m 20s 500ms'", () => {
    const expected = 3_600_000 + 30 * 60_000 + 20_000 + 500;
    expect((toTimedelta("1h 30m 20s 500ms") as Timedelta).totalMs).toBe(expected);
  });
});

// ─── string — integer string ──────────────────────────────────────────────────

describe("toTimedelta — integer string", () => {
  it("parses '1000' as ns by default", () => {
    const td = toTimedelta("1000") as Timedelta;
    expect(td.totalMs).toBeCloseTo(0.001, 5);
  });

  it("parses '1000' with unit ms", () => {
    const td = toTimedelta("1000", { unit: "ms" }) as Timedelta;
    expect(td.totalMs).toBe(1000);
  });
});

// ─── errors handling ──────────────────────────────────────────────────────────

describe("toTimedelta — errors", () => {
  it("raises by default for bad string", () => {
    expect(() => toTimedelta("not-a-duration")).toThrow(TypeError);
  });

  it("coerces to null", () => {
    expect(toTimedelta("not-a-duration", { errors: "coerce" })).toBeNull();
  });

  it("ignores and returns original", () => {
    const result = toTimedelta("not-a-duration", { errors: "ignore" });
    expect(result).toBe("not-a-duration" as unknown as Timedelta);
  });
});

// ─── array overload ───────────────────────────────────────────────────────────

describe("toTimedelta — array", () => {
  it("converts array of strings", () => {
    const arr = toTimedelta(["1h", "30m", null] as Scalar[], { unit: "ms" });
    expect(arr[0]?.totalMs).toBe(3_600_000);
    expect(arr[1]?.totalMs).toBe(30 * 60_000);
    expect(arr[2]).toBeNull();
  });

  it("converts array of numbers", () => {
    const arr = toTimedelta([1000, 2000] as Scalar[], { unit: "ms" });
    expect(arr[0]?.totalMs).toBe(1000);
    expect(arr[1]?.totalMs).toBe(2000);
  });
});

// ─── Series overload ──────────────────────────────────────────────────────────

describe("toTimedelta — Series", () => {
  it("converts Series<Scalar> to Series<Timedelta | null>", () => {
    const s = series(["1h", "30m", null]);
    const result = toTimedelta(s);
    expect(result instanceof Series).toBe(true);
    expect((result.values[0] as Timedelta | null)?.totalMs).toBe(3_600_000);
    expect((result.values[1] as Timedelta | null)?.totalMs).toBe(30 * 60_000);
    expect(result.values[2]).toBeNull();
  });

  it("preserves Series name", () => {
    const s = new Series({ data: ["1h"], name: "dur" });
    const result = toTimedelta(s);
    expect(result.name).toBe("dur");
  });
});

// ─── parseFrac ────────────────────────────────────────────────────────────────

describe("parseFrac", () => {
  it("parses '5' → 500 ms", () => {
    expect(parseFrac("5")).toBe(500);
  });

  it("parses '500000' → 500 ms", () => {
    expect(parseFrac("500000")).toBe(500);
  });

  it("parses '001' → 1 ms", () => {
    expect(parseFrac("001")).toBe(1);
  });

  it("parses '0' → 0 ms", () => {
    expect(parseFrac("0")).toBe(0);
  });
});

// ─── formatTimedelta ──────────────────────────────────────────────────────────

describe("formatTimedelta", () => {
  it("formats zero", () => {
    expect(formatTimedelta(new Timedelta(0))).toBe("0 days 00:00:00");
  });

  it("formats 1 day", () => {
    expect(formatTimedelta(new Timedelta(86_400_000))).toBe("1 day 00:00:00");
  });

  it("formats 2 days", () => {
    expect(formatTimedelta(new Timedelta(2 * 86_400_000))).toBe("2 days 00:00:00");
  });

  it("formats hours/minutes/seconds", () => {
    const td = new Timedelta(3_600_000 + 30 * 60_000 + 5_000);
    expect(formatTimedelta(td)).toBe("0 days 01:30:05");
  });

  it("formats fractional seconds", () => {
    const td = new Timedelta(500);
    expect(formatTimedelta(td)).toBe("0 days 00:00:00.500000");
  });

  it("negative: calls toString()", () => {
    const td = new Timedelta(-86_400_000);
    const s = td.toString();
    expect(s).toContain("days");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("toTimedelta — property tests", () => {
  it("numeric round-trip: toTimedelta(n, unit=ms).totalMs === n", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (n) => {
        const td = toTimedelta(n, { unit: "ms" }) as Timedelta;
        return td.totalMs === n;
      }),
    );
  });

  it("array length preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const scalars = arr as unknown as Scalar[];
          const result = toTimedelta(scalars, { unit: "ms" });
          return result.length === arr.length;
        },
      ),
    );
  });

  it("Timedelta.add is commutative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        fc.integer({ min: -1_000_000, max: 1_000_000 }),
        (a, b) => {
          const ta = new Timedelta(a);
          const tb = new Timedelta(b);
          return ta.add(tb).totalMs === tb.add(ta).totalMs;
        },
      ),
    );
  });

  it("Timedelta.abs is always non-negative", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1_000_000, max: 1_000_000 }), (n) => {
        return new Timedelta(n).abs().totalMs >= 0;
      }),
    );
  });
});
