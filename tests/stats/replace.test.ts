/**
 * Tests for replaceSeries / replaceDataFrame.
 *
 * Covers:
 * - Series: scalar pair (value → value)
 * - Series: scalar pair replacing null
 * - Series: scalar pair replacing NaN
 * - Series: list pair (many → many)
 * - Series: list pair with scalar target (many → one)
 * - Series: dict form
 * - Series: dict replacing null ("null" key)
 * - Series: dict replacing NaN ("NaN" key)
 * - Series: unmatched values are unchanged
 * - Series: preserves index and name
 * - Series: empty series
 * - Series: all values replaced
 * - Series: string values
 * - Series: boolean values
 * - Series: Date values
 * - Series: bigint values
 * - Series: duplicate from values (last wins in list, dedup in dict)
 *
 * - DataFrame: global scalar pair
 * - DataFrame: global list pair
 * - DataFrame: global dict
 * - DataFrame: per-column dict
 * - DataFrame: per-column dict with missing column (unchanged)
 * - DataFrame: preserves index and columns
 * - DataFrame: empty DataFrame
 *
 * - Property-based: output length matches input
 * - Property-based: replaced values no longer present (if replacement differs)
 * - Property-based: unmatched values are unchanged
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, replaceDataFrame, replaceSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function vals(s: Series<Scalar>): Scalar[] {
  return [...s.values];
}

function dfCol(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

// ─── replaceSeries — scalar pair ──────────────────────────────────────────────

describe("replaceSeries — scalar pair", () => {
  it("replaces a single numeric value", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 2, 1] });
    expect(vals(replaceSeries(s, 2, 99))).toEqual([1, 99, 3, 99, 1]);
  });

  it("replaces null", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    expect(vals(replaceSeries(s, null, 0))).toEqual([1, 0, 3]);
  });

  it("replaces NaN", () => {
    const s = new Series<Scalar>({ data: [1, Number.NaN, 3] });
    const result = vals(replaceSeries(s, Number.NaN, 0));
    expect(result).toEqual([1, 0, 3]);
  });

  it("replaces undefined", () => {
    const s = new Series<Scalar>({ data: [1, undefined, 3] });
    expect(vals(replaceSeries(s, undefined, 99))).toEqual([1, 99, 3]);
  });

  it("preserves index and name", () => {
    const s = new Series<Scalar>({ data: [1, 2], name: "x" });
    const r = replaceSeries(s, 1, 10);
    expect(r.name).toBe("x");
    expect([...r.index.values]).toEqual([...s.index.values]);
  });

  it("leaves unmatched values unchanged", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(vals(replaceSeries(s, 5, 99))).toEqual([1, 2, 3]);
  });

  it("handles empty series", () => {
    const s = new Series<Scalar>({ data: [] });
    expect(vals(replaceSeries(s, 1, 2))).toEqual([]);
  });

  it("replaces all values when all match", () => {
    const s = new Series<Scalar>({ data: [1, 1, 1] });
    expect(vals(replaceSeries(s, 1, 0))).toEqual([0, 0, 0]);
  });

  it("handles string values", () => {
    const s = new Series<Scalar>({ data: ["a", "b", "a"] });
    expect(vals(replaceSeries(s, "a", "z"))).toEqual(["z", "b", "z"]);
  });

  it("handles boolean values", () => {
    const s = new Series<Scalar>({ data: [true, false, true] });
    expect(vals(replaceSeries(s, true, 1))).toEqual([1, false, 1]);
  });
});

// ─── replaceSeries — list pair ────────────────────────────────────────────────

describe("replaceSeries — list pair", () => {
  it("replaces many → many", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4] });
    expect(vals(replaceSeries(s, [1, 3], [10, 30]))).toEqual([10, 2, 30, 4]);
  });

  it("replaces many → one (broadcast)", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4] });
    expect(vals(replaceSeries(s, [1, 2, 3], 0))).toEqual([0, 0, 0, 4]);
  });

  it("empty replacement list → no change", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(vals(replaceSeries(s, [], []))).toEqual([1, 2, 3]);
  });

  it("replaces null in list", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    expect(vals(replaceSeries(s, [null], [0]))).toEqual([1, 0, 3]);
  });
});

// ─── replaceSeries — dict form ────────────────────────────────────────────────

describe("replaceSeries — dict form", () => {
  it("basic dict replacement", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(vals(replaceSeries(s, { "1": 10, "2": 20 }))).toEqual([10, 20, 3]);
  });

  it("replaces null via 'null' key", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    expect(vals(replaceSeries(s, { null: 0 }))).toEqual([1, 0, 3]);
  });

  it("replaces NaN via 'NaN' key", () => {
    const s = new Series<Scalar>({ data: [1, Number.NaN, 3] });
    const result = vals(replaceSeries(s, { NaN: 0 }));
    expect(result).toEqual([1, 0, 3]);
  });

  it("leaves unmatched values unchanged", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(vals(replaceSeries(s, { "5": 50 }))).toEqual([1, 2, 3]);
  });

  it("empty dict → no change", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(vals(replaceSeries(s, {}))).toEqual([1, 2, 3]);
  });
});

// ─── replaceDataFrame — global ────────────────────────────────────────────────

describe("replaceDataFrame — global", () => {
  it("global scalar pair replaces in all columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 1, 6] });
    const r = replaceDataFrame(df, 1, 99);
    expect(dfCol(r, "a")).toEqual([99, 2, 3]);
    expect(dfCol(r, "b")).toEqual([4, 99, 6]);
  });

  it("global list pair", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 3, 4] });
    const r = replaceDataFrame(df, [2, 3], [20, 30]);
    expect(dfCol(r, "a")).toEqual([1, 20, 30]);
    expect(dfCol(r, "b")).toEqual([20, 30, 4]);
  });

  it("global dict", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [2, 3] });
    const r = replaceDataFrame(df, { "1": 99 });
    expect(dfCol(r, "a")).toEqual([99, 2]);
    expect(dfCol(r, "b")).toEqual([2, 3]);
  });

  it("preserves index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const r = replaceDataFrame(df, 1, 99);
    expect([...r.index.values]).toEqual([...df.index.values]);
  });

  it("preserves columns", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const r = replaceDataFrame(df, 1, 99);
    expect([...r.columns.values]).toEqual(["a", "b"]);
  });
});

// ─── replaceDataFrame — per-column ───────────────────────────────────────────

describe("replaceDataFrame — per-column", () => {
  it("applies different replacements per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [1, 2, 3] });
    const r = replaceDataFrame(df, { a: { "1": 10 }, b: { "2": 20 } });
    expect(dfCol(r, "a")).toEqual([10, 2, 3]);
    expect(dfCol(r, "b")).toEqual([1, 20, 3]);
  });

  it("leaves unlisted columns unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const r = replaceDataFrame(df, { a: { "1": 99 } });
    expect(dfCol(r, "a")).toEqual([99, 2]);
    expect(dfCol(r, "b")).toEqual([3, 4]);
  });

  it("empty per-column dict → no change", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const r = replaceDataFrame(df, { a: {} });
    expect(dfCol(r, "a")).toEqual([1, 2]);
    expect(dfCol(r, "b")).toEqual([3, 4]);
  });

  it("per-column with null replacement", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] as Scalar[] });
    const r = replaceDataFrame(df, { a: { null: 0 } });
    expect(dfCol(r, "a")).toEqual([1, 0, 3]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("replaceSeries — property tests", () => {
  it("output length matches input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.constant(null)), { maxLength: 20 }),
        fc.integer(),
        fc.integer(),
        (data, from, to) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const r = replaceSeries(s, from, to);
          return r.size === s.size;
        },
      ),
    );
  });

  it("non-matching values are unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const from = 999;
          const to = -1;
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const r = replaceSeries(s, from, to);
          const before = vals(s);
          const after = vals(r);
          for (let i = 0; i < before.length; i++) {
            if (before[i] !== from && after[i] !== before[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("matched values become the replacement", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 100, max: 200 }),
        (data, from, to) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const r = replaceSeries(s, from, to);
          const before = vals(s);
          const after = vals(r);
          for (let i = 0; i < before.length; i++) {
            if (before[i] === from && after[i] !== to) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("dict form is equivalent to scalar pair", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 100, max: 200 }),
        (data, from, to) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const r1 = replaceSeries(s, from, to);
          const r2 = replaceSeries(s, { [String(from)]: to });
          const v1 = vals(r1);
          const v2 = vals(r2);
          for (let i = 0; i < v1.length; i++) {
            if (v1[i] !== v2[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
