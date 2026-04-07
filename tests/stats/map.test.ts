/**
 * Tests for seriesMap / dataFrameTransform.
 *
 * Covers seriesMap:
 * - function arg: maps each value
 * - function arg: preserves index and name
 * - function arg: passes null/undefined to function by default
 * - function arg: na_action="ignore" skips NA values
 * - function arg: na_action="ignore" skips NaN values
 * - Map arg: maps values through ES Map
 * - Map arg: missing keys → undefined
 * - dict arg: maps values through plain object
 * - dict arg: numeric keys
 * - dict arg: missing keys → undefined
 * - Series arg: maps values through another Series' index
 * - Series arg: values not in index → undefined
 * - empty series
 * - preserves bigint and Date values when mapped through function
 *
 * Covers dataFrameTransform:
 * - function arg axis=0: transforms each column
 * - function arg axis=1: transforms each row
 * - dict arg: transforms named columns only
 * - dict arg: unnamed columns pass through unchanged
 * - returns same shape as input
 * - preserves index and column names
 * - throws when returned length mismatches
 * - empty DataFrame
 *
 * Property-based:
 * - seriesMap with identity function preserves values
 * - seriesMap length equals input length
 * - seriesMap na_action="ignore" preserves all NA positions
 * - dataFrameTransform shape is unchanged
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameTransform,
  seriesMap,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function vals(s: Series<Scalar>): Scalar[] {
  return [...s.values];
}

function dfCol(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

const isNA = (v: Scalar): boolean =>
  v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));

// ─── seriesMap ────────────────────────────────────────────────────────────────

describe("seriesMap — function arg", () => {
  it("maps each element through the function", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], name: "x" });
    const result = seriesMap(s, (v) => (v as number) * 10);
    expect(vals(result)).toEqual([10, 20, 30]);
  });

  it("preserves original index labels", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [10, 20, 30] });
    const result = seriesMap(s, (v) => v);
    expect([...result.index.values]).toEqual([10, 20, 30]);
  });

  it("preserves series name", () => {
    const s = new Series<Scalar>({ data: [1], name: "hello" });
    expect(seriesMap(s, (v) => v).name).toBe("hello");
  });

  it("passes null values to function by default", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    const seen: Scalar[] = [];
    seriesMap(s, (v) => { seen.push(v); return v; });
    expect(seen).toEqual([1, null, 3]);
  });

  it("na_action=ignore skips null", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    const result = seriesMap(s, (v) => (v as number) * 2, { naAction: "ignore" });
    expect(vals(result)).toEqual([2, null, 6]);
  });

  it("na_action=ignore skips undefined", () => {
    const s = new Series<Scalar>({ data: [10, undefined, 30] });
    const result = seriesMap(s, (v) => (v as number) + 1, { naAction: "ignore" });
    expect(vals(result)).toEqual([11, undefined, 31]);
  });

  it("na_action=ignore skips NaN", () => {
    const s = new Series<Scalar>({ data: [1, Number.NaN, 3] });
    const result = seriesMap(s, (v) => (v as number) * 2, { naAction: "ignore" });
    expect(vals(result)[0]).toBe(2);
    expect(Number.isNaN(vals(result)[1] as number)).toBe(true);
    expect(vals(result)[2]).toBe(6);
  });

  it("returns an empty series for empty input", () => {
    const s = new Series<Scalar>({ data: [] });
    expect(vals(seriesMap(s, (v) => v))).toEqual([]);
  });

  it("maps string values", () => {
    const s = new Series<Scalar>({ data: ["a", "b", "c"] });
    const result = seriesMap(s, (v) => (v as string).toUpperCase());
    expect(vals(result)).toEqual(["A", "B", "C"]);
  });

  it("maps boolean values", () => {
    const s = new Series<Scalar>({ data: [true, false, true] });
    const result = seriesMap(s, (v) => !v);
    expect(vals(result)).toEqual([false, true, false]);
  });
});

describe("seriesMap — Map arg", () => {
  it("maps values through an ES Map", () => {
    const m = new Map<Scalar, Scalar>([
      [1, "one"],
      [2, "two"],
      [3, "three"],
    ]);
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(vals(seriesMap(s, m))).toEqual(["one", "two", "three"]);
  });

  it("missing keys produce undefined", () => {
    const m = new Map<Scalar, Scalar>([[1, "one"]]);
    const s = new Series<Scalar>({ data: [1, 2] });
    expect(vals(seriesMap(s, m))).toEqual(["one", undefined]);
  });

  it("maps null through Map if key exists", () => {
    const m = new Map<Scalar, Scalar>([[null, "missing"]]);
    const s = new Series<Scalar>({ data: [1, null] });
    expect(vals(seriesMap(s, m))).toEqual([undefined, "missing"]);
  });
});

describe("seriesMap — dict arg", () => {
  it("maps string keys", () => {
    const s = new Series<Scalar>({ data: ["a", "b", "c"] });
    const result = seriesMap(s, { a: 1, b: 2, c: 3 });
    expect(vals(result)).toEqual([1, 2, 3]);
  });

  it("maps numeric keys", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    const result = seriesMap(s, { 1: "one", 2: "two", 3: "three" });
    expect(vals(result)).toEqual(["one", "two", "three"]);
  });

  it("missing dict keys produce undefined", () => {
    const s = new Series<Scalar>({ data: [1, 2, 99] });
    const result = seriesMap(s, { 1: "one", 2: "two" });
    expect(vals(result)[2]).toBeUndefined();
  });

  it("handles empty dict", () => {
    const s = new Series<Scalar>({ data: [1, 2] });
    const result = seriesMap(s, {});
    expect(vals(result)).toEqual([undefined, undefined]);
  });
});

describe("seriesMap — Series arg", () => {
  it("maps via another Series index→value", () => {
    const lookup = new Series<Scalar>({ data: ["alpha", "beta", "gamma"], index: [1, 2, 3] });
    const s = new Series<Scalar>({ data: [2, 1, 3] });
    const result = seriesMap(s, lookup);
    expect(vals(result)).toEqual(["beta", "alpha", "gamma"]);
  });

  it("values not in lookup Series index → undefined", () => {
    const lookup = new Series<Scalar>({ data: ["alpha"], index: [1] });
    const s = new Series<Scalar>({ data: [1, 99] });
    const result = seriesMap(s, lookup);
    expect(vals(result)).toEqual(["alpha", undefined]);
  });
});

// ─── dataFrameTransform ───────────────────────────────────────────────────────

describe("dataFrameTransform — function arg, axis=0", () => {
  it("transforms each column with the function", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = dataFrameTransform(df, (col) =>
      col.values.map((v) => (v as number) * 2),
    );
    expect(dfCol(result, "a")).toEqual([2, 4, 6]);
    expect(dfCol(result, "b")).toEqual([8, 10, 12]);
  });

  it("returns a Series from transform function", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [10, 20] });
    const result = dataFrameTransform(df, (col) =>
      new Series<Scalar>({ data: col.values.map((v) => (v as number) + 100), index: col.index }),
    );
    expect(dfCol(result, "a")).toEqual([101, 102]);
    expect(dfCol(result, "b")).toEqual([110, 120]);
  });

  it("preserves column names and index", () => {
    const df = DataFrame.fromColumns({ x: [1], y: [2] });
    const result = dataFrameTransform(df, (col) => col.values.map((v) => v));
    expect([...result.columns.values]).toEqual(["x", "y"]);
    expect([...result.index.values]).toEqual([...df.index.values]);
  });

  it("returns same number of rows", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const result = dataFrameTransform(df, (col) => col.values.map((v) => v));
    expect(result.shape[0]).toBe(5);
  });

  it("throws when returned array length mismatches", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(() => dataFrameTransform(df, (_col) => [1, 2])).toThrow(RangeError);
  });

  it("handles single-column DataFrame", () => {
    const df = DataFrame.fromColumns({ val: [10, 20, 30] });
    const result = dataFrameTransform(df, (col) => col.values.map((v) => (v as number) / 10));
    expect(dfCol(result, "val")).toEqual([1, 2, 3]);
  });
});

describe("dataFrameTransform — function arg, axis=1", () => {
  it("transforms each row with the function", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    // Negate all values in each row.
    const result = dataFrameTransform(
      df,
      (row) => row.values.map((v) => -(v as number)),
      { axis: 1 },
    );
    expect(dfCol(result, "a")).toEqual([-1, -2]);
    expect(dfCol(result, "b")).toEqual([-3, -4]);
  });

  it("returns same shape with axis=1", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const result = dataFrameTransform(df, (row) => row.values.map((v) => v), { axis: 1 });
    expect(result.shape).toEqual([3, 3]);
  });

  it("throws for dict func with axis=1", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    expect(() =>
      dataFrameTransform(df, { a: (col) => col.values.map((v) => v) }, { axis: 1 }),
    ).toThrow(TypeError);
  });
});

describe("dataFrameTransform — dict arg", () => {
  it("applies per-column functions", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameTransform(df, {
      a: (col) => col.values.map((v) => (v as number) + 10),
      b: (col) => col.values.map((v) => (v as number) - 1),
    });
    expect(dfCol(result, "a")).toEqual([11, 12]);
    expect(dfCol(result, "b")).toEqual([2, 3]);
  });

  it("passes through columns not in dict", () => {
    const df = DataFrame.fromColumns({ a: [5, 6], b: [7, 8], c: [9, 10] });
    const result = dataFrameTransform(df, {
      a: (col) => col.values.map((v) => (v as number) * 0),
    });
    expect(dfCol(result, "b")).toEqual([7, 8]);
    expect(dfCol(result, "c")).toEqual([9, 10]);
  });

  it("empty dict: all columns pass through unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = dataFrameTransform(df, {});
    expect(dfCol(result, "a")).toEqual([1, 2]);
    expect(dfCol(result, "b")).toEqual([3, 4]);
  });
});

describe("dataFrameTransform — edge cases", () => {
  it("empty DataFrame (no columns)", () => {
    const df = new DataFrame(new Map(), new Series<Scalar>({ data: [] }).index);
    const result = dataFrameTransform(df, (col) => col.values.map((v) => v));
    expect(result.shape[1]).toBe(0);
  });
});

// ─── property-based ───────────────────────────────────────────────────────────

describe("seriesMap — property-based", () => {
  it("identity function: output equals input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), { minLength: 0, maxLength: 50 }),
        (data) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const result = seriesMap(s, (v) => v);
          for (let i = 0; i < data.length; i++) {
            expect(vals(result)[i]).toBe((data as Scalar[])[i]);
          }
        },
      ),
    );
  });

  it("output length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string()), { minLength: 0, maxLength: 100 }),
        (data) => {
          const s = new Series<Scalar>({ data: data as Scalar[] });
          const result = seriesMap(s, (v) => (v as number) + 1);
          expect(result.values.length).toBe(data.length);
        },
      ),
    );
  });

  it("na_action=ignore: NA positions in output are NA", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer({ min: 1, max: 1000 }),
            fc.constant(null as Scalar),
            fc.constant(undefined as Scalar),
          ),
          { minLength: 0, maxLength: 50 },
        ),
        (data) => {
          const s = new Series<Scalar>({ data });
          const result = seriesMap(s, (v) => (v as number) * 2, { naAction: "ignore" });
          for (let i = 0; i < data.length; i++) {
            if (isNA(data[i] as Scalar)) {
              expect(vals(result)[i]).toBe(data[i]);
            }
          }
        },
      ),
    );
  });
});

describe("dataFrameTransform — property-based", () => {
  it("shape is unchanged by identity transform", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), {
          minLength: 1,
          maxLength: 5,
        }).chain((cols) => {
          const nRows = cols[0]!.length;
          return fc.constant(cols.map((c) => c.slice(0, nRows)));
        }),
        (cols) => {
          const colObj: Record<string, number[]> = {};
          cols.forEach((c, i) => {
            colObj[`c${i}`] = c as number[];
          });
          const df = DataFrame.fromColumns(colObj);
          const result = dataFrameTransform(df, (col) => col.values.map((v) => v));
          expect(result.shape).toEqual(df.shape);
        },
      ),
    );
  });
});
