/**
 * Tests for isin / dataFrameIsin.
 *
 * Covers:
 * - Series: basic membership with array
 * - Series: Set as values
 * - Series: NaN never matches (even if NaN in values)
 * - Series: null matches null
 * - Series: undefined matches undefined
 * - Series: empty values → all false
 * - Series: preserves index and name
 * - Series: all values match
 * - Series: string/boolean/bigint types
 * - DataFrame: shared array values
 * - DataFrame: shared Set values
 * - DataFrame: per-column IsinDict
 * - DataFrame: IsinDict with missing column → all false
 * - DataFrame: preserves index and columns
 * - DataFrame: empty DataFrame
 * - DataFrame: NaN cells always false in DataFrame
 * - Property-based: result length matches input, values are boolean
 * - Property-based: isin(s, []) → all false
 * - Property-based: isin(s, s.values) → all true (no NaN)
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Index } from "../../src/core/base-index.ts";
import { DataFrame } from "../../src/core/frame.ts";
import { Series } from "../../src/core/series.ts";
import { dataFrameIsin, isin } from "../../src/stats/isin.ts";
import type { Label, Scalar } from "../../src/types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function vals<T extends Scalar>(s: Series<T>): T[] {
  return [...s.values];
}

function bvals(s: Series<Scalar>): boolean[] {
  return [...s.values] as boolean[];
}

function dfCol(df: DataFrame, col: string): boolean[] {
  return [...df.col(col).values] as boolean[];
}

function idx(s: Series<Scalar>): Label[] {
  return [...s.index.values];
}

// ─── isin — Series ────────────────────────────────────────────────────────────

describe("isin — Series", () => {
  test("basic membership with array", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
    const result = isin(s, [1, 3, 5]);
    expect(bvals(result)).toEqual([true, false, true, false, true]);
  });

  test("no matches", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(bvals(isin(s, [4, 5, 6]))).toEqual([false, false, false]);
  });

  test("all match", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(bvals(isin(s, [1, 2, 3]))).toEqual([true, true, true]);
  });

  test("empty values → all false", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(bvals(isin(s, []))).toEqual([false, false, false]);
  });

  test("Set as values", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3, 4] });
    const result = isin(s, new Set<Scalar>([2, 4]));
    expect(bvals(result)).toEqual([false, true, false, true]);
  });

  test("NaN in series never matches, even when NaN in values", () => {
    const s = new Series<Scalar>({ data: [1, Number.NaN, 3] });
    const result = isin(s, [1, Number.NaN, 3]);
    expect(bvals(result)).toEqual([true, false, true]);
  });

  test("NaN in series always false", () => {
    const s = new Series<Scalar>({ data: [Number.NaN, Number.NaN] });
    expect(bvals(isin(s, [Number.NaN]))).toEqual([false, false]);
  });

  test("null matches null", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    const result = isin(s, [null]);
    expect(bvals(result)).toEqual([false, true, false]);
  });

  test("null in series with array not containing null → false", () => {
    const s = new Series<Scalar>({ data: [null, 1] });
    expect(bvals(isin(s, [1, 2]))).toEqual([false, true]);
  });

  test("string values", () => {
    const s = new Series<Scalar>({ data: ["a", "b", "c", "d"] });
    expect(bvals(isin(s, ["b", "d"]))).toEqual([false, true, false, true]);
  });

  test("boolean values", () => {
    const s = new Series<Scalar>({ data: [true, false, true] });
    expect(bvals(isin(s, [true]))).toEqual([true, false, true]);
  });

  test("preserves index", () => {
    const s = new Series<Scalar>({
      data: [1, 2, 3],
      index: new Index<Label>(["a", "b", "c"]),
    });
    const result = isin(s, [1, 3]);
    expect(idx(result)).toEqual(["a", "b", "c"]);
    expect(bvals(result)).toEqual([true, false, true]);
  });

  test("preserves name", () => {
    const s = new Series<Scalar>({ data: [1, 2], name: "myCol" });
    expect(isin(s, [1]).name).toBe("myCol");
  });

  test("empty series → empty result", () => {
    const s = new Series<Scalar>({ data: [] });
    expect(bvals(isin(s, [1, 2]))).toEqual([]);
  });

  test("duplicate values in lookup deduplicated (still works)", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(bvals(isin(s, [1, 1, 1]))).toEqual([true, false, false]);
  });

  test("iterable (generator) as values", () => {
    function* gen(): Generator<Scalar> {
      yield 2;
      yield 4;
    }
    const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
    expect(bvals(isin(s, gen()))).toEqual([false, true, false, true, false]);
  });
});

// ─── dataFrameIsin — shared values ────────────────────────────────────────────

describe("dataFrameIsin — shared values", () => {
  test("array of scalars checks all columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [3, 4, 5] });
    const result = dataFrameIsin(df, [1, 3, 5]);
    expect(dfCol(result, "a")).toEqual([true, false, true]);
    expect(dfCol(result, "b")).toEqual([true, false, true]);
  });

  test("Set as shared values", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30], y: [20, 30, 40] });
    const result = dataFrameIsin(df, new Set<Scalar>([20, 40]));
    expect(dfCol(result, "x")).toEqual([false, true, false]);
    expect(dfCol(result, "y")).toEqual([true, false, true]);
  });

  test("empty values → all false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameIsin(df, []);
    expect(dfCol(result, "a")).toEqual([false, false]);
    expect(dfCol(result, "b")).toEqual([false, false]);
  });

  test("NaN cells always false", () => {
    const df = DataFrame.fromColumns({ a: [Number.NaN, 1], b: [2, Number.NaN] });
    const result = dataFrameIsin(df, [Number.NaN, 1, 2]);
    expect(dfCol(result, "a")).toEqual([false, true]);
    expect(dfCol(result, "b")).toEqual([true, false]);
  });

  test("preserves index", () => {
    const df = new DataFrame(
      new Map([
        [
          "a",
          new Series<Scalar>({ data: [1, 2], index: new Index<Label>(["r1", "r2"]), name: "a" }),
        ],
      ]),
      new Index<Label>(["r1", "r2"]),
    );
    const result = dataFrameIsin(df, [1]);
    expect([...result.index.values]).toEqual(["r1", "r2"]);
  });

  test("preserves columns order", () => {
    const df = DataFrame.fromColumns({ b: [1, 2], a: [3, 4] });
    const result = dataFrameIsin(df, [1, 3]);
    expect([...result.columns.values]).toEqual(["b", "a"]);
  });

  test("string columns", () => {
    const df = DataFrame.fromColumns({ s: ["foo", "bar", "baz"] });
    const result = dataFrameIsin(df, ["foo", "baz"]);
    expect(dfCol(result, "s")).toEqual([true, false, true]);
  });

  test("null values match", () => {
    const df = DataFrame.fromColumns({ a: [null, 1, null] });
    const result = dataFrameIsin(df, [null]);
    expect(dfCol(result, "a")).toEqual([true, false, true]);
  });

  test("empty DataFrame → empty result", () => {
    const df = DataFrame.fromColumns({ a: [] as Scalar[] });
    const result = dataFrameIsin(df, [1, 2]);
    expect(dfCol(result, "a")).toEqual([]);
  });
});

// ─── dataFrameIsin — IsinDict ─────────────────────────────────────────────────

describe("dataFrameIsin — IsinDict (per-column)", () => {
  test("different lookups per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const result = dataFrameIsin(df, { a: [1, 3], b: [20] });
    expect(dfCol(result, "a")).toEqual([true, false, true]);
    expect(dfCol(result, "b")).toEqual([false, true, false]);
  });

  test("column absent from dict → all false for that column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameIsin(df, { a: [1, 2] });
    expect(dfCol(result, "a")).toEqual([true, true]);
    expect(dfCol(result, "b")).toEqual([false, false]);
  });

  test("all columns absent → all false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameIsin(df, {});
    expect(dfCol(result, "a")).toEqual([false, false]);
    expect(dfCol(result, "b")).toEqual([false, false]);
  });

  test("Set in dict values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
    const result = dataFrameIsin(df, { a: new Set<Scalar>([2]), b: ["y", "z"] });
    expect(dfCol(result, "a")).toEqual([false, true, false]);
    expect(dfCol(result, "b")).toEqual([false, true, true]);
  });

  test("NaN in column never matches even with NaN in dict", () => {
    const df = DataFrame.fromColumns({ a: [Number.NaN, 2, Number.NaN] });
    const result = dataFrameIsin(df, { a: [Number.NaN, 2] });
    expect(dfCol(result, "a")).toEqual([false, true, false]);
  });

  test("null matching in dict", () => {
    const df = DataFrame.fromColumns({ a: [null, 1, null] });
    const result = dataFrameIsin(df, { a: [null] });
    expect(dfCol(result, "a")).toEqual([true, false, true]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("isin — property-based", () => {
  test("result length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          maxLength: 30,
        }),
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          maxLength: 10,
        }),
        (data, lookup) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const result = isin(s, lookup as Scalar[]);
          return result.size === s.size;
        },
      ),
    );
  });

  test("all values are boolean", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          maxLength: 20,
        }),
        fc.array(fc.integer(), { maxLength: 10 }),
        (data, lookup) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const result = isin(s, lookup as Scalar[]);
          return [...result.values].every((v) => typeof v === "boolean");
        },
      ),
    );
  });

  test("isin(s, []) → all false for non-NaN data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          maxLength: 20,
        }),
        (data) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const result = isin(s, []);
          return [...result.values].every((v) => v === false);
        },
      ),
    );
  });

  test("isin(s, allValues) → all true for non-NaN elements", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const scalars = data as Scalar[];
          const s = new Series<Scalar>({ data: scalars });
          const lookup = [...new Set(scalars)];
          const result = isin(s, lookup);
          return [...result.values].every((v) => v === true);
        },
      ),
    );
  });

  test("dataFrameIsin result has same shape as input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 3, maxLength: 3 }),
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 3, maxLength: 3 }),
        fc.array(fc.integer(), { maxLength: 5 }),
        (colA, colB, lookup) => {
          const df = DataFrame.fromColumns({
            a: colA as Scalar[],
            b: colB as Scalar[],
          });
          const result = dataFrameIsin(df, lookup as Scalar[]);
          const [r1, c1] = result.shape;
          const [r2, c2] = df.shape;
          return r1 === r2 && c1 === c2;
        },
      ),
    );
  });
});
