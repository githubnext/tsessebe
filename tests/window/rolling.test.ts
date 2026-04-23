/**
 * Tests for src/window/rolling.ts — Rolling window aggregations.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, DataFrameRolling, Rolling, Series } from "../../src/index.ts";
import type { RollingSeriesLike, Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function numSeries(data: (number | null)[], name?: string): Series<Scalar> {
  return new Series({ data, name: name ?? null });
}

function asArray(r: RollingSeriesLike): Scalar[] {
  return [...r.toArray()];
}

function close(a: Scalar | undefined, b: Scalar | undefined, eps = 1e-10): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) {
      return true;
    }
    return Math.abs(a - b) < eps;
  }
  return a === b;
}

// ─── Rolling construction ─────────────────────────────────────────────────────

describe("Rolling construction", () => {
  it("returns a Rolling instance from Series.rolling()", () => {
    const s = numSeries([1, 2, 3]);
    expect(s.rolling(2)).toBeInstanceOf(Rolling);
  });

  it("throws on window < 1", () => {
    expect(() => numSeries([1]).rolling(0)).toThrow(RangeError);
    expect(() => numSeries([1]).rolling(-1)).toThrow(RangeError);
  });

  it("throws on non-integer window", () => {
    expect(() => numSeries([1]).rolling(1.5)).toThrow(RangeError);
  });
});

// ─── Rolling.mean() ───────────────────────────────────────────────────────────

describe("Rolling.mean()", () => {
  it("computes trailing 3-window mean", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    const result = asArray(s.rolling(3).mean());
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(2);
    expect(result[3]).toBe(3);
    expect(result[4]).toBe(4);
  });

  it("window=1 returns same values", () => {
    const s = numSeries([10, 20, 30]);
    const result = asArray(s.rolling(1).mean());
    expect(result).toEqual([10, 20, 30]);
  });

  it("window larger than series returns all null", () => {
    const s = numSeries([1, 2]);
    const result = asArray(s.rolling(5).mean());
    expect(result).toEqual([null, null]);
  });

  it("propagates null values in window", () => {
    const s = numSeries([1, null, 3, 4]);
    // window=2, minPeriods=2: positions without 2 valid obs → null
    const result = asArray(s.rolling(2).mean());
    expect(result[0]).toBeNull(); // window=[1], size<2
    expect(result[1]).toBeNull(); // window=[1,null], only 1 valid
    expect(result[2]).toBeNull(); // window=[null,3], only 1 valid
    expect(result[3]).toBe(3.5); // window=[3,4]
  });

  it("minPeriods=1 allows partial windows", () => {
    const s = numSeries([1, 2, 3]);
    const result = asArray(s.rolling(3, { minPeriods: 1 }).mean());
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1.5);
    expect(result[2]).toBe(2);
  });

  it("centered window", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    // window=3, center: index 2 gets [2,3,4] → mean=3
    const result = asArray(s.rolling(3, { center: true }).mean());
    expect(result[2]).toBe(3);
    expect(result[0]).toBeNull(); // only 2 obs in window < 3
  });

  it("preserves index labels", () => {
    const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
    const result = s.rolling(2, { minPeriods: 1 }).mean();
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  it("preserves series name", () => {
    const s = new Series({ data: [1, 2, 3], name: "price" });
    expect(s.rolling(2).mean().name).toBe("price");
  });
});

// ─── Rolling.sum() ───────────────────────────────────────────────────────────

describe("Rolling.sum()", () => {
  it("computes trailing 2-window sum", () => {
    const s = numSeries([1, 2, 3, 4, 5]);
    const result = asArray(s.rolling(2).sum());
    expect(result[0]).toBeNull();
    expect(result[1]).toBe(3);
    expect(result[2]).toBe(5);
    expect(result[3]).toBe(7);
    expect(result[4]).toBe(9);
  });

  it("handles null values with minPeriods=1", () => {
    const s = numSeries([1, null, 3]);
    const result = asArray(s.rolling(2, { minPeriods: 1 }).sum());
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1); // only valid: 1
    expect(result[2]).toBe(3); // only valid: 3
  });
});

// ─── Rolling.std() ───────────────────────────────────────────────────────────

describe("Rolling.std()", () => {
  it("sample std (ddof=1) for window=3", () => {
    const s = numSeries([2, 4, 4, 4, 5, 5, 7, 9]);
    const result = asArray(s.rolling(3).std());
    // index 2: [2,4,4] → sample std
    const v = result[2];
    const expected = Math.sqrt(((2 - 10 / 3) ** 2 + (4 - 10 / 3) ** 2 + (4 - 10 / 3) ** 2) / 2);
    expect(close(v, expected)).toBe(true);
  });

  it("returns null for window of size 1 (ddof=1 needs ≥2)", () => {
    const s = numSeries([1, 2, 3]);
    const result = asArray(s.rolling(1).std());
    expect(result).toEqual([null, null, null]);
  });

  it("ddof=0 population std", () => {
    const s = numSeries([1, 3]);
    const result = asArray(s.rolling(2, { minPeriods: 2 }).std(0));
    expect(close(result[1], 1)).toBe(true); // pop std of [1,3] = 1
  });
});

// ─── Rolling.var() ───────────────────────────────────────────────────────────

describe("Rolling.var()", () => {
  it("sample variance window=2", () => {
    const s = numSeries([1, 3, 5]);
    const result = asArray(s.rolling(2).var());
    expect(result[0]).toBeNull();
    expect(close(result[1], 2)).toBe(true); // var([1,3],ddof=1)=2
    expect(close(result[2], 2)).toBe(true); // var([3,5],ddof=1)=2
  });
});

// ─── Rolling.min() / max() ───────────────────────────────────────────────────

describe("Rolling.min() and max()", () => {
  it("rolling min window=3", () => {
    const s = numSeries([5, 3, 1, 2, 4]);
    const result = asArray(s.rolling(3).min());
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(1);
    expect(result[3]).toBe(1);
    expect(result[4]).toBe(1);
  });

  it("rolling max window=2", () => {
    const s = numSeries([1, 3, 2, 5]);
    const result = asArray(s.rolling(2).max());
    expect(result[0]).toBeNull();
    expect(result[1]).toBe(3);
    expect(result[2]).toBe(3);
    expect(result[3]).toBe(5);
  });
});

// ─── Rolling.count() ─────────────────────────────────────────────────────────

describe("Rolling.count()", () => {
  it("counts valid observations in window", () => {
    const s = numSeries([1, null, 3, 4]);
    const result = asArray(s.rolling(2).count());
    expect(result[0]).toBe(1); // [1]
    expect(result[1]).toBe(1); // [1, null]
    expect(result[2]).toBe(1); // [null, 3]
    expect(result[3]).toBe(2); // [3, 4]
  });

  it("ignores minPeriods", () => {
    const s = numSeries([1, 2]);
    const result = asArray(s.rolling(3, { minPeriods: 3 }).count());
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
  });
});

// ─── Rolling.median() ────────────────────────────────────────────────────────

describe("Rolling.median()", () => {
  it("window=3 odd count", () => {
    const s = numSeries([1, 3, 5, 7, 9]);
    const result = asArray(s.rolling(3).median());
    expect(result[2]).toBe(3);
    expect(result[3]).toBe(5);
    expect(result[4]).toBe(7);
  });

  it("window=2 even count", () => {
    const s = numSeries([1, 3, 7, 9]);
    const result = asArray(s.rolling(2).median());
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(5);
    expect(result[3]).toBe(8);
  });
});

// ─── Rolling.apply() ─────────────────────────────────────────────────────────

describe("Rolling.apply()", () => {
  it("custom product function", () => {
    const s = numSeries([1, 2, 3, 4]);
    const result = asArray(s.rolling(2).apply((vals) => vals.reduce((a, b) => a * b, 1)));
    expect(result[0]).toBeNull();
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(6);
    expect(result[3]).toBe(12);
  });

  it("range function (max - min)", () => {
    const s = numSeries([1, 3, 6, 10]);
    const result = asArray(s.rolling(2).apply((vals) => Math.max(...vals) - Math.min(...vals)));
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
    expect(result[3]).toBe(4);
  });
});

// ─── DataFrameRolling ────────────────────────────────────────────────────────

describe("DataFrameRolling", () => {
  it("returns DataFrameRolling from DataFrame.rolling()", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(df.rolling(2)).toBeInstanceOf(DataFrameRolling);
  });

  it("mean() applies to each column independently", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const result = df.rolling(2).mean();
    const a = result.col("a").toArray();
    const b = result.col("b").toArray();
    expect(a[0]).toBeNull();
    expect(a[1]).toBe(1.5);
    expect(a[2]).toBe(2.5);
    expect(b[0]).toBeNull();
    expect(b[1]).toBe(15);
    expect(b[2]).toBe(25);
  });

  it("sum() correct", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const result = df.rolling(2).sum().col("x").toArray();
    expect(result[0]).toBeNull();
    expect(result[1]).toBe(3);
    expect(result[2]).toBe(5);
  });

  it("std() correct", () => {
    const df = DataFrame.fromColumns({ x: [2, 4, 6] });
    const result = df.rolling(2).std().col("x").toArray();
    expect(result[0]).toBeNull();
    expect(close(result[1], Math.sqrt(2))).toBe(true);
    expect(close(result[2], Math.sqrt(2))).toBe(true);
  });

  it("min() and max() correct", () => {
    const df = DataFrame.fromColumns({ y: [5, 1, 3, 2] });
    const minResult = df.rolling(2).min().col("y").toArray();
    const maxResult = df.rolling(2).max().col("y").toArray();
    expect(minResult[1]).toBe(1);
    expect(minResult[2]).toBe(1);
    expect(maxResult[1]).toBe(5);
    expect(maxResult[2]).toBe(3);
  });

  it("count() correct", () => {
    const df = DataFrame.fromColumns({ z: [1, null, 3] });
    const result = df.rolling(2).count().col("z").toArray();
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1);
    expect(result[2]).toBe(1);
  });

  it("median() correct", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3, 4] });
    const result = df.rolling(3).median().col("v").toArray();
    expect(result[2]).toBe(2);
    expect(result[3]).toBe(3);
  });

  it("apply() correct", () => {
    const df = DataFrame.fromColumns({ w: [1, 2, 3] });
    const result = df
      .rolling(2)
      .apply((v) => {
        const first = v[0] ?? 0;
        const last = v.at(-1) ?? 0;
        return first + last;
      })
      .col("w")
      .toArray();
    expect(result[1]).toBe(3); // 1+2
    expect(result[2]).toBe(5); // 2+3
  });

  it("throws for invalid window", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(() => df.rolling(0)).toThrow(RangeError);
  });

  it("preserves column names and row index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = df.rolling(2).mean();
    expect([...result.columns.values]).toEqual(["a", "b"]);
    expect(result.shape).toEqual([3, 2]);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("Rolling property-based tests", () => {
  it("mean with window=1 equals original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const s = numSeries(arr);
          const result = asArray(s.rolling(1, { minPeriods: 1 }).mean());
          for (let i = 0; i < arr.length; i++) {
            expect(close(result[i], arr[i])).toBe(true);
          }
        },
      ),
    );
  });

  it("sum window=2 equals pairwise sums", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2, maxLength: 20 }),
        (arr) => {
          const s = numSeries(arr);
          const result = asArray(s.rolling(2).sum());
          expect(result[0]).toBeNull();
          for (let i = 1; i < arr.length; i++) {
            const expected = (arr[i - 1] ?? 0) + (arr[i] ?? 0);
            expect(result[i]).toBe(expected);
          }
        },
      ),
    );
  });

  it("count is always between 0 and window", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -10, max: 10 }), fc.constant(null)), {
          minLength: 1,
          maxLength: 15,
        }),
        fc.integer({ min: 1, max: 5 }),
        (arr, window) => {
          const s = numSeries(arr as (number | null)[]);
          const counts = asArray(s.rolling(window).count());
          for (const c of counts) {
            expect(typeof c).toBe("number");
            if (typeof c === "number") {
              expect(c).toBeGreaterThanOrEqual(0);
              expect(c).toBeLessThanOrEqual(window);
            }
          }
        },
      ),
    );
  });

  it("rolling max >= rolling min when both defined", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (arr, window) => {
          const s = numSeries(arr);
          const mins = asArray(s.rolling(window).min());
          const maxs = asArray(s.rolling(window).max());
          for (let i = 0; i < arr.length; i++) {
            const mn = mins[i];
            const mx = maxs[i];
            if (mn !== null && mx !== null && typeof mn === "number" && typeof mx === "number") {
              expect(mx).toBeGreaterThanOrEqual(mn);
            }
          }
        },
      ),
    );
  });

  it("std is always non-negative when defined", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 20,
        }),
        (arr) => {
          const s = numSeries(arr);
          const stds = asArray(s.rolling(2).std());
          for (const v of stds) {
            if (v !== null && v !== undefined && typeof v === "number") {
              expect(v).toBeGreaterThanOrEqual(0);
            }
          }
        },
      ),
    );
  });
});
