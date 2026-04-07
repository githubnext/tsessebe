/**
 * Tests for Expanding (growing-window) aggregations.
 *
 * Covers: Series.expanding(), DataFrame.expanding(), all aggregation methods,
 * edge cases (nulls, NaN, minPeriods, single element, empty), and property tests.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: (number | null)[]): Series<number | null> {
  return new Series<number | null>({ data });
}

function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

// ─── Series.expanding() — basic behaviour ─────────────────────────────────────

describe("Series.expanding() — mean", () => {
  test("simple integer series", () => {
    const result = s([1, 2, 3, 4, 5]).expanding().mean().toArray();
    expect(result).toEqual([1, 1.5, 2, 2.5, 3]);
  });

  test("single element", () => {
    expect(s([42]).expanding().mean().toArray()).toEqual([42]);
  });

  test("two elements", () => {
    expect(s([10, 20]).expanding().mean().toArray()).toEqual([10, 15]);
  });

  test("with null values", () => {
    const result = s([1, null, 3, null, 5]).expanding().mean().toArray();
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1); // only 1 valid
    expect(result[2]).toBe(2); // (1+3)/2
    expect(result[3]).toBe(2); // still (1+3)/2
    expect(result[4]).toBe(3); // (1+3+5)/3
  });

  test("all nulls → all null", () => {
    const result = s([null, null, null]).expanding().mean().toArray();
    expect(result).toEqual([null, null, null]);
  });
});

describe("Series.expanding() — sum", () => {
  test("cumulative sum", () => {
    expect(s([1, 2, 3, 4]).expanding().sum().toArray()).toEqual([1, 3, 6, 10]);
  });

  test("with nulls (skip nulls)", () => {
    const result = s([1, null, 3]).expanding().sum().toArray();
    expect(result).toEqual([1, 1, 4]);
  });
});

describe("Series.expanding() — min/max", () => {
  test("expanding min", () => {
    expect(s([5, 3, 4, 1, 2]).expanding().min().toArray()).toEqual([5, 3, 3, 1, 1]);
  });

  test("expanding max", () => {
    expect(s([1, 5, 3, 7, 2]).expanding().max().toArray()).toEqual([1, 5, 5, 7, 7]);
  });

  test("min with leading nulls", () => {
    const result = s([null, null, 3, 1, 5]).expanding().min().toArray();
    expect(result[0]).toBe(null);
    expect(result[1]).toBe(null);
    expect(result[2]).toBe(3);
    expect(result[3]).toBe(1);
    expect(result[4]).toBe(1);
  });
});

describe("Series.expanding() — count", () => {
  test("count ignores minPeriods", () => {
    const result = s([1, null, 3, null, 5])
      .expanding({ minPeriods: 3 })
      .count()
      .toArray();
    // count always returns actual count regardless of minPeriods
    expect(result).toEqual([1, 1, 2, 2, 3]);
  });

  test("all valid", () => {
    expect(s([1, 2, 3]).expanding().count().toArray()).toEqual([1, 2, 3]);
  });

  test("all null → 0 counts", () => {
    expect(s([null, null]).expanding().count().toArray()).toEqual([0, 0]);
  });
});

describe("Series.expanding() — std/var", () => {
  test("std with ddof=1 (default)", () => {
    const result = s([2, 4, 4, 4, 5, 5, 7, 9]).expanding().std().toArray();
    // first element: only 1 value, ddof=1 → NaN → null
    expect(result[0]).toBe(null);
    // last element: std of [2,4,4,4,5,5,7,9]
    const last = result[7] as number;
    expect(approx(last, 2.0, 1e-6)).toBe(true);
  });

  test("var with ddof=1", () => {
    const result = s([1, 2, 3]).expanding().var().toArray();
    expect(result[0]).toBe(null); // 1 element, ddof=1
    expect(result[1]).toBeCloseTo(0.5, 9); // var([1,2])=0.5
    expect(result[2]).toBeCloseTo(1.0, 9); // var([1,2,3])=1
  });

  test("std with ddof=0 (population)", () => {
    const result = s([1, 2, 3]).expanding().std(0).toArray();
    expect(result[0]).toBe(0); // single element, pop std = 0
    expect(result[1]).toBeCloseTo(0.5, 9);
    expect((result[2] as number)).toBeCloseTo(Math.sqrt(2 / 3), 9);
  });
});

describe("Series.expanding() — median", () => {
  test("expanding median odd window", () => {
    const result = s([3, 1, 4, 1, 5]).expanding().median().toArray();
    expect(result[0]).toBe(3);
    expect(result[1]).toBe(2); // median([3,1])=2
    expect(result[2]).toBe(3); // median([1,3,4])=3
    expect(result[3]).toBe(2); // median([1,1,3,4])=2
    expect(result[4]).toBe(3); // median([1,1,3,4,5])=3
  });
});

describe("Series.expanding() — apply", () => {
  test("custom product function", () => {
    const result = s([1, 2, 3, 4])
      .expanding()
      .apply((nums) => nums.reduce((a, b) => a * b, 1))
      .toArray();
    expect(result).toEqual([1, 2, 6, 24]);
  });

  test("apply with minPeriods", () => {
    const result = s([1, 2, 3])
      .expanding({ minPeriods: 2 })
      .apply((nums) => nums.length)
      .toArray();
    expect(result[0]).toBe(null); // only 1 element, < minPeriods
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
  });
});

// ─── minPeriods ───────────────────────────────────────────────────────────────

describe("Series.expanding() — minPeriods", () => {
  test("minPeriods=2 produces null for first position", () => {
    const result = s([10, 20, 30]).expanding({ minPeriods: 2 }).sum().toArray();
    expect(result[0]).toBe(null);
    expect(result[1]).toBe(30);
    expect(result[2]).toBe(60);
  });

  test("minPeriods=1 (default) never null for non-missing", () => {
    const result = s([1, 2, 3]).expanding({ minPeriods: 1 }).mean().toArray();
    for (const v of result) {
      expect(v).not.toBe(null);
    }
  });

  test("minPeriods > length → all null", () => {
    const result = s([1, 2]).expanding({ minPeriods: 5 }).mean().toArray();
    expect(result).toEqual([null, null]);
  });

  test("minPeriods with NaN values", () => {
    const result = s([NaN, 2, 3]).expanding({ minPeriods: 2 }).sum().toArray();
    // NaN is treated as missing; [NaN] has 0 valid → null; [NaN,2] has 1 valid < 2 → null; [NaN,2,3] has 2 valid
    expect(result[0]).toBe(null);
    expect(result[1]).toBe(null);
    expect(result[2]).toBe(5);
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe("Series.expanding() — edge cases", () => {
  test("empty series", () => {
    const result = s([]).expanding().mean().toArray();
    expect(result).toEqual([]);
  });

  test("NaN treated as missing", () => {
    const nanSeries = new Series<number>({ data: [1, NaN, 3] });
    const result = nanSeries.expanding().mean().toArray();
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1); // NaN skipped
    expect(result[2]).toBe(2); // (1+3)/2
  });

  test("returns Series with same index and name", () => {
    const orig = new Series({ data: [1, 2, 3], name: "myCol" });
    const result = orig.expanding().mean();
    expect(result.name).toBe("myCol");
    expect(result.index.values).toEqual(orig.index.values);
  });
});

// ─── DataFrame.expanding() ────────────────────────────────────────────────────

describe("DataFrame.expanding()", () => {
  test("mean per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const result = df.expanding().mean();
    expect(result.col("a").toArray()).toEqual([1, 1.5, 2, 2.5]);
    expect(result.col("b").toArray()).toEqual([10, 15, 20, 25]);
  });

  test("sum per column", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 5, 6] });
    const result = df.expanding().sum();
    expect(result.col("x").toArray()).toEqual([1, 3, 6]);
    expect(result.col("y").toArray()).toEqual([4, 9, 15]);
  });

  test("min per column", () => {
    const df = DataFrame.fromColumns({ a: [5, 3, 7, 1] });
    const result = df.expanding().min();
    expect(result.col("a").toArray()).toEqual([5, 3, 3, 1]);
  });

  test("max per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 5, 2, 8] });
    const result = df.expanding().max();
    expect(result.col("a").toArray()).toEqual([1, 5, 5, 8]);
  });

  test("count per column with nulls", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3, null, 5] });
    const result = df.expanding().count();
    expect(result.col("a").toArray()).toEqual([1, 1, 2, 2, 3]);
  });

  test("std per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = df.expanding().std();
    expect(result.col("a").toArray()[0]).toBe(null);
    expect((result.col("a").toArray()[1] as number)).toBeCloseTo(Math.sqrt(0.5), 9);
  });

  test("var per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = df.expanding().var();
    expect(result.col("a").toArray()[0]).toBe(null);
    expect((result.col("a").toArray()[1] as number)).toBeCloseTo(0.5, 9);
  });

  test("median per column", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 4] });
    const result = df.expanding().median();
    expect(result.col("a").toArray()[0]).toBe(3);
    expect(result.col("a").toArray()[1]).toBe(2); // median([3,1])=2
    expect(result.col("a").toArray()[2]).toBe(3); // median([1,3,4])=3
  });

  test("apply per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4] });
    const result = df.expanding().apply((nums) => nums.reduce((a, b) => a * b, 1));
    expect(result.col("a").toArray()).toEqual([1, 2, 6, 24]);
  });

  test("minPeriods option", () => {
    const df = DataFrame.fromColumns({ a: [10, 20, 30] });
    const result = df.expanding({ minPeriods: 2 }).sum();
    expect(result.col("a").toArray()[0]).toBe(null);
    expect(result.col("a").toArray()[1]).toBe(30);
    expect(result.col("a").toArray()[2]).toBe(60);
  });

  test("preserves column names and index", () => {
    const df = DataFrame.fromColumns({ alpha: [1, 2], beta: [3, 4] });
    const result = df.expanding().mean();
    expect(result.columns.values).toEqual(["alpha", "beta"]);
    expect(result.index.values).toEqual(df.index.values);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("Expanding — property tests", () => {
  test("expanding().sum() at position i equals sum of all valid values up to i", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.float({ noNaN: true, min: -100, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 30,
        }),
        (data) => {
          const series = new Series<number | null>({ data });
          const result = series.expanding().sum().toArray();

          for (let i = 0; i < data.length; i++) {
            const validSoFar = data
              .slice(0, i + 1)
              .filter((v): v is number => v !== null && !Number.isNaN(v));
            if (validSoFar.length === 0) {
              expect(result[i]).toBe(null);
            } else {
              const expected = validSoFar.reduce((a, b) => a + b, 0);
              expect((result[i] as number)).toBeCloseTo(expected, 6);
            }
          }
        },
      ),
    );
  });

  test("expanding().max() at position i >= expanding().min() at position i", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1000, max: 1000 }), {
          minLength: 1,
          maxLength: 50,
        }),
        (data) => {
          const series = new Series<number>({ data });
          const maxResult = series.expanding().max().toArray();
          const minResult = series.expanding().min().toArray();

          for (let i = 0; i < data.length; i++) {
            const maxVal = maxResult[i];
            const minVal = minResult[i];
            if (maxVal !== null && minVal !== null) {
              expect(maxVal as number).toBeGreaterThanOrEqual(minVal as number);
            }
          }
        },
      ),
    );
  });

  test("expanding().count() is non-decreasing", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer(), { nil: null }), { minLength: 0, maxLength: 30 }),
        (data) => {
          const result = new Series<number | null>({ data }).expanding().count().toArray();
          for (let i = 1; i < result.length; i++) {
            expect(result[i] as number).toBeGreaterThanOrEqual(result[i - 1] as number);
          }
        },
      ),
    );
  });

  test("expanding().mean() matches manual computation", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const result = new Series<number>({ data }).expanding().mean().toArray();
          for (let i = 0; i < data.length; i++) {
            const slice = data.slice(0, i + 1);
            const expected = slice.reduce((a, b) => a + b, 0) / slice.length;
            expect((result[i] as number)).toBeCloseTo(expected, 6);
          }
        },
      ),
    );
  });
});
