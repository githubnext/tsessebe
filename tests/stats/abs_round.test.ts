/**
 * Tests for absSeries, roundSeries, absDataFrame, roundDataFrame.
 *
 * Mirrors pandas.Series.abs(), pandas.Series.round(),
 * pandas.DataFrame.abs(), pandas.DataFrame.round().
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  absSeries,
  absDataFrame,
  roundSeries,
  roundDataFrame,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const nan = Number.NaN;

function s(values: Scalar[]): Series<Scalar> {
  return new Series(values);
}

function close(a: number, b: number, tol = 1e-10): boolean {
  return Math.abs(a - b) <= tol;
}

// ─── absSeries ────────────────────────────────────────────────────────────────

describe("absSeries", () => {
  it("returns non-negative values for negative input", () => {
    const result = absSeries(s([-3, -1, 0, 1, 3]));
    expect(result.values).toEqual([3, 1, 0, 1, 3]);
  });

  it("leaves positive values unchanged", () => {
    const result = absSeries(s([1, 2, 3]));
    expect(result.values).toEqual([1, 2, 3]);
  });

  it("handles mixed positive and negative floats", () => {
    const result = absSeries(s([-1.5, 2.5, -0.0, 3.14]));
    expect(result.values[0]).toBe(1.5);
    expect(result.values[1]).toBe(2.5);
    expect(result.values[2]).toBe(0);
    expect(result.values[3]).toBe(3.14);
  });

  it("passes null through unchanged", () => {
    const result = absSeries(s([null, -1, null]));
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe(1);
    expect(result.values[2]).toBeNull();
  });

  it("passes undefined through unchanged", () => {
    const result = absSeries(s([undefined, -5]));
    expect(result.values[0]).toBeUndefined();
    expect(result.values[1]).toBe(5);
  });

  it("passes NaN through unchanged", () => {
    const result = absSeries(s([nan, -2, nan]));
    expect(Number.isNaN(result.values[0] as number)).toBe(true);
    expect(result.values[1]).toBe(2);
    expect(Number.isNaN(result.values[2] as number)).toBe(true);
  });

  it("passes string values through unchanged", () => {
    const result = absSeries(s(["hello", -3, "world"]));
    expect(result.values[0]).toBe("hello");
    expect(result.values[1]).toBe(3);
    expect(result.values[2]).toBe("world");
  });

  it("passes boolean values through unchanged", () => {
    const result = absSeries(s([true, -1, false]));
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(1);
    expect(result.values[2]).toBe(false);
  });

  it("returns an empty series for empty input", () => {
    const result = absSeries(s([]));
    expect(result.values).toEqual([]);
  });

  it("preserves the series name", () => {
    const named = new Series({ data: [-1, 2], name: "myCol" });
    expect(absSeries(named).name).toBe("myCol");
  });

  it("preserves the series index", () => {
    const indexed = new Series({ data: [-1, -2], index: ["a", "b"] });
    const result = absSeries(indexed);
    expect(result.index.values).toEqual(["a", "b"]);
  });

  it("does not mutate the input series", () => {
    const input = s([-1, -2, -3]);
    absSeries(input);
    expect(input.values).toEqual([-1, -2, -3]);
  });

  // property-based
  it("property: abs(x) >= 0 for all finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true, noDefaultInfinity: true })), (arr) => {
        const result = absSeries(s(arr));
        return (result.values as number[]).every((v) => v >= 0);
      }),
    );
  });

  it("property: abs(abs(x)) === abs(x) (idempotent)", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true, noDefaultInfinity: true })), (arr) => {
        const once = absSeries(s(arr)).values as number[];
        const twice = absSeries(new Series(once)).values as number[];
        return once.every((v, i) => v === twice[i]);
      }),
    );
  });
});

// ─── roundSeries ─────────────────────────────────────────────────────────────

describe("roundSeries", () => {
  it("rounds to 0 decimals by default", () => {
    const result = roundSeries(s([1.4, 1.5, 1.6, -1.5]));
    expect(result.values).toEqual([1, 2, 2, -2]);
  });

  it("rounds to specified decimal places", () => {
    const result = roundSeries(s([3.14159, 2.71828]), 2);
    expect(result.values[0]).toBe(3.14);
    expect(result.values[1]).toBe(2.72);
  });

  it("rounds to 3 decimal places", () => {
    const result = roundSeries(s([1.23456]), 3);
    expect(result.values[0]).toBe(1.235);
  });

  it("negative decimals rounds to tens", () => {
    const result = roundSeries(s([1234, 5678, -99]), -2);
    expect(result.values[0]).toBe(1200);
    expect(result.values[1]).toBe(5700);
    expect(result.values[2]).toBe(-100);
  });

  it("passes null through unchanged", () => {
    const result = roundSeries(s([null, 1.6, null]), 0);
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe(2);
    expect(result.values[2]).toBeNull();
  });

  it("passes NaN through unchanged", () => {
    const result = roundSeries(s([nan, 1.5]), 1);
    expect(Number.isNaN(result.values[0] as number)).toBe(true);
    expect(result.values[1]).toBe(1.5);
  });

  it("passes string values through unchanged", () => {
    const result = roundSeries(s(["hi", 1.9]), 0);
    expect(result.values[0]).toBe("hi");
    expect(result.values[1]).toBe(2);
  });

  it("returns an empty series for empty input", () => {
    expect(roundSeries(s([]), 2).values).toEqual([]);
  });

  it("preserves the series name", () => {
    const named = new Series({ data: [1.23], name: "x" });
    expect(roundSeries(named, 1).name).toBe("x");
  });

  it("preserves the series index", () => {
    const indexed = new Series({ data: [1.5, 2.5], index: ["a", "b"] });
    const result = roundSeries(indexed, 0);
    expect(result.index.values).toEqual(["a", "b"]);
  });

  it("does not mutate the input series", () => {
    const input = s([1.5, 2.7]);
    roundSeries(input, 0);
    expect(input.values).toEqual([1.5, 2.7]);
  });

  // property-based
  it("property: round(x, d) is within 0.5 * 10^-d of x", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 })),
        fc.integer({ min: 0, max: 6 }),
        (arr, d) => {
          const result = roundSeries(s(arr), d).values as number[];
          const tol = 0.5 * 10 ** -d + Number.EPSILON * 1000;
          return result.every((v, i) => Math.abs(v - (arr[i] ?? 0)) <= tol);
        },
      ),
    );
  });
});

// ─── absDataFrame ─────────────────────────────────────────────────────────────

describe("absDataFrame", () => {
  it("applies abs to numeric columns", () => {
    const df = DataFrame.fromColumns({ a: [-1, 2], b: [3, -4] });
    const result = absDataFrame(df).toRecords();
    expect(result[0]).toEqual({ a: 1, b: 3 });
    expect(result[1]).toEqual({ a: 2, b: 4 });
  });

  it("handles missing values in numeric columns", () => {
    const df = DataFrame.fromColumns({ a: [-1, null, -3] });
    const result = absDataFrame(df);
    expect(result.col("a").values[0]).toBe(1);
    expect(result.col("a").values[1]).toBeNull();
    expect(result.col("a").values[2]).toBe(3);
  });

  it("passes string columns through unchanged", () => {
    const df = DataFrame.fromColumns({ a: [-1, 2], label: ["x", "y"] });
    const result = absDataFrame(df);
    expect(result.col("a").values).toEqual([1, 2]);
    expect(result.col("label").values).toEqual(["x", "y"]);
  });

  it("returns empty DataFrame for empty input", () => {
    const df = DataFrame.fromColumns({});
    expect(absDataFrame(df).shape).toEqual([0, 0]);
  });

  it("preserves column names and index", () => {
    const df = DataFrame.fromColumns({ x: [-5, 10], y: [-3, -7] });
    const result = absDataFrame(df);
    expect(result.columns.values).toEqual(["x", "y"]);
    expect(result.index.values).toEqual(df.index.values);
  });

  it("does not mutate the input DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [-1, -2] });
    absDataFrame(df);
    expect(df.col("a").values).toEqual([-1, -2]);
  });
});

// ─── roundDataFrame ───────────────────────────────────────────────────────────

describe("roundDataFrame", () => {
  it("rounds all columns with scalar decimals", () => {
    const df = DataFrame.fromColumns({ a: [1.14, 2.75], b: [3.149, 4.999] });
    const result = roundDataFrame(df, 1).toRecords();
    expect(result[0]).toEqual({ a: 1.1, b: 3.1 });
    expect(result[1]).toEqual({ a: 2.8, b: 5.0 });
  });

  it("rounds with 0 decimals by default", () => {
    const df = DataFrame.fromColumns({ a: [1.4, 1.6] });
    const result = roundDataFrame(df).toRecords();
    expect(result[0]).toEqual({ a: 1 });
    expect(result[1]).toEqual({ a: 2 });
  });

  it("per-column decimals dict", () => {
    const df = DataFrame.fromColumns({ a: [1.14, 2.75], b: [3.14159, 2.71828] });
    const result = roundDataFrame(df, { a: 1, b: 3 }).toRecords();
    expect(result[0]).toEqual({ a: 1.1, b: 3.142 });
    expect(result[1]).toEqual({ a: 2.8, b: 2.718 });
  });

  it("columns not in dict are passed through unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1.55, 2.44], b: [3.14159, 2.71828] });
    const result = roundDataFrame(df, { b: 2 });
    expect(result.col("a").values).toEqual([1.55, 2.44]);
    expect(result.col("b").values[0]).toBe(3.14);
  });

  it("handles missing values gracefully", () => {
    const df = DataFrame.fromColumns({ a: [1.5, null, 2.7] });
    const result = roundDataFrame(df, 0);
    expect(result.col("a").values[0]).toBe(2);
    expect(result.col("a").values[1]).toBeNull();
    expect(result.col("a").values[2]).toBe(3);
  });

  it("passes string columns through with per-column dict (not mentioned)", () => {
    const df = DataFrame.fromColumns({ a: [1.5], label: ["x"] });
    const result = roundDataFrame(df, { a: 0 });
    expect(result.col("a").values[0]).toBe(2);
    expect(result.col("label").values[0]).toBe("x");
  });

  it("preserves column names and index", () => {
    const df = DataFrame.fromColumns({ x: [1.1], y: [2.2] });
    const result = roundDataFrame(df, 0);
    expect(result.columns.values).toEqual(["x", "y"]);
    expect(result.index.values).toEqual(df.index.values);
  });

  it("does not mutate input DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.7] });
    roundDataFrame(df, 0);
    expect(df.col("a").values).toEqual([1.5, 2.7]);
  });

  it("empty DataFrame returns empty", () => {
    const df = DataFrame.fromColumns({});
    expect(roundDataFrame(df, 2).shape).toEqual([0, 0]);
  });

  // property-based
  it("property: round(df, 0) values are integers for finite numeric columns", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
          { minLength: 1, maxLength: 20 },
        ),
        (arr) => {
          const df = DataFrame.fromColumns({ v: arr });
          const result = roundDataFrame(df, 0).col("v").values as number[];
          return result.every((v) => Number.isInteger(v));
        },
      ),
    );
  });
});
