/**
 * Tests for stats/apply.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import {
  applyDataFrame,
  applyExpandDataFrame,
  applySeries,
  mapDataFrame,
  mapSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── applySeries ───────────────────────────────────────────────────────────────

describe("applySeries", () => {
  test("squares each value", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    expect(applySeries(s, (v) => (v as number) ** 2).values).toEqual([1, 4, 9, 16]);
  });

  test("string transform", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    expect(applySeries(s, (v) => String(v).toUpperCase()).values).toEqual(["A", "B", "C"]);
  });

  test("null values passed to fn", () => {
    const s = new Series<Scalar>({ data: [1, null, 3] });
    expect(applySeries(s, (v) => (v === null ? 0 : (v as number) * 2)).values).toEqual([2, 0, 6]);
  });

  test("fn receives label", () => {
    const s = new Series({ data: [10, 20], index: ["x", "y"] });
    const labels: string[] = [];
    applySeries(s, (v, label) => {
      labels.push(String(label));
      return v;
    });
    expect(labels).toEqual(["x", "y"]);
  });

  test("fn receives index position", () => {
    const s = new Series({ data: [5, 6, 7] });
    expect(applySeries(s, (_v, _l, i) => i).values).toEqual([0, 1, 2]);
  });

  test("preserves name and index", () => {
    const s = new Series({ data: [1, 2], index: ["a", "b"], name: "test" });
    const result = applySeries(s, (v) => v);
    expect(result.name).toBe("test");
    expect(result.index.at(1)).toBe("b");
  });

  // property: apply identity function returns same values
  test("property: identity preserves all values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const s = new Series({ data: data as Scalar[] });
          const result = applySeries(s, (v) => v);
          return (result.values as number[]).every((v, i) => v === data[i]);
        },
      ),
    );
  });

  // property: apply constant function returns constant values
  test("property: constant function fills result", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        fc.integer(),
        (data, k) => {
          const s = new Series({ data: data as Scalar[] });
          const result = applySeries(s, () => k);
          return (result.values as number[]).every((v) => v === k);
        },
      ),
    );
  });
});

// ─── mapSeries ─────────────────────────────────────────────────────────────────

describe("mapSeries", () => {
  test("function mapper behaves like applySeries", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(mapSeries(s, (v) => (v as number) * 10).values).toEqual([10, 20, 30]);
  });

  test("plain object lookup", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    expect(mapSeries(s, { a: 1, b: 2, c: 3 }).values).toEqual([1, 2, 3]);
  });

  test("Map lookup", () => {
    const s = new Series({ data: [1, 2, 3] });
    const lookup = new Map<Scalar, Scalar>([
      [1, "one"],
      [2, "two"],
      [3, "three"],
    ]);
    expect(mapSeries(s, lookup).values).toEqual(["one", "two", "three"]);
  });

  test("missing lookup key returns null", () => {
    const s = new Series({ data: ["a", "z"] });
    expect(mapSeries(s, { a: 1 }).values).toEqual([1, null]);
  });

  test("preserves index and name", () => {
    const s = new Series({ data: [1, 2], name: "x" });
    const result = mapSeries(s, (v) => v);
    expect(result.name).toBe("x");
  });
});

// ─── applyDataFrame ───────────────────────────────────────────────────────────

describe("applyDataFrame", () => {
  test("sum of each column (axis=0)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = applyDataFrame(df, (col) =>
      (col.values as number[]).reduce((acc, v) => acc + v, 0),
    );
    expect(result.values).toEqual([6, 15]);
    expect(result.index.at(0)).toBe("a");
    expect(result.index.at(1)).toBe("b");
  });

  test("max of each column (axis=0)", () => {
    const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [5, 10, 4] });
    const result = applyDataFrame(df, (col) => Math.max(...(col.values as number[])));
    expect(result.values).toEqual([3, 10]);
  });

  test("sum of each row (axis=1)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = applyDataFrame(
      df,
      (row) => (row.values as number[]).reduce((acc, v) => acc + v, 0),
      { axis: 1 },
    );
    expect(result.values).toEqual([4, 6]);
  });

  test("fn receives column name (axis=0)", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const names: string[] = [];
    applyDataFrame(df, (_col, label) => {
      names.push(String(label));
      return 0;
    });
    expect(names).toEqual(["a", "b"]);
  });

  test("fn receives row label (axis=1)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const labels: string[] = [];
    applyDataFrame(
      df,
      (_row, label) => {
        labels.push(String(label));
        return 0;
      },
      { axis: 1 },
    );
    expect(labels).toEqual(["0", "1"]);
  });

  // property: apply len returns column/row sizes
  test("property: length of each column equals row count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
        (col1, col2) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as Scalar[],
            b: col2.slice(0, len) as Scalar[],
          });
          const result = applyDataFrame(df, (col) => col.size);
          return (result.values as number[]).every((v) => v === len);
        },
      ),
    );
  });
});

// ─── applyExpandDataFrame ────────────────────────────────────────────────────

describe("applyExpandDataFrame", () => {
  test("double each column (axis=0)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = applyExpandDataFrame(
      df,
      (col) =>
        new Series<Scalar>({
          data: (col.values as number[]).map((v) => v * 2),
          index: col.index,
          name: col.name,
        }),
    );
    expect(result.col("a").values).toEqual([2, 4, 6]);
    expect(result.col("b").values).toEqual([8, 10, 12]);
  });

  test("apply returning same Series (identity)", () => {
    const df = DataFrame.fromColumns({ x: [10, 20], y: [30, 40] });
    const result = applyExpandDataFrame(df, (col) => col);
    expect(result.col("x").values).toEqual([10, 20]);
    expect(result.col("y").values).toEqual([30, 40]);
  });

  test("axis=1: transform each row into scaled version", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    // Each row → multiply all values by row index
    const result = applyExpandDataFrame(
      df,
      (row, label) => {
        const scale = (label as number) + 1;
        return new Series<Scalar>({
          data: (row.values as number[]).map((v) => v * scale),
          index: row.index,
          name: String(label),
        });
      },
      { axis: 1 },
    );
    expect(result.col("a").values).toEqual([1 * 1, 2 * 2]);
    expect(result.col("b").values).toEqual([3 * 1, 4 * 2]);
  });

  test("result has same number of rows as input", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = applyExpandDataFrame(df, (col) => col);
    expect(result.index.size).toBe(3);
  });
});

// ─── mapDataFrame ─────────────────────────────────────────────────────────────

describe("mapDataFrame", () => {
  test("squares all values", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = mapDataFrame(df, (v) => (v as number) ** 2);
    expect(result.col("a").values).toEqual([1, 4, 9]);
    expect(result.col("b").values).toEqual([16, 25, 36]);
  });

  test("fn receives row label and col name", () => {
    const df = DataFrame.fromColumns({ a: [100] });
    const meta: [string, string][] = [];
    mapDataFrame(df, (v, rowLabel, colName) => {
      meta.push([String(rowLabel), colName]);
      return v;
    });
    expect(meta[0]).toEqual(["0", "a"]);
  });

  test("null values passed to fn", () => {
    const df = DataFrame.fromColumns<Scalar>({ a: [null, 2] });
    const result = mapDataFrame(df, (v) => (v === null ? -1 : (v as number) * 10));
    expect(result.col("a").values).toEqual([-1, 20]);
  });

  test("preserves shape and index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = mapDataFrame(df, (v) => v);
    expect(result.index.size).toBe(2);
    expect(result.columns.values).toEqual(["a", "b"]);
  });

  // property: identity map preserves all values
  test("property: identity map preserves all values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 6 }),
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 6 }),
        (col1, col2) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as Scalar[],
            b: col2.slice(0, len) as Scalar[],
          });
          const result = mapDataFrame(df, (v) => v);
          const origA = df.col("a").values;
          const origB = df.col("b").values;
          return (
            (result.col("a").values as Scalar[]).every((v, i) => v === origA[i]) &&
            (result.col("b").values as Scalar[]).every((v, i) => v === origB[i])
          );
        },
      ),
    );
  });

  // property: constant map fills all cells with that constant
  test("property: constant map", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 6 }),
        fc.integer(),
        (data, k) => {
          const df = DataFrame.fromColumns({ a: data as Scalar[] });
          const result = mapDataFrame(df, () => k);
          return (result.col("a").values as number[]).every((v) => v === k);
        },
      ),
    );
  });
});
