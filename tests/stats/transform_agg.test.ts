/**
 * Tests for transform_agg — seriesTransform, dataFrameTransform.
 *
 * Covers:
 * - seriesTransform with single function
 * - seriesTransform with built-in string names (cumsum, cumprod, cummin, cummax, sum, mean, min, max, etc.)
 * - seriesTransform with array of functions → DataFrame
 * - seriesTransform with Record → DataFrame
 * - dataFrameTransform single function (column-wise)
 * - dataFrameTransform with array of functions
 * - dataFrameTransform with Record (per-column mapping)
 * - dataFrameTransform axis=1 (row-wise)
 * - Missing value handling
 * - Property-based: identity transform preserves values
 * - Property-based: cumsum last element equals sum
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, dataFrameTransform, seriesTransform } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── seriesTransform — single function ────────────────────────────────────────

describe("seriesTransform — single function", () => {
  test("identity function", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, (x) => x) as Series<Scalar>;
    expect([...result.values]).toEqual([1, 2, 3]);
  });

  test("element-wise doubling via series return", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(
      s,
      (x) =>
        new Series<Scalar>({
          data: x.values.map((v) => (v as number) * 2) as Scalar[],
          index: x.index,
        }),
    ) as Series<Scalar>;
    expect([...result.values]).toEqual([2, 4, 6]);
  });

  test("scalar broadcast — sum", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, (x) => x.sum() as Scalar) as Series<Scalar>;
    expect([...result.values]).toEqual([6, 6, 6]);
  });

  test("preserves index", () => {
    const s = new Series<Scalar>({ data: [10, 20], index: ["a", "b"] });
    const result = seriesTransform(s, (x) => x) as Series<Scalar>;
    expect([...result.index.values]).toEqual(["a", "b"]);
  });

  test("preserves name", () => {
    const s = new Series<Scalar>({ data: [1, 2], name: "myCol" });
    const result = seriesTransform(s, (x) => x) as Series<Scalar>;
    expect(result.name).toBe("myCol");
  });
});

// ─── seriesTransform — built-in string names ──────────────────────────────────

describe("seriesTransform — built-in names", () => {
  test("cumsum", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4] });
    const result = seriesTransform(s, "cumsum") as Series<Scalar>;
    expect([...result.values]).toEqual([1, 3, 6, 10]);
  });

  test("cumprod", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4] });
    const result = seriesTransform(s, "cumprod") as Series<Scalar>;
    expect([...result.values]).toEqual([1, 2, 6, 24]);
  });

  test("cummin", () => {
    const s = new Series<Scalar>({ data: [3, 1, 2, 4] });
    const result = seriesTransform(s, "cummin") as Series<Scalar>;
    expect([...result.values]).toEqual([3, 1, 1, 1]);
  });

  test("cummax", () => {
    const s = new Series<Scalar>({ data: [1, 3, 2, 4] });
    const result = seriesTransform(s, "cummax") as Series<Scalar>;
    expect([...result.values]).toEqual([1, 3, 3, 4]);
  });

  test("sum broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, "sum") as Series<Scalar>;
    expect([...result.values]).toEqual([6, 6, 6]);
  });

  test("mean broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, "mean") as Series<Scalar>;
    expect([...result.values]).toEqual([2, 2, 2]);
  });

  test("min broadcast", () => {
    const s = new Series<Scalar>({ data: [3, 1, 2] });
    const result = seriesTransform(s, "min") as Series<Scalar>;
    expect([...result.values]).toEqual([1, 1, 1]);
  });

  test("max broadcast", () => {
    const s = new Series<Scalar>({ data: [3, 1, 2] });
    const result = seriesTransform(s, "max") as Series<Scalar>;
    expect([...result.values]).toEqual([3, 3, 3]);
  });

  test("count broadcast", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    const result = seriesTransform(s, "count") as Series<Scalar>;
    expect([...result.values]).toEqual([2, 2, 2]);
  });

  test("first broadcast", () => {
    const s = new Series<Scalar>({ data: [null, 2, 3] });
    const result = seriesTransform(s, "first") as Series<Scalar>;
    expect([...result.values]).toEqual([2, 2, 2]);
  });

  test("last broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 2, null] });
    const result = seriesTransform(s, "last") as Series<Scalar>;
    expect([...result.values]).toEqual([2, 2, 2]);
  });

  test("prod broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4] });
    const result = seriesTransform(s, "prod") as Series<Scalar>;
    expect([...result.values]).toEqual([24, 24, 24, 24]);
  });

  test("std broadcast", () => {
    const s = new Series<Scalar>({ data: [2, 4, 4, 4, 5, 5, 7, 9] });
    const result = seriesTransform(s, "std") as Series<Scalar>;
    const v = result.values[0] as number;
    expect(Math.abs(v - 2.138089935299395)).toBeLessThan(0.01);
    // all values same
    expect(new Set(result.values.map(String)).size).toBe(1);
  });

  test("var broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, "var") as Series<Scalar>;
    const v = result.values[0] as number;
    expect(Math.abs(v - 1.0)).toBeLessThan(1e-10); // variance of [1,2,3] = 1.0
  });

  test("median broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 3, 2] });
    const result = seriesTransform(s, "median") as Series<Scalar>;
    expect([...result.values]).toEqual([2, 2, 2]);
  });

  test("any broadcast — true", () => {
    const s = new Series<Scalar>({ data: [0, 1, 0] });
    const result = seriesTransform(s, "any") as Series<Scalar>;
    expect([...result.values]).toEqual([true, true, true]);
  });

  test("any broadcast — false", () => {
    const s = new Series<Scalar>({ data: [0, 0, 0] });
    const result = seriesTransform(s, "any") as Series<Scalar>;
    expect([...result.values]).toEqual([false, false, false]);
  });

  test("all broadcast — true", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, "all") as Series<Scalar>;
    expect([...result.values]).toEqual([true, true, true]);
  });

  test("all broadcast — false", () => {
    const s = new Series<Scalar>({ data: [1, 0, 3] });
    const result = seriesTransform(s, "all") as Series<Scalar>;
    expect([...result.values]).toEqual([false, false, false]);
  });

  test("nunique broadcast", () => {
    const s = new Series<Scalar>({ data: [1, 2, 2, 3] });
    const result = seriesTransform(s, "nunique") as Series<Scalar>;
    expect([...result.values]).toEqual([3, 3, 3, 3]);
  });

  test("cumsum with null values passes through null", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    const result = seriesTransform(s, "cumsum") as Series<Scalar>;
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBeNull();
    expect(result.values[2]).toBe(4);
  });
});

// ─── seriesTransform — array form ─────────────────────────────────────────────

describe("seriesTransform — array of functions → DataFrame", () => {
  test("two built-in names", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, ["sum", "mean"]) as DataFrame;
    expect(result).toBeInstanceOf(DataFrame);
    expect([...result.col("sum").values]).toEqual([6, 6, 6]);
    expect([...result.col("mean").values]).toEqual([2, 2, 2]);
  });

  test("cumsum and cummax", () => {
    const s = new Series<Scalar>({ data: [1, 3, 2] });
    const result = seriesTransform(s, ["cumsum", "cummax"]) as DataFrame;
    expect([...result.col("cumsum").values]).toEqual([1, 4, 6]);
    expect([...result.col("cummax").values]).toEqual([1, 3, 3]);
  });

  test("preserves index in DataFrame result", () => {
    const s = new Series<Scalar>({ data: [10, 20], index: ["a", "b"] });
    const result = seriesTransform(s, ["min", "max"]) as DataFrame;
    expect([...result.index.values]).toEqual(["a", "b"]);
  });

  test("anonymous functions use numeric column names", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, [(x) => x, (x) => x]) as DataFrame;
    expect([...result.columns.values]).toEqual(["0", "1"]);
  });
});

// ─── seriesTransform — record form ────────────────────────────────────────────

describe("seriesTransform — Record → DataFrame", () => {
  test("named columns from record", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, { total: "sum", running: "cumsum" }) as DataFrame;
    expect(result).toBeInstanceOf(DataFrame);
    expect([...result.col("total").values]).toEqual([6, 6, 6]);
    expect([...result.col("running").values]).toEqual([1, 3, 6]);
  });

  test("custom function in record", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesTransform(s, {
      doubled: (x) =>
        new Series<Scalar>({
          data: x.values.map((v) => (v as number) * 2) as Scalar[],
          index: x.index,
        }),
    }) as DataFrame;
    expect([...result.col("doubled").values]).toEqual([2, 4, 6]);
  });
});

// ─── dataFrameTransform — single function ─────────────────────────────────────

describe("dataFrameTransform — single function", () => {
  test("identity returns same shape and values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = dataFrameTransform(df, (s) => s);
    expect(result.shape).toEqual([3, 2]);
    expect([...result.col("a").values]).toEqual([1, 2, 3]);
    expect([...result.col("b").values]).toEqual([4, 5, 6]);
  });

  test("cumsum per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const result = dataFrameTransform(df, "cumsum");
    expect([...result.col("a").values]).toEqual([1, 3, 6]);
    expect([...result.col("b").values]).toEqual([10, 30, 60]);
  });

  test("sum broadcast per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = dataFrameTransform(df, "sum");
    expect([...result.col("a").values]).toEqual([6, 6, 6]);
    expect([...result.col("b").values]).toEqual([15, 15, 15]);
  });

  test("mean broadcast per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 4] });
    const result = dataFrameTransform(df, "mean");
    expect([...result.col("a").values]).toEqual([2, 2]);
    expect([...result.col("b").values]).toEqual([3, 3]);
  });

  test("preserves row index", () => {
    const s = new Series<Scalar>({ data: [0, 0], index: ["r0", "r1"] });
    const df = new DataFrame(
      new Map([["a", new Series<Scalar>({ data: [1, 2] as Scalar[], index: s.index })]]),
      s.index,
    );
    const result = dataFrameTransform(df, "cumsum");
    expect([...result.index.values]).toEqual(["r0", "r1"]);
  });

  test("preserves column names", () => {
    const df = DataFrame.fromColumns({ x: [1], y: [2], z: [3] });
    const result = dataFrameTransform(df, "sum");
    expect([...result.columns.values]).toEqual(["x", "y", "z"]);
  });
});

// ─── dataFrameTransform — array form ──────────────────────────────────────────

describe("dataFrameTransform — array of functions", () => {
  test("two built-in names produce flattened columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const result = dataFrameTransform(df, ["sum", "mean"]);
    expect([...result.columns.values]).toEqual(["a|sum", "a|mean"]);
    expect([...result.col("a|sum").values]).toEqual([3, 3]);
    expect([...result.col("a|mean").values]).toEqual([1.5, 1.5]);
  });

  test("multiple columns × multiple funcs", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameTransform(df, ["min", "max"]);
    expect([...result.columns.values]).toEqual(["a|min", "a|max", "b|min", "b|max"]);
    expect([...result.col("a|min").values]).toEqual([1, 1]);
    expect([...result.col("b|max").values]).toEqual([4, 4]);
  });
});

// ─── dataFrameTransform — record form ─────────────────────────────────────────

describe("dataFrameTransform — Record (per-column)", () => {
  test("transforms only matched column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = dataFrameTransform(df, { a: "cumsum" });
    expect([...result.col("a").values]).toEqual([1, 3, 6]);
    // b is unchanged
    expect([...result.col("b").values]).toEqual([4, 5, 6]);
  });

  test("transforms multiple columns independently", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const result = dataFrameTransform(df, { a: "sum", b: "mean" });
    expect([...result.col("a").values]).toEqual([6, 6, 6]);
    expect([...result.col("b").values]).toEqual([20, 20, 20]);
  });

  test("unmatched columns pass through unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const result = dataFrameTransform(df, { b: "cumsum" });
    expect([...result.col("a").values]).toEqual([1, 2]);
    expect([...result.col("b").values]).toEqual([3, 7]);
    expect([...result.col("c").values]).toEqual([5, 6]);
  });
});

// ─── dataFrameTransform — axis=1 ──────────────────────────────────────────────

describe("dataFrameTransform — axis=1 (row-wise)", () => {
  test("identity row-wise", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameTransform(df, (s) => s, { axis: 1 });
    expect([...result.col("a").values]).toEqual([1, 2]);
    expect([...result.col("b").values]).toEqual([3, 4]);
  });

  test("cumsum row-wise", () => {
    const df = DataFrame.fromColumns({ a: [1, 10], b: [2, 20] });
    const result = dataFrameTransform(df, "cumsum", { axis: 1 });
    // row 0: [1, 1+2] = [1, 3]; row 1: [10, 10+20] = [10, 30]
    expect([...result.col("a").values]).toEqual([1, 10]);
    expect([...result.col("b").values]).toEqual([3, 30]);
  });
});

// ─── Property-based ────────────────────────────────────────────────────────────

describe("seriesTransform — property tests", () => {
  test("identity transform preserves all values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<Scalar>({ data: arr as Scalar[] });
          const result = seriesTransform(s, (x) => x) as Series<Scalar>;
          for (let i = 0; i < arr.length; i++) {
            const orig = arr[i] as number;
            const got = result.values[i] as number;
            if (Math.abs(orig - got) > 1e-9) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  test("cumsum last element equals sum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<Scalar>({ data: arr as Scalar[] });
          const cumResult = seriesTransform(s, "cumsum") as Series<Scalar>;
          const sumResult = seriesTransform(s, "sum") as Series<Scalar>;
          const lastCum = cumResult.values.at(-1) as number;
          const sum = sumResult.values[0] as number;
          return Math.abs(lastCum - sum) < 1e-6;
        },
      ),
    );
  });
});
