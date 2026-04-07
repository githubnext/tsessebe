/**
 * Tests for value_counts / dataFrameValueCounts.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { dataFrameValueCounts, valueCounts } from "../../src/stats/value_counts.ts";

// ─── Series value_counts ───────────────────────────────────────────────────────

describe("valueCounts — basic", () => {
  it("counts unique values, sorted descending by default", () => {
    const s = new Series({ data: ["a", "b", "a", "c", "b", "a"] });
    const vc = valueCounts(s);
    expect(vc.values).toEqual([3, 2, 1]);
    expect(vc.index.values).toEqual(["a", "b", "c"]);
  });

  it("returns empty Series for empty input", () => {
    const s = new Series({ data: [] as string[] });
    const vc = valueCounts(s);
    expect(vc.size).toBe(0);
  });

  it("single unique value", () => {
    const s = new Series({ data: [42, 42, 42] });
    const vc = valueCounts(s);
    expect(vc.values).toEqual([3]);
    expect(vc.index.values).toEqual([42]);
  });

  it("all unique values", () => {
    const s = new Series({ data: [3, 1, 2] });
    const vc = valueCounts(s);
    // all counts are 1, original order preserved (stable sort)
    expect(vc.values).toEqual([1, 1, 1]);
  });
});

describe("valueCounts — options", () => {
  it("normalize=true returns proportions summing to 1", () => {
    const s = new Series({ data: ["a", "b", "a", "a"] });
    const vc = valueCounts(s, { normalize: true });
    const sum = (vc.values as number[]).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
    expect(vc.values[0]).toBeCloseTo(0.75);
    expect(vc.values[1]).toBeCloseTo(0.25);
  });

  it("sort=false preserves insertion order", () => {
    const s = new Series({ data: ["b", "a", "b", "c"] });
    const vc = valueCounts(s, { sort: false });
    expect(vc.index.values).toEqual(["b", "a", "c"]);
    expect(vc.values).toEqual([2, 1, 1]);
  });

  it("ascending=true sorts lowest count first", () => {
    const s = new Series({ data: ["a", "b", "a", "c", "b", "a"] });
    const vc = valueCounts(s, { ascending: true });
    expect(vc.values[0]).toBeLessThanOrEqual(vc.values[vc.values.length - 1] as number);
    expect(vc.index.values[0]).toBe("c");
    expect(vc.index.values[2]).toBe("a");
  });

  it("dropna=true (default) excludes null", () => {
    const s = new Series({ data: ["a", null, "b", null, "a"] });
    const vc = valueCounts(s);
    expect(vc.index.values).not.toContain(null);
    expect(vc.values).toEqual([2, 1]);
  });

  it("dropna=false includes null", () => {
    const s = new Series({ data: ["a", null, "b", null, "a"] });
    const vc = valueCounts(s, { dropna: false });
    expect(vc.index.values).toContain(null);
    // null appears 2 times
    const nullIdx = vc.index.values.indexOf(null);
    expect(vc.values[nullIdx]).toBe(2);
  });

  it("dropna=false, normalize=true: null proportions included in denominator", () => {
    const s = new Series({ data: ["a", null, "a"] });
    const vc = valueCounts(s, { dropna: false, normalize: true });
    const sum = (vc.values as number[]).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
  });

  it("NaN treated as missing by default", () => {
    const s = new Series({ data: [1, Number.NaN, 2, 1] });
    const vc = valueCounts(s);
    expect(vc.index.values).not.toContain(null);
    expect(vc.values).toEqual([2, 1]);
  });
});

describe("valueCounts — types", () => {
  it("boolean values", () => {
    const s = new Series({ data: [true, false, true, true] });
    const vc = valueCounts(s);
    expect(vc.values[0]).toBe(3);
    expect(vc.index.values[0]).toBe(true);
  });

  it("numeric values", () => {
    const s = new Series({ data: [1, 2, 1, 3, 2, 1] });
    const vc = valueCounts(s);
    expect(vc.values[0]).toBe(3);
    expect(vc.index.values[0]).toBe(1);
  });

  it("series name is preserved in result", () => {
    const s = new Series({ data: ["a", "b", "a"], name: "col" });
    const vc = valueCounts(s);
    expect(vc.name).toBe("col");
  });
});

// ─── DataFrame value_counts ────────────────────────────────────────────────────

describe("dataFrameValueCounts — basic", () => {
  it("counts unique row combinations", () => {
    const df = DataFrame.fromRecords([
      { a: "x", b: 1 },
      { a: "x", b: 2 },
      { a: "y", b: 1 },
      { a: "x", b: 1 },
    ]);
    const vc = dataFrameValueCounts(df);
    expect(vc.values[0]).toBe(2); // "x|1"
    expect(vc.values[1]).toBe(1);
    expect(vc.values[2]).toBe(1);
  });

  it("empty DataFrame returns empty Series", () => {
    const df = DataFrame.fromRecords([]);
    const vc = dataFrameValueCounts(df);
    expect(vc.size).toBe(0);
  });

  it("subset selects specific columns", () => {
    const df = DataFrame.fromRecords([
      { a: "x", b: 1, c: 99 },
      { a: "x", b: 1, c: 100 },
      { a: "y", b: 2, c: 99 },
    ]);
    const vc = dataFrameValueCounts(df, { subset: ["a", "b"] });
    // "x|1" appears twice
    expect(vc.size).toBe(2);
    expect(vc.values[0]).toBe(2);
  });

  it("normalize=true proportions sum to 1", () => {
    const df = DataFrame.fromRecords([{ a: "x" }, { a: "x" }, { a: "y" }]);
    const vc = dataFrameValueCounts(df, { normalize: true });
    const sum = (vc.values as number[]).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
  });

  it("dropna=true excludes rows with null", () => {
    const df = DataFrame.fromRecords([
      { a: "x", b: 1 },
      { a: null, b: 1 },
      { a: "x", b: 1 },
    ]);
    const vc = dataFrameValueCounts(df);
    expect(vc.size).toBe(1);
    expect(vc.values[0]).toBe(2);
  });

  it("dropna=false includes rows with null", () => {
    const df = DataFrame.fromRecords([
      { a: "x", b: 1 },
      { a: null, b: 1 },
      { a: "x", b: 1 },
    ]);
    const vc = dataFrameValueCounts(df, { dropna: false });
    expect(vc.size).toBe(2);
  });

  it("ascending=true sorts lowest count first", () => {
    const df = DataFrame.fromRecords([{ a: "x" }, { a: "x" }, { a: "y" }]);
    const vc = dataFrameValueCounts(df, { ascending: true });
    expect(vc.values[0]).toBe(1);
    expect(vc.values[1]).toBe(2);
  });
});

// ─── property-based tests ──────────────────────────────────────────────────────

describe("valueCounts — property tests", () => {
  it("total count equals series length (no missing, dropna=true)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: 0, max: 5 }), fc.string({ maxLength: 2 })), {
          minLength: 0,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series({ data: arr });
          const vc = valueCounts(s);
          const total = (vc.values as number[]).reduce((a, b) => a + b, 0);
          expect(total).toBe(arr.length);
        },
      ),
    );
  });

  it("normalize=true: all proportions in [0,1] and sum to 1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const vc = valueCounts(s, { normalize: true });
          const vals = vc.values as number[];
          for (const v of vals) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
          }
          const sum = vals.reduce((a, b) => a + b, 0);
          expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
        },
      ),
    );
  });

  it("count of unique value equals occurrences in original array", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const vc = valueCounts(s, { sort: false });
          for (let i = 0; i < vc.size; i++) {
            const label = vc.index.at(i);
            const expectedCount = arr.filter((v) => v === label).length;
            expect(vc.values[i]).toBe(expectedCount);
          }
        },
      ),
    );
  });

  it("sorted descending: values are non-increasing", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const vc = valueCounts(s); // sort=true, ascending=false
          const vals = vc.values as number[];
          for (let i = 1; i < vals.length; i++) {
            expect(vals[i - 1]).toBeGreaterThanOrEqual(vals[i] as number);
          }
        },
      ),
    );
  });
});
