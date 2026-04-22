/**
 * Tests for rename_ops — renameSeriesIndex, renameDataFrame, addPrefix/addSuffix,
 * setAxisSeries, setAxisDataFrame, seriesToFrame.
 *
 * Covers:
 * - renameSeriesIndex: mapping, function, partial mapping
 * - renameDataFrame: columns mapping, index mapping, both combined
 * - addPrefixDataFrame / addSuffixDataFrame
 * - addPrefixSeries / addSuffixSeries
 * - setAxisSeries / setAxisDataFrame (axis 0 and 1)
 * - seriesToFrame: default name, explicit name, fallback to "0"
 * - Error paths for mismatched label counts
 * - Property-based: rename/set_axis preserve values
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  addPrefixDataFrame,
  addPrefixSeries,
  addSuffixDataFrame,
  addSuffixSeries,
  renameDataFrame,
  renameSeriesIndex,
  seriesToFrame,
  setAxisDataFrame,
  setAxisSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── renameSeriesIndex ────────────────────────────────────────────────────────

describe("renameSeriesIndex", () => {
  test("rename with Record mapping — partial", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = renameSeriesIndex(s, { a: "x", c: "z" });
    expect([...result.index.values]).toEqual(["x", "b", "z"]);
    expect([...result.values]).toEqual([1, 2, 3]);
  });

  test("rename with function mapper", () => {
    const s = new Series<Scalar>({ data: [10, 20], index: ["foo", "bar"] });
    const result = renameSeriesIndex(s, (l) => String(l).toUpperCase());
    expect([...result.index.values]).toEqual(["FOO", "BAR"]);
  });

  test("rename does not mutate original", () => {
    const s = new Series<Scalar>({ data: [1], index: ["a"] });
    renameSeriesIndex(s, { a: "z" });
    expect(s.index.at(0)).toBe("a");
  });

  test("rename preserves name and dtype", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: ["a", "b"], name: "col" });
    const r = renameSeriesIndex(s, { a: "x" });
    expect(r.name).toBe("col");
  });

  test("rename with identity mapping returns same labels", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: ["p", "q", "r"] });
    const r = renameSeriesIndex(s, {});
    expect([...r.index.values]).toEqual(["p", "q", "r"]);
  });
});

// ─── renameDataFrame ──────────────────────────────────────────────────────────

describe("renameDataFrame", () => {
  test("rename columns via Record", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = renameDataFrame(df, { columns: { a: "x", b: "y" } });
    expect([...result.columns.values]).toEqual(["x", "y"]);
    expect([...result.col("x").values]).toEqual([1, 2]);
    expect([...result.col("y").values]).toEqual([3, 4]);
  });

  test("rename columns via function", () => {
    const df = DataFrame.fromColumns({ alpha: [1], beta: [2] });
    const result = renameDataFrame(df, { columns: (c) => String(c).slice(0, 1) });
    expect([...result.columns.values]).toEqual(["a", "b"]);
  });

  test("rename index labels via Record", () => {
    const df = DataFrame.fromColumns({ v: [10, 20] }, { index: ["r0", "r1"] });
    const result = renameDataFrame(df, { index: { r0: "row0", r1: "row1" } });
    expect([...result.index.values]).toEqual(["row0", "row1"]);
  });

  test("rename both columns and index simultaneously", () => {
    const df = DataFrame.fromColumns({ a: [1] }, { index: ["x"] });
    const result = renameDataFrame(df, { columns: { a: "A" }, index: { x: "X" } });
    expect([...result.columns.values]).toEqual(["A"]);
    expect(result.index.at(0)).toBe("X");
  });

  test("partial rename leaves other columns unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2], c: [3] });
    const result = renameDataFrame(df, { columns: { b: "B" } });
    expect([...result.columns.values]).toEqual(["a", "B", "c"]);
  });

  test("values are preserved after rename", () => {
    const df = DataFrame.fromColumns({ x: [7, 8, 9] });
    const result = renameDataFrame(df, { columns: { x: "y" } });
    expect([...result.col("y").values]).toEqual([7, 8, 9]);
  });
});

// ─── addPrefixDataFrame / addSuffixDataFrame ───────────────────────────────────

describe("addPrefixDataFrame", () => {
  test("adds prefix to all columns", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect([...addPrefixDataFrame(df, "col_").columns.values]).toEqual(["col_a", "col_b"]);
  });

  test("empty prefix leaves columns unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect([...addPrefixDataFrame(df, "").columns.values]).toEqual(["a", "b"]);
  });

  test("values preserved", () => {
    const df = DataFrame.fromColumns({ x: [99] });
    expect([...addPrefixDataFrame(df, "p_").col("p_x").values]).toEqual([99]);
  });
});

describe("addSuffixDataFrame", () => {
  test("adds suffix to all columns", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect([...addSuffixDataFrame(df, "_v1").columns.values]).toEqual(["a_v1", "b_v1"]);
  });

  test("empty suffix leaves columns unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    expect([...addSuffixDataFrame(df, "").columns.values]).toEqual(["a"]);
  });
});

// ─── addPrefixSeries / addSuffixSeries ────────────────────────────────────────

describe("addPrefixSeries", () => {
  test("adds prefix to all index labels", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: ["a", "b"] });
    expect([...addPrefixSeries(s, "x_").index.values]).toEqual(["x_a", "x_b"]);
  });

  test("values preserved", () => {
    const s = new Series<Scalar>({ data: [10, 20], index: ["a", "b"] });
    expect([...addPrefixSeries(s, "p_").values]).toEqual([10, 20]);
  });
});

describe("addSuffixSeries", () => {
  test("adds suffix to all index labels", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: ["a", "b"] });
    expect([...addSuffixSeries(s, "_end").index.values]).toEqual(["a_end", "b_end"]);
  });
});

// ─── setAxisSeries ────────────────────────────────────────────────────────────

describe("setAxisSeries", () => {
  test("replaces index with new labels", () => {
    const s = new Series<Scalar>({ data: [10, 20, 30] });
    const r = setAxisSeries(s, ["x", "y", "z"]);
    expect([...r.index.values]).toEqual(["x", "y", "z"]);
    expect([...r.values]).toEqual([10, 20, 30]);
  });

  test("preserves name", () => {
    const s = new Series<Scalar>({ data: [1], name: "col" });
    expect(setAxisSeries(s, ["a"]).name).toBe("col");
  });

  test("throws on length mismatch", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(() => setAxisSeries(s, ["a", "b"])).toThrow(RangeError);
  });

  test("does not mutate original", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: ["a", "b"] });
    setAxisSeries(s, ["x", "y"]);
    expect(s.index.at(0)).toBe("a");
  });
});

// ─── setAxisDataFrame ─────────────────────────────────────────────────────────

describe("setAxisDataFrame", () => {
  test("axis=0 replaces row index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const r = setAxisDataFrame(df, ["r0", "r1"], 0);
    expect([...r.index.values]).toEqual(["r0", "r1"]);
    expect([...r.col("a").values]).toEqual([1, 2]);
  });

  test("axis=1 replaces column labels", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const r = setAxisDataFrame(df, ["x", "y"], 1);
    expect([...r.columns.values]).toEqual(["x", "y"]);
    expect([...r.col("x").values]).toEqual([1, 2]);
  });

  test(`axis="index" same as axis=0`, () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const r = setAxisDataFrame(df, ["p", "q"], "index");
    expect([...r.index.values]).toEqual(["p", "q"]);
  });

  test(`axis="columns" same as axis=1`, () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const r = setAxisDataFrame(df, ["z"], "columns");
    expect([...r.columns.values]).toEqual(["z"]);
  });

  test("throws when row label count mismatches", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(() => setAxisDataFrame(df, ["only_one"], 0)).toThrow(RangeError);
  });

  test("throws when column label count mismatches", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect(() => setAxisDataFrame(df, ["only_one"], 1)).toThrow(RangeError);
  });
});

// ─── seriesToFrame ────────────────────────────────────────────────────────────

describe("seriesToFrame", () => {
  test("uses Series name as column", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], name: "score" });
    const df = seriesToFrame(s);
    expect([...df.columns.values]).toEqual(["score"]);
    expect([...df.col("score").values]).toEqual([1, 2, 3]);
  });

  test("explicit name overrides Series name", () => {
    const s = new Series<Scalar>({ data: [1, 2], name: "old" });
    const df = seriesToFrame(s, "new");
    expect([...df.columns.values]).toEqual(["new"]);
  });

  test("falls back to '0' when Series has no name", () => {
    const s = new Series<Scalar>({ data: [5, 6] });
    const df = seriesToFrame(s);
    expect([...df.columns.values]).toEqual(["0"]);
    expect([...df.col("0").values]).toEqual([5, 6]);
  });

  test("preserves index", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: ["a", "b"] });
    const df = seriesToFrame(s);
    expect([...df.index.values]).toEqual(["a", "b"]);
  });

  test("null name falls back to '0'", () => {
    const s = new Series<Scalar>({ data: [1] });
    const df = seriesToFrame(s, null);
    expect([...df.columns.values]).toEqual(["0"]);
  });
});

// ─── Property-based ───────────────────────────────────────────────────────────

describe("rename_ops property tests", () => {
  test("renameSeriesIndex preserves values and size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        (data) => {
          const s = new Series<Scalar>({ data });
          const r = renameSeriesIndex(s, (l) => `r_${String(l)}`);
          expect(r.size).toBe(s.size);
          expect([...r.values]).toEqual([...s.values]);
        },
      ),
    );
  });

  test("setAxisSeries sets exactly the supplied labels", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 8 }),
        (data) => {
          const labels = data.map((_, i) => `lbl${i}`);
          const s = new Series<Scalar>({ data });
          const r = setAxisSeries(s, labels);
          expect([...r.index.values]).toEqual(labels);
          expect([...r.values]).toEqual([...s.values]);
        },
      ),
    );
  });

  test("seriesToFrame single column contains original values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.constant(null)), { minLength: 0, maxLength: 10 }),
        (data) => {
          const s = new Series<Scalar>({ data, name: "v" });
          const df = seriesToFrame(s);
          expect([...df.col("v").values]).toEqual([...s.values]);
        },
      ),
    );
  });
});
