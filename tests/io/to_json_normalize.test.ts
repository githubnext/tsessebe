/**
 * Tests for to_json_normalize — toJsonDenormalize, toJsonRecords, toJsonSplit, toJsonIndex
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import {
  toJsonDenormalize,
  toJsonIndex,
  toJsonRecords,
  toJsonSplit,
} from "../../src/io/to_json_normalize.ts";

// ─── toJsonDenormalize ────────────────────────────────────────────────────────

describe("toJsonDenormalize", () => {
  test("flat columns unchanged", () => {
    const df = DataFrame.fromColumns({ name: ["Alice", "Bob"], age: [30, 25] });
    const result = toJsonDenormalize(df);
    expect(result).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  test("nested columns reconstructed", () => {
    const df = DataFrame.fromColumns({
      name: ["Alice", "Bob"],
      "address.city": ["NY", "LA"],
      "address.zip": ["10001", "90001"],
    });
    const result = toJsonDenormalize(df);
    expect(result).toEqual([
      { name: "Alice", address: { city: "NY", zip: "10001" } },
      { name: "Bob", address: { city: "LA", zip: "90001" } },
    ]);
  });

  test("deeply nested columns", () => {
    const df = DataFrame.fromColumns({
      "a.b.c": [1, 2],
      "a.b.d": [3, 4],
      "a.e": [5, 6],
    });
    const result = toJsonDenormalize(df);
    expect(result[0]).toEqual({ a: { b: { c: 1, d: 3 }, e: 5 } });
    expect(result[1]).toEqual({ a: { b: { c: 2, d: 4 }, e: 6 } });
  });

  test("custom separator", () => {
    const df = DataFrame.fromColumns({
      x__y: [1, 2],
      x__z: [3, 4],
    });
    const result = toJsonDenormalize(df, { sep: "__" });
    expect(result[0]).toEqual({ x: { y: 1, z: 3 } });
  });

  test("null values preserved", () => {
    const df = DataFrame.fromColumns({ a: [1, null], b: [null, 2] });
    const result = toJsonDenormalize(df);
    expect(result[0]).toEqual({ a: 1, b: null });
    expect(result[1]).toEqual({ a: null, b: 2 });
  });

  test("dropNull omits null fields", () => {
    const df = DataFrame.fromColumns({ a: [1, null], b: [null, 2] });
    const result = toJsonDenormalize(df, { dropNull: true });
    expect(Object.keys(result[0] as object)).toContain("a");
    expect(Object.keys(result[0] as object)).not.toContain("b");
    expect(Object.keys(result[1] as object)).not.toContain("a");
    expect(Object.keys(result[1] as object)).toContain("b");
  });

  test("empty DataFrame returns empty array", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    expect(toJsonDenormalize(df)).toEqual([]);
  });

  test("NaN values map to null", () => {
    const df = DataFrame.fromColumns({ a: [Number.NaN, 1] });
    const result = toJsonDenormalize(df);
    expect(result[0]).toEqual({ a: null });
    expect(result[1]).toEqual({ a: 1 });
  });

  // property: flat DataFrame round-trips through toJsonDenormalize→fromColumns
  test("property: round-trip for flat numeric DataFrames", () => {
    fc.assert(
      fc.property(
        fc
          .record({
            x: fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 5 }),
            y: fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 5 }),
          })
          .filter((r) => r.x.length === r.y.length),
        ({ x, y }) => {
          const df = DataFrame.fromColumns({ x, y });
          const records = toJsonDenormalize(df);
          expect(records.length).toBe(x.length);
          for (let i = 0; i < x.length; i++) {
            expect((records[i] as { x: number; y: number }).x).toBe(x[i]!);
            expect((records[i] as { x: number; y: number }).y).toBe(y[i]!);
          }
        },
      ),
    );
  });
});

// ─── toJsonRecords ────────────────────────────────────────────────────────────

describe("toJsonRecords", () => {
  test("basic records", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const result = toJsonRecords(df);
    expect(result).toEqual([
      { a: 1, b: "x" },
      { a: 2, b: "y" },
    ]);
  });

  test("empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    expect(toJsonRecords(df)).toEqual([]);
  });

  test("column names with dots are NOT split", () => {
    const df = DataFrame.fromColumns({ "a.b": [1, 2] });
    const result = toJsonRecords(df);
    expect(result[0]?.["a.b"]).toBe(1);
  });

  test("null values preserved", () => {
    const df = DataFrame.fromColumns({ x: [null, 1] });
    const result = toJsonRecords(df);
    expect(result[0]).toEqual({ x: null });
  });

  // property: each record has correct columns
  test("property: all records have same keys as DataFrame columns", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 }),
        (nums) => {
          const df = DataFrame.fromColumns({ val: nums });
          const records = toJsonRecords(df);
          for (const r of records) {
            expect(Object.keys(r)).toEqual(["val"]);
          }
        },
      ),
    );
  });
});

// ─── toJsonSplit ──────────────────────────────────────────────────────────────

describe("toJsonSplit", () => {
  test("basic split structure", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const result = toJsonSplit(df);
    expect(result.columns).toEqual(["a", "b"]);
    expect(result.data).toEqual([
      [1, "x"],
      [2, "y"],
    ]);
    expect(result.index).toEqual([0, 1]);
  });

  test("index excluded when includeIndex=false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const result = toJsonSplit(df, { includeIndex: false });
    expect(result.index).toBeUndefined();
  });

  test("custom index preserved", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] }, { index: ["r1", "r2"] });
    const result = toJsonSplit(df);
    expect(result.index).toEqual(["r1", "r2"]);
  });

  test("empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    const result = toJsonSplit(df);
    expect(result.columns).toEqual(["a"]);
    expect(result.data).toEqual([]);
  });

  test("NaN maps to null", () => {
    const df = DataFrame.fromColumns({ a: [Number.NaN, 1] });
    const result = toJsonSplit(df);
    expect(result.data[0]).toEqual([null]);
    expect(result.data[1]).toEqual([1]);
  });

  // property: data rows count equals index.size
  test("property: data length equals row count", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 10 }), (nums) => {
        const df = DataFrame.fromColumns({ n: nums });
        const result = toJsonSplit(df);
        expect(result.data.length).toBe(nums.length);
      }),
    );
  });
});

// ─── toJsonIndex ──────────────────────────────────────────────────────────────

describe("toJsonIndex", () => {
  test("basic index structure", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const result = toJsonIndex(df);
    expect(result).toEqual({
      "0": { a: 1, b: "x" },
      "1": { a: 2, b: "y" },
    });
  });

  test("custom string index", () => {
    const df = DataFrame.fromColumns({ v: [10, 20] }, { index: ["foo", "bar"] });
    const result = toJsonIndex(df);
    expect(result).toHaveProperty("foo");
    expect(result).toHaveProperty("bar");
    expect((result["foo"] as { v: number }).v).toBe(10);
  });

  test("empty DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    expect(toJsonIndex(df)).toEqual({});
  });

  test("null values", () => {
    const df = DataFrame.fromColumns({ x: [null, 5] });
    const result = toJsonIndex(df);
    expect((result["0"] as { x: null }).x).toBeNull();
    expect((result["1"] as { x: number }).x).toBe(5);
  });

  // property: number of keys equals row count
  test("property: key count equals rows", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 10 }), (nums) => {
        const df = DataFrame.fromColumns({ n: nums });
        const result = toJsonIndex(df);
        expect(Object.keys(result).length).toBe(nums.length);
      }),
    );
  });
});
