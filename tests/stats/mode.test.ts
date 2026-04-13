/**
 * Tests for src/stats/mode.ts — modeSeries() and modeDataFrame().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, modeDataFrame, modeSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── modeSeries ───────────────────────────────────────────────────────────────

describe("modeSeries", () => {
  it("single mode", () => {
    const s = new Series({ data: [1, 2, 2, 3] });
    const result = modeSeries(s);
    expect(result.values).toEqual([2]);
    expect(result.index.values).toEqual([0]);
  });

  it("multiple modes (tie)", () => {
    const s = new Series({ data: [1, 1, 2, 2, 3] });
    const result = modeSeries(s);
    expect(result.values).toEqual([1, 2]);
  });

  it("all unique values — all are modes", () => {
    const s = new Series({ data: [3, 1, 2] });
    const result = modeSeries(s);
    expect(result.values).toEqual([1, 2, 3]);
  });

  it("empty series returns empty", () => {
    const s = new Series({ data: [] as Scalar[] });
    const result = modeSeries(s);
    expect(result.values).toEqual([]);
  });

  it("series with string values", () => {
    const s = new Series({ data: ["a", "b", "b", "c"] });
    const result = modeSeries(s);
    expect(result.values).toEqual(["b"]);
  });

  it("dropna=true (default) excludes nulls", () => {
    const s = new Series({ data: [null, 1, 1, null, null] as Scalar[] });
    const result = modeSeries(s);
    expect(result.values).toEqual([1]);
  });

  it("dropna=false counts nulls", () => {
    const s = new Series({ data: [null, null, 1] as Scalar[] });
    const result = modeSeries(s, { dropna: false });
    expect(result.values[0]).toBeNull();
  });

  it("all null values with dropna=true returns empty", () => {
    const s = new Series({ data: [null, null] as Scalar[] });
    const result = modeSeries(s);
    expect(result.values).toEqual([]);
  });

  it("single element", () => {
    const s = new Series({ data: [42] });
    expect(modeSeries(s).values).toEqual([42]);
  });

  it("modes are sorted ascending for numbers", () => {
    const s = new Series({ data: [5, 5, 3, 3, 1, 1] });
    const result = modeSeries(s);
    expect(result.values).toEqual([1, 3, 5]);
  });

  it("modes are sorted ascending for strings", () => {
    const s = new Series({ data: ["c", "c", "a", "a", "b", "b"] });
    const result = modeSeries(s);
    expect(result.values).toEqual(["a", "b", "c"]);
  });

  it("preserves series name", () => {
    const s = new Series({ data: [1, 1, 2], name: "x" });
    expect(modeSeries(s).name).toBe("x");
  });

  it("result index is 0-based integers", () => {
    const s = new Series({ data: [1, 1, 2, 2] });
    const result = modeSeries(s);
    expect(result.index.values).toEqual([0, 1]);
  });
});

// ─── modeDataFrame — axis=0 ───────────────────────────────────────────────────

describe("modeDataFrame axis=0", () => {
  it("single mode per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 1, 2], b: [3, 3, 3] });
    const result = modeDataFrame(df);
    expect(result.col("a")?.values).toEqual([1]);
    expect(result.col("b")?.values).toEqual([3]);
  });

  it("null-pads shorter mode lists", () => {
    const df = DataFrame.fromColumns({ a: [1, 1, 2, 2], b: [5, 5, 5, 6] });
    const result = modeDataFrame(df);
    // a has 2 modes [1,2], b has 1 mode [5]
    expect(result.col("a")?.values).toEqual([1, 2]);
    expect(result.col("b")?.values).toEqual([5, null]);
  });

  it("numericOnly skips string columns", () => {
    const df = DataFrame.fromColumns({ n: [1, 1, 2], s: ["x", "x", "y"] });
    const result = modeDataFrame(df, { numericOnly: true });
    expect(result.columns.values).toContain("n");
    expect(result.columns.values).not.toContain("s");
  });

  it("dropna=false counts nulls", () => {
    const df = DataFrame.fromColumns({ a: [null, null, 1] as Scalar[] });
    const result = modeDataFrame(df, { dropna: false });
    expect(result.col("a")?.values[0]).toBeNull();
  });

  it("result index is 0-based", () => {
    const df = DataFrame.fromColumns({ a: [1, 1, 2] });
    const result = modeDataFrame(df);
    expect(result.index.values).toEqual([0]);
  });
});

// ─── modeDataFrame — axis=1 ───────────────────────────────────────────────────

describe("modeDataFrame axis=1", () => {
  it("row-wise mode", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [1, 3], c: [2, 3] });
    const result = modeDataFrame(df, { axis: 1 });
    // row 0: [1,1,2] → mode=1
    expect(result.col("0")?.values[0]).toBe(1);
    // row 1: [2,3,3] → mode=3
    expect(result.col("0")?.values[1]).toBe(3);
  });

  it("preserves original row index", () => {
    const df = DataFrame.fromColumns(
      { a: [10, 20, 30], b: [10, 10, 30] },
      { index: ["x", "y", "z"] },
    );
    const result = modeDataFrame(df, { axis: 1 });
    expect(result.index.values).toEqual(["x", "y", "z"]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("modeSeries property tests", () => {
  it("mode value always appears in original series", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1 }), (arr) => {
        const s = new Series({ data: arr });
        const result = modeSeries(s);
        for (const v of result.values as number[]) {
          expect(arr).toContain(v);
        }
      }),
    );
  });

  it("all mode values have equal and maximal frequency", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 2 }), (arr) => {
        const s = new Series({ data: arr });
        const result = modeSeries(s);
        if ((result.values as number[]).length === 0) {
          return;
        }
        const freq = new Map<number, number>();
        for (const v of arr) {
          freq.set(v, (freq.get(v) ?? 0) + 1);
        }
        const modeFreq = freq.get(result.values[0] as number) ?? 0;
        for (const v of result.values as number[]) {
          expect(freq.get(v)).toBe(modeFreq);
        }
        // No non-mode value has higher frequency
        for (const [val, cnt] of freq) {
          if (!(result.values as number[]).includes(val)) {
            expect(cnt).toBeLessThan(modeFreq);
          }
        }
      }),
    );
  });

  it("result is sorted ascending", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2 }), (arr) => {
        const s = new Series({ data: arr });
        const result = modeSeries(s).values as number[];
        for (let i = 1; i < result.length; i++) {
          expect((result[i] as number) >= (result[i - 1] as number)).toBe(true);
        }
      }),
    );
  });
});
