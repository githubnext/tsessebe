/**
 * Tests for scalar_extract — squeeze, item, bool, firstValidIndex, lastValidIndex.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  boolDataFrame,
  boolSeries,
  dataFrameFirstValidIndex,
  dataFrameLastValidIndex,
  firstValidIndex,
  itemSeries,
  lastValidIndex,
  squeezeDataFrame,
  squeezeSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── squeezeSeries ────────────────────────────────────────────────────────────

describe("squeezeSeries", () => {
  it("returns scalar when Series has 1 element", () => {
    expect(squeezeSeries(new Series({ data: [42] }))).toBe(42);
    expect(squeezeSeries(new Series({ data: ["hello"] }))).toBe("hello");
    expect(squeezeSeries(new Series({ data: [null] }))).toBe(null);
  });

  it("returns the Series unchanged when length > 1", () => {
    const s = new Series({ data: [1, 2, 3] });
    const result = squeezeSeries(s);
    expect(result).toBeInstanceOf(Series);
    expect((result as Series<Scalar>).values).toEqual([1, 2, 3]);
  });

  it("returns null for single-element Series with undefined value", () => {
    // Underlying array has undefined coerced to null
    const s = new Series({ data: [undefined] });
    expect(squeezeSeries(s)).toBeNull();
  });

  it("property: single-element Series always returns a scalar", () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true }), (v) => {
        const result = squeezeSeries(new Series({ data: [v] }));
        return typeof result === "number";
      }),
    );
  });

  it("property: multi-element Series always returns a Series", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 2, maxLength: 10 }), (arr) => {
        const result = squeezeSeries(new Series({ data: arr }));
        return result instanceof Series;
      }),
    );
  });
});

// ─── squeezeDataFrame ─────────────────────────────────────────────────────────

describe("squeezeDataFrame", () => {
  it("1×1 DataFrame with no axis → scalar", () => {
    const df = DataFrame.fromColumns({ A: [99] });
    expect(squeezeDataFrame(df)).toBe(99);
  });

  it("1×N DataFrame with no axis → Series indexed by column names", () => {
    const df = DataFrame.fromColumns({ A: [1], B: [2], C: [3] });
    const result = squeezeDataFrame(df);
    expect(result).toBeInstanceOf(Series);
    const s = result as Series<Scalar>;
    expect([...s.values]).toEqual([1, 2, 3]);
    expect(s.index.toArray()).toEqual(["A", "B", "C"]);
  });

  it("N×1 DataFrame with no axis → Series indexed by row labels", () => {
    const df = DataFrame.fromColumns({ A: [10, 20, 30] });
    const result = squeezeDataFrame(df);
    expect(result).toBeInstanceOf(Series);
    expect([...(result as Series<Scalar>).values]).toEqual([10, 20, 30]);
  });

  it("N×M DataFrame with no axis → DataFrame unchanged", () => {
    const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] });
    expect(squeezeDataFrame(df)).toBeInstanceOf(DataFrame);
  });

  it("axis=0: 1-row DataFrame → Series", () => {
    const df = DataFrame.fromColumns({ X: [5], Y: [6] });
    const result = squeezeDataFrame(df, 0);
    expect(result).toBeInstanceOf(Series);
    expect([...(result as Series<Scalar>).values]).toEqual([5, 6]);
  });

  it("axis=0: multi-row DataFrame → DataFrame unchanged", () => {
    const df = DataFrame.fromColumns({ A: [1, 2] });
    expect(squeezeDataFrame(df, 0)).toBeInstanceOf(DataFrame);
  });

  it("axis=1: 1-col DataFrame → Series", () => {
    const df = DataFrame.fromColumns({ A: [7, 8, 9] });
    const result = squeezeDataFrame(df, 1);
    expect(result).toBeInstanceOf(Series);
    expect([...(result as Series<Scalar>).values]).toEqual([7, 8, 9]);
  });

  it("axis=1: multi-col DataFrame → DataFrame unchanged", () => {
    const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] });
    expect(squeezeDataFrame(df, 1)).toBeInstanceOf(DataFrame);
  });

  it("axis='index' behaves like axis=0", () => {
    const df = DataFrame.fromColumns({ X: [1], Y: [2] });
    const r0 = squeezeDataFrame(df, 0);
    const rStr = squeezeDataFrame(df, "index");
    expect((r0 as Series<Scalar>).values).toEqual((rStr as Series<Scalar>).values);
  });

  it("axis='columns' behaves like axis=1", () => {
    const df = DataFrame.fromColumns({ A: [10, 20] });
    const r1 = squeezeDataFrame(df, 1);
    const rStr = squeezeDataFrame(df, "columns");
    expect((r1 as Series<Scalar>).values).toEqual((rStr as Series<Scalar>).values);
  });
});

// ─── itemSeries ───────────────────────────────────────────────────────────────

describe("itemSeries", () => {
  it("returns single element as scalar", () => {
    expect(itemSeries(new Series({ data: [7] }))).toBe(7);
    expect(itemSeries(new Series({ data: ["x"] }))).toBe("x");
    expect(itemSeries(new Series({ data: [true] }))).toBe(true);
    expect(itemSeries(new Series({ data: [null] }))).toBeNull();
  });

  it("throws RangeError for empty Series", () => {
    expect(() => itemSeries(new Series({ data: [] }))).toThrow(RangeError);
  });

  it("throws RangeError for multi-element Series", () => {
    expect(() => itemSeries(new Series({ data: [1, 2] }))).toThrow(RangeError);
    expect(() => itemSeries(new Series({ data: [1, 2, 3] }))).toThrow(RangeError);
  });

  it("property: itemSeries always equals squeezeSeries for single-element Series", () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true }), (v) => {
        const s = new Series({ data: [v] });
        return itemSeries(s) === squeezeSeries(s);
      }),
    );
  });
});

// ─── boolSeries ───────────────────────────────────────────────────────────────

describe("boolSeries", () => {
  it("truthy values → true", () => {
    expect(boolSeries(new Series({ data: [1] }))).toBe(true);
    expect(boolSeries(new Series({ data: [2] }))).toBe(true);
    expect(boolSeries(new Series({ data: [true] }))).toBe(true);
    expect(boolSeries(new Series({ data: ["hello"] }))).toBe(true);
  });

  it("falsy values → false", () => {
    expect(boolSeries(new Series({ data: [0] }))).toBe(false);
    expect(boolSeries(new Series({ data: [false] }))).toBe(false);
    expect(boolSeries(new Series({ data: [""] }))).toBe(false);
  });

  it("throws TypeError for null element", () => {
    expect(() => boolSeries(new Series({ data: [null] }))).toThrow(TypeError);
  });

  it("throws RangeError for multi-element Series", () => {
    expect(() => boolSeries(new Series({ data: [1, 2] }))).toThrow(RangeError);
  });

  it("throws RangeError for empty Series", () => {
    expect(() => boolSeries(new Series({ data: [] }))).toThrow(RangeError);
  });
});

// ─── boolDataFrame ────────────────────────────────────────────────────────────

describe("boolDataFrame", () => {
  it("returns bool of single-element 1×1 DataFrame", () => {
    expect(boolDataFrame(DataFrame.fromColumns({ A: [1] }))).toBe(true);
    expect(boolDataFrame(DataFrame.fromColumns({ A: [0] }))).toBe(false);
    expect(boolDataFrame(DataFrame.fromColumns({ A: [true] }))).toBe(true);
    expect(boolDataFrame(DataFrame.fromColumns({ A: [false] }))).toBe(false);
  });

  it("throws RangeError for 1×2 DataFrame", () => {
    expect(() => boolDataFrame(DataFrame.fromColumns({ A: [1], B: [2] }))).toThrow(RangeError);
  });

  it("throws RangeError for 2×1 DataFrame", () => {
    expect(() => boolDataFrame(DataFrame.fromColumns({ A: [1, 2] }))).toThrow(RangeError);
  });

  it("throws TypeError for null element in 1×1 DataFrame", () => {
    expect(() => boolDataFrame(DataFrame.fromColumns({ A: [null] }))).toThrow(TypeError);
  });
});

// ─── firstValidIndex ──────────────────────────────────────────────────────────

describe("firstValidIndex", () => {
  it("returns first non-NA label", () => {
    const s = new Series({ data: [null, Number.NaN, 3, 4], index: ["a", "b", "c", "d"] });
    expect(firstValidIndex(s)).toBe("c");
  });

  it("returns first element label if first is valid", () => {
    const s = new Series({ data: [10, null, null], index: [0, 1, 2] });
    expect(firstValidIndex(s)).toBe(0);
  });

  it("returns null when all values are NA", () => {
    const s = new Series({ data: [null, null, null] });
    expect(firstValidIndex(s)).toBeNull();
  });

  it("returns null for empty Series", () => {
    expect(firstValidIndex(new Series({ data: [] }))).toBeNull();
  });

  it("works with numeric index", () => {
    const s = new Series({ data: [null, 99], index: [10, 20] });
    expect(firstValidIndex(s)).toBe(20);
  });

  it("property: first valid index is consistent with manual scan", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant(null), fc.float({ noNaN: true })), {
          minLength: 1,
          maxLength: 8,
        }),
        (arr) => {
          const s = new Series({ data: arr });
          const fvi = firstValidIndex(s);
          const idx = arr.findIndex((v) => v !== null);
          if (idx === -1) {
            return fvi === null;
          }
          return fvi === idx;
        },
      ),
    );
  });
});

// ─── lastValidIndex ───────────────────────────────────────────────────────────

describe("lastValidIndex", () => {
  it("returns last non-NA label", () => {
    const s = new Series({ data: [1, 2, null, null], index: ["a", "b", "c", "d"] });
    expect(lastValidIndex(s)).toBe("b");
  });

  it("returns null when all NA", () => {
    expect(lastValidIndex(new Series({ data: [null, null] }))).toBeNull();
  });

  it("returns last label when last element is valid", () => {
    const s = new Series({ data: [null, null, 5], index: [0, 1, 2] });
    expect(lastValidIndex(s)).toBe(2);
  });

  it("property: last valid index is consistent with manual scan", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant(null), fc.float({ noNaN: true })), {
          minLength: 1,
          maxLength: 8,
        }),
        (arr) => {
          const s = new Series({ data: arr });
          const lvi = lastValidIndex(s);
          let last = -1;
          for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== null) {
              last = i;
            }
          }
          if (last === -1) {
            return lvi === null;
          }
          return lvi === last;
        },
      ),
    );
  });
});

// ─── dataFrameFirstValidIndex ─────────────────────────────────────────────────

describe("dataFrameFirstValidIndex", () => {
  it("returns first row label with any non-NA value", () => {
    const df = DataFrame.fromColumns({
      A: [null, null, 1],
      B: [null, 2, 3],
    });
    expect(dataFrameFirstValidIndex(df)).toBe(1);
  });

  it("returns 0-based index when default RangeIndex and first row has a value", () => {
    const df = DataFrame.fromColumns({ X: [10, 20], Y: [30, 40] });
    expect(dataFrameFirstValidIndex(df)).toBe(0);
  });

  it("returns null when entire DataFrame is NA", () => {
    const df = DataFrame.fromColumns({ A: [null, null], B: [null, null] });
    expect(dataFrameFirstValidIndex(df)).toBeNull();
  });

  it("returns null for empty DataFrame", () => {
    const df = DataFrame.fromColumns({ A: [] });
    expect(dataFrameFirstValidIndex(df)).toBeNull();
  });

  it("uses the row index label (not position) when custom index is set", () => {
    const df = DataFrame.fromColumns({ A: [null, null, 5] }, { index: ["r0", "r1", "r2"] });
    expect(dataFrameFirstValidIndex(df)).toBe("r2");
  });
});

// ─── dataFrameLastValidIndex ──────────────────────────────────────────────────

describe("dataFrameLastValidIndex", () => {
  it("returns last row label with any non-NA value", () => {
    const df = DataFrame.fromColumns({
      A: [1, null, null],
      B: [2, 3, null],
    });
    expect(dataFrameLastValidIndex(df)).toBe(1);
  });

  it("returns last row when last has a value", () => {
    const df = DataFrame.fromColumns({ A: [1, 2, 3] });
    expect(dataFrameLastValidIndex(df)).toBe(2);
  });

  it("returns null when all NA", () => {
    const df = DataFrame.fromColumns({ A: [null], B: [null] });
    expect(dataFrameLastValidIndex(df)).toBeNull();
  });

  it("uses the row index label", () => {
    const df = DataFrame.fromColumns({ A: [5, null, null] }, { index: ["x", "y", "z"] });
    expect(dataFrameLastValidIndex(df)).toBe("x");
  });
});
