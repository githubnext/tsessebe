/**
 * Tests for explode / explodeDataFrame.
 *
 * Covers:
 * - Series: scalar, null, empty-array, single-element, multi-element lists
 * - Series: ignoreIndex=true
 * - Series: string/number/mixed element types
 * - DataFrame: single explode column, non-exploded columns repeat
 * - DataFrame: multi-column simultaneous explode
 * - DataFrame: ignoreIndex=true
 * - DataFrame: error on unknown column
 * - DataFrame: named index preserved
 * - Edge cases: empty Series, empty DataFrame, all-scalar Series
 * - Property-based: output length matches sum of element counts
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { Index } from "../../src/core/base-index.ts";
import { Series } from "../../src/core/series.ts";
import type { Label, Scalar } from "../../src/types.ts";
import { explodeDataFrame, explodeSeries } from "../../src/stats/explode.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function vals<T extends Scalar>(s: Series<T>): T[] {
  return [...s.values];
}

function idxVals(s: Series<Scalar>): Label[] {
  return [...s.index.values];
}

function colVals(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

function dfIdxVals(df: DataFrame): Label[] {
  return [...df.index.values];
}

// ─── explodeSeries ────────────────────────────────────────────────────────────

describe("explodeSeries", () => {
  test("scalar elements are unchanged", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([1, 2, 3]);
    expect(idxVals(out)).toEqual([0, 1, 2]);
  });

  test("array element explodes to multiple rows", () => {
    const s = new Series({ data: [[1, 2, 3]] as unknown as Scalar[] });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([1, 2, 3]);
    expect(idxVals(out)).toEqual([0, 0, 0]);
  });

  test("null element stays as null row", () => {
    const s = new Series({ data: [null] as Scalar[] });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([null]);
    expect(idxVals(out)).toEqual([0]);
  });

  test("empty array becomes single null row", () => {
    const s = new Series({ data: [[], [1, 2]] as unknown as Scalar[] });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([null, 1, 2]);
    expect(idxVals(out)).toEqual([0, 1, 1]);
  });

  test("mixed: arrays, scalars, null, empty", () => {
    const s = new Series({
      data: [[1, 2, 3], "foo", [], [3, 4]] as unknown as Scalar[],
      index: new Index<Label>(["a", "b", "c", "d"]),
    });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([1, 2, 3, "foo", null, 3, 4]);
    expect(idxVals(out)).toEqual(["a", "a", "a", "b", "c", "d", "d"]);
  });

  test("ignoreIndex replaces index with RangeIndex", () => {
    const s = new Series({
      data: [[1, 2], [3]] as unknown as Scalar[],
      index: new Index<Label>(["x", "y"]),
    });
    const out = explodeSeries(s, { ignoreIndex: true });
    expect(vals(out)).toEqual([1, 2, 3]);
    expect(idxVals(out)).toEqual([0, 1, 2]);
  });

  test("name is preserved", () => {
    const s = new Series({ data: [[1, 2]] as unknown as Scalar[], name: "myCol" });
    const out = explodeSeries(s);
    expect(out.name).toBe("myCol");
  });

  test("empty Series returns empty Series", () => {
    const s = new Series({ data: [] as Scalar[] });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([]);
    expect(out.size).toBe(0);
  });

  test("nested arrays explode only one level deep", () => {
    const s = new Series({ data: [[[1, 2], [3]]] as unknown as Scalar[] });
    const out = explodeSeries(s);
    // Inner arrays are Scalar (as object) — not re-exploded
    expect(out.size).toBe(2);
  });

  test("string elements (non-array scalars) are unchanged", () => {
    const s = new Series({ data: ["hello", "world"] as Scalar[] });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual(["hello", "world"]);
  });

  test("undefined element treated same as null", () => {
    const s = new Series({ data: [undefined] as Scalar[] });
    const out = explodeSeries(s);
    expect(out.size).toBe(1);
    expect(out.values[0]).toBeUndefined();
  });

  test("multi-element list with custom index labels", () => {
    const s = new Series({
      data: [[10, 20], [30]] as unknown as Scalar[],
      index: new Index<Label>([100, 200]),
    });
    const out = explodeSeries(s);
    expect(vals(out)).toEqual([10, 20, 30]);
    expect(idxVals(out)).toEqual([100, 100, 200]);
  });
});

// ─── explodeDataFrame ─────────────────────────────────────────────────────────

describe("explodeDataFrame", () => {
  test("single column explode, other columns repeat", () => {
    const df = DataFrame.fromColumns({
      a: [[1, 2], [3, 4]] as unknown as Scalar[],
      b: [10, 20] as Scalar[],
    });
    const out = explodeDataFrame(df, "a");
    expect(colVals(out, "a")).toEqual([1, 2, 3, 4]);
    expect(colVals(out, "b")).toEqual([10, 10, 20, 20]);
    expect(dfIdxVals(out)).toEqual([0, 0, 1, 1]);
  });

  test("null in explode column stays null", () => {
    const df = DataFrame.fromColumns({
      a: [null, [1, 2]] as unknown as Scalar[],
      b: ["x", "y"] as Scalar[],
    });
    const out = explodeDataFrame(df, "a");
    expect(colVals(out, "a")).toEqual([null, 1, 2]);
    expect(colVals(out, "b")).toEqual(["x", "y", "y"]);
  });

  test("empty array in explode column becomes null row", () => {
    const df = DataFrame.fromColumns({
      a: [[], [1]] as unknown as Scalar[],
      b: ["p", "q"] as Scalar[],
    });
    const out = explodeDataFrame(df, "a");
    expect(colVals(out, "a")).toEqual([null, 1]);
    expect(colVals(out, "b")).toEqual(["p", "q"]);
  });

  test("scalar in explode column is unchanged", () => {
    const df = DataFrame.fromColumns({
      a: [42, [1, 2]] as unknown as Scalar[],
      b: ["x", "y"] as Scalar[],
    });
    const out = explodeDataFrame(df, "a");
    expect(colVals(out, "a")).toEqual([42, 1, 2]);
    expect(colVals(out, "b")).toEqual(["x", "y", "y"]);
  });

  test("ignoreIndex=true replaces index", () => {
    const df = DataFrame.fromColumns({
      a: [[1, 2], [3]] as unknown as Scalar[],
    });
    const out = explodeDataFrame(df, "a", { ignoreIndex: true });
    expect(dfIdxVals(out)).toEqual([0, 1, 2]);
  });

  test("named index labels are repeated", () => {
    const df = new DataFrame(
      new Map([["x", new Series({ data: [[1, 2], [3]] as unknown as Scalar[], name: "x" })]]),
      new Index<Label>(["r0", "r1"]),
    );
    const out = explodeDataFrame(df, "x");
    expect(dfIdxVals(out)).toEqual(["r0", "r0", "r1"]);
  });

  test("column order is preserved", () => {
    const df = DataFrame.fromColumns({
      c: ["x", "y"] as Scalar[],
      a: [[1, 2], [3]] as unknown as Scalar[],
      b: [10, 20] as Scalar[],
    });
    const out = explodeDataFrame(df, "a");
    expect([...out.columns.values]).toEqual(["c", "a", "b"]);
  });

  test("throws on unknown column", () => {
    const df = DataFrame.fromColumns({ a: [[1, 2]] as unknown as Scalar[] });
    expect(() => explodeDataFrame(df, "z")).toThrow(/Column "z" not found/);
  });

  test("empty DataFrame returns empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as Scalar[] });
    const out = explodeDataFrame(df, "a");
    expect(out.shape[0]).toBe(0);
  });

  test("multi-column explode: two columns exploded simultaneously", () => {
    const df = DataFrame.fromColumns({
      a: [[1, 2], [3, 4]] as unknown as Scalar[],
      b: [["x", "y"], ["p", "q"]] as unknown as Scalar[],
      c: [100, 200] as Scalar[],
    });
    const out = explodeDataFrame(df, ["a", "b"]);
    expect(colVals(out, "a")).toEqual([1, 2, 3, 4]);
    expect(colVals(out, "b")).toEqual(["x", "y", "p", "q"]);
    expect(colVals(out, "c")).toEqual([100, 100, 200, 200]);
  });

  test("multi-column explode with null in one column", () => {
    const df = DataFrame.fromColumns({
      a: [null, [1, 2]] as unknown as Scalar[],
      b: [null, ["p", "q"]] as unknown as Scalar[],
    });
    const out = explodeDataFrame(df, ["a", "b"]);
    expect(colVals(out, "a")).toEqual([null, 1, 2]);
    expect(colVals(out, "b")).toEqual([null, "p", "q"]);
  });

  test("explode accepts string[] column argument", () => {
    const df = DataFrame.fromColumns({ a: [[1, 2], [3]] as unknown as Scalar[] });
    const out = explodeDataFrame(df, ["a"]);
    expect(colVals(out, "a")).toEqual([1, 2, 3]);
  });

  test("single-row DataFrame with list column", () => {
    const df = DataFrame.fromColumns({ a: [[10, 20, 30]] as unknown as Scalar[], b: [99] as Scalar[] });
    const out = explodeDataFrame(df, "a");
    expect(colVals(out, "a")).toEqual([10, 20, 30]);
    expect(colVals(out, "b")).toEqual([99, 99, 99]);
    expect(dfIdxVals(out)).toEqual([0, 0, 0]);
  });

  test("all rows have scalar values — DataFrame unchanged in shape", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[], b: [4, 5, 6] as Scalar[] });
    const out = explodeDataFrame(df, "a");
    expect(out.shape).toEqual([3, 2]);
    expect(colVals(out, "a")).toEqual([1, 2, 3]);
  });
});

// ─── property-based ───────────────────────────────────────────────────────────

describe("explodeSeries — property-based", () => {
  test("output length equals sum of element counts", () => {
    const elementCount = (v: unknown): number => {
      if (Array.isArray(v)) {
        return v.length === 0 ? 1 : v.length;
      }
      return 1;
    };

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer(),
            fc.constant(null),
            fc.array(fc.integer(), { minLength: 0, maxLength: 5 }),
          ),
          { minLength: 0, maxLength: 20 },
        ),
        (data) => {
          const s = new Series({ data: data as unknown as Scalar[] });
          const out = explodeSeries(s);
          const expected = data.reduce((sum: number, v) => sum + elementCount(v), 0);
          return out.size === expected;
        },
      ),
    );
  });

  test("ignoreIndex produces contiguous RangeIndex", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.integer(), fc.array(fc.integer(), { minLength: 1, maxLength: 4 })),
          { minLength: 1, maxLength: 15 },
        ),
        (data) => {
          const s = new Series({ data: data as unknown as Scalar[] });
          const out = explodeSeries(s, { ignoreIndex: true });
          const idxArr = idxVals(out);
          for (let i = 0; i < idxArr.length; i++) {
            if (idxArr[i] !== i) return false;
          }
          return true;
        },
      ),
    );
  });

  test("source positions are non-decreasing", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer(),
            fc.constant(null),
            fc.array(fc.integer(), { minLength: 0, maxLength: 5 }),
          ),
          { minLength: 0, maxLength: 20 },
        ),
        (data) => {
          const s = new Series({
            data: data as unknown as Scalar[],
            index: new Index<Label>(data.map((_, i) => i)),
          });
          const out = explodeSeries(s);
          const idx = idxVals(out) as number[];
          for (let i = 1; i < idx.length; i++) {
            if ((idx[i] as number) < (idx[i - 1] as number)) return false;
          }
          return true;
        },
      ),
    );
  });

  test("exploding all-scalar Series leaves values unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          minLength: 0,
          maxLength: 30,
        }),
        (data) => {
          const s = new Series({ data: data as Scalar[] });
          const out = explodeSeries(s);
          return (
            out.size === s.size &&
            out.values.every((v, i) => v === s.values[i])
          );
        },
      ),
    );
  });
});
