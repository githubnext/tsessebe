import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, sampleDataFrame, sampleSeries } from "../../src/index.ts";
import type { Label } from "../../src/index.ts";

// ─── sampleSeries ─────────────────────────────────────────────────────────────

describe("sampleSeries — basic", () => {
  const s = new Series({ data: [10, 20, 30, 40, 50], index: ["a", "b", "c", "d", "e"] });

  test("default n=1 returns one element", () => {
    const r = sampleSeries(s, { randomState: 0 });
    expect(r.size).toBe(1);
  });

  test("n=3 returns 3 elements", () => {
    const r = sampleSeries(s, { n: 3, randomState: 1 });
    expect(r.size).toBe(3);
  });

  test("values come from source", () => {
    const r = sampleSeries(s, { n: 5, randomState: 2 });
    const allowed = new Set([10, 20, 30, 40, 50]);
    for (const v of r.values) {
      expect(allowed.has(v as number)).toBe(true);
    }
  });

  test("without replacement: no duplicates (n=5 from 5)", () => {
    const r = sampleSeries(s, { n: 5, randomState: 7 });
    expect(new Set(r.values).size).toBe(5);
  });

  test("frac=0.4 → 2 elements", () => {
    const r = sampleSeries(s, { frac: 0.4, randomState: 3 });
    expect(r.size).toBe(2);
  });

  test("frac=1.0 → all elements", () => {
    const r = sampleSeries(s, { frac: 1.0, randomState: 4 });
    expect(r.size).toBe(5);
  });

  test("frac=0 → empty", () => {
    const r = sampleSeries(s, { frac: 0, randomState: 5 });
    expect(r.size).toBe(0);
  });

  test("randomState produces same result every time", () => {
    const r1 = sampleSeries(s, { n: 3, randomState: 99 });
    const r2 = sampleSeries(s, { n: 3, randomState: 99 });
    expect(r1.values).toEqual(r2.values);
    expect(r1.index.toArray()).toEqual(r2.index.toArray());
  });

  test("different seeds produce (potentially) different results", () => {
    const r1 = sampleSeries(s, { n: 3, randomState: 1 });
    const r2 = sampleSeries(s, { n: 3, randomState: 9999 });
    // With 5 elements and n=3, probability of getting identical samples is low.
    // We just check both are valid.
    expect(r1.size).toBe(3);
    expect(r2.size).toBe(3);
  });

  test("index is preserved by default", () => {
    const r = sampleSeries(s, { n: 2, randomState: 10 });
    const allowed = new Set<Label>(["a", "b", "c", "d", "e"]);
    for (const label of r.index.toArray()) {
      expect(allowed.has(label)).toBe(true);
    }
  });

  test("ignoreIndex resets index", () => {
    const r = sampleSeries(s, { n: 3, ignoreIndex: true, randomState: 11 });
    expect(r.index.toArray()).toEqual([0, 1, 2]);
  });

  test("with replacement allows n > size", () => {
    const r = sampleSeries(s, { n: 10, replace: true, randomState: 12 });
    expect(r.size).toBe(10);
  });

  test("with replacement may repeat values", () => {
    // Single-element series + replace=true → all same
    const single = new Series({ data: [42] });
    const r = sampleSeries(single, { n: 5, replace: true, randomState: 0 });
    expect(r.values).toEqual([42, 42, 42, 42, 42]);
  });
});

// ─── sampleSeries — weights ───────────────────────────────────────────────────

describe("sampleSeries — weights", () => {
  test("zero-weight element never selected (probabilistic)", () => {
    const s = new Series({ data: [1, 2, 3] });
    const weights = [0, 1, 1] as const;
    const counts = new Map<number, number>([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    for (let seed = 0; seed < 50; seed++) {
      const r = sampleSeries(s, { n: 1, weights, randomState: seed });
      const v = r.values[0] as number;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(counts.get(1)).toBe(0);
  });

  test("high-weight element selected more often (probabilistic)", () => {
    const s = new Series({ data: [1, 2, 3] });
    const weights = [0, 0, 10] as const;
    for (let seed = 0; seed < 20; seed++) {
      const r = sampleSeries(s, { n: 1, weights, randomState: seed });
      expect(r.values[0]).toBe(3);
    }
  });

  test("weights need not sum to 1", () => {
    const s = new Series({ data: [1, 2] });
    const r = sampleSeries(s, { n: 1, weights: [100, 0], randomState: 0 });
    expect(r.values[0]).toBe(1);
  });

  test("throws on all-zero weights", () => {
    const s = new Series({ data: [1, 2] });
    expect(() => sampleSeries(s, { n: 1, weights: [0, 0] })).toThrow();
  });

  test("throws on negative weight", () => {
    const s = new Series({ data: [1, 2] });
    expect(() => sampleSeries(s, { n: 1, weights: [-1, 1] })).toThrow();
  });
});

// ─── sampleSeries — errors ────────────────────────────────────────────────────

describe("sampleSeries — errors", () => {
  const s = new Series({ data: [1, 2, 3] });

  test("throws when both n and frac specified", () => {
    expect(() => sampleSeries(s, { n: 2, frac: 0.5 })).toThrow();
  });

  test("throws on negative n", () => {
    expect(() => sampleSeries(s, { n: -1 })).toThrow();
  });

  test("throws when n > size without replace", () => {
    expect(() => sampleSeries(s, { n: 10 })).toThrow();
  });

  test("n > size allowed with replace", () => {
    expect(() => sampleSeries(s, { n: 10, replace: true })).not.toThrow();
  });
});

// ─── sampleSeries — name/dtype preserved ─────────────────────────────────────

describe("sampleSeries — metadata", () => {
  test("name is preserved", () => {
    const s = new Series({ data: [1, 2, 3], name: "x" });
    expect(sampleSeries(s, { n: 2, randomState: 0 }).name).toBe("x");
  });
});

// ─── sampleDataFrame — rows ───────────────────────────────────────────────────

describe("sampleDataFrame — rows (axis=0)", () => {
  const df = DataFrame.fromColumns({
    a: [1, 2, 3, 4, 5],
    b: [10, 20, 30, 40, 50],
  });

  test("default n=1 returns 1 row", () => {
    const r = sampleDataFrame(df, { randomState: 0 });
    expect(r.index.size).toBe(1);
  });

  test("n=3 returns 3 rows", () => {
    const r = sampleDataFrame(df, { n: 3, randomState: 1 });
    expect(r.index.size).toBe(3);
  });

  test("columns are preserved", () => {
    const r = sampleDataFrame(df, { n: 2, randomState: 2 });
    expect(r.columns.values).toEqual(["a", "b"]);
  });

  test("values come from source", () => {
    const r = sampleDataFrame(df, { n: 5, randomState: 3 });
    const allowed = new Set([1, 2, 3, 4, 5]);
    for (const v of r.col("a").values) {
      expect(allowed.has(v as number)).toBe(true);
    }
  });

  test("row integrity: a[i] / b[i] correspond to same source row", () => {
    const r = sampleDataFrame(df, { n: 3, randomState: 5 });
    const aVals = r.col("a").values as number[];
    const bVals = r.col("b").values as number[];
    for (let i = 0; i < aVals.length; i++) {
      expect((bVals[i] as number) / (aVals[i] as number)).toBe(10);
    }
  });

  test("randomState reproducible", () => {
    const r1 = sampleDataFrame(df, { n: 3, randomState: 42 });
    const r2 = sampleDataFrame(df, { n: 3, randomState: 42 });
    expect(r1.col("a").values).toEqual(r2.col("a").values);
  });

  test("frac=0.6 → 3 rows", () => {
    const r = sampleDataFrame(df, { frac: 0.6, randomState: 6 });
    expect(r.index.size).toBe(3);
  });

  test("with replacement allows n > nRows", () => {
    const r = sampleDataFrame(df, { n: 10, replace: true, randomState: 7 });
    expect(r.index.size).toBe(10);
  });

  test("ignoreIndex resets row index", () => {
    const r = sampleDataFrame(df, { n: 3, ignoreIndex: true, randomState: 8 });
    expect(r.index.toArray()).toEqual([0, 1, 2]);
  });
});

// ─── sampleDataFrame — columns (axis=1) ──────────────────────────────────────

describe("sampleDataFrame — columns (axis=1)", () => {
  const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 4], z: [5, 6] });

  test("n=2 returns 2-column DataFrame", () => {
    const r = sampleDataFrame(df, { n: 2, axis: 1, randomState: 0 });
    expect(r.columns.values.length).toBe(2);
  });

  test("sampled columns come from source", () => {
    const allowed = new Set(["x", "y", "z"]);
    const r = sampleDataFrame(df, { n: 2, axis: 1, randomState: 1 });
    for (const col of r.columns.values) {
      expect(allowed.has(col as string)).toBe(true);
    }
  });

  test("frac=1/3 → 1 column", () => {
    const r = sampleDataFrame(df, { frac: 1 / 3, axis: 1, randomState: 2 });
    expect(r.columns.values.length).toBe(1);
  });

  test("column values are preserved", () => {
    const r = sampleDataFrame(df, { n: 3, axis: 1, randomState: 3 });
    for (const col of r.columns.values) {
      const orig = df.col(col as string).values;
      const sampled = r.col(col as string).values;
      expect(sampled).toEqual(orig);
    }
  });
});

// ─── sampleDataFrame — errors ─────────────────────────────────────────────────

describe("sampleDataFrame — errors", () => {
  const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });

  test("throws when both n and frac specified", () => {
    expect(() => sampleDataFrame(df, { n: 1, frac: 0.5 })).toThrow();
  });

  test("throws n > nRows without replace", () => {
    expect(() => sampleDataFrame(df, { n: 10 })).toThrow();
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("sampleSeries — property tests", () => {
  test("result size equals requested n", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (data, seed) => {
          const n = Math.min(3, data.length);
          const s = new Series({ data });
          const r = sampleSeries(s, { n, randomState: seed });
          return r.size === n;
        },
      ),
    );
  });

  test("all sampled values exist in source", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 15 }),
        fc.integer({ min: 0 }),
        (data, seed) => {
          const n = Math.min(data.length, 5);
          const s = new Series({ data });
          const r = sampleSeries(s, { n, randomState: seed });
          const allowed = new Set(data);
          return (r.values as number[]).every((v) => allowed.has(v));
        },
      ),
    );
  });

  test("same randomState → same result", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        fc.nat(99999),
        (data, seed) => {
          const n = Math.min(data.length, 3);
          const s = new Series({ data });
          const r1 = sampleSeries(s, { n, randomState: seed });
          const r2 = sampleSeries(s, { n, randomState: seed });
          return JSON.stringify(r1.values) === JSON.stringify(r2.values);
        },
      ),
    );
  });

  test("without replacement: no duplicate positions", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (data, seed) => {
          const n = Math.min(data.length, 4);
          const s = new Series({ data });
          const r = sampleSeries(s, { n, randomState: seed });
          return new Set(r.index.toArray()).size === r.size;
        },
      ),
    );
  });
});

describe("sampleDataFrame — property tests", () => {
  test("result has correct number of rows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        fc.nat(99999),
        (data, seed) => {
          const n = Math.min(data.length, 3);
          const df = DataFrame.fromColumns({ v: data });
          const r = sampleDataFrame(df, { n, randomState: seed });
          return r.index.size === n;
        },
      ),
    );
  });

  test("columns are preserved after row sampling", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 8 }),
        fc.nat(9999),
        (data, seed) => {
          const n = Math.min(data.length, 2);
          const df = DataFrame.fromColumns({ a: data, b: data });
          const r = sampleDataFrame(df, { n, randomState: seed });
          return r.columns.values.includes("a") && r.columns.values.includes("b");
        },
      ),
    );
  });
});
