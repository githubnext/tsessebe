/**
 * Tests for src/stats/sem_var.ts — varSeries(), semSeries(),
 * varDataFrame(), semDataFrame().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  semDataFrame,
  semSeries,
  varDataFrame,
  varSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function round(v: number, d = 10): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ─── varSeries ────────────────────────────────────────────────────────────────

describe("varSeries", () => {
  it("sample variance (ddof=1) of [2,4,4,4,5,5,7,9] ≈ 32/7", () => {
    const s = new Series({ data: [2, 4, 4, 4, 5, 5, 7, 9] });
    // mean=5, SS=32, ddof=1 → 32/7
    expect(round(varSeries(s), 8)).toBe(round(32 / 7, 8));
  });

  it("population variance (ddof=0) of [2,4,4,4,5,5,7,9] = 4", () => {
    const s = new Series({ data: [2, 4, 4, 4, 5, 5, 7, 9] });
    // mean=5, SS=32, ddof=0 → 32/8 = 4
    expect(round(varSeries(s, { ddof: 0 }), 10)).toBe(4);
  });

  it("constant series has variance 0", () => {
    const s = new Series({ data: [5, 5, 5, 5] });
    expect(varSeries(s)).toBe(0);
  });

  it("single element returns NaN (ddof=1, n-ddof=0)", () => {
    const s = new Series({ data: [7] });
    expect(Number.isNaN(varSeries(s))).toBe(true);
  });

  it("single element with ddof=0 returns 0", () => {
    const s = new Series({ data: [7] });
    expect(varSeries(s, { ddof: 0 })).toBe(0);
  });

  it("empty series returns NaN", () => {
    const s = new Series({ data: [] as Scalar[] });
    expect(Number.isNaN(varSeries(s))).toBe(true);
  });

  it("skipna=true (default) ignores nulls", () => {
    const withNull = new Series({ data: [1, 2, 3, null] as Scalar[] });
    const withoutNull = new Series({ data: [1, 2, 3] });
    expect(round(varSeries(withNull))).toBe(round(varSeries(withoutNull)));
  });

  it("skipna=false returns NaN when null present", () => {
    const s = new Series({ data: [1, 2, null, 4] as Scalar[] });
    expect(Number.isNaN(varSeries(s, { skipna: false }))).toBe(true);
  });

  it("minCount threshold: returns NaN when not enough valid values", () => {
    const s = new Series({ data: [1, null, null] as Scalar[] });
    expect(Number.isNaN(varSeries(s, { minCount: 2 }))).toBe(true);
  });

  it("minCount met: returns normal value", () => {
    const s = new Series({ data: [1, 2, null] as Scalar[] });
    expect(Number.isFinite(varSeries(s, { minCount: 2 }))).toBe(true);
  });
});

// ─── semSeries ────────────────────────────────────────────────────────────────

describe("semSeries", () => {
  it("SEM of [2,4,4,4,5,5,7,9]: sqrt((32/7)/8)", () => {
    const s = new Series({ data: [2, 4, 4, 4, 5, 5, 7, 9] });
    // var(ddof=1)=32/7, n=8 → sem = sqrt((32/7)/8)
    expect(round(semSeries(s), 8)).toBe(round(Math.sqrt(32 / 7 / 8), 8));
  });

  it("constant series has SEM = 0", () => {
    const s = new Series({ data: [3, 3, 3] });
    expect(semSeries(s)).toBe(0);
  });

  it("empty series returns NaN", () => {
    const s = new Series({ data: [] as Scalar[] });
    expect(Number.isNaN(semSeries(s))).toBe(true);
  });

  it("single element with ddof=1 returns NaN", () => {
    expect(Number.isNaN(semSeries(new Series({ data: [5] })))).toBe(true);
  });

  it("skipna=true ignores nulls", () => {
    const withNull = new Series({ data: [1, 2, 3, null] as Scalar[] });
    const withoutNull = new Series({ data: [1, 2, 3] });
    expect(round(semSeries(withNull))).toBe(round(semSeries(withoutNull)));
  });
});

// ─── varDataFrame ─────────────────────────────────────────────────────────────

describe("varDataFrame", () => {
  it("column-wise (axis=0) variance", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = varDataFrame(df);
    expect(round(result.values[0] as number)).toBe(1);
    expect(round(result.values[1] as number)).toBe(1);
  });

  it("result Series has correct column index", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 4, 4] });
    const result = varDataFrame(df);
    expect(result.index.values).toEqual(["x", "y"]);
    expect(result.values[1]).toBe(0);
  });

  it("non-numeric column returns NaN without numericOnly", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
    const result = varDataFrame(df);
    expect(Number.isFinite(result.values[0] as number)).toBe(true);
    expect(Number.isNaN(result.values[1] as number)).toBe(true);
  });

  it("numericOnly=true excludes non-numeric columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: ["x", "y", "z"] });
    const result = varDataFrame(df, { numericOnly: true });
    expect(result.index.values).toEqual(["a"]);
  });

  it("axis=1 row-wise variance", () => {
    const df = DataFrame.fromColumns({ a: [1, 10], b: [3, 10] });
    const result = varDataFrame(df, { axis: 1 });
    expect(round(result.values[0] as number)).toBe(2);
    expect(result.values[1]).toBe(0);
  });

  it("ddof=0 population variance", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const sample = varDataFrame(df);
    const population = varDataFrame(df, { ddof: 0 });
    expect(population.values[0] as number).toBeLessThan(sample.values[0] as number);
  });
});

// ─── semDataFrame ─────────────────────────────────────────────────────────────

describe("semDataFrame", () => {
  it("column-wise SEM", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = semDataFrame(df);
    // var=1, n=3 => sem=sqrt(1/3)
    expect(round(result.values[0] as number, 8)).toBe(round(Math.sqrt(1 / 3), 8));
  });

  it("constant column has SEM = 0", () => {
    const df = DataFrame.fromColumns({ a: [5, 5, 5] });
    expect(semDataFrame(df).values[0]).toBe(0);
  });

  it("axis=1 row-wise SEM", () => {
    const df = DataFrame.fromColumns({ a: [2, 4], b: [4, 4] });
    const result = semDataFrame(df, { axis: 1 });
    // row 0: [2,4] var=2, n=2 => sem=sqrt(2/2)=1
    expect(round(result.values[0] as number)).toBe(1);
    // row 1: [4,4] sem=0
    expect(result.values[1]).toBe(0);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("varSeries — property tests", () => {
  it("sample variance is always >= 0 for non-null arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 2 }), (arr) => {
        const s = new Series({ data: arr });
        const v = varSeries(s);
        return Number.isNaN(v) || v >= 0;
      }),
    );
  });

  it("variance of identical values is 0", () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true }), fc.integer({ min: 2, max: 20 }), (val, n) => {
        const s = new Series({ data: new Array(n).fill(val) });
        return Math.abs(varSeries(s)) < 1e-9 || Number.isNaN(varSeries(s));
      }),
    );
  });

  it("SEM is always >= 0 when defined", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 2 }), (arr) => {
        const s = new Series({ data: arr });
        const v = semSeries(s);
        return Number.isNaN(v) || v >= 0;
      }),
    );
  });
});
