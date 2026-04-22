/**
 * Tests for sort_ops — sort_values and sort_index for Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  sortIndexDataFrame,
  sortIndexSeries,
  sortValuesDataFrame,
  sortValuesSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── sortValuesSeries ─────────────────────────────────────────────────────────

describe("sortValuesSeries", () => {
  it("sorts numeric values ascending (default)", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    const sorted = sortValuesSeries(s);
    expect(sorted.values).toEqual([1, 2, 3]);
    expect(sorted.index.values).toEqual(["a", "c", "b"]);
  });

  it("sorts numeric values descending", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    const sorted = sortValuesSeries(s, { ascending: false });
    expect(sorted.values).toEqual([3, 2, 1]);
    expect(sorted.index.values).toEqual(["b", "c", "a"]);
  });

  it("sorts string values ascending", () => {
    const s = new Series({ data: ["banana", "apple", "cherry"] });
    const sorted = sortValuesSeries(s);
    expect(sorted.values).toEqual(["apple", "banana", "cherry"]);
  });

  it("places null at the end by default (naPosition='last')", () => {
    const s = new Series({ data: [3, null, 1] });
    const sorted = sortValuesSeries(s);
    expect(sorted.values).toEqual([1, 3, null]);
  });

  it("places null at the start when naPosition='first'", () => {
    const s = new Series({ data: [3, null, 1] });
    const sorted = sortValuesSeries(s, { naPosition: "first" });
    expect(sorted.values).toEqual([null, 1, 3]);
  });

  it("places NaN at the end by default", () => {
    const s = new Series({ data: [3, Number.NaN, 1] });
    const sorted = sortValuesSeries(s);
    expect(sorted.values[0]).toBe(1);
    expect(sorted.values[1]).toBe(3);
    expect(Number.isNaN(sorted.values[2] as number)).toBe(true);
  });

  it("ignoreIndex resets the index", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    const sorted = sortValuesSeries(s, { ignoreIndex: true });
    expect(sorted.values).toEqual([1, 2, 3]);
    expect(sorted.index.values).toEqual([0, 1, 2]);
  });

  it("preserves the series name", () => {
    const s = new Series({ data: [2, 1], name: "myname" });
    expect(sortValuesSeries(s).name).toBe("myname");
  });

  it("handles empty series", () => {
    const s = new Series({ data: [] });
    expect(sortValuesSeries(s).values).toEqual([]);
  });

  it("handles single element", () => {
    const s = new Series({ data: [42], index: ["x"] });
    const sorted = sortValuesSeries(s);
    expect(sorted.values).toEqual([42]);
    expect(sorted.index.values).toEqual(["x"]);
  });

  it("does not mutate the original series", () => {
    const s = new Series({ data: [3, 1, 2] });
    sortValuesSeries(s);
    expect(s.values).toEqual([3, 1, 2]);
  });

  it("property: sorted output has same values as input (set equality)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 0, maxLength: 30 }),
        (data) => {
          const s = new Series({ data });
          const sorted = sortValuesSeries(s);
          const original = [...data].sort((a, b) => a - b);
          return JSON.stringify(sorted.values) === JSON.stringify(original);
        },
      ),
    );
  });

  it("property: sorted output is non-decreasing for numbers", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const s = new Series({ data });
          const sorted = sortValuesSeries(s);
          const vals = sorted.values as number[];
          for (let i = 1; i < vals.length; i++) {
            if ((vals[i] as number) < (vals[i - 1] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── sortIndexSeries ──────────────────────────────────────────────────────────

describe("sortIndexSeries", () => {
  it("sorts by string index labels ascending", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    const sorted = sortIndexSeries(s);
    expect(sorted.index.values).toEqual(["a", "b", "c"]);
    expect(sorted.values).toEqual([1, 3, 2]);
  });

  it("sorts by string index labels descending", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    const sorted = sortIndexSeries(s, { ascending: false });
    expect(sorted.index.values).toEqual(["c", "b", "a"]);
    expect(sorted.values).toEqual([2, 3, 1]);
  });

  it("sorts by numeric index labels", () => {
    const s = new Series({ data: [30, 10, 20], index: [3, 1, 2] });
    const sorted = sortIndexSeries(s);
    expect(sorted.index.values).toEqual([1, 2, 3]);
    expect(sorted.values).toEqual([10, 20, 30]);
  });

  it("ignoreIndex resets the index", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    const sorted = sortIndexSeries(s, { ignoreIndex: true });
    expect(sorted.index.values).toEqual([0, 1, 2]);
    expect(sorted.values).toEqual([1, 3, 2]);
  });

  it("handles empty series", () => {
    const s = new Series({ data: [] });
    expect(sortIndexSeries(s).values).toEqual([]);
  });

  it("does not mutate the original", () => {
    const s = new Series({ data: [3, 1, 2], index: ["b", "a", "c"] });
    sortIndexSeries(s);
    expect(s.index.values).toEqual(["b", "a", "c"]);
  });
});

// ─── sortValuesDataFrame ──────────────────────────────────────────────────────

describe("sortValuesDataFrame", () => {
  it("sorts rows by a single column ascending", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2], b: [10, 30, 20] });
    const sorted = sortValuesDataFrame(df, "a");
    expect([...sorted.col("a").values]).toEqual([1, 2, 3]);
    expect([...sorted.col("b").values]).toEqual([30, 20, 10]);
  });

  it("sorts rows by a single column descending", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2], b: [10, 30, 20] });
    const sorted = sortValuesDataFrame(df, "a", { ascending: false });
    expect([...sorted.col("a").values]).toEqual([3, 2, 1]);
    expect([...sorted.col("b").values]).toEqual([10, 20, 30]);
  });

  it("sorts by multiple columns (compound key)", () => {
    const df = DataFrame.fromColumns({
      a: [1, 1, 2],
      b: [30, 10, 20],
    });
    const sorted = sortValuesDataFrame(df, ["a", "b"]);
    expect([...sorted.col("a").values]).toEqual([1, 1, 2]);
    expect([...sorted.col("b").values]).toEqual([10, 30, 20]);
  });

  it("supports per-column ascending flags", () => {
    const df = DataFrame.fromColumns({
      a: [1, 1, 2],
      b: [30, 10, 20],
    });
    // sort by a ascending, then b descending
    const sorted = sortValuesDataFrame(df, ["a", "b"], {
      ascending: [true, false],
    });
    expect([...sorted.col("a").values]).toEqual([1, 1, 2]);
    expect([...sorted.col("b").values]).toEqual([30, 10, 20]);
  });

  it("places null rows last by default", () => {
    const df = DataFrame.fromColumns({ v: [3, null, 1] as Scalar[] });
    const sorted = sortValuesDataFrame(df, "v");
    expect([...sorted.col("v").values]).toEqual([1, 3, null]);
  });

  it("places null rows first when naPosition='first'", () => {
    const df = DataFrame.fromColumns({ v: [3, null, 1] as Scalar[] });
    const sorted = sortValuesDataFrame(df, "v", { naPosition: "first" });
    expect([...sorted.col("v").values]).toEqual([null, 1, 3]);
  });

  it("preserves row index labels after sort", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2] }, { index: ["r2", "r0", "r1"] });
    const sorted = sortValuesDataFrame(df, "a");
    expect([...sorted.index.values]).toEqual(["r0", "r1", "r2"]);
  });

  it("ignoreIndex resets the row index", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2] }, { index: ["r2", "r0", "r1"] });
    const sorted = sortValuesDataFrame(df, "a", { ignoreIndex: true });
    expect([...sorted.index.values]).toEqual([0, 1, 2]);
    expect([...sorted.col("a").values]).toEqual([1, 2, 3]);
  });

  it("does not mutate the original DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2] });
    sortValuesDataFrame(df, "a");
    expect([...df.col("a").values]).toEqual([3, 1, 2]);
  });

  it("handles empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as Scalar[] });
    const sorted = sortValuesDataFrame(df, "a");
    expect(sorted.shape).toEqual([0, 1]);
  });

  it("property: sorted column is non-decreasing for integers", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const df = DataFrame.fromColumns({ v: data });
          const sorted = sortValuesDataFrame(df, "v");
          const vals = [...sorted.col("v").values] as number[];
          for (let i = 1; i < vals.length; i++) {
            if ((vals[i] as number) < (vals[i - 1] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── sortIndexDataFrame ───────────────────────────────────────────────────────

describe("sortIndexDataFrame", () => {
  it("sorts rows by index labels ascending", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] }, { index: ["b", "a", "c"] });
    const sorted = sortIndexDataFrame(df);
    expect([...sorted.index.values]).toEqual(["a", "b", "c"]);
    expect([...sorted.col("x").values]).toEqual([2, 1, 3]);
  });

  it("sorts rows by index labels descending", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] }, { index: ["b", "a", "c"] });
    const sorted = sortIndexDataFrame(df, { ascending: false });
    expect([...sorted.index.values]).toEqual(["c", "b", "a"]);
    expect([...sorted.col("x").values]).toEqual([3, 1, 2]);
  });

  it("sorts columns (axis=1) by name ascending", () => {
    const df = DataFrame.fromColumns({ z: [1], a: [2], m: [3] });
    const sorted = sortIndexDataFrame(df, { axis: 1 });
    expect([...sorted.columns.values]).toEqual(["a", "m", "z"]);
  });

  it("sorts columns (axis=1) by name descending", () => {
    const df = DataFrame.fromColumns({ z: [1], a: [2], m: [3] });
    const sorted = sortIndexDataFrame(df, { axis: 1, ascending: false });
    expect([...sorted.columns.values]).toEqual(["z", "m", "a"]);
  });

  it("ignoreIndex resets the row index to 0,1,2…", () => {
    const df = DataFrame.fromColumns({ x: [10, 20] }, { index: ["b", "a"] });
    const sorted = sortIndexDataFrame(df, { ignoreIndex: true });
    expect([...sorted.index.values]).toEqual([0, 1]);
    expect([...sorted.col("x").values]).toEqual([20, 10]);
  });

  it("already-sorted DataFrame is unchanged", () => {
    const df = DataFrame.fromColumns({ v: [1, 2, 3] }, { index: ["a", "b", "c"] });
    const sorted = sortIndexDataFrame(df);
    expect([...sorted.index.values]).toEqual(["a", "b", "c"]);
    expect([...sorted.col("v").values]).toEqual([1, 2, 3]);
  });

  it("does not mutate the original", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] }, { index: ["b", "a", "c"] });
    sortIndexDataFrame(df);
    expect([...df.index.values]).toEqual(["b", "a", "c"]);
  });

  it("handles empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as Scalar[] });
    expect(sortIndexDataFrame(df).shape).toEqual([0, 1]);
  });

  it("property: sorted index is non-decreasing for numeric labels", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 20 }),
        (indices) => {
          const df = DataFrame.fromColumns({ v: indices }, { index: indices });
          const sorted = sortIndexDataFrame(df);
          const idxVals = [...sorted.index.values] as number[];
          for (let i = 1; i < idxVals.length; i++) {
            if ((idxVals[i] as number) < (idxVals[i - 1] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
