/**
 * Tests for duplicated / drop_duplicates.
 *
 * Covers:
 * - Series: basic, keep="first"/"last"/false, name/index preservation
 * - DataFrame: basic, subset, keep="first"/"last"/false
 * - Edge cases: empty, single row, all duplicates, no duplicates
 * - Invalid subset column
 * - Property-based: output is subset of input; duplicatedSeries + dropDuplicatesSeries are consistent
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Index } from "../../src/core/base-index.ts";
import { DataFrame } from "../../src/core/frame.ts";
import { Series } from "../../src/core/series.ts";
import {
  dropDuplicatesDataFrame,
  dropDuplicatesSeries,
  duplicatedDataFrame,
  duplicatedSeries,
} from "../../src/stats/duplicated.ts";
import type { Scalar } from "../../src/types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function bools(s: Series<boolean>): boolean[] {
  return [...(s.values as readonly boolean[])];
}

function scalars<T extends Scalar>(s: Series<T>): T[] {
  return [...(s.values as readonly T[])];
}

// ─── Series: keep="first" (default) ───────────────────────────────────────────

describe("duplicatedSeries — keep=first", () => {
  test("no duplicates → all false", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(bools(duplicatedSeries(s))).toEqual([false, false, false]);
  });

  test("one duplicate → third element marked", () => {
    const s = new Series({ data: [1, 2, 1] });
    expect(bools(duplicatedSeries(s))).toEqual([false, false, true]);
  });

  test("multiple duplicates", () => {
    const s = new Series({ data: [1, 2, 1, 3, 2] });
    expect(bools(duplicatedSeries(s))).toEqual([false, false, true, false, true]);
  });

  test("all same → first is false, rest true", () => {
    const s = new Series({ data: ["a", "a", "a"] });
    expect(bools(duplicatedSeries(s))).toEqual([false, true, true]);
  });

  test("null values are treated as equal", () => {
    const s = new Series({ data: [null, 1, null] });
    expect(bools(duplicatedSeries(s))).toEqual([false, false, true]);
  });

  test("NaN values are treated as equal", () => {
    const s = new Series({ data: [Number.NaN, 1, Number.NaN] });
    expect(bools(duplicatedSeries(s))).toEqual([false, false, true]);
  });

  test("name is preserved", () => {
    const s = new Series({ data: [1, 2, 1], name: "x" });
    expect(duplicatedSeries(s).name).toBe("x");
  });

  test("custom index is preserved", () => {
    const s = new Series({ data: [1, 2, 1], index: new Index(["a", "b", "c"]) });
    expect([...duplicatedSeries(s).index.values]).toEqual(["a", "b", "c"]);
  });

  test("empty series → empty result", () => {
    const s = new Series({ data: [] });
    expect(bools(duplicatedSeries(s))).toEqual([]);
  });

  test("single element → not duplicate", () => {
    const s = new Series({ data: [42] });
    expect(bools(duplicatedSeries(s))).toEqual([false]);
  });
});

// ─── Series: keep="last" ──────────────────────────────────────────────────────

describe("duplicatedSeries — keep=last", () => {
  test("[1,2,1] → [true,false,false]", () => {
    const s = new Series({ data: [1, 2, 1] });
    expect(bools(duplicatedSeries(s, { keep: "last" }))).toEqual([true, false, false]);
  });

  test("[1,2,1,3,2] → [true,true,false,false,false]", () => {
    const s = new Series({ data: [1, 2, 1, 3, 2] });
    expect(bools(duplicatedSeries(s, { keep: "last" }))).toEqual([true, true, false, false, false]);
  });

  test("all same → last false, rest true", () => {
    const s = new Series({ data: ["a", "a", "a"] });
    expect(bools(duplicatedSeries(s, { keep: "last" }))).toEqual([true, true, false]);
  });
});

// ─── Series: keep=false ───────────────────────────────────────────────────────

describe("duplicatedSeries — keep=false", () => {
  test("[1,2,1] → [true,false,true]", () => {
    const s = new Series({ data: [1, 2, 1] });
    expect(bools(duplicatedSeries(s, { keep: false }))).toEqual([true, false, true]);
  });

  test("[1,2,3] → [false,false,false]", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(bools(duplicatedSeries(s, { keep: false }))).toEqual([false, false, false]);
  });

  test("all same → all true", () => {
    const s = new Series({ data: ["a", "a", "a"] });
    expect(bools(duplicatedSeries(s, { keep: false }))).toEqual([true, true, true]);
  });
});

// ─── dropDuplicatesSeries ─────────────────────────────────────────────────────

describe("dropDuplicatesSeries", () => {
  test("keep=first (default)", () => {
    const s = new Series({ data: [1, 2, 1, 3] });
    expect(scalars(dropDuplicatesSeries(s))).toEqual([1, 2, 3]);
  });

  test("keep=last", () => {
    const s = new Series({ data: [1, 2, 1, 3] });
    expect(scalars(dropDuplicatesSeries(s, { keep: "last" }))).toEqual([2, 1, 3]);
  });

  test("keep=false", () => {
    const s = new Series({ data: [1, 2, 1, 3] });
    expect(scalars(dropDuplicatesSeries(s, { keep: false }))).toEqual([2, 3]);
  });

  test("no duplicates → unchanged values", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(scalars(dropDuplicatesSeries(s))).toEqual([1, 2, 3]);
  });

  test("empty → empty", () => {
    const s = new Series({ data: [] });
    expect(dropDuplicatesSeries(s).size).toBe(0);
  });

  test("index is preserved (position-based)", () => {
    const s = new Series({ data: [1, 2, 1], index: new Index(["a", "b", "c"]) });
    const result = dropDuplicatesSeries(s);
    expect(scalars(result)).toEqual([1, 2]);
    expect([...result.index.values]).toEqual(["a", "b"]);
  });

  test("name is preserved", () => {
    const s = new Series({ data: [1, 2, 1], name: "col" });
    expect(dropDuplicatesSeries(s).name).toBe("col");
  });
});

// ─── DataFrame: keep="first" (default) ───────────────────────────────────────

describe("duplicatedDataFrame — keep=first", () => {
  const df = DataFrame.fromColumns({
    a: [1, 2, 1, 3],
    b: ["x", "y", "x", "z"],
  });

  test("no options → first occurrence kept", () => {
    expect(bools(duplicatedDataFrame(df))).toEqual([false, false, true, false]);
  });

  test("subset=['a'] — row 2 is dup of row 0 on column a", () => {
    const df2 = DataFrame.fromColumns({ a: [1, 2, 1, 2], b: ["x", "y", "z", "w"] });
    expect(bools(duplicatedDataFrame(df2, { subset: ["a"] }))).toEqual([false, false, true, true]);
  });

  test("subset=['b'] — independent of 'a'", () => {
    const df2 = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: ["x", "y", "x", "y"] });
    expect(bools(duplicatedDataFrame(df2, { subset: ["b"] }))).toEqual([false, false, true, true]);
  });

  test("all unique → all false", () => {
    const df2 = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(bools(duplicatedDataFrame(df2))).toEqual([false, false, false]);
  });

  test("all same rows → first false, rest true", () => {
    const df2 = DataFrame.fromColumns({ a: [1, 1, 1], b: ["x", "x", "x"] });
    expect(bools(duplicatedDataFrame(df2))).toEqual([false, true, true]);
  });

  test("empty DataFrame → empty mask", () => {
    const df2 = DataFrame.fromColumns({ a: [] as number[] });
    expect(bools(duplicatedDataFrame(df2))).toEqual([]);
  });

  test("single row → not duplicate", () => {
    const df2 = DataFrame.fromColumns({ a: [1], b: ["x"] });
    expect(bools(duplicatedDataFrame(df2))).toEqual([false]);
  });

  test("null/NaN in rows treated as equal", () => {
    const df2 = DataFrame.fromColumns({ a: [null, 1, null] as (number | null)[] });
    expect(bools(duplicatedDataFrame(df2))).toEqual([false, false, true]);
  });

  test("invalid subset column throws RangeError", () => {
    expect(() => duplicatedDataFrame(df, { subset: ["nonexistent"] })).toThrow(RangeError);
  });

  test("row index preserved on result", () => {
    const idx = new Index(["r0", "r1", "r2", "r3"]);
    const df2 = new DataFrame(
      new Map<string, Series<Scalar>>([
        ["a", new Series<Scalar>({ data: [1, 2, 1, 3], index: idx })],
        ["b", new Series<Scalar>({ data: ["x", "y", "x", "z"], index: idx })],
      ]),
      idx,
    );
    expect([...duplicatedDataFrame(df2).index.values]).toEqual(["r0", "r1", "r2", "r3"]);
  });
});

// ─── DataFrame: keep="last" ───────────────────────────────────────────────────

describe("duplicatedDataFrame — keep=last", () => {
  test("[1,2,1,3] → first row 0 is dup, row 2 kept", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 1, 3] });
    expect(bools(duplicatedDataFrame(df, { keep: "last" }))).toEqual([true, false, false, false]);
  });

  test("all same → last false, rest true", () => {
    const df = DataFrame.fromColumns({ a: [5, 5, 5] });
    expect(bools(duplicatedDataFrame(df, { keep: "last" }))).toEqual([true, true, false]);
  });
});

// ─── DataFrame: keep=false ────────────────────────────────────────────────────

describe("duplicatedDataFrame — keep=false", () => {
  test("[1,2,1,3] → first and third rows are both marked", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 1, 3] });
    expect(bools(duplicatedDataFrame(df, { keep: false }))).toEqual([true, false, true, false]);
  });

  test("all unique → all false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(bools(duplicatedDataFrame(df, { keep: false }))).toEqual([false, false, false]);
  });

  test("all same → all true", () => {
    const df = DataFrame.fromColumns({ a: [7, 7, 7] });
    expect(bools(duplicatedDataFrame(df, { keep: false }))).toEqual([true, true, true]);
  });
});

// ─── dropDuplicatesDataFrame ──────────────────────────────────────────────────

describe("dropDuplicatesDataFrame", () => {
  test("basic keep=first", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 1, 3], b: ["x", "y", "x", "z"] });
    const result = dropDuplicatesDataFrame(df);
    expect(result.shape).toEqual([3, 2]);
    expect([...(result.col("a").values as readonly number[])]).toEqual([1, 2, 3]);
  });

  test("keep=last", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 1, 3] });
    const result = dropDuplicatesDataFrame(df, { keep: "last" });
    expect([...(result.col("a").values as readonly number[])]).toEqual([2, 1, 3]);
  });

  test("keep=false — removes all occurrences", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 1, 3] });
    const result = dropDuplicatesDataFrame(df, { keep: false });
    expect([...(result.col("a").values as readonly number[])]).toEqual([2, 3]);
  });

  test("subset=['a'] only — different 'b' still considered dup on 'a'", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 1], b: ["x", "y", "z"] });
    const result = dropDuplicatesDataFrame(df, { subset: ["a"] });
    expect(result.shape[0]).toBe(2);
    expect([...(result.col("a").values as readonly number[])]).toEqual([1, 2]);
  });

  test("no duplicates → same shape", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(dropDuplicatesDataFrame(df).shape[0]).toBe(3);
  });

  test("all same → single row (keep=first)", () => {
    const df = DataFrame.fromColumns({ a: [9, 9, 9] });
    expect(dropDuplicatesDataFrame(df).shape[0]).toBe(1);
  });

  test("empty → empty", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    expect(dropDuplicatesDataFrame(df).shape[0]).toBe(0);
  });

  test("columns are preserved", () => {
    const df = DataFrame.fromColumns({ a: [1, 1], b: [2, 2], c: [3, 3] });
    const result = dropDuplicatesDataFrame(df);
    expect([...result.columns.values]).toEqual(["a", "b", "c"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based: duplicatedSeries", () => {
  test("output size equals input size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          return duplicatedSeries(s).size === s.size;
        },
      ),
    );
  });

  test("dropDuplicatesSeries result has no duplicates (keep=first)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const deduped = dropDuplicatesSeries(s);
          const mask = duplicatedSeries(deduped);
          return (mask.values as readonly boolean[]).every((v) => !v);
        },
      ),
    );
  });

  test("dropDuplicatesSeries result is a subset of input values (keep=first)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const deduped = dropDuplicatesSeries(s);
          const inputSet = new Set(arr.map(String));
          return (deduped.values as readonly number[]).every((v) => inputSet.has(String(v)));
        },
      ),
    );
  });

  test("keep=first result size <= input size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          return dropDuplicatesSeries(s).size <= s.size;
        },
      ),
    );
  });
});

describe("property-based: duplicatedDataFrame", () => {
  test("mask size equals DataFrame row count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 15 }),
        (arr) => {
          const df = DataFrame.fromColumns({ x: arr });
          return duplicatedDataFrame(df).size === arr.length;
        },
      ),
    );
  });

  test("dropDuplicatesDataFrame result has no duplicates", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 0, maxLength: 15 }),
        (arr) => {
          const df = DataFrame.fromColumns({ x: arr });
          const deduped = dropDuplicatesDataFrame(df);
          const mask = duplicatedDataFrame(deduped);
          return (mask.values as readonly boolean[]).every((v) => !v);
        },
      ),
    );
  });

  test("result row count <= input row count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 15 }),
        (arr) => {
          const df = DataFrame.fromColumns({ x: arr });
          return dropDuplicatesDataFrame(df).shape[0] <= arr.length;
        },
      ),
    );
  });

  test("keep=false: mask count >= keep=first mask count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 0, maxLength: 15 }),
        (arr) => {
          const df = DataFrame.fromColumns({ x: arr });
          const firstCount = (
            duplicatedDataFrame(df, { keep: "first" }).values as boolean[]
          ).filter(Boolean).length;
          const falseCount = (duplicatedDataFrame(df, { keep: false }).values as boolean[]).filter(
            Boolean,
          ).length;
          return falseCount >= firstCount;
        },
      ),
    );
  });
});
