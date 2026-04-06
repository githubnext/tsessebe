/**
 * Tests for combine_first — patch missing values from another Series/DataFrame.
 *
 * Covers:
 * - Series: basic combine, index union, self values take priority
 * - Series: all-null self, no-overlap indices, identical indices
 * - Series: NaN treated as missing, name preserved
 * - DataFrame: basic combine, row/col union
 * - DataFrame: new columns from other, new rows from other
 * - DataFrame: overlapping and non-overlapping cells
 * - Edge cases: empty inputs
 * - Property-based: result contains no missing values where either input had a value
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { Series } from "../../src/core/series.ts";
import { Index } from "../../src/core/base-index.ts";
import {
  combineFirstDataFrame,
  combineFirstSeries,
} from "../../src/stats/combine_first.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function sv(s: Series<unknown>, idx: unknown[]): unknown[] {
  return idx.map((lbl) => {
    const pos = s.index.getLoc(lbl as number | string | boolean | null);
    const p = Array.isArray(pos) ? (pos[0] ?? 0) : pos;
    return s.values[p];
  });
}

// ─── Series ───────────────────────────────────────────────────────────────────

describe("combineFirstSeries", () => {
  test("basic: fills null in self from other at same label", () => {
    const a = new Series({ data: [1, null, 3], index: ["x", "y", "z"] });
    const b = new Series({ data: [10, 20, 30], index: ["x", "y", "z"] });
    const result = combineFirstSeries(a, b);
    expect(result.index.size).toBe(3);
    // y was null in a → filled from b
    expect(sv(result, ["x", "y", "z"])).toEqual([1, 20, 3]);
  });

  test("self values take priority over other", () => {
    const a = new Series({ data: [5, 6, 7], index: ["x", "y", "z"] });
    const b = new Series({ data: [50, 60, 70], index: ["x", "y", "z"] });
    const result = combineFirstSeries(a, b);
    expect(sv(result, ["x", "y", "z"])).toEqual([5, 6, 7]);
  });

  test("index union — labels in other but not self are added", () => {
    const a = new Series({ data: [1, 2], index: ["a", "b"] });
    const b = new Series({ data: [10, 30], index: ["a", "c"] });
    const result = combineFirstSeries(a, b);
    const labels = [...result.index.values];
    expect(labels).toContain("a");
    expect(labels).toContain("b");
    expect(labels).toContain("c");
    expect(result.index.size).toBe(3);
  });

  test("labels only in other → value from other", () => {
    const a = new Series({ data: [1], index: ["a"] });
    const b = new Series({ data: [99], index: ["z"] });
    const result = combineFirstSeries(a, b);
    const labels = [...result.index.values] as string[];
    const zIdx = labels.indexOf("z");
    expect(result.values[zIdx]).toBe(99);
  });

  test("all-null self → entirely filled from other", () => {
    const a = new Series({ data: [null, null, null], index: ["x", "y", "z"] });
    const b = new Series({ data: [1, 2, 3], index: ["x", "y", "z"] });
    const result = combineFirstSeries(a, b);
    expect(sv(result, ["x", "y", "z"])).toEqual([1, 2, 3]);
  });

  test("NaN treated as missing — filled from other", () => {
    const a = new Series({ data: [Number.NaN, 2], index: ["a", "b"] });
    const b = new Series({ data: [9, 8], index: ["a", "b"] });
    const result = combineFirstSeries(a, b);
    expect(sv(result, ["a", "b"])).toEqual([9, 2]);
  });

  test("undefined treated as missing — filled from other", () => {
    const a = new Series({ data: [undefined, 2], index: ["a", "b"] });
    const b = new Series({ data: [9, 8], index: ["a", "b"] });
    const result = combineFirstSeries(a, b);
    expect(sv(result, ["a", "b"])).toEqual([9, 2]);
  });

  test("no overlap — result is union, self portion not changed", () => {
    const a = new Series({ data: [1, 2], index: ["a", "b"] });
    const b = new Series({ data: [3, 4], index: ["c", "d"] });
    const result = combineFirstSeries(a, b);
    expect(result.index.size).toBe(4);
    const labels = [...result.index.values] as string[];
    expect(result.values[labels.indexOf("a")]).toBe(1);
    expect(result.values[labels.indexOf("c")]).toBe(3);
  });

  test("preserves name from self", () => {
    const a = new Series({ data: [1, 2], index: ["a", "b"], name: "myname" });
    const b = new Series({ data: [3, 4], index: ["a", "b"], name: "othername" });
    const result = combineFirstSeries(a, b);
    expect(result.name).toBe("myname");
  });

  test("empty self — result equals other", () => {
    const a = new Series({ data: [], index: [] as string[] });
    const b = new Series({ data: [1, 2], index: ["x", "y"] });
    const result = combineFirstSeries(a, b);
    expect(result.index.size).toBe(2);
  });

  test("empty other — result equals self", () => {
    const a = new Series({ data: [1, 2], index: ["x", "y"] });
    const b = new Series({ data: [], index: [] as string[] });
    const result = combineFirstSeries(a, b);
    expect(result.index.size).toBe(2);
    expect(sv(result, ["x", "y"])).toEqual([1, 2]);
  });

  test("both empty — result is empty", () => {
    const a = new Series({ data: [], index: [] as string[] });
    const b = new Series({ data: [], index: [] as string[] });
    const result = combineFirstSeries(a, b);
    expect(result.index.size).toBe(0);
    expect(result.values.length).toBe(0);
  });

  test("label in both: null in self, null in other → null in result", () => {
    const a = new Series({ data: [null], index: ["a"] });
    const b = new Series({ data: [null], index: ["a"] });
    const result = combineFirstSeries(a, b);
    expect(result.values[0]).toBeNull();
  });

  test("numeric and string mixed via shared index", () => {
    const a = new Series({ data: [null, "hello"], index: [0, 1] });
    const b = new Series({ data: [42, "world"], index: [0, 1] });
    const result = combineFirstSeries(a, b);
    expect(sv(result, [0, 1])).toEqual([42, "hello"]);
  });
});

// ─── DataFrame ────────────────────────────────────────────────────────────────

describe("combineFirstDataFrame", () => {
  test("basic: fills null cells in self from other", () => {
    const a = DataFrame.fromColumns({ x: [1, null], y: [3, 4] }, { index: ["r0", "r1"] });
    const b = DataFrame.fromColumns({ x: [10, 20], y: [30, 40] }, { index: ["r0", "r1"] });
    const result = combineFirstDataFrame(a, b);
    expect(result.shape).toEqual([2, 2]);
    const x = result.col("x").values;
    const y = result.col("y").values;
    const labels = [...result.index.values] as string[];
    const r1i = labels.indexOf("r1");
    expect(x[r1i]).toBe(20); // was null, filled from b
    expect(y[r1i]).toBe(4);  // was 4, kept from a
  });

  test("self values take priority", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] }, { index: ["r0", "r1"] });
    const b = DataFrame.fromColumns({ x: [99, 99] }, { index: ["r0", "r1"] });
    const result = combineFirstDataFrame(a, b);
    expect(result.col("x").values).toEqual([1, 2]);
  });

  test("new rows from other appear in result", () => {
    const a = DataFrame.fromColumns({ x: [1] }, { index: ["r0"] });
    const b = DataFrame.fromColumns({ x: [2] }, { index: ["r1"] });
    const result = combineFirstDataFrame(a, b);
    expect(result.index.size).toBe(2);
    const labels = [...result.index.values] as string[];
    expect(labels).toContain("r0");
    expect(labels).toContain("r1");
  });

  test("new columns from other appear in result", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] }, { index: ["r0", "r1"] });
    const b = DataFrame.fromColumns({ z: [3, 4] }, { index: ["r0", "r1"] });
    const result = combineFirstDataFrame(a, b);
    expect([...result.columns.values]).toContain("x");
    expect([...result.columns.values]).toContain("z");
    // x came from a, z came from b
    expect(result.col("x").values).toEqual([1, 2]);
    expect(result.col("z").values).toEqual([3, 4]);
  });

  test("row+col union: missing cells are null", () => {
    const a = DataFrame.fromColumns({ x: [1] }, { index: ["r0"] });
    const b = DataFrame.fromColumns({ z: [9] }, { index: ["r1"] });
    const result = combineFirstDataFrame(a, b);
    expect(result.index.size).toBe(2);
    // x col: r0=1, r1=null (not in b)
    const labels = [...result.index.values] as string[];
    const r1i = labels.indexOf("r1");
    expect(result.col("x").values[r1i]).toBeNull();
  });

  test("empty self — result mirrors other", () => {
    const a = DataFrame.fromColumns({});
    const b = DataFrame.fromColumns({ x: [1, 2] }, { index: ["r0", "r1"] });
    const result = combineFirstDataFrame(a, b);
    expect([...result.columns.values]).toContain("x");
  });

  test("empty other — result mirrors self", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] }, { index: ["r0", "r1"] });
    const b = DataFrame.fromColumns({});
    const result = combineFirstDataFrame(a, b);
    expect(result.col("x").values).toEqual([1, 2]);
  });

  test("NaN cells in self are filled from other", () => {
    const a = DataFrame.fromColumns({ x: [Number.NaN, 2] }, { index: ["r0", "r1"] });
    const b = DataFrame.fromColumns({ x: [99, 88] }, { index: ["r0", "r1"] });
    const result = combineFirstDataFrame(a, b);
    const labels = [...result.index.values] as string[];
    const r0i = labels.indexOf("r0");
    expect(result.col("x").values[r0i]).toBe(99);
    const r1i = labels.indexOf("r1");
    expect(result.col("x").values[r1i]).toBe(2);
  });

  test("shared row, different cols: no overlap — all cells filled from owner", () => {
    const a = DataFrame.fromColumns({ a: [1, 2] }, { index: ["r0", "r1"] });
    const b = DataFrame.fromColumns({ b: [3, 4] }, { index: ["r0", "r1"] });
    const result = combineFirstDataFrame(a, b);
    expect(result.shape).toEqual([2, 2]);
    expect(result.col("a").values).toEqual([1, 2]);
    expect(result.col("b").values).toEqual([3, 4]);
  });
});

// ─── Property-based ───────────────────────────────────────────────────────────

describe("combineFirstSeries — property tests", () => {
  test("result size >= max(self.size, other.size)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.array(fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }), {
          minLength: 1,
          maxLength: 10,
        }),
        (aVals, bVals) => {
          const aIdx = aVals.map((_, i) => `a${i}`);
          const bIdx = bVals.map((_, i) => `b${i}`);
          const a = new Series({ data: aVals, index: aIdx });
          const b = new Series({ data: bVals, index: bIdx });
          const result = combineFirstSeries(a, b);
          return (
            result.index.size >= Math.max(a.index.size, b.index.size)
          );
        },
      ),
    );
  });

  test("shared labels: result value is from self when self is non-null, else from other", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }), {
          minLength: 1,
          maxLength: 8,
        }),
        fc.array(fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }), {
          minLength: 1,
          maxLength: 8,
        }),
        (aVals, bVals) => {
          const sharedLen = Math.min(aVals.length, bVals.length);
          const sharedIdx = Array.from({ length: sharedLen }, (_, i) => `k${i}`);
          const aIdxFull = [...sharedIdx, ...aVals.slice(sharedLen).map((_, i) => `a${i}`)];
          const bIdxFull = [...sharedIdx, ...bVals.slice(sharedLen).map((_, i) => `b${i}`)];
          const a = new Series({ data: aVals, index: aIdxFull });
          const b = new Series({ data: bVals, index: bIdxFull });
          const result = combineFirstSeries(a, b);

          for (let i = 0; i < sharedLen; i++) {
            const lbl = sharedIdx[i];
            const aVal = aVals[i];
            const bVal = bVals[i];
            const expected = (aVal === null || aVal === undefined) ? bVal ?? null : aVal;
            const pos = result.index.getLoc(lbl as Label);
            const p = Array.isArray(pos) ? (pos[0] ?? 0) : pos;
            const actual = result.values[p];
            if (actual !== expected) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  test("idempotent: combine_first(a, a) === a for non-null values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        (vals) => {
          const idx = vals.map((_, i) => `k${i}`);
          const s = new Series({ data: vals, index: idx });
          const result = combineFirstSeries(s, s);
          for (let i = 0; i < vals.length; i++) {
            if (result.values[i] !== vals[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
