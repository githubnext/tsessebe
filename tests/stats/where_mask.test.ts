/**
 * Tests for src/stats/where_mask.ts
 * Covers whereSeries, maskSeries, whereDataFrame, maskDataFrame.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  maskDataFrame,
  maskSeries,
  whereDataFrame,
  whereSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

function boolS(data: readonly boolean[]): Series<boolean> {
  return new Series({ data: [...data] });
}

// ─── whereSeries ─────────────────────────────────────────────────────────────

describe("whereSeries — predicate", () => {
  it("keeps values where predicate is true", () => {
    const result = whereSeries(s([1, 2, 3, 4, 5]), (v) => (v as number) > 2);
    expect([...result.values]).toEqual([null, null, 3, 4, 5]);
  });

  it("replaces with custom other", () => {
    const result = whereSeries(s([1, 2, 3]), (v) => (v as number) !== 2, { other: 0 });
    expect([...result.values]).toEqual([1, 0, 3]);
  });

  it("keeps index and name", () => {
    const input = new Series({ data: [10, 20], name: "x" });
    const result = whereSeries(input, () => true);
    expect(result.name).toBe("x");
    expect([...result.index.values]).toEqual([...input.index.values]);
  });

  it("all true → identity", () => {
    const data: Scalar[] = [1, 2, 3];
    const result = whereSeries(s(data), () => true);
    expect([...result.values]).toEqual(data);
  });

  it("all false → all replaced", () => {
    const result = whereSeries(s([1, 2, 3]), () => false);
    expect([...result.values]).toEqual([null, null, null]);
  });

  it("handles null / NaN values", () => {
    const result = whereSeries(s([null, Number.NaN, 1]), (v) => v !== null);
    // null fails the predicate; NaN passes (v !== null is true)
    expect([...result.values]).toEqual([null, Number.NaN, 1]);
  });
});

describe("whereSeries — boolean Series cond", () => {
  it("keeps values aligned by position", () => {
    const result = whereSeries(s([10, 20, 30]), boolS([true, false, true]));
    expect([...result.values]).toEqual([10, null, 30]);
  });

  it("throws when lengths differ", () => {
    expect(() => whereSeries(s([1, 2, 3]), boolS([true]))).toThrow(RangeError);
  });
});

describe("whereSeries — boolean array cond", () => {
  it("works with plain array", () => {
    const result = whereSeries(s([7, 8, 9]), [false, true, false]);
    expect([...result.values]).toEqual([null, 8, null]);
  });
});

// ─── maskSeries ──────────────────────────────────────────────────────────────

describe("maskSeries — predicate", () => {
  it("replaces values where predicate is true", () => {
    const result = maskSeries(s([1, 2, 3, 4, 5]), (v) => (v as number) > 2);
    expect([...result.values]).toEqual([1, 2, null, null, null]);
  });

  it("replaces with custom other", () => {
    const result = maskSeries(s([1, 2, 3]), (v) => (v as number) === 2, { other: -1 });
    expect([...result.values]).toEqual([1, -1, 3]);
  });

  it("mask is inverse of where (predicate)", () => {
    const data: Scalar[] = [1, 2, 3, 4, 5];
    const pred = (v: Scalar) => (v as number) > 3;
    const w = whereSeries(s(data), pred);
    const m = maskSeries(s(data), pred);
    for (let i = 0; i < data.length; i++) {
      const wv = w.values[i] as Scalar;
      const mv = m.values[i] as Scalar;
      const original = data[i] as Scalar;
      // Exactly one of them should equal the original value
      const wKeeps = wv === original;
      const mKeeps = mv === original;
      expect(wKeeps !== mKeeps).toBe(true);
    }
  });

  it("all false → identity", () => {
    const data: Scalar[] = [1, 2, 3];
    const result = maskSeries(s(data), () => false);
    expect([...result.values]).toEqual(data);
  });
});

describe("maskSeries — boolean Series cond", () => {
  it("replaces where cond is true", () => {
    const result = maskSeries(s([10, 20, 30]), boolS([true, false, true]));
    expect([...result.values]).toEqual([null, 20, null]);
  });
});

// ─── whereDataFrame ───────────────────────────────────────────────────────────

describe("whereDataFrame — predicate", () => {
  it("keeps non-negative values", () => {
    const df = DataFrame.fromColumns({ a: [1, -2, 3] as Scalar[], b: [-4, 5, -6] as Scalar[] });
    const result = whereDataFrame(df, (v) => (v as number) >= 0);
    expect([...result.col("a").values]).toEqual([1, null, 3]);
    expect([...result.col("b").values]).toEqual([null, 5, null]);
  });

  it("keeps index and column names", () => {
    const df = DataFrame.fromColumns({ x: [1, 2] as Scalar[] });
    const result = whereDataFrame(df, () => true);
    expect([...result.columns.values]).toEqual(["x"]);
  });

  it("custom other", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[] });
    const result = whereDataFrame(df, (v) => (v as number) !== 2, { other: 0 });
    expect([...result.col("a").values]).toEqual([1, 0, 3]);
  });
});

describe("whereDataFrame — boolean DataFrame cond", () => {
  it("keeps values where cond DataFrame is true", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[], b: [4, 5, 6] as Scalar[] });
    const cond = DataFrame.fromColumns({
      a: [true, false, true] as Scalar[],
      b: [false, true, false] as Scalar[],
    });
    const result = whereDataFrame(df, cond as unknown as DataFrame);
    expect([...result.col("a").values]).toEqual([1, null, 3]);
    expect([...result.col("b").values]).toEqual([null, 5, null]);
  });

  it("missing column in cond → all null for that column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] as Scalar[], b: [3, 4] as Scalar[] });
    const cond = DataFrame.fromColumns({ a: [true, false] as Scalar[] });
    const result = whereDataFrame(df, cond as unknown as DataFrame);
    expect([...result.col("a").values]).toEqual([1, null]);
    expect([...result.col("b").values]).toEqual([null, null]);
  });

  it("throws when cond column length mismatches", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] as Scalar[] });
    const cond = DataFrame.fromColumns({ a: [true, false] as Scalar[] });
    expect(() => whereDataFrame(df, cond as unknown as DataFrame)).toThrow(RangeError);
  });
});

// ─── maskDataFrame ────────────────────────────────────────────────────────────

describe("maskDataFrame — predicate", () => {
  it("replaces negative values", () => {
    const df = DataFrame.fromColumns({ a: [1, -2, 3] as Scalar[], b: [-4, 5, -6] as Scalar[] });
    const result = maskDataFrame(df, (v) => (v as number) < 0);
    expect([...result.col("a").values]).toEqual([1, null, 3]);
    expect([...result.col("b").values]).toEqual([null, 5, null]);
  });

  it("mask is inverse of where for DataFrames (predicate)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4] as Scalar[] });
    const pred = (v: Scalar) => (v as number) > 2;
    const w = whereDataFrame(df, pred).col("a").values;
    const m = maskDataFrame(df, pred).col("a").values;
    const orig = df.col("a").values;
    for (let i = 0; i < orig.length; i++) {
      const wKeeps = w[i] === orig[i];
      const mKeeps = m[i] === orig[i];
      expect(wKeeps !== mKeeps).toBe(true);
    }
  });
});

describe("maskDataFrame — boolean DataFrame cond", () => {
  it("replaces where cond is true", () => {
    const df = DataFrame.fromColumns({ a: [10, 20, 30] as Scalar[] });
    const cond = DataFrame.fromColumns({ a: [false, true, false] as Scalar[] });
    const result = maskDataFrame(df, cond as unknown as DataFrame);
    expect([...result.col("a").values]).toEqual([10, null, 30]);
  });
});

// ─── property tests ─────────────────────────────────────────────────────────

describe("property: whereSeries(s, cond) + maskSeries(s, cond) covers all positions", () => {
  it("every position is kept by exactly one", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const scalars = data.map((v) => v as Scalar);
          const ser = s(scalars);
          const pred = (v: Scalar) => (v as number) % 2 === 0;
          const w = whereSeries(ser, pred).values;
          const m = maskSeries(ser, pred).values;
          for (let i = 0; i < scalars.length; i++) {
            const wv = w[i] as Scalar;
            const mv = m[i] as Scalar;
            const original = scalars[i] as Scalar;
            // exactly one keeps the original
            expect((wv === original) !== (mv === original)).toBe(true);
          }
        },
      ),
    );
  });
});

describe("property: whereDataFrame with predicate covers all cells", () => {
  it("cell kept by where iff not kept by mask", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 2, maxLength: 10 }),
        (data) => {
          const scalars = data.map((v) => v as Scalar);
          const df = DataFrame.fromColumns({ v: scalars });
          const pred = (v: Scalar) => (v as number) >= 0;
          const wv = whereDataFrame(df, pred).col("v").values;
          const mv = maskDataFrame(df, pred).col("v").values;
          for (let i = 0; i < scalars.length; i++) {
            const original = scalars[i] as Scalar;
            expect((wv[i] === original) !== (mv[i] === original)).toBe(true);
          }
        },
      ),
    );
  });
});
