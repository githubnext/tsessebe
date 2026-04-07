/**
 * Tests for moments — mode, skew, kurtosis, and sem for Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  type Index,
  RangeIndex,
  Series,
  kurtosisDataFrame,
  kurtosisSeries,
  modeDataFrame,
  modeSeries,
  semDataFrame,
  semSeries,
  skewDataFrame,
  skewSeries,
} from "../../src/index.ts";
import type { Label, Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const nan = Number.NaN;

function close(a: number, b: number, tol = 1e-9): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  if (!(Number.isFinite(a) || Number.isFinite(b))) {
    return a === b;
  }
  return Math.abs(a - b) <= tol;
}

function num(v: Scalar | undefined): number {
  if (v === null || v === undefined) {
    return Number.NaN;
  }
  if (typeof v === "number") {
    return v;
  }
  return Number.NaN;
}

function makeDF(cols: Record<string, Scalar[]>): DataFrame {
  const entries = Object.entries(cols);
  const nrows = entries.length > 0 ? (entries[0]?.[1]?.length ?? 0) : 0;
  const rowIdx = new RangeIndex(nrows) as unknown as Index<Label>;
  const map = new Map<string, Series<Scalar>>();
  for (const [k, v] of entries) {
    map.set(k, new Series<Scalar>({ data: v, index: rowIdx, name: k }));
  }
  return new DataFrame(map, rowIdx);
}

// ─── modeSeries ───────────────────────────────────────────────────────────────

describe("modeSeries", () => {
  it("single mode", () => {
    const s = new Series({ data: [1, 2, 2, 3] });
    const r = modeSeries(s);
    expect(r.values).toEqual([2]);
  });

  it("multiple tied modes are returned sorted", () => {
    const s = new Series({ data: [1, 2, 2, 3, 3] });
    const r = modeSeries(s);
    expect(r.values).toEqual([2, 3]);
  });

  it("all values unique → all returned sorted", () => {
    const s = new Series({ data: [3, 1, 2] });
    const r = modeSeries(s);
    expect(r.values).toEqual([1, 2, 3]);
  });

  it("string values", () => {
    const s = new Series({ data: ["a", "b", "b", "c"] });
    const r = modeSeries(s);
    expect(r.values).toEqual(["b"]);
  });

  it("dropna=true excludes nulls by default", () => {
    const s = new Series({ data: [null, 1, 1, null, null] });
    const r = modeSeries(s);
    expect(r.values).toEqual([1]);
  });

  it("dropna=false treats null as a value", () => {
    const s = new Series({ data: [null, null, 1] });
    const r = modeSeries(s, false);
    expect(r.values.includes(null)).toBe(true);
    expect(r.size).toBe(1); // null appears 2 times, 1 appears once → null is mode
  });

  it("empty series returns empty", () => {
    const s = new Series({ data: [] });
    const r = modeSeries(s);
    expect(r.size).toBe(0);
  });

  it("all missing with dropna=true returns empty", () => {
    const s = new Series({ data: [null, undefined, nan] });
    const r = modeSeries(s);
    expect(r.size).toBe(0);
  });
});

// ─── modeDataFrame ────────────────────────────────────────────────────────────

describe("modeDataFrame", () => {
  it("column-wise single mode per column", () => {
    const df = makeDF({ a: [1, 2, 2, 3], b: [5, 5, 6, 6] });
    const r = modeDataFrame(df);
    // column a: mode=2, column b: modes=[5,6] → 2 rows
    expect(r.shape[1]).toBe(2);
    expect(num(r.col("a").values[0])).toBe(2);
    expect(r.shape[0]).toBe(2); // b has 2 modes
    expect(Number.isNaN(num(r.col("a").values[1]))).toBe(true); // a padded with NaN
  });

  it("column-wise all same value", () => {
    const df = makeDF({ a: [7, 7, 7] });
    const r = modeDataFrame(df);
    expect(r.shape[0]).toBe(1);
    expect(num(r.col("a").values[0])).toBe(7);
  });

  it("row-wise mode", () => {
    const df = makeDF({ a: [1, 2], b: [1, 3], c: [1, 2] });
    const r = modeDataFrame(df, { axis: 1 });
    // row 0: [1,1,1] → 1; row 1: [2,3,2] → 2
    expect(num(r.col("0").values[0])).toBe(1);
    expect(num(r.col("0").values[1])).toBe(2);
  });
});

// ─── skewSeries ───────────────────────────────────────────────────────────────

describe("skewSeries", () => {
  it("symmetric data has skew ≈ 0", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(close(skewSeries(s), 0, 1e-10)).toBe(true);
  });

  it("right-skewed data has positive skew", () => {
    const s = new Series({ data: [1, 2, 3, 4, 10] });
    expect(skewSeries(s)).toBeGreaterThan(0);
  });

  it("left-skewed data has negative skew", () => {
    const s = new Series({ data: [-10, 1, 2, 3, 4] });
    expect(skewSeries(s)).toBeLessThan(0);
  });

  it("returns NaN for n < 3", () => {
    expect(Number.isNaN(skewSeries(new Series({ data: [] })))).toBe(true);
    expect(Number.isNaN(skewSeries(new Series({ data: [1] })))).toBe(true);
    expect(Number.isNaN(skewSeries(new Series({ data: [1, 2] })))).toBe(true);
  });

  it("returns NaN for constant series", () => {
    const s = new Series({ data: [5, 5, 5, 5] });
    expect(Number.isNaN(skewSeries(s))).toBe(true);
  });

  it("skips missing values by default", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, null] });
    const sClean = new Series({ data: [1, 2, 3, 4, 5] });
    expect(close(skewSeries(s), skewSeries(sClean))).toBe(true);
  });

  it("skipna=false returns NaN when missing present", () => {
    const s = new Series({ data: [1, 2, 3, null] });
    expect(Number.isNaN(skewSeries(s, { skipna: false }))).toBe(true);
  });

  it("property: skew of reversed data negates", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        (arr) => {
          const s1 = new Series({ data: arr });
          const s2 = new Series({ data: arr.map((v) => -v) });
          const sk1 = skewSeries(s1);
          const sk2 = skewSeries(s2);
          if (!(Number.isNaN(sk1) || Number.isNaN(sk2))) {
            return close(sk1, -sk2, 1e-8);
          }
          return true;
        },
      ),
    );
  });
});

// ─── kurtosisSeries ───────────────────────────────────────────────────────────

describe("kurtosisSeries", () => {
  it("uniform [1..5] has known kurtosis ≈ -1.3", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(close(kurtosisSeries(s), -1.3, 1e-10)).toBe(true);
  });

  it("returns NaN for n < 4", () => {
    expect(Number.isNaN(kurtosisSeries(new Series({ data: [] })))).toBe(true);
    expect(Number.isNaN(kurtosisSeries(new Series({ data: [1, 2, 3] })))).toBe(true);
  });

  it("returns NaN for constant series", () => {
    const s = new Series({ data: [3, 3, 3, 3, 3] });
    expect(Number.isNaN(kurtosisSeries(s))).toBe(true);
  });

  it("skips missing by default", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, null] });
    const sClean = new Series({ data: [1, 2, 3, 4, 5] });
    expect(close(kurtosisSeries(s), kurtosisSeries(sClean))).toBe(true);
  });

  it("skipna=false returns NaN when missing present", () => {
    const s = new Series({ data: [1, 2, 3, 4, null] });
    expect(Number.isNaN(kurtosisSeries(s, { skipna: false }))).toBe(true);
  });

  it("property: kurtosis of shifted data equals original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 4,
          maxLength: 20,
        }),
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (arr, shift) => {
          const s1 = new Series({ data: arr });
          const s2 = new Series({ data: arr.map((v) => v + shift) });
          const k1 = kurtosisSeries(s1);
          const k2 = kurtosisSeries(s2);
          if (!(Number.isNaN(k1) || Number.isNaN(k2))) {
            return close(k1, k2, 1e-6);
          }
          return true;
        },
      ),
    );
  });
});

// ─── semSeries ────────────────────────────────────────────────────────────────

describe("semSeries", () => {
  it("basic sem computation", () => {
    // [1,2,3,4,5]: std(ddof=1)=sqrt(2.5), sem=sqrt(2.5)/sqrt(5)
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const expected = Math.sqrt(2.5) / Math.sqrt(5);
    expect(close(semSeries(s), expected)).toBe(true);
  });

  it("returns NaN for n <= ddof", () => {
    expect(Number.isNaN(semSeries(new Series({ data: [] })))).toBe(true);
    expect(Number.isNaN(semSeries(new Series({ data: [1] })))).toBe(true);
  });

  it("ddof=0 uses population std", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const std0 = Math.sqrt(2); // pop std of [1..5]
    const expected = std0 / Math.sqrt(5);
    expect(close(semSeries(s, { ddof: 0 }), expected)).toBe(true);
  });

  it("skips missing by default", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, null] });
    const sClean = new Series({ data: [1, 2, 3, 4, 5] });
    expect(close(semSeries(s), semSeries(sClean))).toBe(true);
  });

  it("skipna=false returns NaN when missing present", () => {
    const s = new Series({ data: [1, 2, 3, null] });
    expect(Number.isNaN(semSeries(s, { skipna: false }))).toBe(true);
  });

  it("sem equals std / sqrt(n) property", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }), {
          minLength: 2,
          maxLength: 30,
        }),
        (arr) => {
          const s = new Series({ data: arr });
          const computed = semSeries(s);
          const n = arr.length;
          const m = arr.reduce((a, b) => a + b, 0) / n;
          const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
          const expected = Math.sqrt(variance) / Math.sqrt(n);
          if (!(Number.isNaN(computed) || Number.isNaN(expected))) {
            return close(computed, expected, 1e-6);
          }
          return true;
        },
      ),
    );
  });
});

// ─── DataFrame aggregation functions ─────────────────────────────────────────

describe("skewDataFrame", () => {
  it("column-wise skew", () => {
    const df = makeDF({
      a: [1, 2, 3, 4, 5],
      b: [1, 2, 3, 4, 10],
    });
    const r = skewDataFrame(df);
    expect(close(num(r.values[0]), 0, 1e-9)).toBe(true);
    expect(num(r.values[1])).toBeGreaterThan(0);
  });

  it("row-wise skew returns one value per row", () => {
    const df = makeDF({
      a: [1, 10],
      b: [2, 11],
      c: [3, 12],
      d: [4, 13],
      e: [5, 14],
    });
    const r = skewDataFrame(df, { axis: 1 });
    expect(r.size).toBe(2);
    expect(close(num(r.values[0]), 0, 1e-9)).toBe(true);
    expect(close(num(r.values[1]), 0, 1e-9)).toBe(true);
  });
});

describe("kurtosisDataFrame", () => {
  it("column-wise kurtosis", () => {
    const df = makeDF({ a: [1, 2, 3, 4, 5] });
    const r = kurtosisDataFrame(df);
    expect(close(num(r.values[0]), -1.3, 1e-10)).toBe(true);
  });

  it("row-wise kurtosis", () => {
    const df = makeDF({
      a: [1, 2],
      b: [2, 3],
      c: [3, 4],
      d: [4, 5],
      e: [5, 6],
    });
    const r = kurtosisDataFrame(df, { axis: 1 });
    expect(r.size).toBe(2);
    expect(close(num(r.values[0]), -1.3, 1e-10)).toBe(true);
    expect(close(num(r.values[1]), -1.3, 1e-10)).toBe(true);
  });
});

describe("semDataFrame", () => {
  it("column-wise sem", () => {
    const df = makeDF({ a: [1, 2, 3, 4, 5], b: [2, 4, 6, 8, 10] });
    const r = semDataFrame(df);
    const expected_a = Math.sqrt(2.5) / Math.sqrt(5);
    const expected_b = Math.sqrt(10) / Math.sqrt(5);
    expect(close(num(r.values[0]), expected_a)).toBe(true);
    expect(close(num(r.values[1]), expected_b)).toBe(true);
  });

  it("row-wise sem", () => {
    const df = makeDF({
      a: [1, 2],
      b: [2, 4],
      c: [3, 6],
      d: [4, 8],
      e: [5, 10],
    });
    const r = semDataFrame(df, { axis: 1 });
    expect(r.size).toBe(2);
    const exp0 = Math.sqrt(2.5) / Math.sqrt(5);
    const exp1 = Math.sqrt(10) / Math.sqrt(5);
    expect(close(num(r.values[0]), exp0)).toBe(true);
    expect(close(num(r.values[1]), exp1)).toBe(true);
  });
});
