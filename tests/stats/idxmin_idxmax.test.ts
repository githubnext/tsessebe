/**
 * Tests for src/stats/idxmin_idxmax.ts
 * — idxminSeries, idxmaxSeries, idxminDataFrame, idxmaxDataFrame
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  idxmaxDataFrame,
  idxmaxSeries,
  idxminDataFrame,
  idxminSeries,
} from "../../src/index.ts";
import type { Label, Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[], index?: readonly Label[]): Series<Scalar> {
  return new Series({ data: [...data], ...(index !== undefined ? { index: [...index] } : {}) });
}

// ─── idxminSeries ─────────────────────────────────────────────────────────────

describe("idxminSeries", () => {
  it("returns label of the minimum value", () => {
    const series = s([3, 1, 4, 1, 5], ["a", "b", "c", "d", "e"]);
    expect(idxminSeries(series)).toBe("b"); // first occurrence of minimum 1
  });

  it("returns integer index label for default index", () => {
    const series = s([10, 3, 7]);
    expect(idxminSeries(series)).toBe(1);
  });

  it("handles single element", () => {
    const series = s([42], ["x"]);
    expect(idxminSeries(series)).toBe("x");
  });

  it("returns null for empty series", () => {
    const series = s([]);
    expect(idxminSeries(series)).toBeNull();
  });

  it("skips NaN by default (skipna=true)", () => {
    const series = s([Number.NaN, 2, 1, Number.NaN], ["a", "b", "c", "d"]);
    expect(idxminSeries(series)).toBe("c");
  });

  it("skips null values by default", () => {
    const series = s([null, 5, 2, null], ["a", "b", "c", "d"]);
    expect(idxminSeries(series)).toBe("c");
  });

  it("returns null when all values are NaN with skipna=true", () => {
    const series = s([Number.NaN, Number.NaN], ["a", "b"]);
    expect(idxminSeries(series)).toBeNull();
  });

  it("returns null when any value is NaN with skipna=false", () => {
    const series = s([1, Number.NaN, 3], ["a", "b", "c"]);
    expect(idxminSeries(series, { skipna: false })).toBeNull();
  });

  it("returns correct label with skipna=false when no NaN", () => {
    const series = s([5, 2, 8], ["a", "b", "c"]);
    expect(idxminSeries(series, { skipna: false })).toBe("b");
  });

  it("handles negative numbers", () => {
    const series = s([-1, -5, -3], ["x", "y", "z"]);
    expect(idxminSeries(series)).toBe("y");
  });

  it("handles all equal values — returns first label", () => {
    const series = s([7, 7, 7], ["p", "q", "r"]);
    expect(idxminSeries(series)).toBe("p");
  });

  it("works with string values (lexicographic min)", () => {
    const series = s(["banana", "apple", "cherry"], ["a", "b", "c"]);
    expect(idxminSeries(series)).toBe("b"); // "apple" < "banana" < "cherry"
  });

  it("handles NaN at the start with skipna=true", () => {
    const series = s([Number.NaN, 3, 1], ["a", "b", "c"]);
    expect(idxminSeries(series)).toBe("c");
  });
});

// ─── idxmaxSeries ─────────────────────────────────────────────────────────────

describe("idxmaxSeries", () => {
  it("returns label of the maximum value", () => {
    const series = s([3, 1, 4, 1, 5], ["a", "b", "c", "d", "e"]);
    expect(idxmaxSeries(series)).toBe("e");
  });

  it("returns integer index label for default index", () => {
    const series = s([10, 3, 7]);
    expect(idxmaxSeries(series)).toBe(0);
  });

  it("handles single element", () => {
    const series = s([42], ["x"]);
    expect(idxmaxSeries(series)).toBe("x");
  });

  it("returns null for empty series", () => {
    const series = s([]);
    expect(idxmaxSeries(series)).toBeNull();
  });

  it("skips NaN by default (skipna=true)", () => {
    const series = s([Number.NaN, 2, 9, Number.NaN], ["a", "b", "c", "d"]);
    expect(idxmaxSeries(series)).toBe("c");
  });

  it("returns null when all values are NaN with skipna=true", () => {
    const series = s([Number.NaN, Number.NaN], ["a", "b"]);
    expect(idxmaxSeries(series)).toBeNull();
  });

  it("returns null when any value is NaN with skipna=false", () => {
    const series = s([1, Number.NaN, 3], ["a", "b", "c"]);
    expect(idxmaxSeries(series, { skipna: false })).toBeNull();
  });

  it("handles negative numbers", () => {
    const series = s([-1, -5, -3], ["x", "y", "z"]);
    expect(idxmaxSeries(series)).toBe("x");
  });

  it("all equal — returns first label", () => {
    const series = s([3, 3, 3], ["p", "q", "r"]);
    expect(idxmaxSeries(series)).toBe("p");
  });

  it("works with string values (lexicographic max)", () => {
    const series = s(["banana", "apple", "cherry"], ["a", "b", "c"]);
    expect(idxmaxSeries(series)).toBe("c"); // "cherry" > "banana" > "apple"
  });
});

// ─── idxminDataFrame ──────────────────────────────────────────────────────────

describe("idxminDataFrame", () => {
  it("returns row label of minimum for each column", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 20, 5] }, { index: ["x", "y", "z"] });
    const result = idxminDataFrame(df);
    expect(result.at("a")).toBe("y"); // min of a is 1 at row "y"
    expect(result.at("b")).toBe("z"); // min of b is 5 at row "z"
  });

  it("result is indexed by column names", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = idxminDataFrame(df);
    expect([...result.index.values]).toEqual(["a", "b"]);
  });

  it("skips NaN by default", () => {
    const df = DataFrame.fromColumns(
      { a: [Number.NaN, 2, 1], b: [5, Number.NaN, 3] },
      { index: ["x", "y", "z"] },
    );
    const result = idxminDataFrame(df);
    expect(result.at("a")).toBe("z");
    expect(result.at("b")).toBe("z");
  });

  it("returns null for column with all NaN (skipna=true)", () => {
    const df = DataFrame.fromColumns(
      { a: [1, 2], b: [Number.NaN, Number.NaN] },
      { index: ["x", "y"] },
    );
    const result = idxminDataFrame(df);
    expect(result.at("a")).toBe("x");
    expect(result.at("b")).toBeNull();
  });

  it("handles single row DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [42], b: [7] }, { index: ["row0"] });
    const result = idxminDataFrame(df);
    expect(result.at("a")).toBe("row0");
    expect(result.at("b")).toBe("row0");
  });
});

// ─── idxmaxDataFrame ──────────────────────────────────────────────────────────

describe("idxmaxDataFrame", () => {
  it("returns row label of maximum for each column", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 20, 5] }, { index: ["x", "y", "z"] });
    const result = idxmaxDataFrame(df);
    expect(result.at("a")).toBe("z"); // max of a is 4 at row "z"
    expect(result.at("b")).toBe("y"); // max of b is 20 at row "y"
  });

  it("result is indexed by column names", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = idxmaxDataFrame(df);
    expect([...result.index.values]).toEqual(["a", "b"]);
  });

  it("skips NaN by default", () => {
    const df = DataFrame.fromColumns(
      { a: [Number.NaN, 2, 1], b: [5, Number.NaN, 3] },
      { index: ["x", "y", "z"] },
    );
    const result = idxmaxDataFrame(df);
    expect(result.at("a")).toBe("y");
    expect(result.at("b")).toBe("x");
  });

  it("handles single row DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [42], b: [7] }, { index: ["row0"] });
    const result = idxmaxDataFrame(df);
    expect(result.at("a")).toBe("row0");
    expect(result.at("b")).toBe("row0");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("idxminSeries property tests", () => {
  it("idxmin label points to minimum value in series", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true }), { minLength: 1, maxLength: 20 }), (data) => {
        const series = s(data);
        const label = idxminSeries(series);
        if (label === null) {
          return true;
        }
        const minVal = Math.min(...data);
        return series.at(label as number) === minVal;
      }),
    );
  });

  it("idxmax label points to maximum value in series", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true }), { minLength: 1, maxLength: 20 }), (data) => {
        const series = s(data);
        const label = idxmaxSeries(series);
        if (label === null) {
          return true;
        }
        const maxVal = Math.max(...data);
        return series.at(label as number) === maxVal;
      }),
    );
  });

  it("idxmin and idxmax are consistent — min <= max", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true }), { minLength: 2, maxLength: 20 }), (data) => {
        const series = s(data);
        const minLabel = idxminSeries(series);
        const maxLabel = idxmaxSeries(series);
        if (minLabel === null || maxLabel === null) {
          return true;
        }
        const minVal = series.at(minLabel as number) as number;
        const maxVal = series.at(maxLabel as number) as number;
        return minVal <= maxVal;
      }),
    );
  });
});
