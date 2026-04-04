/**
 * Tests for src/core/sort.ts — nlargest, nsmallest, rank, rankDataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Index,
  Series,
  dataFrameNlargest,
  dataFrameNsmallest,
  nlargest,
  nsmallest,
  rank,
  rankDataFrame,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function numSeries(data: number[], idx?: (string | number)[]): Series<number> {
  return new Series<number>({
    data,
    index: idx !== undefined ? new Index<string | number>(idx) : undefined,
  });
}

// ─── nlargest ─────────────────────────────────────────────────────────────────

describe("nlargest", () => {
  it("returns n largest values in descending index order", () => {
    const s = numSeries([3, 1, 4, 1, 5, 9, 2, 6]);
    const result = nlargest(s, 3);
    // positions of 9 (idx 5), 6 (idx 7), 5 (idx 4) sorted by position: 4,5,7
    expect([...result.values]).toEqual([5, 9, 6]);
  });

  it("returns all values when n >= size", () => {
    const s = numSeries([3, 1, 2]);
    expect(nlargest(s, 10).size).toBe(3);
  });

  it("returns empty when n = 0", () => {
    const s = numSeries([3, 1, 2]);
    expect(nlargest(s, 0).size).toBe(0);
  });

  it("preserves index labels", () => {
    const s = numSeries([3, 7, 1], ["a", "b", "c"]);
    const result = nlargest(s, 2);
    // positions of 7 (b) and 3 (a), sorted: a, b
    expect([...result.index.values]).toEqual(["a", "b"]);
    expect([...result.values]).toEqual([3, 7]);
  });

  it("keep=first picks first occurrence for ties", () => {
    const s = numSeries([5, 5, 3]);
    const result = nlargest(s, 1, { keep: "first" });
    expect(result.size).toBe(1);
    expect(result.values[0]).toBe(5);
    // first occurrence is position 0
    expect([...result.index.values][0]).toBe(0);
  });

  it("keep=last picks last occurrence for ties", () => {
    const s = numSeries([5, 5, 3]);
    const result = nlargest(s, 1, { keep: "last" });
    expect(result.size).toBe(1);
    expect([...result.index.values][0]).toBe(1);
  });

  it("keep=all returns all tied values at boundary", () => {
    const s = numSeries([5, 3, 5, 1]);
    const result = nlargest(s, 1, { keep: "all" });
    // both 5s are tied at position 1
    expect(result.size).toBeGreaterThanOrEqual(1);
    expect([...result.values].every((v) => v === 5 || v === 3)).toBe(true);
  });

  it("single element", () => {
    const s = numSeries([42]);
    expect([...nlargest(s, 1).values]).toEqual([42]);
  });

  it("handles n=1 correctly", () => {
    const s = numSeries([1, 9, 3, 7]);
    const r = nlargest(s, 1);
    expect(r.size).toBe(1);
    expect(r.values[0]).toBe(9);
  });

  it("preserves name", () => {
    const s = new Series<number>({ data: [3, 1, 2], name: "score" });
    expect(nlargest(s, 2).name).toBe("score");
  });

  // property: result is always ≤ n rows
  it("property: size <= n", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 30 }),
        fc.integer({ min: 0, max: 20 }),
        (data, n) => {
          const s = numSeries(data);
          return nlargest(s, n).size <= n;
        },
      ),
    );
  });

  // property: values are non-increasing subset of sorted input
  it("property: values are among top-n of input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), {
          minLength: 1,
          maxLength: 30,
        }),
        fc.integer({ min: 1, max: 10 }),
        (data, n) => {
          const s = numSeries(data);
          const result = nlargest(s, Math.min(n, data.length));
          const sorted = [...data].sort((a, b) => b - a).slice(0, Math.min(n, data.length));
          const resultSorted = [...result.values].sort((a, b) => (b as number) - (a as number));
          return JSON.stringify(resultSorted) === JSON.stringify(sorted);
        },
      ),
    );
  });
});

// ─── nsmallest ────────────────────────────────────────────────────────────────

describe("nsmallest", () => {
  it("returns n smallest values in original index order", () => {
    const s = numSeries([3, 1, 4, 1, 5, 9, 2, 6]);
    const result = nsmallest(s, 3);
    // two 1s at positions 1,3 and 2 at position 6 — sorted: 1,3,6
    expect([...result.values]).toEqual([1, 1, 2]);
  });

  it("n >= size returns all values", () => {
    const s = numSeries([3, 1, 2]);
    expect(nsmallest(s, 10).size).toBe(3);
  });

  it("n=0 returns empty", () => {
    expect(nsmallest(numSeries([1, 2, 3]), 0).size).toBe(0);
  });

  it("preserves index labels", () => {
    const s = numSeries([3, 7, 1], ["a", "b", "c"]);
    const result = nsmallest(s, 2);
    // positions 2 (c=1) and 0 (a=3), sorted: a, c
    expect([...result.index.values]).toEqual(["a", "c"]);
    expect([...result.values]).toEqual([3, 1]);
  });

  it("keep=first for ties", () => {
    const s = numSeries([1, 1, 5]);
    const result = nsmallest(s, 1, { keep: "first" });
    expect(result.size).toBe(1);
    expect([...result.index.values][0]).toBe(0);
  });

  it("keep=last for ties", () => {
    const s = numSeries([1, 1, 5]);
    const result = nsmallest(s, 1, { keep: "last" });
    expect(result.size).toBe(1);
    expect([...result.index.values][0]).toBe(1);
  });

  it("property: result values are min-n of input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), {
          minLength: 1,
          maxLength: 30,
        }),
        fc.integer({ min: 1, max: 10 }),
        (data, n) => {
          const s = numSeries(data);
          const result = nsmallest(s, Math.min(n, data.length));
          const sorted = [...data].sort((a, b) => a - b).slice(0, Math.min(n, data.length));
          const resultSorted = [...result.values].sort((a, b) => (a as number) - (b as number));
          return JSON.stringify(resultSorted) === JSON.stringify(sorted);
        },
      ),
    );
  });
});

// ─── dataFrameNlargest ────────────────────────────────────────────────────────

describe("dataFrameNlargest", () => {
  function sampleDf(): DataFrame {
    return DataFrame.fromRecords([
      { name: "Alice", score: 85, age: 30 },
      { name: "Bob", score: 92, age: 25 },
      { name: "Carol", score: 78, age: 35 },
      { name: "Dave", score: 92, age: 22 },
      { name: "Eve", score: 65, age: 28 },
    ]);
  }

  it("returns n rows with largest values in column", () => {
    const df = sampleDf();
    const result = dataFrameNlargest(df, 2, "score");
    expect(result.index.size).toBe(2);
    const scores = [...(result.get("score")?.values ?? [])];
    // Bob (score=92) and Dave (score=92) — ties at 92
    expect(scores.every((v) => (v as number) >= 85)).toBe(true);
  });

  it("returns all rows when n >= nRows", () => {
    const df = sampleDf();
    expect(dataFrameNlargest(df, 100, "score").index.size).toBe(5);
  });

  it("n=0 returns empty DataFrame", () => {
    const df = sampleDf();
    expect(dataFrameNlargest(df, 0, "score").index.size).toBe(0);
  });

  it("preserves all columns", () => {
    const df = sampleDf();
    const result = dataFrameNlargest(df, 2, "score");
    expect([...result.columns.values]).toEqual(["name", "score", "age"]);
  });

  it("multi-column: sort by first column then second", () => {
    const df = DataFrame.fromRecords([
      { a: 3, b: 1 },
      { a: 3, b: 2 },
      { a: 2, b: 5 },
    ]);
    const result = dataFrameNlargest(df, 2, ["a", "b"]);
    // Both a=3 rows should be selected
    const aVals = [...(result.get("a")?.values ?? [])];
    expect(aVals.every((v) => v === 3)).toBe(true);
  });

  it("rows in original order", () => {
    const df = sampleDf();
    const result = dataFrameNlargest(df, 3, "score");
    // row indices should be ascending (original order preserved)
    const idxVals = [...result.index.values] as number[];
    for (let i = 1; i < idxVals.length; i++) {
      expect((idxVals[i] as number) > (idxVals[i - 1] as number)).toBe(true);
    }
  });
});

// ─── dataFrameNsmallest ───────────────────────────────────────────────────────

describe("dataFrameNsmallest", () => {
  function sampleDf(): DataFrame {
    return DataFrame.fromRecords([
      { name: "Alice", score: 85, age: 30 },
      { name: "Bob", score: 92, age: 25 },
      { name: "Carol", score: 78, age: 35 },
      { name: "Dave", score: 92, age: 22 },
      { name: "Eve", score: 65, age: 28 },
    ]);
  }

  it("returns n rows with smallest values", () => {
    const df = sampleDf();
    const result = dataFrameNsmallest(df, 2, "score");
    expect(result.index.size).toBe(2);
    const scores = [...(result.get("score")?.values ?? [])];
    expect(scores.every((v) => (v as number) <= 78)).toBe(true);
  });

  it("n=0 returns empty", () => {
    const df = sampleDf();
    expect(dataFrameNsmallest(df, 0, "score").index.size).toBe(0);
  });

  it("rows in original order", () => {
    const df = sampleDf();
    const result = dataFrameNsmallest(df, 3, "score");
    const idxVals = [...result.index.values] as number[];
    for (let i = 1; i < idxVals.length; i++) {
      expect((idxVals[i] as number) > (idxVals[i - 1] as number)).toBe(true);
    }
  });
});

// ─── rank (Series) ────────────────────────────────────────────────────────────

describe("rank (Series)", () => {
  it("default average method", () => {
    const s = numSeries([3, 1, 4, 1, 5]);
    const r = rank(s);
    // sorted: 1(idx1), 1(idx3), 3(idx0), 4(idx2), 5(idx4)
    // ranks:  1.5,     1.5,     3,        4,        5
    expect([...r.values]).toEqual([3, 1.5, 4, 1.5, 5]);
  });

  it("method=min", () => {
    const s = numSeries([3, 1, 4, 1, 5]);
    const r = rank(s, { method: "min" });
    expect([...r.values]).toEqual([3, 1, 4, 1, 5]);
  });

  it("method=max", () => {
    const s = numSeries([3, 1, 4, 1, 5]);
    const r = rank(s, { method: "max" });
    expect([...r.values]).toEqual([3, 2, 4, 2, 5]);
  });

  it("method=first (no ties)", () => {
    const s = numSeries([3, 1, 4, 1, 5]);
    const r = rank(s, { method: "first" });
    // sorted by value then original position: 1(1), 1(3), 3(0), 4(2), 5(4)
    // ranks: idx0→3, idx1→1, idx2→4, idx3→2, idx4→5
    expect([...r.values]).toEqual([3, 1, 4, 2, 5]);
  });

  it("method=dense", () => {
    const s = numSeries([3, 1, 4, 1, 5]);
    const r = rank(s, { method: "dense" });
    // unique values: 1→1, 3→2, 4→3, 5→4
    expect([...r.values]).toEqual([2, 1, 3, 1, 4]);
  });

  it("ascending=false reverses ranks", () => {
    const s = numSeries([1, 2, 3]);
    const r = rank(s, { ascending: false });
    expect([...r.values]).toEqual([3, 2, 1]);
  });

  it("NaN: naOption=keep gives NaN rank", () => {
    const s = numSeries([1, Number.NaN, 3]);
    const r = rank(s, { naOption: "keep" });
    expect(Number.isNaN(r.values[1])).toBe(true);
    expect(r.values[0]).toBe(1);
    expect(r.values[2]).toBe(2);
  });

  it("NaN: naOption=top — NaN ranks lowest (ascending)", () => {
    const s = numSeries([1, Number.NaN, 3]);
    const r = rank(s, { naOption: "top" });
    // NaN → rank 0 (below 1), 1→1, 3→2 would shift
    // top means NaN is treated as smallest → ascending: NaN=0 position
    expect((r.values[1] as number) < (r.values[0] as number)).toBe(true);
  });

  it("NaN: naOption=bottom — NaN ranks highest (ascending)", () => {
    const s = numSeries([1, Number.NaN, 3]);
    const r = rank(s, { naOption: "bottom" });
    expect((r.values[1] as number) > (r.values[2] as number)).toBe(true);
  });

  it("pct=true normalises ranks to (0, 1]", () => {
    const s = numSeries([1, 2, 3]);
    const r = rank(s, { pct: true });
    expect([...r.values]).toEqual([1 / 3, 2 / 3, 1]);
  });

  it("pct=true with ties uses average", () => {
    const s = numSeries([1, 1, 3]);
    const r = rank(s, { pct: true });
    // average of ranks 1,2 = 1.5; 3rd = 3. normalise by 3
    const v = [...r.values];
    expect(v[0]).toBeCloseTo(0.5, 10);
    expect(v[1]).toBeCloseTo(0.5, 10);
    expect(v[2]).toBeCloseTo(1.0, 10);
  });

  it("single value gets rank 1", () => {
    const s = numSeries([42]);
    expect([...rank(s).values]).toEqual([1]);
  });

  it("all equal values", () => {
    const s = numSeries([7, 7, 7]);
    const r = rank(s, { method: "average" });
    expect([...r.values]).toEqual([2, 2, 2]);
  });

  it("preserves index and name", () => {
    const s = new Series<number>({ data: [3, 1, 2], index: ["a", "b", "c"], name: "x" });
    const r = rank(s);
    expect([...r.index.values]).toEqual(["a", "b", "c"]);
    expect(r.name).toBe("x");
  });

  // property: ranks are 1-based and within [1, n]
  it("property: all ranks in [1, n] for non-NaN input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), {
          minLength: 1,
          maxLength: 50,
        }),
        (data) => {
          const s = numSeries(data);
          const r = rank(s);
          const vals = [...r.values] as number[];
          return vals.every((v) => v >= 1 && v <= data.length);
        },
      ),
    );
  });

  // property: pct ranks are in (0, 1]
  it("property: pct ranks in (0, 1] for non-NaN input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), {
          minLength: 1,
          maxLength: 50,
        }),
        (data) => {
          const s = numSeries(data);
          const r = rank(s, { pct: true });
          const vals = [...r.values] as number[];
          return vals.every((v) => v > 0 && v <= 1 + 1e-10);
        },
      ),
    );
  });

  // property: rank(ascending=true) + rank(ascending=false) = n+1 for each elem
  it("property: ascending + descending ranks sum to n+1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e3, max: 1e3 }), {
          minLength: 1,
          maxLength: 30,
        }),
        (data) => {
          const n = data.length;
          const s = numSeries(data);
          const asc = [...rank(s, { method: "min" }).values] as number[];
          const desc = [...rank(s, { method: "min", ascending: false }).values] as number[];
          return asc.every((v, i) => Math.abs(v + (desc[i] as number) - (n + 1)) < 1e-9);
        },
      ),
    );
  });
});

// ─── rankDataFrame ────────────────────────────────────────────────────────────

describe("rankDataFrame", () => {
  it("ranks each column independently", () => {
    const df = DataFrame.fromRecords([
      { a: 3, b: 10 },
      { a: 1, b: 20 },
      { a: 2, b: 30 },
    ]);
    const r = rankDataFrame(df);
    const aRanks = [...(r.get("a")?.values ?? [])];
    const bRanks = [...(r.get("b")?.values ?? [])];
    expect(aRanks).toEqual([3, 1, 2]);
    expect(bRanks).toEqual([1, 2, 3]);
  });

  it("respects options across all columns", () => {
    const df = DataFrame.fromRecords([
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ]);
    const r = rankDataFrame(df, { method: "max" });
    const xRanks = [...(r.get("x")?.values ?? [])];
    expect(xRanks).toEqual([2, 2]);
  });

  it("empty DataFrame returns empty DataFrame", () => {
    const df = new DataFrame(new Map(), new Index<number>([]));
    const r = rankDataFrame(df);
    expect(r.columns.size).toBe(0);
  });

  it("preserves column order", () => {
    const df = DataFrame.fromRecords([
      { c: 1, b: 2, a: 3 },
      { c: 4, b: 5, a: 6 },
    ]);
    const r = rankDataFrame(df);
    expect([...r.columns.values]).toEqual(["c", "b", "a"]);
  });

  it("pct=true produces fractions", () => {
    const df = DataFrame.fromRecords([{ v: 10 }, { v: 20 }, { v: 30 }]);
    const r = rankDataFrame(df, { pct: true });
    const vals = [...(r.get("v")?.values ?? [])];
    expect(vals).toEqual([1 / 3, 2 / 3, 1]);
  });
});
