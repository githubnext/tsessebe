/**
 * Tests for stats/replace — value substitution for Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { replaceDataFrame, replaceSeries } from "../../src/stats/replace.ts";

// ─── replaceSeries — scalar → scalar ─────────────────────────────────────────

describe("replaceSeries: scalar → scalar", () => {
  it("replaces a matching value", () => {
    const s = new Series({ data: [1, 2, 3, 2, 1] });
    const r = replaceSeries(s, { toReplace: 2, value: 99 });
    expect([...r.values]).toEqual([1, 99, 3, 99, 1]);
  });

  it("leaves non-matching values unchanged", () => {
    const s = new Series({ data: [1, 2, 3] });
    const r = replaceSeries(s, { toReplace: 9, value: 0 });
    expect([...r.values]).toEqual([1, 2, 3]);
  });

  it("replaces string values", () => {
    const s = new Series({ data: ["a", "b", "a", "c"] });
    const r = replaceSeries(s, { toReplace: "a", value: "z" });
    expect([...r.values]).toEqual(["z", "b", "z", "c"]);
  });

  it("replaces null values", () => {
    const s = new Series({ data: [1, null, 3, null] });
    const r = replaceSeries(s, { toReplace: null, value: 0 });
    expect([...r.values]).toEqual([1, 0, 3, 0]);
  });

  it("replaces NaN values when matchNaN=true (default)", () => {
    const s = new Series({ data: [1, Number.NaN, 3] });
    const r = replaceSeries(s, { toReplace: Number.NaN, value: 0 });
    expect([...r.values]).toEqual([1, 0, 3]);
  });

  it("does NOT replace NaN when matchNaN=false", () => {
    const s = new Series({ data: [1, Number.NaN, 3] });
    const r = replaceSeries(s, { toReplace: Number.NaN, value: 0 }, { matchNaN: false });
    expect(Number.isNaN((r.values[1] as number))).toBe(true);
  });

  it("preserves index", () => {
    const s = new Series({ data: [1, 2, 3], index: ["x", "y", "z"] });
    const r = replaceSeries(s, { toReplace: 2, value: 20 });
    expect([...r.index.values]).toEqual(["x", "y", "z"]);
  });

  it("preserves name", () => {
    const s = new Series({ data: [1, 2], name: "myCol" });
    const r = replaceSeries(s, { toReplace: 1, value: 0 });
    expect(r.name).toBe("myCol");
  });

  it("returns empty series when input is empty", () => {
    const s = new Series({ data: [] });
    const r = replaceSeries(s, { toReplace: 1, value: 0 });
    expect(r.size).toBe(0);
  });
});

// ─── replaceSeries — array → scalar ───────────────────────────────────────────

describe("replaceSeries: array → scalar", () => {
  it("replaces all listed values with single value", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const r = replaceSeries(s, { toReplace: [1, 3, 5], value: 0 });
    expect([...r.values]).toEqual([0, 2, 0, 4, 0]);
  });

  it("handles empty toReplace array", () => {
    const s = new Series({ data: [1, 2, 3] });
    const r = replaceSeries(s, { toReplace: [], value: 0 });
    expect([...r.values]).toEqual([1, 2, 3]);
  });
});

// ─── replaceSeries — array → array ────────────────────────────────────────────

describe("replaceSeries: array → array", () => {
  it("performs pair-wise replacement", () => {
    const s = new Series({ data: [1, 2, 3, 1, 2] });
    const r = replaceSeries(s, { toReplace: [1, 2], value: [10, 20] });
    expect([...r.values]).toEqual([10, 20, 3, 10, 20]);
  });

  it("throws when array lengths differ", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(() => replaceSeries(s, { toReplace: [1, 2], value: [10] })).toThrow(RangeError);
  });
});

// ─── replaceSeries — mapping (Record) ─────────────────────────────────────────

describe("replaceSeries: Record mapping", () => {
  it("replaces using a Record map", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    const r = replaceSeries(s, { toReplace: { "1": 10, "3": 30 } });
    expect([...r.values]).toEqual([10, 2, 30, 4]);
  });

  it("leaves values with no mapping entry unchanged", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    const r = replaceSeries(s, { toReplace: { "a": "A" } });
    expect([...r.values]).toEqual(["A", "b", "c"]);
  });
});

// ─── replaceSeries — mapping (Map) ────────────────────────────────────────────

describe("replaceSeries: Map mapping", () => {
  it("replaces using a Map", () => {
    const s = new Series({ data: [1, 2, 3, 2, 1] });
    const map = new Map<number | string | boolean | bigint | null | undefined | Date, number | string | boolean | bigint | null | undefined | Date>([[1, 100], [2, 200]]);
    const r = replaceSeries(s, { toReplace: map });
    expect([...r.values]).toEqual([100, 200, 3, 200, 100]);
  });

  it("handles NaN keys in Map with matchNaN=true", () => {
    const s = new Series({ data: [1, Number.NaN, 3] });
    const map = new Map([[Number.NaN, 99]]);
    const r = replaceSeries(s, { toReplace: map });
    expect([...r.values]).toEqual([1, 99, 3]);
  });
});

// ─── replaceDataFrame ─────────────────────────────────────────────────────────

describe("replaceDataFrame: basic", () => {
  it("replaces value in all columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 2, 4] });
    const r = replaceDataFrame(df, { toReplace: 2, value: 0 });
    expect([...r.col("a").values]).toEqual([1, 0, 3]);
    expect([...r.col("b").values]).toEqual([0, 0, 4]);
  });

  it("restricts replacement to specified columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 2, 4] });
    const r = replaceDataFrame(df, { toReplace: 2, value: 0 }, { columns: ["a"] });
    expect([...r.col("a").values]).toEqual([1, 0, 3]);
    expect([...r.col("b").values]).toEqual([2, 2, 4]);
  });

  it("preserves index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const r = replaceDataFrame(df, { toReplace: 1, value: 10 });
    expect([...r.index.values]).toEqual([...df.index.values]);
  });

  it("preserves columns order", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2], c: [3] });
    const r = replaceDataFrame(df, { toReplace: 1, value: 99 });
    expect([...r.columns.values]).toEqual(["a", "b", "c"]);
  });

  it("uses array → scalar replacement across columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [3, 4, 5] });
    const r = replaceDataFrame(df, { toReplace: [1, 3], value: 0 });
    expect([...r.col("a").values]).toEqual([0, 2, 0]);
    expect([...r.col("b").values]).toEqual([0, 4, 5]);
  });

  it("uses Record mapping across columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [2, 3] });
    const r = replaceDataFrame(df, { toReplace: { "2": 20 } });
    expect([...r.col("a").values]).toEqual([1, 20]);
    expect([...r.col("b").values]).toEqual([20, 3]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("replaceSeries: properties", () => {
  it("scalar→scalar: replaced value never appears where original matched", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 10, max: 99 }),
        (data, old, newVal) => {
          const s = new Series({ data });
          const r = replaceSeries(s, { toReplace: old, value: newVal });
          for (let i = 0; i < s.size; i++) {
            if (s.values[i] === old) {
              if (r.values[i] !== newVal) return false;
            } else {
              if (r.values[i] !== s.values[i]) return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("size is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 30 }),
        (data) => {
          const s = new Series({ data });
          const r = replaceSeries(s, { toReplace: 5, value: 0 });
          return r.size === s.size;
        },
      ),
    );
  });

  it("no-op when toReplace not present", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const s = new Series({ data });
          // 99 is never in the array since data is 0-5
          const r = replaceSeries(s, { toReplace: 99, value: -1 });
          return [...r.values].every((v, i) => v === data[i]);
        },
      ),
    );
  });

  it("array→array: pair-wise replacement is consistent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const s = new Series({ data });
          const r = replaceSeries(s, { toReplace: [1, 2, 3], value: [10, 20, 30] });
          const mapping: Record<number, number> = { 1: 10, 2: 20, 3: 30 };
          return [...r.values].every((v, i) => {
            const orig = data[i] as number;
            const expected = mapping[orig] ?? orig;
            return v === expected;
          });
        },
      ),
    );
  });
});
