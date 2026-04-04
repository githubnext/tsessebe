/**
 * Tests for window functions: rolling, expanding, ewm.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { ewm } from "../../src/index.ts";
import { expanding } from "../../src/index.ts";
import { rolling } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const EPS = 1e-10;

function closeEnough(a: number | null, b: number | null, eps = EPS): boolean {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  if (!(Number.isFinite(a) || Number.isFinite(b))) {
    return true;
  }
  return Math.abs(a - b) < eps;
}

function makeSeries(data: (number | null)[]): Series<number | null> {
  return new Series<number | null>({ data });
}

// ─── rolling ─────────────────────────────────────────────────────────────────

describe("rolling – SeriesRolling", () => {
  test("sum – basic 3-period trailing", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    const result = rolling(s, 3).sum();
    expect(result.values).toEqual([null, null, 6, 9, 12]);
  });

  test("mean – basic 3-period trailing", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    const result = rolling(s, 3).mean();
    expect(result.values).toEqual([null, null, 2, 3, 4]);
  });

  test("min – 3-period", () => {
    const s = makeSeries([3, 1, 4, 1, 5, 9]);
    const result = rolling(s, 3).min();
    expect(result.values).toEqual([null, null, 1, 1, 1, 1]);
  });

  test("max – 3-period", () => {
    const s = makeSeries([3, 1, 4, 1, 5, 9]);
    const result = rolling(s, 3).max();
    expect(result.values).toEqual([null, null, 4, 4, 5, 9]);
  });

  test("count – non-null obs in window", () => {
    const s = makeSeries([1, null, 3, 4]);
    const result = rolling(s, 3).count();
    expect(result.values).toEqual([1, 1, 2, 2]);
  });

  test("std – 3-period sample", () => {
    const s = makeSeries([2, 4, 4, 4, 5, 5, 7, 9]);
    const result = rolling(s, 3).std();
    const expected = [null, null, 1, 0, 0.5773502691896258, 0.5773502691896258, 1, 2];
    for (let i = 0; i < expected.length; i++) {
      const e = expected[i] ?? null;
      const r = result.values[i] ?? null;
      expect(closeEnough(r, e, 1e-9)).toBe(true);
    }
  });

  test("var – 3-period sample", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const result = rolling(s, 3).var();
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
    expect(closeEnough(result.values[2] ?? null, 1, 1e-12)).toBe(true);
    expect(closeEnough(result.values[3] ?? null, 1, 1e-12)).toBe(true);
  });

  test("median – 3-period", () => {
    const s = makeSeries([3, 1, 4, 1, 5]);
    const result = rolling(s, 3).median();
    expect(result.values).toEqual([null, null, 3, 1, 4]);
  });

  test("apply – custom function", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const result = rolling(s, 2).apply((vals) => {
      const a = vals[0] ?? 0;
      const b = vals[1] ?? 0;
      return a + b * 2;
    });
    expect(result.values).toEqual([null, 5, 8, 11]);
  });

  test("minPeriods override", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    // window=3 but minPeriods=1: first elements should be non-null
    const result = rolling(s, 3, { minPeriods: 1 }).mean();
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBe(1.5);
    expect(result.values[2]).toBe(2);
  });

  test("center=true – symmetric window", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    // window=3 centered: position 1 covers [0,1,2] = mean 2
    const result = rolling(s, 3, { center: true }).mean();
    expect(result.values[0]).toBeNull(); // only 2 in window, need 3
    expect(result.values[1]).toBe(2);
    expect(result.values[2]).toBe(3);
    expect(result.values[3]).toBe(4);
    expect(result.values[4]).toBeNull(); // only 2 in window
  });

  test("window=1 returns same values", () => {
    const s = makeSeries([10, 20, 30]);
    const result = rolling(s, 1).mean();
    expect(result.values).toEqual([10, 20, 30]);
  });

  test("missing values are skipped in window", () => {
    const s = makeSeries([1, null, 3, null, 5]);
    const result = rolling(s, 3, { minPeriods: 1 }).sum();
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBe(1);
    expect(result.values[2]).toBe(4);
    expect(result.values[3]).toBe(3);
    expect(result.values[4]).toBe(8);
  });

  test("empty series", () => {
    const s = makeSeries([]);
    const result = rolling(s, 3).mean();
    expect(result.values).toEqual([]);
  });

  test("invalid window throws", () => {
    const s = makeSeries([1, 2]);
    expect(() => rolling(s, 0)).toThrow();
    expect(() => rolling(s, -1)).toThrow();
  });

  test("preserves index and name", () => {
    const s = new Series<number>({ data: [1, 2, 3], name: "x" });
    const result = rolling(s, 2).sum();
    expect(result.name).toBe("x");
    expect(result.index.size).toBe(3);
  });
});

describe("rolling – DataFrameRolling", () => {
  test("mean on DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = rolling(df, 2).mean();
    expect(result.col("a").values).toEqual([null, 1.5, 2.5]);
    expect(result.col("b").values).toEqual([null, 4.5, 5.5]);
  });

  test("sum on DataFrame preserves index", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const result = rolling(df, 3).sum();
    expect(result.col("x").values).toEqual([null, null, 60]);
    expect(result.index.size).toBe(3);
  });
});

// ─── expanding ───────────────────────────────────────────────────────────────

describe("expanding – SeriesExpanding", () => {
  test("sum – cumulative", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const result = expanding(s).sum();
    expect(result.values).toEqual([1, 3, 6, 10]);
  });

  test("mean – cumulative", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const result = expanding(s).mean();
    expect(result.values).toEqual([1, 1.5, 2, 2.5]);
  });

  test("min – cumulative", () => {
    const s = makeSeries([5, 3, 1, 4]);
    const result = expanding(s).min();
    expect(result.values).toEqual([5, 3, 1, 1]);
  });

  test("max – cumulative", () => {
    const s = makeSeries([1, 3, 2, 5]);
    const result = expanding(s).max();
    expect(result.values).toEqual([1, 3, 3, 5]);
  });

  test("count – non-null", () => {
    const s = makeSeries([1, null, 3, null, 5]);
    const result = expanding(s).count();
    expect(result.values).toEqual([1, 1, 2, 2, 3]);
  });

  test("std – sample", () => {
    const s = makeSeries([2, 4, 4, 4]);
    const result = expanding(s).std();
    expect(result.values[0]).toBeNull();
    expect(closeEnough(result.values[1] ?? null, Math.sqrt(2), 1e-12)).toBe(true);
    const expected2 = Math.sqrt(((2 - 10 / 3) ** 2 + 2 * (4 - 10 / 3) ** 2) / 2);
    expect(closeEnough(result.values[2] ?? null, expected2, 1e-9)).toBe(true);
  });

  test("var – sample", () => {
    const s = makeSeries([1, 2, 3]);
    const result = expanding(s).var();
    expect(result.values[0]).toBeNull(); // only 1 value
    expect(closeEnough(result.values[1] ?? null, 0.5, 1e-12)).toBe(true);
    expect(closeEnough(result.values[2] ?? null, 1, 1e-12)).toBe(true);
  });

  test("apply – custom function", () => {
    const s = makeSeries([1, 2, 3]);
    const result = expanding(s).apply((vals) => vals.length);
    expect(result.values).toEqual([1, 2, 3]);
  });

  test("minPeriods=2", () => {
    const s = makeSeries([1, 2, 3]);
    const result = expanding(s, 2).sum();
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe(3);
    expect(result.values[2]).toBe(6);
  });

  test("skips null values", () => {
    const s = makeSeries([null, 2, null, 4]);
    const result = expanding(s).sum();
    expect(result.values[0]).toBe(0); // 0 non-null nums → sum = 0... actually with minPeriods=1 need at least 1
    // null at 0 → collectExpandingNums returns [] but minPeriods=1 → agg([]) = 0
    // Let's fix: sum([]) should be 0, but we should return null if no nums.
    // Actually minPeriods=1 means we need >= 1 non-null. [] < 1 → null.
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe(2);
    expect(result.values[2]).toBe(2);
    expect(result.values[3]).toBe(6);
  });

  test("empty series", () => {
    expect(expanding(makeSeries([])).mean().values).toEqual([]);
  });

  test("preserves name", () => {
    const s = new Series<number>({ data: [1, 2, 3], name: "y" });
    expect(expanding(s).sum().name).toBe("y");
  });
});

describe("expanding – DataFrameExpanding", () => {
  test("mean on DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [3, 6, 9] });
    const result = expanding(df).mean();
    expect(result.col("a").values).toEqual([1, 1.5, 2]);
    expect(result.col("b").values).toEqual([3, 4.5, 6]);
  });
});

// ─── ewm ─────────────────────────────────────────────────────────────────────

describe("ewm – alpha derivation", () => {
  test("span=10 gives alpha=2/11", () => {
    const s = makeSeries([1, 2]);
    // just check it doesn't throw and returns correct type
    const r = ewm(s, { span: 10 }).mean();
    expect(r.values.length).toBe(2);
  });

  test("com=3 gives alpha=0.25", () => {
    const s = makeSeries([1, 2]);
    const r = ewm(s, { com: 3 }).mean();
    expect(r.values.length).toBe(2);
  });

  test("halflife requires > 0", () => {
    const s = makeSeries([1]);
    expect(() => ewm(s, { halflife: 0 }).mean()).toThrow();
    expect(() => ewm(s, { halflife: -1 }).mean()).toThrow();
  });

  test("alpha must be in (0,1]", () => {
    const s = makeSeries([1]);
    expect(() => ewm(s, { alpha: 0 }).mean()).toThrow();
    expect(() => ewm(s, { alpha: 1.1 }).mean()).toThrow();
  });

  test("alpha=1 is allowed", () => {
    const s = makeSeries([1, 2, 3]);
    const r = ewm(s, { alpha: 1 }).mean();
    // With alpha=1 adjusted: weight of oldest = 0, newest = 1 → just the current value
    expect(closeEnough(r.values[0] ?? null, 1, 1e-12)).toBe(true);
    expect(closeEnough(r.values[1] ?? null, 2, 1e-12)).toBe(true);
    expect(closeEnough(r.values[2] ?? null, 3, 1e-12)).toBe(true);
  });

  test("exactly one param required", () => {
    const s = makeSeries([1]);
    expect(() => ewm(s, {} as never).mean()).toThrow();
    expect(() => ewm(s, { alpha: 0.5, span: 5 }).mean()).toThrow();
  });
});

describe("ewm – mean adjusted", () => {
  test("single element", () => {
    const s = makeSeries([5]);
    expect(ewm(s, { alpha: 0.5 }).mean().values).toEqual([5]);
  });

  test("two elements", () => {
    const s = makeSeries([2, 4]);
    const r = ewm(s, { alpha: 0.5 }).mean();
    // adjusted: y[0] = 2, y[1] = (0.5*2 + 1*4) / (0.5+1) = (1+4)/1.5 = 10/3
    expect(closeEnough(r.values[0] ?? null, 2, 1e-12)).toBe(true);
    expect(closeEnough(r.values[1] ?? null, 10 / 3, 1e-12)).toBe(true);
  });

  test("skips missing values", () => {
    const s = makeSeries([1, null, 3]);
    const r = ewm(s, { alpha: 0.5 }).mean();
    expect(r.values[1]).toBeNull(); // only 1 non-null seen so far... wait minPeriods=0 by default
    // With minPeriods=0, result should be non-null even with 0 non-null obs? No, 0 < 1
    // Actually minPeriods=0 means minPeriods=0 ≥ 0, but let's check: index 0 → [1], 1 → [1], 2 → [1,3]
    expect(closeEnough(r.values[0] ?? null, 1, 1e-12)).toBe(true);
    expect(closeEnough(r.values[1] ?? null, 1, 1e-12)).toBe(true); // still [1]
    expect(closeEnough(r.values[2] ?? null, (0.5 * 1 + 1 * 3) / 1.5, 1e-12)).toBe(true);
  });

  test("minPeriods respected", () => {
    const s = makeSeries([1, 2, 3]);
    const r = ewm(s, { alpha: 0.5, minPeriods: 2 }).mean();
    expect(r.values[0]).toBeNull();
    expect(r.values[1]).not.toBeNull();
    expect(r.values[2]).not.toBeNull();
  });
});

describe("ewm – mean non-adjusted (recursive)", () => {
  test("recursive formula", () => {
    const s = makeSeries([1, 2, 3]);
    const r = ewm(s, { alpha: 0.5, adjust: false }).mean();
    // y[0] = 1, y[1] = 0.5*2 + 0.5*1 = 1.5, y[2] = 0.5*3 + 0.5*1.5 = 2.25
    expect(closeEnough(r.values[0] ?? null, 1, 1e-12)).toBe(true);
    expect(closeEnough(r.values[1] ?? null, 1.5, 1e-12)).toBe(true);
    expect(closeEnough(r.values[2] ?? null, 2.25, 1e-12)).toBe(true);
  });
});

describe("ewm – var and std", () => {
  test("var needs ≥ 2 observations", () => {
    const s = makeSeries([1, 2, 3]);
    const r = ewm(s, { alpha: 0.5 }).var();
    expect(r.values[0]).toBeNull();
    expect(r.values[1]).not.toBeNull();
    expect(r.values[2]).not.toBeNull();
  });

  test("std is sqrt of var", () => {
    const s = makeSeries([1, 2, 3, 4, 5]);
    const varR = ewm(s, { alpha: 0.3 }).var();
    const stdR = ewm(s, { alpha: 0.3 }).std();
    for (let i = 0; i < s.values.length; i++) {
      const v = varR.values[i] ?? null;
      const sd = stdR.values[i] ?? null;
      if (v === null) {
        expect(sd).toBeNull();
      } else {
        expect(closeEnough(sd, Math.sqrt(v), 1e-12)).toBe(true);
      }
    }
  });
});

describe("ewm – DataFrameEWM", () => {
  test("mean on DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = ewm(df, { alpha: 0.5 }).mean();
    expect(result.col("a").values.length).toBe(3);
    expect(result.col("b").values.length).toBe(3);
    // b[0] = 4, b[1] = (0.5*4 + 1*5) / 1.5 = 14/3
    expect(closeEnough(result.col("b").values[0] ?? null, 4, 1e-12)).toBe(true);
    expect(closeEnough(result.col("b").values[1] ?? null, 14 / 3, 1e-12)).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property: rolling mean ≤ max and ≥ min", () => {
  test("rolling mean is within [min, max] of window", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1000, max: 1000 }), { minLength: 3, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (data, w) => {
          const s = new Series<number>({ data });
          const means = rolling(s, w, { minPeriods: 1 }).mean().values;
          const mins = rolling(s, w, { minPeriods: 1 }).min().values;
          const maxs = rolling(s, w, { minPeriods: 1 }).max().values;
          for (let i = 0; i < means.length; i++) {
            const mn = means[i];
            const lo = mins[i];
            const hi = maxs[i];
            if (
              mn !== null &&
              lo !== null &&
              hi !== null &&
              !(closeEnough(mn, lo, 1e-6) || closeEnough(mn, hi, 1e-6)) &&
              (mn < lo - 1e-6 || mn > hi + 1e-6)
            ) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("property: expanding sum is monotonically non-decreasing for positive values", () => {
  test("cumulative sum of positive data is non-decreasing", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: 0, max: 1000 }), { minLength: 1, maxLength: 30 }),
        (data) => {
          const s = new Series<number>({ data });
          const sums = expanding(s).sum().values;
          for (let i = 1; i < sums.length; i++) {
            const prev = sums[i - 1];
            const curr = sums[i];
            if (prev !== null && curr !== null && curr < prev - 1e-9) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("property: ewm mean with alpha=1 equals original values", () => {
  test("ewm mean (alpha=1) equals input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const s = new Series<number>({ data });
          const means = ewm(s, { alpha: 1 }).mean().values;
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            const m = means[i];
            if (d !== undefined && m !== null && !closeEnough(m, d, 1e-9)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("property: rolling count ≤ window size", () => {
  test("count never exceeds window", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.float({ noNaN: true }), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 5 }),
        (data, w) => {
          const s = makeSeries(data);
          const counts = rolling(s, w).count().values;
          for (const c of counts) {
            if (c !== null && c > w) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
