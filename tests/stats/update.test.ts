/**
 * Tests for update — seriesUpdate and dataFrameUpdate.
 *
 * Covers:
 * - seriesUpdate: basic overwrite, NA handling, overwrite=false, errors="raise"
 * - dataFrameUpdate: column subset update, NA skipping
 * - Label alignment (only matching labels updated)
 * - Property-based: non-NA values from other always appear in result when overwrite=true
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, dataFrameUpdate, seriesUpdate } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

describe("seriesUpdate", () => {
  test("basic overwrite: non-NA values from other replace self", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [10, 20, 30], index: [0, 1, 2] });
    expect(seriesUpdate(s, other).values).toEqual([10, 20, 30]);
  });

  test("NA in other does not overwrite self", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [10, null, 30], index: [0, 1, 2] });
    expect(seriesUpdate(s, other).values).toEqual([10, 2, 30]);
  });

  test("NA in self gets updated by non-NA from other", () => {
    const s = new Series<Scalar>({ data: [1, null, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [null, 20, null], index: [0, 1, 2] });
    expect(seriesUpdate(s, other).values).toEqual([1, 20, 3]);
  });

  test("overwrite=false: does not replace non-NA self with non-NA other", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [10, 20, 30], index: [0, 1, 2] });
    const result = seriesUpdate(s, other, { overwrite: false });
    expect(result.values).toEqual([1, 2, 3]);
  });

  test("overwrite=false: fills NA in self with non-NA from other", () => {
    const s = new Series<Scalar>({ data: [1, null, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [10, 20, 30], index: [0, 1, 2] });
    const result = seriesUpdate(s, other, { overwrite: false });
    expect(result.values).toEqual([1, 20, 3]);
  });

  test("overwrite=false + errors='raise': throws on non-NA overlap", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [10, 20, 30], index: [0, 1, 2] });
    expect(() => seriesUpdate(s, other, { overwrite: false, errors: "raise" })).toThrow(RangeError);
  });

  test("label alignment: only matching labels are updated", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [99], index: [1] });
    expect(seriesUpdate(s, other).values).toEqual([1, 99, 3]);
  });

  test("extra labels in other are ignored", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [10, 20, 30, 40], index: [0, 1, 2, 3] });
    expect(seriesUpdate(s, other).values).toEqual([10, 20, 30]);
  });

  test("empty other produces unchanged self", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [], index: [] });
    expect(seriesUpdate(s, other).values).toEqual([1, 2, 3]);
  });

  test("preserves index and name", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: ["a", "b"], name: "x" });
    const other = new Series<Scalar>({ data: [10], index: ["a"] });
    const result = seriesUpdate(s, other);
    expect(result.index.values).toEqual(["a", "b"]);
    expect(result.name).toBe("x");
  });

  test("NaN in other does not overwrite", () => {
    const s = new Series<Scalar>({ data: [5, 6, 7], index: [0, 1, 2] });
    const other = new Series<Scalar>({ data: [Number.NaN, 60, 70], index: [0, 1, 2] });
    expect(seriesUpdate(s, other).values).toEqual([5, 60, 70]);
  });

  // property-based
  test("property: when overwrite=true, non-NA from other always wins", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.float({ noNaN: true }), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.array(fc.oneof(fc.float({ noNaN: true }), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr1, arr2) => {
          const n = Math.min(arr1.length, arr2.length);
          const idx = Array.from({ length: n }, (_, i) => i);
          const s = new Series<Scalar>({ data: arr1.slice(0, n) as Scalar[], index: idx });
          const other = new Series<Scalar>({ data: arr2.slice(0, n) as Scalar[], index: idx });
          const result = seriesUpdate(s, other);
          for (let i = 0; i < n; i++) {
            const ov = arr2[i];
            const sv = arr1[i];
            const rv = result.values[i];
            if (ov !== null && ov !== undefined) {
              if (rv !== ov) {
                return false;
              }
            } else if (sv !== null && rv !== sv) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("dataFrameUpdate", () => {
  test("basic update: non-NA values from other overwrite self", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const other = DataFrame.fromColumns({ a: [100, 200, null] });
    const result = dataFrameUpdate(df, other);
    expect(result.col("a").values).toEqual([100, 200, 3]);
    expect(result.col("b").values).toEqual([10, 20, 30]);
  });

  test("columns in other not in self are ignored", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const other = DataFrame.fromColumns({ a: [10, null, 30], z: [99, 99, 99] });
    const result = dataFrameUpdate(df, other);
    expect(result.columns.values).toEqual(["a"]);
    expect(result.col("a").values).toEqual([10, 2, 30]);
  });

  test("overwrite=false: fills NA in self", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const other = DataFrame.fromColumns({ a: [10, 20, 30] });
    const result = dataFrameUpdate(df, other, { overwrite: false });
    expect(result.col("a").values).toEqual([1, 20, 3]);
  });

  test("empty other returns copy of self", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const other = DataFrame.fromColumns({});
    const result = dataFrameUpdate(df, other);
    expect(result.col("a").values).toEqual([1, 2, 3]);
    expect(result.col("b").values).toEqual([4, 5, 6]);
  });

  test("all NA in other preserves self", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const other = DataFrame.fromColumns({ a: [null, null, null] });
    const result = dataFrameUpdate(df, other);
    expect(result.col("a").values).toEqual([1, 2, 3]);
  });

  test("preserves row index", () => {
    const idx = [10, 20, 30];
    const df = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: idx });
    const other = DataFrame.fromColumns({ a: [9, null, 7] }, { index: idx });
    const result = dataFrameUpdate(df, other);
    expect(result.index.values).toEqual([10, 20, 30]);
    expect(result.col("a").values).toEqual([9, 2, 7]);
  });

  test("multiple columns updated correctly", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3], b: [null, 20, 30] });
    const other = DataFrame.fromColumns({ a: [10, 20, null], b: [100, null, null] });
    const result = dataFrameUpdate(df, other);
    expect(result.col("a").values).toEqual([10, 20, 3]);
    expect(result.col("b").values).toEqual([100, 20, 30]);
  });
});
