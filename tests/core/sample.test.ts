/**
 * Tests for core/sample.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { sampleDataFrame, sampleSeries } from "../../src/index.ts";

// ─── sampleSeries ──────────────────────────────────────────────────────────────

describe("sampleSeries", () => {
  test("returns correct number of items (n)", () => {
    const s = new Series({ data: [10, 20, 30, 40, 50] });
    const r = sampleSeries(s, { n: 3, randomState: 1 });
    expect(r.values.length).toBe(3);
  });

  test("frac=0.4 on length-5 returns 2 items", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const r = sampleSeries(s, { frac: 0.4, randomState: 0 });
    expect(r.values.length).toBe(2);
  });

  test("n=1 is default", () => {
    const s = new Series({ data: [1, 2, 3] });
    const r = sampleSeries(s, { randomState: 0 });
    expect(r.values.length).toBe(1);
  });

  test("replace=false: no repeated items (small pool)", () => {
    const s = new Series({ data: [10, 20, 30] });
    const r = sampleSeries(s, { n: 3, replace: false, randomState: 42 });
    const vals = r.values as number[];
    expect(new Set(vals).size).toBe(3);
    expect(vals.sort((a, b) => a - b)).toEqual([10, 20, 30]);
  });

  test("replace=true can repeat items", () => {
    // By using a tiny pool and large n, repetitions are guaranteed
    const s = new Series({ data: [7] });
    const r = sampleSeries(s, { n: 5, replace: true, randomState: 0 });
    expect(r.values.length).toBe(5);
    expect(r.values.every((v) => v === 7)).toBe(true);
  });

  test("deterministic with randomState", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const r1 = sampleSeries(s, { n: 3, randomState: 99 });
    const r2 = sampleSeries(s, { n: 3, randomState: 99 });
    expect(r1.values).toEqual(r2.values);
  });

  test("different seeds give potentially different results", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    const r1 = sampleSeries(s, { n: 5, randomState: 1 });
    const r2 = sampleSeries(s, { n: 5, randomState: 2 });
    // Not guaranteed but overwhelmingly likely for 10-choose-5
    expect(r1.values).not.toEqual(r2.values);
  });

  test("weighted sample: high-weight item is selected more often", () => {
    const s = new Series({ data: [1, 2, 3] });
    // Weight 3 heavily on index 2 (value=3)
    let countOf3 = 0;
    for (let seed = 0; seed < 20; seed++) {
      const r = sampleSeries(s, { n: 1, weights: [0.01, 0.01, 0.98], randomState: seed });
      if (r.values[0] === 3) {
        countOf3 += 1;
      }
    }
    expect(countOf3).toBeGreaterThan(10);
  });

  test("throws when n > poolSize and replace=false", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(() => sampleSeries(s, { n: 5 })).toThrow();
  });

  test("throws when n and frac both specified", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(() => sampleSeries(s, { n: 1, frac: 0.5 })).toThrow();
  });

  test("n=0 returns empty Series", () => {
    const s = new Series({ data: [1, 2, 3] });
    const r = sampleSeries(s, { n: 0 });
    expect(r.values.length).toBe(0);
  });

  test("sampled values are all from original Series", () => {
    const s = new Series({ data: [10, 20, 30, 40, 50] });
    const original = new Set(s.values as number[]);
    const r = sampleSeries(s, { n: 4, randomState: 7 });
    for (const v of r.values) {
      expect(original.has(v as number)).toBe(true);
    }
  });

  test("preserves correct index labels", () => {
    const s = new Series({ data: [100, 200, 300], index: { values: ["a", "b", "c"] } });
    const r = sampleSeries(s, { n: 2, randomState: 0 });
    // Index labels should match the positions sampled
    for (let i = 0; i < r.values.length; i++) {
      const v = r.values[i] as number;
      const label = r.index.at(i);
      const origPos = (v - 100) / 100; // 0, 1, or 2
      const expectedLabel = ["a", "b", "c"][origPos];
      expect(label).toBe(expectedLabel);
    }
  });

  test("property: result length is always n", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        fc.nat({ max: 5 }),
        (arr, n) => {
          const s = new Series({ data: arr });
          const safeN = Math.min(n, arr.length);
          const r = sampleSeries(s, { n: safeN, randomState: 0 });
          expect(r.values.length).toBe(safeN);
        },
      ),
    );
  });

  test("property: without replacement, no repeated index positions", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 20 }),
        fc.integer({ min: 1, max: 3 }),
        (arr, n) => {
          const s = new Series({ data: arr });
          const r = sampleSeries(s, { n, replace: false, randomState: 42 });
          // Check no index label is repeated (each row label unique since RangeIndex)
          const labels = Array.from({ length: r.index.size }, (_, i) => r.index.at(i));
          expect(new Set(labels).size).toBe(labels.length);
        },
      ),
    );
  });
});

// ─── sampleDataFrame ──────────────────────────────────────────────────────────

describe("sampleDataFrame", () => {
  test("sample rows (axis=0)", () => {
    const df = DataFrame.fromRecords([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]);
    const r = sampleDataFrame(df, { n: 2, randomState: 0 });
    expect(r.shape[0]).toBe(2);
    expect(r.shape[1]).toBe(1);
  });

  test("sample columns (axis=1)", () => {
    const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4], z: [5, 6] });
    const r = sampleDataFrame(df, { n: 2, axis: 1, randomState: 0 });
    expect(r.shape[1]).toBe(2);
    expect(r.shape[0]).toBe(2);
  });

  test("frac sampling", () => {
    const df = DataFrame.fromRecords([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }]);
    const r = sampleDataFrame(df, { frac: 0.5, randomState: 0 });
    expect(r.shape[0]).toBe(2);
  });

  test("replace=true allows row repetition", () => {
    const df = DataFrame.fromRecords([{ a: 99 }]);
    const r = sampleDataFrame(df, { n: 3, replace: true, randomState: 0 });
    expect(r.shape[0]).toBe(3);
    expect(r.col("a").values.every((v) => v === 99)).toBe(true);
  });

  test("deterministic with randomState", () => {
    const df = DataFrame.fromRecords([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }]);
    const r1 = sampleDataFrame(df, { n: 3, randomState: 5 });
    const r2 = sampleDataFrame(df, { n: 3, randomState: 5 });
    expect(r1.col("a").values).toEqual(r2.col("a").values);
  });

  test("sampled rows contain values from original", () => {
    const df = DataFrame.fromRecords([{ a: 10 }, { a: 20 }, { a: 30 }]);
    const allowed = new Set([10, 20, 30]);
    const r = sampleDataFrame(df, { n: 2, randomState: 0 });
    for (const v of r.col("a").values) {
      expect(allowed.has(v as number)).toBe(true);
    }
  });

  test("all columns preserved when sampling rows", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const r = sampleDataFrame(df, { n: 2, randomState: 0 });
    expect(r.columns.values).toEqual(["a", "b"]);
  });

  test("axis='columns' string form", () => {
    const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4], z: [5, 6] });
    const r = sampleDataFrame(df, { n: 1, axis: "columns", randomState: 0 });
    expect(r.shape[1]).toBe(1);
  });
});
