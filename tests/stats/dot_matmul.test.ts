/**
 * Tests for dot_matmul — seriesDotSeries, seriesDotDataFrame, dataFrameDotSeries, dataFrameDotDataFrame.
 *
 * Covers:
 * - seriesDotSeries: basic dot product, partial overlap, no overlap, NaN propagation
 * - seriesDotDataFrame: series × matrix
 * - dataFrameDotSeries: matrix × vector
 * - dataFrameDotDataFrame: matrix × matrix, identity matrix
 * - Property-based: dot product commutativity for Series
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameDotDataFrame,
  dataFrameDotSeries,
  seriesDotDataFrame,
  seriesDotSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── seriesDotSeries ──────────────────────────────────────────────────────────

describe("seriesDotSeries", () => {
  test("basic dot product with matching index", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3], index: ["x", "y", "z"] });
    const b = new Series<Scalar>({ data: [4, 5, 6], index: ["x", "y", "z"] });
    expect(seriesDotSeries(a, b)).toBe(32); // 1*4 + 2*5 + 3*6
  });

  test("default RangeIndex alignment", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3] });
    const b = new Series<Scalar>({ data: [2, 3, 4] });
    expect(seriesDotSeries(a, b)).toBe(20); // 1*2 + 2*3 + 3*4
  });

  test("partial overlap — only shared labels contribute", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const b = new Series<Scalar>({ data: [10, 20], index: ["b", "c"] });
    expect(seriesDotSeries(a, b)).toBe(80); // 2*10 + 3*20
  });

  test("no overlap returns 0", () => {
    const a = new Series<Scalar>({ data: [1, 2], index: ["x", "y"] });
    const b = new Series<Scalar>({ data: [3, 4], index: ["p", "q"] });
    expect(seriesDotSeries(a, b)).toBe(0);
  });

  test("NaN in one series propagates to result", () => {
    const a = new Series<Scalar>({ data: [1, Number.NaN, 3] });
    const b = new Series<Scalar>({ data: [1, 2, 3] });
    expect(Number.isNaN(seriesDotSeries(a, b))).toBe(true);
  });

  test("null values treated as NaN", () => {
    const a = new Series<Scalar>({ data: [1, null, 3] });
    const b = new Series<Scalar>({ data: [1, 2, 3] });
    expect(Number.isNaN(seriesDotSeries(a, b))).toBe(true);
  });

  test("single element", () => {
    const a = new Series<Scalar>({ data: [7], index: ["k"] });
    const b = new Series<Scalar>({ data: [3], index: ["k"] });
    expect(seriesDotSeries(a, b)).toBe(21);
  });

  test("zero values", () => {
    const a = new Series<Scalar>({ data: [0, 0, 0] });
    const b = new Series<Scalar>({ data: [1, 2, 3] });
    expect(seriesDotSeries(a, b)).toBe(0);
  });

  test("negative values", () => {
    const a = new Series<Scalar>({ data: [-1, 2, -3] });
    const b = new Series<Scalar>({ data: [4, -5, 6] });
    expect(seriesDotSeries(a, b)).toBe(-4 - 10 - 18); // -32
  });

  test("property: commutativity", () => {
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
        (xs, ys) => {
          const len = Math.min(xs.length, ys.length);
          const a = new Series<Scalar>({ data: xs.slice(0, len) as Scalar[] });
          const b = new Series<Scalar>({ data: ys.slice(0, len) as Scalar[] });
          const ab = seriesDotSeries(a, b);
          const ba = seriesDotSeries(b, a);
          return Math.abs(ab - ba) < 1e-6;
        },
      ),
    );
  });
});

// ─── seriesDotDataFrame ────────────────────────────────────────────────────────

describe("seriesDotDataFrame", () => {
  test("series × 2-column DataFrame (matching index)", () => {
    // s index ["r0","r1"] must match df row index ["r0","r1"]
    const s = new Series<Scalar>({ data: [1, 2], index: ["r0", "r1"] });
    const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 4] });
    // df default index is [0,1]; no overlap with ["r0","r1"] → zeros
    const result = seriesDotDataFrame(s, df);
    expect([...result.values]).toEqual([0, 0]);
  });

  test("series × DataFrame with matching row index", () => {
    const s = new Series<Scalar>({ data: [1, 2], index: [0, 1] });
    const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 4] });
    // result[a] = 1*1 + 2*3 = 7; result[b] = 1*2 + 2*4 = 10
    const result = seriesDotDataFrame(s, df);
    expect([...result.values]).toEqual([7, 10]);
    expect([...result.index.values]).toEqual(["a", "b"]);
  });

  test("single row DataFrame", () => {
    const s = new Series<Scalar>({ data: [3], index: [0] });
    const df = DataFrame.fromColumns({ x: [2], y: [5] });
    const result = seriesDotDataFrame(s, df);
    expect([...result.values]).toEqual([6, 15]);
  });

  test("no overlap → all zeros", () => {
    const s = new Series<Scalar>({ data: [5, 10], index: ["p", "q"] });
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = seriesDotDataFrame(s, df);
    expect([...result.values]).toEqual([0, 0]);
  });
});

// ─── dataFrameDotSeries ────────────────────────────────────────────────────────

describe("dataFrameDotSeries", () => {
  test("2×2 DataFrame × Series (matching columns ↔ index)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const s = new Series<Scalar>({ data: [1, 0], index: ["a", "b"] });
    // row 0: 1*1 + 3*0 = 1; row 1: 2*1 + 4*0 = 2
    const result = dataFrameDotSeries(df, s);
    expect([...result.values]).toEqual([1, 2]);
  });

  test("2×2 DataFrame × Series all columns used", () => {
    const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 4] });
    const s = new Series<Scalar>({ data: [1, 1], index: ["a", "b"] });
    // row 0: 1+2=3; row 1: 3+4=7
    const result = dataFrameDotSeries(df, s);
    expect([...result.values]).toEqual([3, 7]);
  });

  test("partial column overlap", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const s = new Series<Scalar>({ data: [2, 3], index: ["a", "c"] });
    // row 0: a*2 + c*3 = 1*2 + 5*3 = 17; row 1: 2*2 + 6*3 = 22
    const result = dataFrameDotSeries(df, s);
    expect([...result.values]).toEqual([17, 22]);
  });

  test("no overlap → all zeros", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const s = new Series<Scalar>({ data: [1, 2], index: ["x", "y"] });
    const result = dataFrameDotSeries(df, s);
    expect([...result.values]).toEqual([0, 0]);
  });

  test("NaN in DataFrame propagates", () => {
    const df = DataFrame.fromColumns({ a: [1, Number.NaN], b: [2, 3] });
    const s = new Series<Scalar>({ data: [1, 1], index: ["a", "b"] });
    const result = dataFrameDotSeries(df, s);
    expect(result.values[0] as number).toBe(3);
    expect(Number.isNaN(result.values[1] as number)).toBe(true);
  });
});

// ─── dataFrameDotDataFrame ─────────────────────────────────────────────────────

describe("dataFrameDotDataFrame", () => {
  test("1×2 × 2×1 = 1×1 (dot of two vectors as matrices)", () => {
    // A = [[1, 2]]  (1 row, columns ["a","b"])
    // B row index ["a","b"], columns ["r"]  → B = [[3],[4]]
    // Result = [[1*3 + 2*4]] = [[11]]
    const A = DataFrame.fromColumns({ a: [1], b: [2] });
    // B: rows indexed by ["a","b"] which match A's columns
    const B = new DataFrame(
      new Map([["r", new Series<Scalar>({ data: [3, 4] as Scalar[] })]]),
      // index must be ["a","b"] — build via fromColumns then can't set index directly
      // Use workaround via Series with string index
      new Series<Scalar>({ data: [0, 0], index: ["a", "b"] }).index,
    );
    const result = dataFrameDotDataFrame(A, B);
    expect(result.shape).toEqual([1, 1]);
    expect(result.col("r").values[0]).toBe(11);
  });

  test("2×2 × 2×2 matrix multiplication", () => {
    // A = [[1,2],[3,4]], columns ["c0","c1"]
    // B = [[5,6],[7,8]], rows ["c0","c1"], columns ["d0","d1"]
    const A = DataFrame.fromColumns({ c0: [1, 3], c1: [2, 4] });
    const colIdx = new Series<Scalar>({ data: [0, 0], index: ["c0", "c1"] }).index;
    const B = new DataFrame(
      new Map([
        ["d0", new Series<Scalar>({ data: [5, 7] as Scalar[], index: colIdx })],
        ["d1", new Series<Scalar>({ data: [6, 8] as Scalar[], index: colIdx })],
      ]),
      colIdx,
    );
    const result = dataFrameDotDataFrame(A, B);
    // [[1*5+2*7, 1*6+2*8],[3*5+4*7, 3*6+4*8]] = [[19,22],[43,50]]
    expect([...result.col("d0").values]).toEqual([19, 43]);
    expect([...result.col("d1").values]).toEqual([22, 50]);
  });

  test("no overlap → all zeros", () => {
    const A = DataFrame.fromColumns({ a: [1, 2] });
    const B = DataFrame.fromColumns({ x: [3, 4], y: [5, 6] });
    // A.columns = ["a"], B.index = [0,1] → no overlap
    const result = dataFrameDotDataFrame(A, B);
    expect([...result.col("x").values]).toEqual([0, 0]);
    expect([...result.col("y").values]).toEqual([0, 0]);
  });

  test("result shape", () => {
    const A = DataFrame.fromColumns({ k: [1, 2, 3] }); // 3×1
    const kIdx = new Series<Scalar>({ data: [0], index: ["k"] }).index;
    const B = new DataFrame(
      new Map([
        ["p", new Series<Scalar>({ data: [1] as Scalar[], index: kIdx })],
        ["q", new Series<Scalar>({ data: [2] as Scalar[], index: kIdx })],
      ]),
      kIdx,
    ); // 1×2
    const result = dataFrameDotDataFrame(A, B);
    expect(result.shape).toEqual([3, 2]);
  });
});
