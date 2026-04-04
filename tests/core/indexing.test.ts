/**
 * Tests for src/core/indexing.ts
 *
 * Coverage: Slice, locSeries, ilocSeries, locDataFrame, ilocDataFrame,
 *           atDataFrame, iatDataFrame — unit + property-based tests.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Index, Series } from "../../src/index.ts";
import {
  Slice,
  atDataFrame,
  iatDataFrame,
  ilocDataFrame,
  ilocSeries,
  locDataFrame,
  locSeries,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function numSeries(data: number[], labels?: string[]): Series<number> {
  if (labels) {
    return new Series<number>({ data, index: new Index(labels) });
  }
  return new Series<number>({ data });
}

function numDF(obj: Record<string, number[]>): DataFrame {
  return DataFrame.fromColumns(obj);
}

// ─── Slice ────────────────────────────────────────────────────────────────────

describe("Slice", () => {
  test("default slice returns all positions", () => {
    expect(new Slice().toPositions(5)).toEqual([0, 1, 2, 3, 4]);
  });

  test("start:stop", () => {
    expect(new Slice(1, 4).toPositions(6)).toEqual([1, 2, 3]);
  });

  test("start only", () => {
    expect(new Slice(2).toPositions(5)).toEqual([2, 3, 4]);
  });

  test("stop only", () => {
    expect(new Slice(null, 3).toPositions(5)).toEqual([0, 1, 2]);
  });

  test("every other element", () => {
    expect(new Slice(null, null, 2).toPositions(6)).toEqual([0, 2, 4]);
  });

  test("negative start", () => {
    expect(new Slice(-2).toPositions(5)).toEqual([3, 4]);
  });

  test("negative stop", () => {
    expect(new Slice(0, -1).toPositions(5)).toEqual([0, 1, 2, 3]);
  });

  test("reverse step", () => {
    expect(new Slice(4, 1, -1).toPositions(6)).toEqual([4, 3, 2]);
  });

  test("reverse all", () => {
    expect(new Slice(null, null, -1).toPositions(4)).toEqual([3, 2, 1, 0]);
  });

  test("empty slice (start >= stop)", () => {
    expect(new Slice(3, 1).toPositions(5)).toEqual([]);
  });

  test("zero step throws", () => {
    expect(() => new Slice(0, 5, 0)).toThrow(RangeError);
  });

  test("empty container", () => {
    expect(new Slice().toPositions(0)).toEqual([]);
  });

  test("start beyond length clamps", () => {
    expect(new Slice(10).toPositions(5)).toEqual([]);
  });

  test("step 3", () => {
    expect(new Slice(0, 9, 3).toPositions(9)).toEqual([0, 3, 6]);
  });
});

// ─── locSeries ────────────────────────────────────────────────────────────────

describe("locSeries", () => {
  test("scalar label returns value", () => {
    const s = numSeries([10, 20, 30], ["a", "b", "c"]);
    expect(locSeries(s, "b")).toBe(20);
  });

  test("array of labels returns sub-Series", () => {
    const s = numSeries([10, 20, 30], ["a", "b", "c"]);
    const result = locSeries(s, ["a", "c"] as string[]);
    expect(result.values).toEqual([10, 30]);
  });

  test("boolean mask filters rows", () => {
    const s = numSeries([10, 20, 30, 40]);
    const result = locSeries(s, [true, false, true, false]);
    expect(result.values).toEqual([10, 30]);
  });

  test("boolean mask: all false returns empty Series", () => {
    const s = numSeries([1, 2, 3]);
    const result = locSeries(s, [false, false, false]);
    expect(result.values).toEqual([]);
  });

  test("Slice selects range", () => {
    const s = numSeries([10, 20, 30, 40, 50]);
    const result = locSeries(s, new Slice(1, 4));
    expect(result.values).toEqual([20, 30, 40]);
  });

  test("Slice with step", () => {
    const s = numSeries([10, 20, 30, 40, 50]);
    const result = locSeries(s, new Slice(0, 5, 2));
    expect(result.values).toEqual([10, 30, 50]);
  });

  test("Slice empty returns empty Series", () => {
    const s = numSeries([1, 2, 3]);
    const result = locSeries(s, new Slice(5, 3));
    expect(result.values).toEqual([]);
  });

  test("preserves name", () => {
    const s = new Series<number>({ data: [1, 2, 3], name: "col" });
    const result = locSeries(s, [true, false, true]);
    expect(result.name).toBe("col");
  });

  test("duplicate labels return multiple rows", () => {
    const s = new Series<number>({ data: [1, 2, 3], index: new Index(["a", "a", "b"]) });
    const result = locSeries(s, ["a"] as string[]);
    expect(result.values).toEqual([1, 2]);
  });
});

// ─── ilocSeries ───────────────────────────────────────────────────────────────

describe("ilocSeries", () => {
  test("scalar position returns value", () => {
    const s = numSeries([10, 20, 30]);
    expect(ilocSeries(s, 1)).toBe(20);
  });

  test("negative position", () => {
    const s = numSeries([10, 20, 30]);
    expect(ilocSeries(s, -1)).toBe(30);
  });

  test("array of positions", () => {
    const s = numSeries([10, 20, 30, 40, 50]);
    const result = ilocSeries(s, [0, 2, 4]);
    expect(result.values).toEqual([10, 30, 50]);
  });

  test("boolean mask", () => {
    const s = numSeries([10, 20, 30, 40]);
    const result = ilocSeries(s, [false, true, false, true]);
    expect(result.values).toEqual([20, 40]);
  });

  test("Slice", () => {
    const s = numSeries([10, 20, 30, 40, 50]);
    const result = ilocSeries(s, new Slice(1, 4));
    expect(result.values).toEqual([20, 30, 40]);
  });

  test("Slice with negative step", () => {
    const s = numSeries([10, 20, 30, 40, 50]);
    const result = ilocSeries(s, new Slice(4, 1, -1));
    expect(result.values).toEqual([50, 40, 30]);
  });

  test("out-of-bounds throws", () => {
    const s = numSeries([1, 2, 3]);
    expect(() => ilocSeries(s, 5)).toThrow(RangeError);
  });

  test("empty positions returns empty Series", () => {
    const s = numSeries([1, 2, 3]);
    const result = ilocSeries(s, [] as number[]);
    expect(result.values).toEqual([]);
  });

  test("all positions returns full copy", () => {
    const s = numSeries([1, 2, 3]);
    const result = ilocSeries(s, new Slice());
    expect(result.values).toEqual([1, 2, 3]);
  });
});

// ─── locDataFrame ─────────────────────────────────────────────────────────────

describe("locDataFrame", () => {
  test("row filter via boolean mask", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = locDataFrame(df, [true, false, true]);
    expect(result.shape).toEqual([2, 2]);
    expect(result.col("a").values).toEqual([1, 3]);
  });

  test("row filter via Slice", () => {
    const df = numDF({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const result = locDataFrame(df, new Slice(1, 3));
    expect(result.shape).toEqual([2, 2]);
    expect(result.col("a").values).toEqual([2, 3]);
  });

  test("row filter via label array", () => {
    const df = new DataFrame(
      new Map([
        ["a", new Series<number>({ data: [10, 20, 30], index: new Index(["x", "y", "z"]) })],
        ["b", new Series<number>({ data: [1, 2, 3], index: new Index(["x", "y", "z"]) })],
      ]),
      new Index(["x", "y", "z"]),
    );
    const result = locDataFrame(df, ["x", "z"]);
    expect(result.shape).toEqual([2, 2]);
    expect(result.col("a").values).toEqual([10, 30]);
  });

  test("with column selection: single column returns Series", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = locDataFrame(df, new Slice(), "a");
    expect(result instanceof Series).toBe(true);
    expect((result as Series<number>).values).toEqual([1, 2, 3]);
  });

  test("with column selection: array of columns returns DataFrame", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const result = locDataFrame(df, new Slice(), ["a", "c"]);
    expect(result instanceof DataFrame).toBe(true);
    expect((result as DataFrame).columns.values).toEqual(["a", "c"]);
  });

  test("unknown column throws", () => {
    const df = numDF({ a: [1, 2, 3] });
    expect(() => locDataFrame(df, new Slice(), "z")).toThrow();
  });

  test("row slice + column subset", () => {
    const df = numDF({ a: [1, 2, 3, 4], b: [10, 20, 30, 40], c: [100, 200, 300, 400] });
    const result = locDataFrame(df, new Slice(0, 2), ["a", "c"]) as DataFrame;
    expect(result.shape).toEqual([2, 2]);
    expect(result.col("c").values).toEqual([100, 200]);
  });
});

// ─── ilocDataFrame ────────────────────────────────────────────────────────────

describe("ilocDataFrame", () => {
  test("row filter via Slice", () => {
    const df = numDF({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const result = ilocDataFrame(df, new Slice(1, 3));
    expect(result.shape).toEqual([2, 2]);
    expect(result.col("a").values).toEqual([2, 3]);
  });

  test("row filter via boolean mask", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = ilocDataFrame(df, [false, true, false]);
    expect(result.shape).toEqual([1, 2]);
    expect(result.col("a").values).toEqual([2]);
  });

  test("scalar row, scalar col → Scalar", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = ilocDataFrame(df, 1, 1);
    expect(result).toBe(5);
  });

  test("scalar row, scalar col via negative indices", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = ilocDataFrame(df, -1, -1);
    expect(result).toBe(6);
  });

  test("Slice rows + column index array → DataFrame", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const result = ilocDataFrame(df, new Slice(0, 2), [0, 2]) as DataFrame;
    expect(result.shape).toEqual([2, 2]);
    expect(result.columns.values).toEqual(["a", "c"]);
  });

  test("boolean mask rows + column array → DataFrame", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = ilocDataFrame(df, [true, false, true], [0]) as DataFrame;
    expect(result.shape).toEqual([2, 1]);
    expect(result.col("a").values).toEqual([1, 3]);
  });

  test("out-of-bounds row throws", () => {
    const df = numDF({ a: [1, 2, 3] });
    expect(() => ilocDataFrame(df, 10, 0)).toThrow(RangeError);
  });

  test("out-of-bounds column throws", () => {
    const df = numDF({ a: [1, 2, 3] });
    expect(() => ilocDataFrame(df, 0, 5)).toThrow(RangeError);
  });

  test("array of rows + all columns", () => {
    const df = numDF({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });
    const result = ilocDataFrame(df, [0, 3]) as DataFrame;
    expect(result.col("a").values).toEqual([1, 4]);
  });
});

// ─── atDataFrame ─────────────────────────────────────────────────────────────

describe("atDataFrame", () => {
  test("returns correct scalar by row label + column name", () => {
    const df = new DataFrame(
      new Map([["a", new Series<number>({ data: [10, 20], index: new Index(["x", "y"]) })]]),
      new Index(["x", "y"]),
    );
    expect(atDataFrame(df, "x", "a")).toBe(10);
    expect(atDataFrame(df, "y", "a")).toBe(20);
  });

  test("integer row label", () => {
    const df = numDF({ a: [1, 2, 3] });
    expect(atDataFrame(df, 0, "a")).toBe(1);
    expect(atDataFrame(df, 2, "a")).toBe(3);
  });

  test("unknown column throws", () => {
    const df = numDF({ a: [1, 2] });
    expect(() => atDataFrame(df, 0, "z")).toThrow();
  });
});

// ─── iatDataFrame ─────────────────────────────────────────────────────────────

describe("iatDataFrame", () => {
  test("returns correct scalar", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    expect(iatDataFrame(df, 0, 0)).toBe(1);
    expect(iatDataFrame(df, 1, 1)).toBe(5);
    expect(iatDataFrame(df, 2, 0)).toBe(3);
  });

  test("negative row and column positions", () => {
    const df = numDF({ a: [1, 2, 3], b: [4, 5, 6] });
    expect(iatDataFrame(df, -1, -1)).toBe(6);
    expect(iatDataFrame(df, -2, -2)).toBe(2);
  });

  test("out-of-bounds row throws", () => {
    const df = numDF({ a: [1, 2] });
    expect(() => iatDataFrame(df, 5, 0)).toThrow(RangeError);
  });

  test("out-of-bounds col throws", () => {
    const df = numDF({ a: [1, 2] });
    expect(() => iatDataFrame(df, 0, 5)).toThrow(RangeError);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("property-based: Slice.toPositions", () => {
  test("positions always in [0, length)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (length, start, stop, step) => {
          const sl = new Slice(start, stop, step);
          const positions = sl.toPositions(length);
          for (const p of positions) {
            if (p < 0 || p >= length) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  test("reverse step gives positions in strictly decreasing order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (length, step) => {
          const sl = new Slice(null, null, -step);
          const positions = sl.toPositions(length);
          for (let i = 1; i < positions.length; i++) {
            const prev = positions[i - 1];
            const curr = positions[i];
            if (prev === undefined || curr === undefined || prev <= curr) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("property-based: ilocSeries round-trip", () => {
  test("iloc with all positions equals original", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }), (data) => {
        const s = new Series<number>({ data });
        const all = new Slice();
        const copy = ilocSeries(s, all);
        return (
          copy.values.length === s.values.length && copy.values.every((v, i) => v === s.values[i])
        );
      }),
    );
  });

  test("boolean mask count equals true count", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 0, maxLength: 20 }), (mask) => {
        const data = mask.map((_, i) => i);
        const s = new Series<number>({ data });
        const result = ilocSeries(s, mask);
        return result.values.length === mask.filter(Boolean).length;
      }),
    );
  });
});

describe("property-based: locSeries boolean mask", () => {
  test("mask selects matching values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const s = new Series<number>({ data });
          const mask = data.map((v) => v > 0);
          const result = locSeries(s, mask);
          const expected = data.filter((v) => v > 0);
          return (
            result.values.length === expected.length &&
            result.values.every((v, i) => v === expected[i])
          );
        },
      ),
    );
  });
});
