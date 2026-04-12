/**
 * Tests for src/stats/nunique.ts — nuniqueSeries(), nuniqueDataFrame(),
 * anySeries(), allSeries(), anyDataFrame(), allDataFrame().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  allDataFrame,
  allSeries,
  anyDataFrame,
  anySeries,
  nuniqueDataFrame,
  nuniqueSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── nuniqueSeries ────────────────────────────────────────────────────────────

describe("nuniqueSeries", () => {
  it("counts distinct values (no nulls)", () => {
    const s = new Series({ data: [1, 2, 2, 3, 3, 3] });
    expect(nuniqueSeries(s)).toBe(3);
  });

  it("dropna=true (default) excludes null/NaN from count", () => {
    const s = new Series({ data: [1, 2, 2, null, null] as Scalar[] });
    expect(nuniqueSeries(s)).toBe(2);
  });

  it("dropna=false includes null in unique count", () => {
    const s = new Series({ data: [1, 2, null] as Scalar[] });
    expect(nuniqueSeries(s, { dropna: false })).toBe(3);
  });

  it("empty series returns 0", () => {
    const s = new Series({ data: [] as Scalar[] });
    expect(nuniqueSeries(s)).toBe(0);
  });

  it("all-null series with dropna returns 0", () => {
    const s = new Series({ data: [null, null] as Scalar[] });
    expect(nuniqueSeries(s)).toBe(0);
  });

  it("string values", () => {
    const s = new Series({ data: ["a", "b", "a", "c"] as Scalar[] });
    expect(nuniqueSeries(s)).toBe(3);
  });
});

// ─── nuniqueDataFrame ─────────────────────────────────────────────────────────

describe("nuniqueDataFrame", () => {
  it("axis=0 (default) counts per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 2], b: ["x", "x", "y"] });
    const result = nuniqueDataFrame(df);
    expect(result.index.values).toEqual(["a", "b"]);
    expect(result.values[0]).toBe(2);
    expect(result.values[1]).toBe(2);
  });

  it("axis=1 counts per row", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [1, 3] });
    const result = nuniqueDataFrame(df, { axis: 1 });
    expect(result.values[0]).toBe(1); // row [1,1] → 1 unique
    expect(result.values[1]).toBe(2); // row [2,3] → 2 unique
  });

  it("dropna=true excludes nulls in count", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 1] as Scalar[] });
    const result = nuniqueDataFrame(df);
    expect(result.values[0]).toBe(1);
  });
});

// ─── anySeries ────────────────────────────────────────────────────────────────

describe("anySeries", () => {
  it("returns true when any element is truthy", () => {
    const s = new Series({ data: [0, 0, 1] });
    expect(anySeries(s)).toBe(true);
  });

  it("returns false when all elements are falsy", () => {
    const s = new Series({ data: [0, 0, 0] });
    expect(anySeries(s)).toBe(false);
  });

  it("empty series returns false", () => {
    const s = new Series({ data: [] as Scalar[] });
    expect(anySeries(s)).toBe(false);
  });

  it("skipna=true skips null values", () => {
    const s = new Series({ data: [null, 0, null] as Scalar[] });
    expect(anySeries(s)).toBe(false);
  });

  it("skipna=true: non-null truthy makes it true", () => {
    const s = new Series({ data: [null, 1] as Scalar[] });
    expect(anySeries(s)).toBe(true);
  });

  it("all-null series with skipna=true returns false", () => {
    const s = new Series({ data: [null, null] as Scalar[] });
    expect(anySeries(s)).toBe(false);
  });

  it("boolean series", () => {
    const s = new Series({ data: [false, false, true] as Scalar[] });
    expect(anySeries(s)).toBe(true);
  });

  it("string series: non-empty string is truthy", () => {
    const s = new Series({ data: ["", "hello"] as Scalar[] });
    expect(anySeries(s)).toBe(true);
  });
});

// ─── allSeries ────────────────────────────────────────────────────────────────

describe("allSeries", () => {
  it("returns true when all elements are truthy", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(allSeries(s)).toBe(true);
  });

  it("returns false when any element is falsy", () => {
    const s = new Series({ data: [1, 0, 3] });
    expect(allSeries(s)).toBe(false);
  });

  it("empty series returns true (vacuous truth)", () => {
    const s = new Series({ data: [] as Scalar[] });
    expect(allSeries(s)).toBe(true);
  });

  it("skipna=true: all-null series returns true (vacuous)", () => {
    const s = new Series({ data: [null, null] as Scalar[] });
    expect(allSeries(s)).toBe(true);
  });

  it("skipna=true skips null but checks others", () => {
    const s = new Series({ data: [1, null, 0] as Scalar[] });
    expect(allSeries(s)).toBe(false);
  });

  it("boolean series all true", () => {
    const s = new Series({ data: [true, true, true] as Scalar[] });
    expect(allSeries(s)).toBe(true);
  });
});

// ─── anyDataFrame ─────────────────────────────────────────────────────────────

describe("anyDataFrame", () => {
  it("axis=0: reduces each column to bool", () => {
    const df = DataFrame.fromColumns({ a: [0, 0], b: [0, 1] });
    const result = anyDataFrame(df);
    expect(result.index.values).toEqual(["a", "b"]);
    expect(result.values[0]).toBe(false);
    expect(result.values[1]).toBe(true);
  });

  it("axis=1: reduces each row to bool", () => {
    const df = DataFrame.fromColumns({ a: [0, 1], b: [0, 0] });
    const result = anyDataFrame(df, { axis: 1 });
    expect(result.values[0]).toBe(false);
    expect(result.values[1]).toBe(true);
  });

  it("boolOnly=true skips non-bool columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [false, false, false] as Scalar[] });
    const result = anyDataFrame(df, { boolOnly: true });
    expect(result.index.values).toEqual(["b"]);
    expect(result.values[0]).toBe(false);
  });
});

// ─── allDataFrame ─────────────────────────────────────────────────────────────

describe("allDataFrame", () => {
  it("axis=0: reduces each column to bool", () => {
    const df = DataFrame.fromColumns({ a: [1, 1], b: [1, 0] });
    const result = allDataFrame(df);
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(false);
  });

  it("axis=1: reduces each row to bool", () => {
    const df = DataFrame.fromColumns({ a: [1, 1], b: [1, 0] });
    const result = allDataFrame(df, { axis: 1 });
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(false);
  });

  it("empty DataFrame columns axis=1 returns all true (vacuous)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const result = allDataFrame(df, { axis: 1, boolOnly: true });
    // boolOnly excludes numeric column → empty col set → vacuous true for each row
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(true);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("nuniqueSeries — property tests", () => {
  it("nunique is always between 0 and n", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 10 }), { maxLength: 20 }), (arr) => {
        const s = new Series({ data: arr });
        const n = nuniqueSeries(s);
        return n >= 0 && n <= arr.length;
      }),
    );
  });
});

describe("anySeries / allSeries — property tests", () => {
  it("any >= all (if all is true then any must also be true)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 1 }), (arr) => {
        const s = new Series({ data: arr });
        const a = allSeries(s);
        const b = anySeries(s);
        // all => any (vacuous: if all is true and array non-empty, any must be true too,
        // but all-zero returns false for both)
        if (a) {
          return b;
        }
        return true;
      }),
    );
  });
});
