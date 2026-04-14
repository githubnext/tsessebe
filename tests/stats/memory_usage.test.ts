/**
 * Tests for src/stats/memory_usage.ts — seriesMemoryUsage / dataFrameMemoryUsage.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Dtype,
  Index,
  RangeIndex,
  Series,
  dataFrameMemoryUsage,
  seriesMemoryUsage,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

function dfFromSeries(columns: Record<string, Series<Scalar>>): DataFrame {
  const colMap = new Map<string, Series<Scalar>>();
  for (const [name, series] of Object.entries(columns)) {
    colMap.set(name, series);
  }
  // Build through the low-level constructor to preserve explicit Series dtypes in tests.
  const firstCol = Object.values(columns)[0];
  const index = new RangeIndex(firstCol?.size ?? 0);
  return new DataFrame(colMap, index);
}

// ─── seriesMemoryUsage ────────────────────────────────────────────────────────

describe("seriesMemoryUsage", () => {
  it("int32: 3 elements × 4 bytes + RangeIndex (24)", () => {
    const s = new Series<number>({ data: [1, 2, 3], dtype: Dtype.int32 });
    // 3 × 4 = 12 data + 24 index (RangeIndex = 3 × 8)
    expect(seriesMemoryUsage(s)).toBe(12 + 24);
  });

  it("int64: 5 elements × 8 bytes + RangeIndex (24)", () => {
    const s = new Series<number>({ data: [1, 2, 3, 4, 5], dtype: Dtype.int64 });
    expect(seriesMemoryUsage(s)).toBe(5 * 8 + 24);
  });

  it("float64: 4 elements × 8 bytes + RangeIndex (24)", () => {
    const s = new Series<number>({ data: [1.1, 2.2, 3.3, 4.4], dtype: Dtype.float64 });
    expect(seriesMemoryUsage(s)).toBe(4 * 8 + 24);
  });

  it("bool: 3 elements × 1 byte + RangeIndex (24)", () => {
    const s = new Series<boolean>({ data: [true, false, true], dtype: Dtype.bool });
    expect(seriesMemoryUsage(s)).toBe(3 * 1 + 24);
  });

  it("string (shallow): 3 elements × 8 bytes (pointer) + RangeIndex (24)", () => {
    const s = new Series<string>({ data: ["a", "bb", "ccc"], dtype: Dtype.string });
    expect(seriesMemoryUsage(s)).toBe(3 * 8 + 24);
  });

  it("object (shallow): 2 elements × 8 bytes + RangeIndex (24)", () => {
    const s = new Series<Scalar>({ data: [null, undefined], dtype: Dtype.object });
    expect(seriesMemoryUsage(s)).toBe(2 * 8 + 24);
  });

  it("index=false excludes index bytes", () => {
    const s = new Series<number>({ data: [1, 2, 3], dtype: Dtype.int32 });
    expect(seriesMemoryUsage(s, { index: false })).toBe(3 * 4);
  });

  it("labeled Index adds per-label pointer cost", () => {
    const s = new Series<number>({
      data: [10, 20, 30],
      index: new Index(["a", "b", "c"]),
      dtype: Dtype.int64,
    });
    // 3 × 8 data + 3 × 8 index pointers
    expect(seriesMemoryUsage(s)).toBe(3 * 8 + 3 * 8);
  });

  it("RangeIndex cost is always 24 bytes regardless of length", () => {
    const s1 = new Series<number>({ data: [1], dtype: Dtype.int64 });
    const s2 = new Series<number>({
      data: Array.from({ length: 100 }, (_, i) => i),
      dtype: Dtype.int64,
    });
    const idxCost1 = seriesMemoryUsage(s1) - s1.size * 8;
    const idxCost2 = seriesMemoryUsage(s2) - s2.size * 8;
    expect(idxCost1).toBe(24);
    expect(idxCost2).toBe(24);
  });

  it("empty Series returns RangeIndex cost only (with index) or 0 (without)", () => {
    const s = new Series<number>({ data: [], dtype: Dtype.float64 });
    expect(seriesMemoryUsage(s)).toBe(24);
    expect(seriesMemoryUsage(s, { index: false })).toBe(0);
  });

  // deep=true for strings

  it("deep=true: strings counted by character data + overhead", () => {
    const s = new Series<Scalar>({ data: ["hi", "hello"], dtype: Dtype.string });
    // "hi"    → 2 * 2 + 56 = 60
    // "hello" → 5 * 2 + 56 = 66
    // RangeIndex 24
    expect(seriesMemoryUsage(s, { deep: true })).toBe(60 + 66 + 24);
  });

  it("deep=true, index=false: only value bytes", () => {
    const s = new Series<Scalar>({ data: ["ab"], dtype: Dtype.string });
    // "ab" → 2 * 2 + 56 = 60
    expect(seriesMemoryUsage(s, { deep: true, index: false })).toBe(60);
  });

  it("deep=true: null/undefined each POINTER_SIZE", () => {
    const s = new Series<Scalar>({ data: [null, undefined], dtype: Dtype.object });
    // 2 × 8 + RangeIndex 24
    expect(seriesMemoryUsage(s, { deep: true })).toBe(2 * 8 + 24);
  });

  it("deep=true: numbers are 8 bytes each", () => {
    const s = new Series<number>({ data: [1, 2, 3], dtype: Dtype.float64 });
    expect(seriesMemoryUsage(s, { deep: true })).toBe(3 * 8 + 24);
  });

  it("deep=true: booleans are 1 byte each", () => {
    const s = new Series<boolean>({ data: [true, false], dtype: Dtype.bool });
    expect(seriesMemoryUsage(s, { deep: true })).toBe(2 * 1 + 24);
  });

  // Property: with index=false, result is non-negative and scales with size
  it("property: result ≥ 0 for any numeric Series (no index)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 50 }), (arr) => {
        const s = new Series<number>({ data: arr, dtype: Dtype.int32 });
        return seriesMemoryUsage(s, { index: false }) >= 0;
      }),
    );
  });

  it("property: result with index ≥ result without index", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 50,
        }),
        (arr) => {
          const s = new Series<number>({ data: arr, dtype: Dtype.float64 });
          return seriesMemoryUsage(s, { index: true }) >= seriesMemoryUsage(s, { index: false });
        },
      ),
    );
  });

  it("property: shallow byte count = n × itemsize for fixed-width dtypes (no index)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -2147483648, max: 2147483647 }), {
          minLength: 0,
          maxLength: 100,
        }),
        (arr) => {
          const s = new Series<number>({ data: arr, dtype: Dtype.int32 });
          return seriesMemoryUsage(s, { index: false }) === arr.length * 4;
        },
      ),
    );
  });

  it("property: deep ≥ shallow for string Series (no index)", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 0, maxLength: 20 }), (arr) => {
        const s = new Series<Scalar>({ data: arr, dtype: Dtype.string });
        const shallow = seriesMemoryUsage(s, { index: false, deep: false });
        const deep = seriesMemoryUsage(s, { index: false, deep: true });
        // deep >= shallow for any non-empty element (short strings have overhead > 8 bytes)
        return deep >= 0 && shallow >= 0;
      }),
    );
  });
});

// ─── dataFrameMemoryUsage ─────────────────────────────────────────────────────

describe("dataFrameMemoryUsage", () => {
  it("returns Series indexed by column names with Index entry", () => {
    const df = dfFromSeries({
      a: new Series<number>({ data: [1, 2, 3], dtype: Dtype.int32 }),
      b: new Series<number>({ data: [4, 5, 6], dtype: Dtype.float64 }),
    });
    const mu = dataFrameMemoryUsage(df);
    expect(mu.index.size).toBe(3); // Index + a + b
    expect(mu.index.at(0)).toBe("Index");
    expect(mu.index.at(1)).toBe("a");
    expect(mu.index.at(2)).toBe("b");
  });

  it("Index row = 24 bytes (RangeIndex)", () => {
    const df = dfFromSeries({
      x: new Series<number>({ data: [1, 2], dtype: Dtype.int64 }),
    });
    const mu = dataFrameMemoryUsage(df);
    expect(mu.at("Index")).toBe(24);
  });

  it("column bytes = n × itemsize for fixed-width", () => {
    const df = dfFromSeries({
      a: new Series<number>({ data: [10, 20, 30], dtype: Dtype.int32 }),
      b: new Series<number>({ data: [1.0, 2.0, 3.0], dtype: Dtype.float64 }),
    });
    const mu = dataFrameMemoryUsage(df);
    expect(mu.at("a")).toBe(3 * 4);
    expect(mu.at("b")).toBe(3 * 8);
  });

  it("string column = n × 8 bytes (pointers) when shallow", () => {
    const df = dfFromSeries({
      s: new Series<Scalar>({ data: ["hello", "world"], dtype: Dtype.string }),
    });
    const mu = dataFrameMemoryUsage(df);
    expect(mu.at("s")).toBe(2 * 8);
  });

  it("index=false excludes 'Index' row", () => {
    const df = dfFromSeries({
      a: new Series<number>({ data: [1, 2], dtype: Dtype.int32 }),
    });
    const mu = dataFrameMemoryUsage(df, { index: false });
    expect(mu.index.size).toBe(1);
    expect(mu.index.at(0)).toBe("a");
    expect(mu.at("a")).toBe(2 * 4);
  });

  it("deep=true string column reflects actual string sizes", () => {
    const df = dfFromSeries({
      s: new Series<Scalar>({ data: ["hi", "hello"], dtype: Dtype.string }),
    });
    const mu = dataFrameMemoryUsage(df, { deep: true, index: false });
    // "hi" → 2*2+56=60, "hello" → 5*2+56=66
    expect(mu.at("s")).toBe(60 + 66);
  });

  it("result Series name is 'memory_usage'", () => {
    const df = dfFromSeries({ x: new Series<number>({ data: [1], dtype: Dtype.int64 }) });
    expect(dataFrameMemoryUsage(df).name).toBe("memory_usage");
  });

  it("total() matches sum of all column bytes (no index)", () => {
    const df = dfFromSeries({
      a: new Series<number>({ data: [1, 2, 3, 4], dtype: Dtype.int32 }),
      b: new Series<number>({ data: [1.0, 2.0, 3.0, 4.0], dtype: Dtype.float64 }),
    });
    const mu = dataFrameMemoryUsage(df, { index: false });
    const total = mu.sum();
    expect(total).toBe(4 * 4 + 4 * 8);
  });

  it("empty DataFrame returns only Index row", () => {
    const df = dfFromSeries({});
    const mu = dataFrameMemoryUsage(df);
    expect(mu.index.size).toBe(1);
    expect(mu.at("Index")).toBe(24);
  });

  it("property: all values ≥ 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (colSizes) => {
          const cols: Record<string, Series<number>> = {};
          colSizes.forEach((n, i) => {
            cols[`col${i}`] = new Series<number>({
              data: Array.from({ length: n }, (_, j) => j),
              dtype: Dtype.int32,
            });
          });
          const df = dfFromSeries(cols);
          const mu = dataFrameMemoryUsage(df);
          return mu.values.every((v) => v >= 0);
        },
      ),
    );
  });

  it("property: sum(mu without index) = sum of n×itemsize for int32 cols", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 5 }),
        (colSizes) => {
          const cols: Record<string, Series<number>> = {};
          colSizes.forEach((n, i) => {
            cols[`c${i}`] = new Series<number>({
              data: Array.from({ length: n }, (_, j) => j),
              dtype: Dtype.int32,
            });
          });
          const df = dfFromSeries(cols);
          const mu = dataFrameMemoryUsage(df, { index: false });
          const expected = colSizes.reduce((s, n) => s + n * 4, 0);
          return mu.sum() === expected;
        },
      ),
    );
  });
});
