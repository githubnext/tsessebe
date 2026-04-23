/**
 * Tests for math_ops — absSeries, absDataFrame, roundSeries, roundDataFrame.
 *
 * Covers:
 * - absSeries: positive, negative, zero, null/NaN passthrough, non-numeric passthrough
 * - absDataFrame: multi-column element-wise abs
 * - roundSeries: 0/2/negative decimals, missing values
 * - roundDataFrame: uniform decimals, per-column Record, missing columns default to 0
 * - Property-based: abs is idempotent (abs(abs(x)) == abs(x))
 * - Property-based: round preserves values within tolerance
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  absDataFrame,
  absSeries,
  roundDataFrame,
  roundSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── absSeries ────────────────────────────────────────────────────────────────

describe("absSeries", () => {
  test("positive values unchanged", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect([...absSeries(s).values]).toEqual([1, 2, 3]);
  });

  test("negative values become positive", () => {
    const s = new Series<Scalar>({ data: [-1, -5, -100] });
    expect([...absSeries(s).values]).toEqual([1, 5, 100]);
  });

  test("zero stays zero", () => {
    const s = new Series<Scalar>({ data: [0, -0] });
    const r = absSeries(s).values;
    expect(r[0]).toBe(0);
    expect(r[1]).toBe(0);
  });

  test("null values pass through unchanged", () => {
    const s = new Series<Scalar>({ data: [-1, null, -3] });
    expect([...absSeries(s).values]).toEqual([1, null, 3]);
  });

  test("NaN passes through unchanged", () => {
    const s = new Series<Scalar>({ data: [Number.NaN, -1] });
    const r = absSeries(s).values;
    expect(Number.isNaN(r[0] as number)).toBe(true);
    expect(r[1]).toBe(1);
  });

  test("string values pass through unchanged", () => {
    const s = new Series<Scalar>({ data: ["hello", "world"] });
    expect([...absSeries(s).values]).toEqual(["hello", "world"]);
  });

  test("preserves index", () => {
    const s = new Series<Scalar>({ data: [-1, -2], index: ["a", "b"] });
    expect([...absSeries(s).index.values]).toEqual(["a", "b"]);
  });

  test("preserves name", () => {
    const s = new Series<Scalar>({ data: [-1], name: "val" });
    expect(absSeries(s).name).toBe("val");
  });

  test("does not mutate original", () => {
    const s = new Series<Scalar>({ data: [-1, -2] });
    absSeries(s);
    expect([...s.values]).toEqual([-1, -2]);
  });
});

// ─── absDataFrame ─────────────────────────────────────────────────────────────

describe("absDataFrame", () => {
  test("element-wise abs on all columns", () => {
    const df = DataFrame.fromColumns({ a: [-1, 2], b: [3, -4] });
    const r = absDataFrame(df);
    expect([...r.col("a").values]).toEqual([1, 2]);
    expect([...r.col("b").values]).toEqual([3, 4]);
  });

  test("null values preserved", () => {
    const df = DataFrame.fromColumns({ a: [-1, null, -3] });
    expect([...absDataFrame(df).col("a").values]).toEqual([1, null, 3]);
  });

  test("column names preserved", () => {
    const df = DataFrame.fromColumns({ x: [-1], y: [-2] });
    expect([...absDataFrame(df).columns.values]).toEqual(["x", "y"]);
  });

  test("index preserved", () => {
    const df = DataFrame.fromColumns({ a: [-1, -2] }, { index: ["r0", "r1"] });
    expect([...absDataFrame(df).index.values]).toEqual(["r0", "r1"]);
  });
});

// ─── roundSeries ─────────────────────────────────────────────────────────────

describe("roundSeries", () => {
  test("round to 0 decimals (default)", () => {
    const s = new Series<Scalar>({ data: [1.4, 1.5, 2.7] });
    expect([...roundSeries(s).values]).toEqual([1, 2, 3]);
  });

  test("round to 2 decimals", () => {
    const s = new Series<Scalar>({ data: [1.234, 5.678] });
    expect([...roundSeries(s, 2).values]).toEqual([1.23, 5.68]);
  });

  test("round to negative decimals (nearest 10)", () => {
    const s = new Series<Scalar>({ data: [14, 15, 26] });
    expect([...roundSeries(s, -1).values]).toEqual([10, 20, 30]);
  });

  test("null values pass through", () => {
    const s = new Series<Scalar>({ data: [1.5, null, 2.5] });
    const r = roundSeries(s, 0).values;
    expect(r[0]).toBe(2);
    expect(r[1]).toBeNull();
    expect(r[2]).toBe(3);
  });

  test("NaN passes through", () => {
    const s = new Series<Scalar>({ data: [Number.NaN] });
    const r = roundSeries(s, 2).values;
    expect(Number.isNaN(r[0] as number)).toBe(true);
  });

  test("string values pass through", () => {
    const s = new Series<Scalar>({ data: ["abc"] });
    expect([...roundSeries(s, 2).values]).toEqual(["abc"]);
  });

  test("preserves index and name", () => {
    const s = new Series<Scalar>({ data: [1.1, 2.2], index: ["a", "b"], name: "v" });
    const r = roundSeries(s, 1);
    expect([...r.index.values]).toEqual(["a", "b"]);
    expect(r.name).toBe("v");
  });
});

// ─── roundDataFrame ───────────────────────────────────────────────────────────

describe("roundDataFrame", () => {
  test("uniform decimals applied to all columns", () => {
    const df = DataFrame.fromColumns({ a: [1.111, 2.222], b: [3.333, 4.444] });
    const r = roundDataFrame(df, 2);
    expect([...r.col("a").values]).toEqual([1.11, 2.22]);
    expect([...r.col("b").values]).toEqual([3.33, 4.44]);
  });

  test("per-column Record", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5], b: [3.33, 4.44] });
    const r = roundDataFrame(df, { a: 0, b: 1 });
    expect([...r.col("a").values]).toEqual([2, 3]);
    expect([...r.col("b").values]).toEqual([3.3, 4.4]);
  });

  test("columns not in Record default to 0 decimals", () => {
    const df = DataFrame.fromColumns({ a: [1.7], b: [2.3] });
    const r = roundDataFrame(df, { a: 1 }); // b not specified
    expect([...r.col("a").values]).toEqual([1.7]);
    expect([...r.col("b").values]).toEqual([2]);
  });

  test("default (no arg) rounds to 0 decimals", () => {
    const df = DataFrame.fromColumns({ x: [1.9] });
    expect([...roundDataFrame(df).col("x").values]).toEqual([2]);
  });

  test("column names preserved", () => {
    const df = DataFrame.fromColumns({ a: [1.1], b: [2.2] });
    expect([...roundDataFrame(df, 1).columns.values]).toEqual(["a", "b"]);
  });

  test("index preserved", () => {
    const df = DataFrame.fromColumns({ a: [1.1] }, { index: ["r0"] });
    expect([...roundDataFrame(df, 1).index.values]).toEqual(["r0"]);
  });

  test("null values preserved", () => {
    const df = DataFrame.fromColumns({ a: [1.5, null] });
    const r = roundDataFrame(df, 0).col("a").values;
    expect(r[0]).toBe(2);
    expect(r[1]).toBeNull();
  });
});

// ─── Property-based ───────────────────────────────────────────────────────────

describe("math_ops property tests", () => {
  test("abs is idempotent: abs(abs(x)) == abs(x)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series<Scalar>({ data });
          const once = absSeries(s);
          const twice = absSeries(once);
          expect([...twice.values]).toEqual([...once.values]);
        },
      ),
    );
  });

  test("abs values are all >= 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series<Scalar>({ data });
          for (const v of absSeries(s).values) {
            expect((v as number) >= 0).toBe(true);
          }
        },
      ),
    );
  });

  test("round preserves integer values (0 decimals)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const s = new Series<Scalar>({ data });
          expect([...roundSeries(s, 0).values]).toEqual([...s.values]);
        },
      ),
    );
  });
});
