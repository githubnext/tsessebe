/**
 * Tests for stats/quantile — quantileSeries and quantileDataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import type { Scalar } from "../../src/index.ts";
import { DataFrame, Series } from "../../src/index.ts";
import { quantileDataFrame, quantileSeries } from "../../src/index.ts";

// ─── quantileSeries ───────────────────────────────────────────────────────────

describe("quantileSeries — basic", () => {
  it("median of odd-length series", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(quantileSeries(s)).toBe(3);
  });

  it("median of even-length series — linear interpolation", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    expect(quantileSeries(s, { q: 0.5 })).toBe(2.5);
  });

  it("q=0 returns minimum", () => {
    const s = new Series({ data: [3, 1, 4, 1, 5, 9] });
    expect(quantileSeries(s, { q: 0 })).toBe(1);
  });

  it("q=1 returns maximum", () => {
    const s = new Series({ data: [3, 1, 4, 1, 5, 9] });
    expect(quantileSeries(s, { q: 1 })).toBe(9);
  });

  it("q=0.25 first quartile", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    // pos = 0.25 * 4 = 1.0 → exact index 1 → value 2
    expect(quantileSeries(s, { q: 0.25 })).toBe(2);
  });

  it("q=0.75 third quartile", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    // pos = 0.75 * 4 = 3.0 → exact index 3 → value 4
    expect(quantileSeries(s, { q: 0.75 })).toBe(4);
  });

  it("linear interpolation between two values", () => {
    const s = new Series({ data: [0, 10] });
    // pos = 0.5 * 1 = 0.5; lo=0, hi=1; 0*(0.5) + 10*(0.5) = 5
    expect(quantileSeries(s, { q: 0.5 })).toBe(5);
  });

  it("unsorted input — sorts internally", () => {
    const s = new Series({ data: [5, 1, 3, 2, 4] });
    expect(quantileSeries(s, { q: 0.5 })).toBe(3);
  });

  it("single element series", () => {
    const s = new Series({ data: [42] });
    expect(quantileSeries(s, { q: 0.25 })).toBe(42);
    expect(quantileSeries(s, { q: 0.5 })).toBe(42);
    expect(quantileSeries(s, { q: 0.75 })).toBe(42);
  });

  it("empty series returns NaN", () => {
    const s = new Series({ data: [] });
    expect(quantileSeries(s, { q: 0.5 })).toBeNaN();
  });

  it("series with all NaN/null — skipna=true returns NaN", () => {
    const s = new Series({ data: [null, null, Number.NaN] });
    expect(quantileSeries(s, { q: 0.5 })).toBeNaN();
  });

  it("series with NaN — skipna=true (default) ignores NaN", () => {
    const s = new Series({ data: [1, Number.NaN, 3, null, 5] });
    // valid: [1, 3, 5]; sorted: [1, 3, 5]; median = 3
    expect(quantileSeries(s, { q: 0.5 })).toBe(3);
  });

  it("skipna=false propagates NaN", () => {
    const s = new Series({ data: [1, Number.NaN, 3] });
    expect(quantileSeries(s, { q: 0.5, skipna: false })).toBeNaN();
  });
});

describe("quantileSeries — multi-q", () => {
  it("returns Series when q is array", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = quantileSeries(s, { q: [0.25, 0.5, 0.75] });
    expect(result).toBeInstanceOf(Series);
  });

  it("multi-q values correct", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = quantileSeries(s, { q: [0, 0.5, 1] }) as Series<Scalar>;
    const vals = result.values as number[];
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBe(3);
    expect(vals[2]).toBe(5);
  });

  it("multi-q index matches q values", () => {
    const s = new Series({ data: [10, 20, 30] });
    const result = quantileSeries(s, { q: [0.25, 0.75] }) as Series<Scalar>;
    const idx = result.index.values as number[];
    expect(idx[0]).toBe(0.25);
    expect(idx[1]).toBe(0.75);
  });
});

describe("quantileSeries — interpolation methods", () => {
  // data: [0, 10]; q=0.5 → pos=0.5, lo=0, hi=1
  const s = new Series({ data: [0, 10] });

  it("linear", () => {
    expect(quantileSeries(s, { q: 0.5, interpolation: "linear" })).toBe(5);
  });

  it("lower", () => {
    expect(quantileSeries(s, { q: 0.5, interpolation: "lower" })).toBe(0);
  });

  it("higher", () => {
    expect(quantileSeries(s, { q: 0.5, interpolation: "higher" })).toBe(10);
  });

  it("midpoint", () => {
    expect(quantileSeries(s, { q: 0.5, interpolation: "midpoint" })).toBe(5);
  });

  it("nearest — frac < 0.5 returns lower", () => {
    // data: [0, 10, 20]; q=0.4 → pos=0.8, lo=0, hi=1, frac=0.8 > 0.5 → hi=10
    const s3 = new Series({ data: [0, 10, 20] });
    const r = quantileSeries(s3, { q: 0.4, interpolation: "nearest" });
    expect(r).toBe(10); // frac=0.8, use hi
  });

  it("nearest — frac=0.5 returns lower", () => {
    // data: [0, 10]; q=0.5 → frac=0.5, returns lo=0
    expect(quantileSeries(s, { q: 0.5, interpolation: "nearest" })).toBe(0);
  });

  it("exact index hit — all methods agree", () => {
    const sx = new Series({ data: [1, 2, 3] });
    // q=0.5 → pos=1.0, exact → value 2
    for (const interp of ["linear", "lower", "higher", "midpoint", "nearest"] as const) {
      expect(quantileSeries(sx, { q: 0.5, interpolation: interp })).toBe(2);
    }
  });
});

// ─── quantileDataFrame ────────────────────────────────────────────────────────

describe("quantileDataFrame — axis=0 single q", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });

  it("returns Series", () => {
    const r = quantileDataFrame(df);
    expect(r).toBeInstanceOf(Series);
  });

  it("median of each column", () => {
    const r = quantileDataFrame(df, { q: 0.5 }) as Series<Scalar>;
    const vals = r.values as number[];
    expect(vals[0]).toBe(2);
    expect(vals[1]).toBe(20);
  });

  it("q=0 → min of each column", () => {
    const r = quantileDataFrame(df, { q: 0 }) as Series<Scalar>;
    const vals = r.values as number[];
    expect(vals[0]).toBe(1);
    expect(vals[1]).toBe(10);
  });

  it("q=1 → max of each column", () => {
    const r = quantileDataFrame(df, { q: 1 }) as Series<Scalar>;
    const vals = r.values as number[];
    expect(vals[0]).toBe(3);
    expect(vals[1]).toBe(30);
  });

  it("index of result matches column names", () => {
    const r = quantileDataFrame(df, { q: 0.5 }) as Series<Scalar>;
    const idx = r.index.values as string[];
    expect(idx).toEqual(["a", "b"]);
  });

  it("numericOnly=true (default) skips string columns", () => {
    const df2 = DataFrame.fromColumns({ a: [1, 2, 3], label: ["x", "y", "z"] });
    const r = quantileDataFrame(df2, { q: 0.5 }) as Series<Scalar>;
    expect((r.index.values as string[]).includes("label")).toBe(false);
    expect((r.index.values as string[]).includes("a")).toBe(true);
  });

  it("numericOnly=false includes non-numeric as NaN", () => {
    const df2 = DataFrame.fromColumns({ a: [1, 2, 3], label: ["x", "y", "z"] });
    const r = quantileDataFrame(df2, { q: 0.5, numericOnly: false }) as Series<Scalar>;
    expect((r.index.values as string[]).includes("label")).toBe(true);
    const vals = r.values as number[];
    const labelIdx = (r.index.values as string[]).indexOf("label");
    expect(Number.isNaN(vals[labelIdx])).toBe(true);
  });
});

describe("quantileDataFrame — axis=0 multi q", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });

  it("returns DataFrame", () => {
    const r = quantileDataFrame(df, { q: [0.25, 0.5, 0.75] });
    expect(r).toBeInstanceOf(DataFrame);
  });

  it("result shape: rows=q.length, cols=df.columns", () => {
    const r = quantileDataFrame(df, { q: [0.25, 0.5, 0.75] }) as DataFrame;
    expect(r.shape).toEqual([3, 2]);
  });

  it("column names preserved", () => {
    const r = quantileDataFrame(df, { q: [0, 1] }) as DataFrame;
    const cols = r.columns.values as string[];
    expect(cols).toEqual(["a", "b"]);
  });

  it("q=0 row is min, q=1 row is max", () => {
    const r = quantileDataFrame(df, { q: [0, 1] }) as DataFrame;
    const aVals = r.col("a").values as number[];
    expect(aVals[0]).toBe(1);
    expect(aVals[1]).toBe(4);
  });

  it("row index matches q values", () => {
    const r = quantileDataFrame(df, { q: [0.25, 0.75] }) as DataFrame;
    const rowIdx = r.index.values as number[];
    expect(rowIdx[0]).toBe(0.25);
    expect(rowIdx[1]).toBe(0.75);
  });
});

describe("quantileDataFrame — axis=1", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [3, 4, 5], c: [5, 6, 7] });

  it("axis=1 single q returns Series", () => {
    const r = quantileDataFrame(df, { axis: 1, q: 0.5 });
    expect(r).toBeInstanceOf(Series);
  });

  it("axis=1 single q computes median across columns per row", () => {
    // row 0: [1,3,5] → sorted → median=3
    // row 1: [2,4,6] → median=4
    // row 2: [3,5,7] → median=5
    const r = quantileDataFrame(df, { axis: 1, q: 0.5 }) as Series<Scalar>;
    const vals = r.values as number[];
    expect(vals[0]).toBe(3);
    expect(vals[1]).toBe(4);
    expect(vals[2]).toBe(5);
  });

  it("axis=1 multi-q returns DataFrame", () => {
    const r = quantileDataFrame(df, { axis: 1, q: [0, 1] });
    expect(r).toBeInstanceOf(DataFrame);
  });

  it("axis=1 multi-q shape: rows=df.rows, cols=q.length", () => {
    const r = quantileDataFrame(df, { axis: 1, q: [0, 0.5, 1] }) as DataFrame;
    expect(r.shape).toEqual([3, 3]);
  });

  it("axis=1 multi-q column names are q string values", () => {
    const r = quantileDataFrame(df, { axis: 1, q: [0, 1] }) as DataFrame;
    const cols = r.columns.values as string[];
    expect(cols).toEqual(["0", "1"]);
  });
});

describe("quantileDataFrame — NaN handling", () => {
  it("skipna=true (default) ignores null/NaN", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3], b: [Number.NaN, 2, 4] });
    const r = quantileDataFrame(df, { q: 0.5 }) as Series<Scalar>;
    const vals = r.values as number[];
    // a: [1, 3] sorted, median=2; b: [2, 4] sorted, median=3
    expect(vals[0]).toBe(2);
    expect(vals[1]).toBe(3);
  });

  it("skipna=false propagates NaN in columns with missing values", () => {
    const df = DataFrame.fromColumns({ a: [1, Number.NaN, 3], b: [2, 4, 6] });
    const r = quantileDataFrame(df, { q: 0.5, skipna: false }) as Series<Scalar>;
    const vals = r.values as number[];
    expect(Number.isNaN(vals[0])).toBe(true);
    expect(vals[1]).toBe(4);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("quantileSeries — property tests", () => {
  it("q=0 always returns minimum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1, maxLength: 50 }),
        (data) => {
          const s = new Series({ data });
          const q0 = quantileSeries(s, { q: 0 });
          const expected = Math.min(...data);
          return typeof q0 === "number" && Math.abs(q0 - expected) < 1e-9;
        },
      ),
    );
  });

  it("q=1 always returns maximum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1, maxLength: 50 }),
        (data) => {
          const s = new Series({ data });
          const q1 = quantileSeries(s, { q: 1 });
          const expected = Math.max(...data);
          return typeof q1 === "number" && Math.abs(q1 - expected) < 1e-9;
        },
      ),
    );
  });

  it("q monotonicity: q1 <= q2 implies result(q1) <= result(q2)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 2, maxLength: 50 }),
        fc.tuple(
          fc.float({ noNaN: true, min: 0, max: 1 }),
          fc.float({ noNaN: true, min: 0, max: 1 }),
        ),
        (data, [qa, qb]) => {
          const q1 = Math.min(qa, qb);
          const q2 = Math.max(qa, qb);
          const s = new Series({ data });
          const r1 = quantileSeries(s, { q: q1 });
          const r2 = quantileSeries(s, { q: q2 });
          return typeof r1 === "number" && typeof r2 === "number" && r1 <= r2 + 1e-9;
        },
      ),
    );
  });

  it("lower <= linear <= higher for any q", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e3, max: 1e3 }), { minLength: 2, maxLength: 30 }),
        fc.float({ noNaN: true, min: 0, max: 1 }),
        (data, q) => {
          const s = new Series({ data });
          const lo = quantileSeries(s, { q, interpolation: "lower" });
          const lin = quantileSeries(s, { q, interpolation: "linear" });
          const hi = quantileSeries(s, { q, interpolation: "higher" });
          if (typeof lo !== "number" || typeof lin !== "number" || typeof hi !== "number") {
            return false;
          }
          return lo <= lin + 1e-9 && lin <= hi + 1e-9;
        },
      ),
    );
  });
});
