/**
 * Tests for combine — combineSeries and combineDataFrame.
 *
 * Covers:
 * - combineSeries: basic element-wise op, union of indices, fillValue
 * - combineDataFrame: shared columns, overwrite=true/false, union columns
 * - Property-based: result length is union of indices
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, combineDataFrame, combineSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

describe("combineSeries", () => {
  test("element-wise max over aligned index", () => {
    const a = new Series<Scalar>({ data: [1, 5, 3], index: [0, 1, 2] });
    const b = new Series<Scalar>({ data: [10, 2, 30], index: [0, 1, 2] });
    const result = combineSeries(a, b, (x, y) => Math.max(x as number, y as number));
    expect(result.values).toEqual([10, 5, 30]);
  });

  test("element-wise addition over aligned index", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const b = new Series<Scalar>({ data: [10, 20, 30], index: [0, 1, 2] });
    const result = combineSeries(a, b, (x, y) => (x as number) + (y as number));
    expect(result.values).toEqual([11, 22, 33]);
  });

  test("union of indices with default fillValue=null", () => {
    const a = new Series<Scalar>({ data: [1, 2], index: ["x", "y"] });
    const b = new Series<Scalar>({ data: [10, 30], index: ["x", "z"] });
    const result = combineSeries(a, b, (x, y) => {
      if (x === null) {
        return y;
      }
      if (y === null) {
        return x;
      }
      return (x as number) + (y as number);
    });
    // x: 1+10=11, y: 2+null→2, z: null+30→30
    const vals = result.values as Scalar[];
    expect(vals).toContain(11);
    expect(vals).toContain(2);
    expect(vals).toContain(30);
    expect(result.index.size).toBe(3);
  });

  test("union of indices with custom fillValue", () => {
    const a = new Series<Scalar>({ data: [1, 2], index: ["x", "y"] });
    const b = new Series<Scalar>({ data: [10, 30], index: ["x", "z"] });
    const result = combineSeries(a, b, (x, y) => (x as number) + (y as number), 0);
    // x: 1+10=11, y: 2+0=2, z: 0+30=30
    const vals = result.values as Scalar[];
    expect(vals).toContain(11);
    expect(vals).toContain(2);
    expect(vals).toContain(30);
  });

  test("identical indices produce same-length result", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    const b = new Series<Scalar>({ data: [4, 5, 6], index: [0, 1, 2] });
    const result = combineSeries(a, b, (x, y) => (x as number) * (y as number));
    expect(result.values).toEqual([4, 10, 18]);
    expect(result.index.size).toBe(3);
  });

  test("empty Series combined with non-empty", () => {
    const a = new Series<Scalar>({ data: [], index: [] });
    const b = new Series<Scalar>({ data: [1, 2], index: [0, 1] });
    const result = combineSeries(a, b, (x, y) => (x === null ? y : x), null);
    expect(result.index.size).toBe(2);
  });

  test("single-element Series", () => {
    const a = new Series<Scalar>({ data: [7], index: [0] });
    const b = new Series<Scalar>({ data: [3], index: [0] });
    const result = combineSeries(a, b, (x, y) => (x as number) - (y as number));
    expect(result.values).toEqual([4]);
  });

  test("non-overlapping indices", () => {
    const a = new Series<Scalar>({ data: [1, 2], index: ["a", "b"] });
    const b = new Series<Scalar>({ data: [10, 20], index: ["c", "d"] });
    const result = combineSeries(a, b, (x, y) => {
      if (x === null) {
        return y;
      }
      if (y === null) {
        return x;
      }
      return (x as number) + (y as number);
    });
    expect(result.index.size).toBe(4);
  });

  test("string labels in index", () => {
    const a = new Series<Scalar>({ data: [100], index: ["foo"] });
    const b = new Series<Scalar>({ data: [200], index: ["foo"] });
    const result = combineSeries(a, b, (x, y) => (x as number) + (y as number));
    expect(result.values).toEqual([300]);
    expect(result.index.at(0)).toBe("foo");
  });

  // property: result length >= max of both lengths
  test("property: result length >= max(len(a), len(b))", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 8 }),
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 8 }),
        (arrA, arrB) => {
          const idxA = arrA.map((_, i) => i);
          const idxB = arrB.map((_, i) => i + arrA.length);
          const a = new Series<Scalar>({ data: arrA, index: idxA });
          const b = new Series<Scalar>({ data: arrB, index: idxB });
          const result = combineSeries(a, b, (x, y) => {
            if (x === null) {
              return y;
            }
            if (y === null) {
              return x;
            }
            return (x as number) + (y as number);
          });
          return result.index.size >= Math.max(arrA.length, arrB.length);
        },
      ),
    );
  });

  // property: for aligned indices, result values come from func
  test("property: aligned result = func(a, b)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        (arrA, arrB) => {
          const len = Math.min(arrA.length, arrB.length);
          const a = new Series<Scalar>({
            data: arrA.slice(0, len),
            index: Array.from({ length: len }, (_, i) => i),
          });
          const b = new Series<Scalar>({
            data: arrB.slice(0, len),
            index: Array.from({ length: len }, (_, i) => i),
          });
          const result = combineSeries(a, b, (x, y) => (x as number) + (y as number));
          const vals = result.values as number[];
          return vals.every((v, i) => {
            const expected = (arrA[i] ?? 0) + (arrB[i] ?? 0);
            return Math.abs(v - expected) < 1e-9;
          });
        },
      ),
    );
  });
});

describe("combineDataFrame", () => {
  test("shared columns: element-wise max", () => {
    const a = DataFrame.fromColumns({ x: [1, 5, 3], y: [100, 200, 300] });
    const b = DataFrame.fromColumns({ x: [10, 2, 30], y: [50, 250, 150] });
    const result = combineDataFrame(a, b, (p, q) => Math.max(p as number, q as number));
    expect([...result.col("x").values]).toEqual([10, 5, 30]);
    expect([...result.col("y").values]).toEqual([100, 250, 300]);
  });

  test("union of columns: overwrite=true (default)", () => {
    const a = DataFrame.fromColumns({ x: [1, 2], y: [10, 20] });
    const b = DataFrame.fromColumns({ x: [100, 200], z: [1000, 2000] });
    const result = combineDataFrame(a, b, (p, q) => Math.min(p as number, q as number));
    // x shared: min(1,100)=1, min(2,200)=2
    expect([...result.col("x").values]).toEqual([1, 2]);
    // z only in b; overwrite=true: func(fillValue=null, v) — result depends on func
    expect(result.columns.values).toContain("z");
    expect(result.columns.values).toContain("y");
  });

  test("overwrite=false preserves unshared columns unchanged", () => {
    const a = DataFrame.fromColumns({ x: [1, 2], y: [10, 20] });
    const b = DataFrame.fromColumns({ x: [100, 200], z: [1000, 2000] });
    const result = combineDataFrame(a, b, (p, q) => Math.min(p as number, q as number), {
      overwrite: false,
    });
    // y only in a; overwrite=false → preserved as-is
    expect([...result.col("y").values]).toEqual([10, 20]);
    // z only in b; overwrite=false → preserved as-is
    expect([...result.col("z").values]).toEqual([1000, 2000]);
  });

  test("single column shared", () => {
    const a = DataFrame.fromColumns({ a: [1, 2, 3] });
    const b = DataFrame.fromColumns({ a: [4, 5, 6] });
    const result = combineDataFrame(a, b, (p, q) => (p as number) + (q as number));
    expect([...result.col("a").values]).toEqual([5, 7, 9]);
  });

  test("empty DataFrames", () => {
    const a = DataFrame.fromColumns({ a: [] as number[] });
    const b = DataFrame.fromColumns({ a: [] as number[] });
    const result = combineDataFrame(a, b, (p, q) => (p as number) + (q as number));
    expect(result.col("a").index.size).toBe(0);
  });

  test("fillValue used for missing side", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] });
    const b = DataFrame.fromColumns({ y: [10, 20] });
    const result = combineDataFrame(
      a,
      b,
      (p, q) => {
        const pn = p === null ? 0 : (p as number);
        const qn = q === null ? 0 : (q as number);
        return pn + qn;
      },
      { fillValue: 0 },
    );
    expect(result.columns.values).toContain("x");
    expect(result.columns.values).toContain("y");
  });

  test("property: result has all columns from both DataFrames", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 3 }), { minLength: 1, maxLength: 4 }),
        fc.array(fc.string({ minLength: 1, maxLength: 3 }), { minLength: 1, maxLength: 4 }),
        (colsA, colsB) => {
          // dedup
          const uniqueA = [...new Set(colsA)];
          const uniqueB = [...new Set(colsB)];
          const dataA: Record<string, number[]> = {};
          const dataB: Record<string, number[]> = {};
          for (const c of uniqueA) {
            dataA[c] = [1, 2];
          }
          for (const c of uniqueB) {
            dataB[c] = [3, 4];
          }
          const a = DataFrame.fromColumns(dataA);
          const b = DataFrame.fromColumns(dataB);
          const result = combineDataFrame(
            a,
            b,
            (p, q) => {
              if (p === null) {
                return q;
              }
              if (q === null) {
                return p;
              }
              return p;
            },
            { overwrite: false },
          );
          const resultCols = new Set(result.columns.values);
          return uniqueA.every((c) => resultCols.has(c)) && uniqueB.every((c) => resultCols.has(c));
        },
      ),
    );
  });
});
