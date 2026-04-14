/**
 * Tests for src/stats/add_sub_mul_div.ts — seriesAdd, seriesSub, seriesMul,
 * seriesDiv, dataFrameAdd, dataFrameSub, dataFrameMul, dataFrameDiv, and their
 * reversed counterparts (radd, rsub, rmul, rdiv).
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/index.ts";
import { Series } from "../../src/core/index.ts";
import {
  dataFrameAdd,
  dataFrameDiv,
  dataFrameMul,
  dataFrameRadd,
  dataFrameRdiv,
  dataFrameRmul,
  dataFrameRsub,
  dataFrameSub,
  seriesAdd,
  seriesDiv,
  seriesMul,
  seriesRadd,
  seriesRdiv,
  seriesRmul,
  seriesRsub,
  seriesSub,
} from "../../src/stats/add_sub_mul_div.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: (number | null)[], name: string | null = null): Series<number | null> {
  return new Series<number | null>({ data, name });
}

function dfFromCols(cols: Record<string, number[]>): DataFrame {
  return DataFrame.fromColumns(cols);
}

// ─── seriesAdd ────────────────────────────────────────────────────────────────

describe("seriesAdd", () => {
  test("scalar — basic", () => {
    expect(seriesAdd(s([1, 2, 3]), 10).values).toEqual([11, 12, 13]);
  });

  test("scalar — zero", () => {
    expect(seriesAdd(s([1, 2, 3]), 0).values).toEqual([1, 2, 3]);
  });

  test("scalar — negative", () => {
    expect(seriesAdd(s([5, 10, 15]), -3).values).toEqual([2, 7, 12]);
  });

  test("Series × Series — basic", () => {
    expect(seriesAdd(s([1, 2, 3]), s([4, 5, 6])).values).toEqual([5, 7, 9]);
  });

  test("missing values propagated — null", () => {
    expect(seriesAdd(s([1, null, 3]), 5).values).toEqual([6, null, 8]);
  });

  test("missing values propagated — NaN", () => {
    const result = seriesAdd(s([1, Number.NaN, 3]), 5).values as number[];
    expect(result[0]).toBe(6);
    expect(Number.isNaN(result[1] as number)).toBe(true);
    expect(result[2]).toBe(8);
  });

  test("preserves name and index", () => {
    const result = seriesAdd(s([1, 2], "x"), 1);
    expect(result.name).toBe("x");
    expect(result.values).toEqual([2, 3]);
  });

  test("property: add(0) identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const result = seriesAdd(s(data), 0).values as number[];
          return data.every((v, i) => result[i] === v);
        },
      ),
    );
  });

  test("property: commutativity (scalar)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: -100, max: 100 }),
        (data, scalar) => {
          const r1 = seriesAdd(s(data), scalar).values as number[];
          const r2 = seriesAdd(s(data.map(() => scalar as number | null)), s(data))
            .values as number[];
          return r1.every((v, i) => v === r2[i]);
        },
      ),
    );
  });

  test("property: associativity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -50, max: 50 }),
        fc.integer({ min: -50, max: 50 }),
        (data, a, b) => {
          const r1 = seriesAdd(seriesAdd(s(data), a), b).values as number[];
          const r2 = seriesAdd(s(data), a + b).values as number[];
          return r1.every((v, i) => v === r2[i]);
        },
      ),
    );
  });
});

// ─── seriesRadd ───────────────────────────────────────────────────────────────

describe("seriesRadd", () => {
  test("equivalent to add (commutative)", () => {
    const a = seriesAdd(s([1, 2, 3]), 5).values;
    const b = seriesRadd(s([1, 2, 3]), 5).values;
    expect(a).toEqual(b);
  });
});

// ─── seriesSub ────────────────────────────────────────────────────────────────

describe("seriesSub", () => {
  test("scalar — basic", () => {
    expect(seriesSub(s([10, 20, 30]), 5).values).toEqual([5, 15, 25]);
  });

  test("scalar — zero", () => {
    expect(seriesSub(s([1, 2, 3]), 0).values).toEqual([1, 2, 3]);
  });

  test("scalar — negative", () => {
    expect(seriesSub(s([1, 2, 3]), -4).values).toEqual([5, 6, 7]);
  });

  test("Series × Series — basic", () => {
    expect(seriesSub(s([10, 20, 30]), s([1, 2, 3])).values).toEqual([9, 18, 27]);
  });

  test("missing values propagated — null", () => {
    expect(seriesSub(s([1, null, 3]), 1).values).toEqual([0, null, 2]);
  });

  test("preserves name", () => {
    const result = seriesSub(s([10, 20], "y"), 5);
    expect(result.name).toBe("y");
    expect(result.values).toEqual([5, 15]);
  });

  test("property: sub(0) identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const result = seriesSub(s(data), 0).values as number[];
          return data.every((v, i) => result[i] === v);
        },
      ),
    );
  });

  test("property: add and sub are inverse", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: -100, max: 100 }),
        (data, scalar) => {
          const result = seriesSub(seriesAdd(s(data), scalar), scalar).values as number[];
          return data.every((v, i) => result[i] === v);
        },
      ),
    );
  });
});

// ─── seriesRsub ───────────────────────────────────────────────────────────────

describe("seriesRsub", () => {
  test("scalar rsub: other - series[i]", () => {
    expect(seriesRsub(s([1, 2, 3]), 10).values).toEqual([9, 8, 7]);
  });

  test("rsub is anti-commutative: rsub(s, c) = -sub(s, c)", () => {
    const sub = seriesSub(s([1, 2, 3]), 5).values as number[];
    const rsub = seriesRsub(s([1, 2, 3]), 5).values as number[];
    expect(sub.map((v) => -v)).toEqual(rsub);
  });

  test("Series rsub: other[i] - series[i]", () => {
    expect(seriesRsub(s([1, 2, 3]), s([10, 20, 30])).values).toEqual([9, 18, 27]);
  });

  test("missing values propagated — null", () => {
    expect(seriesRsub(s([1, null, 3]), 10).values).toEqual([9, null, 7]);
  });
});

// ─── seriesMul ────────────────────────────────────────────────────────────────

describe("seriesMul", () => {
  test("scalar — basic", () => {
    expect(seriesMul(s([1, 2, 3]), 3).values).toEqual([3, 6, 9]);
  });

  test("scalar — zero", () => {
    expect(seriesMul(s([1, 2, 3]), 0).values).toEqual([0, 0, 0]);
  });

  test("scalar — one (identity)", () => {
    expect(seriesMul(s([5, 10, 15]), 1).values).toEqual([5, 10, 15]);
  });

  test("scalar — negative", () => {
    expect(seriesMul(s([1, -2, 3]), -1).values).toEqual([-1, 2, -3]);
  });

  test("Series × Series — basic", () => {
    expect(seriesMul(s([2, 3, 4]), s([5, 6, 7])).values).toEqual([10, 18, 28]);
  });

  test("missing values propagated — null", () => {
    expect(seriesMul(s([1, null, 3]), 2).values).toEqual([2, null, 6]);
  });

  test("missing values propagated — NaN", () => {
    const result = seriesMul(s([1, Number.NaN, 3]), 2).values as number[];
    expect(result[0]).toBe(2);
    expect(Number.isNaN(result[1] as number)).toBe(true);
    expect(result[2]).toBe(6);
  });

  test("preserves name", () => {
    const result = seriesMul(s([1, 2], "z"), 5);
    expect(result.name).toBe("z");
  });

  test("property: commutativity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -20, max: 20 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: -20, max: 20 }),
        (data, scalar) => {
          const r1 = seriesMul(s(data), scalar).values as number[];
          const r2 = seriesMul(s(data.map(() => scalar as number | null)), s(data))
            .values as number[];
          return r1.every((v, i) => v === r2[i]);
        },
      ),
    );
  });

  test("property: mul(1) identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const result = seriesMul(s(data), 1).values as number[];
          return data.every((v, i) => result[i] === v);
        },
      ),
    );
  });

  test("property: distributive over add", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -20, max: 20 }), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: -10, max: 10 }),
        (data, a, b) => {
          const lhs = seriesMul(seriesAdd(s(data), a), b).values as number[];
          const rhs = seriesAdd(
            seriesMul(s(data), b),
            seriesMul(
              s([a] as (number | null)[]).values.length === 1
                ? new Series<number | null>({ data: data.map(() => a) })
                : new Series<number | null>({ data: data.map(() => a) }),
              b,
            ),
          ).values as number[];
          return lhs.every((v, i) => v === rhs[i]);
        },
      ),
    );
  });
});

// ─── seriesRmul ───────────────────────────────────────────────────────────────

describe("seriesRmul", () => {
  test("equivalent to mul (commutative)", () => {
    const a = seriesMul(s([1, 2, 3]), 4).values;
    const b = seriesRmul(s([1, 2, 3]), 4).values;
    expect(a).toEqual(b);
  });
});

// ─── seriesDiv ────────────────────────────────────────────────────────────────

describe("seriesDiv", () => {
  test("scalar — basic", () => {
    expect(seriesDiv(s([4, 9, 16]), 2).values).toEqual([2, 4.5, 8]);
  });

  test("scalar — one (identity)", () => {
    expect(seriesDiv(s([5, 10, 15]), 1).values).toEqual([5, 10, 15]);
  });

  test("scalar — division by zero returns Infinity", () => {
    expect(seriesDiv(s([1, -1, 2]), 0).values).toEqual([
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ]);
  });

  test("scalar — 0/0 returns NaN", () => {
    const result = seriesDiv(s([0]), 0).values as number[];
    expect(Number.isNaN(result[0] as number)).toBe(true);
  });

  test("Series × Series — basic", () => {
    expect(seriesDiv(s([10, 20, 30]), s([2, 4, 5])).values).toEqual([5, 5, 6]);
  });

  test("missing values propagated — null", () => {
    expect(seriesDiv(s([4, null, 16]), 2).values).toEqual([2, null, 8]);
  });

  test("missing values propagated — NaN", () => {
    const result = seriesDiv(s([4, Number.NaN, 16]), 2).values as number[];
    expect(result[0]).toBe(2);
    expect(Number.isNaN(result[1] as number)).toBe(true);
    expect(result[2]).toBe(8);
  });

  test("preserves name", () => {
    const result = seriesDiv(s([10, 20], "q"), 2);
    expect(result.name).toBe("q");
  });

  test("property: div(1) identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const result = seriesDiv(s(data), 1).values as number[];
          return data.every((v, i) => result[i] === v);
        },
      ),
    );
  });

  test("property: mul then div is near-identity for non-zero scalars", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 50 }),
        (data, scalar) => {
          const result = seriesDiv(seriesMul(s(data), scalar), scalar).values as number[];
          return data.every((v, i) => Math.abs((result[i] as number) - v) < 1e-9);
        },
      ),
    );
  });
});

// ─── seriesRdiv ───────────────────────────────────────────────────────────────

describe("seriesRdiv", () => {
  test("scalar rdiv: other / series[i]", () => {
    expect(seriesRdiv(s([2, 4, 8]), 16).values).toEqual([8, 4, 2]);
  });

  test("Series rdiv: other[i] / series[i]", () => {
    expect(seriesRdiv(s([2, 4, 5]), s([10, 20, 30])).values).toEqual([5, 5, 6]);
  });

  test("rdiv reverses div", () => {
    const div = seriesDiv(s([2, 4, 8]), 16).values as number[];
    const rdiv = seriesRdiv(s([16, 16, 16]), s([2, 4, 8])).values as number[];
    expect(div).toEqual(rdiv);
  });

  test("missing values propagated — null", () => {
    expect(seriesRdiv(s([2, null, 8]), 16).values).toEqual([8, null, 2]);
  });
});

// ─── dataFrameAdd ─────────────────────────────────────────────────────────────

describe("dataFrameAdd", () => {
  test("scalar — basic", () => {
    const df = dfFromCols({ a: [1, 2], b: [3, 4] });
    const result = dataFrameAdd(df, 10);
    expect(result.col("a").values).toEqual([11, 12]);
    expect(result.col("b").values).toEqual([13, 14]);
  });

  test("DataFrame × DataFrame — basic", () => {
    const df1 = dfFromCols({ a: [1, 2], b: [3, 4] });
    const df2 = dfFromCols({ a: [10, 20], b: [30, 40] });
    const result = dataFrameAdd(df1, df2);
    expect(result.col("a").values).toEqual([11, 22]);
    expect(result.col("b").values).toEqual([33, 44]);
  });

  test("preserves column names", () => {
    const df = dfFromCols({ x: [1, 2], y: [3, 4] });
    const result = dataFrameAdd(df, 1);
    expect(result.columns.values).toEqual(["x", "y"]);
  });
});

// ─── dataFrameRadd ────────────────────────────────────────────────────────────

describe("dataFrameRadd", () => {
  test("equivalent to add (commutative)", () => {
    const df = dfFromCols({ a: [1, 2], b: [3, 4] });
    expect(dataFrameAdd(df, 5).col("a").values).toEqual(dataFrameRadd(df, 5).col("a").values);
  });
});

// ─── dataFrameSub ─────────────────────────────────────────────────────────────

describe("dataFrameSub", () => {
  test("scalar — basic", () => {
    const df = dfFromCols({ a: [10, 20], b: [30, 40] });
    const result = dataFrameSub(df, 5);
    expect(result.col("a").values).toEqual([5, 15]);
    expect(result.col("b").values).toEqual([25, 35]);
  });

  test("DataFrame × DataFrame — basic", () => {
    const df1 = dfFromCols({ a: [10, 20], b: [30, 40] });
    const df2 = dfFromCols({ a: [1, 2], b: [3, 4] });
    const result = dataFrameSub(df1, df2);
    expect(result.col("a").values).toEqual([9, 18]);
    expect(result.col("b").values).toEqual([27, 36]);
  });
});

// ─── dataFrameRsub ────────────────────────────────────────────────────────────

describe("dataFrameRsub", () => {
  test("scalar rsub: scalar - df[col][i]", () => {
    const df = dfFromCols({ a: [1, 2], b: [3, 4] });
    const result = dataFrameRsub(df, 10);
    expect(result.col("a").values).toEqual([9, 8]);
    expect(result.col("b").values).toEqual([7, 6]);
  });
});

// ─── dataFrameMul ─────────────────────────────────────────────────────────────

describe("dataFrameMul", () => {
  test("scalar — basic", () => {
    const df = dfFromCols({ a: [1, 2], b: [3, 4] });
    const result = dataFrameMul(df, 3);
    expect(result.col("a").values).toEqual([3, 6]);
    expect(result.col("b").values).toEqual([9, 12]);
  });

  test("DataFrame × DataFrame — basic", () => {
    const df1 = dfFromCols({ a: [2, 3], b: [4, 5] });
    const df2 = dfFromCols({ a: [3, 2], b: [5, 4] });
    const result = dataFrameMul(df1, df2);
    expect(result.col("a").values).toEqual([6, 6]);
    expect(result.col("b").values).toEqual([20, 20]);
  });
});

// ─── dataFrameRmul ────────────────────────────────────────────────────────────

describe("dataFrameRmul", () => {
  test("equivalent to mul (commutative)", () => {
    const df = dfFromCols({ a: [1, 2], b: [3, 4] });
    expect(dataFrameMul(df, 4).col("a").values).toEqual(dataFrameRmul(df, 4).col("a").values);
  });
});

// ─── dataFrameDiv ─────────────────────────────────────────────────────────────

describe("dataFrameDiv", () => {
  test("scalar — basic", () => {
    const df = dfFromCols({ a: [4, 9], b: [6, 8] });
    const result = dataFrameDiv(df, 2);
    expect(result.col("a").values).toEqual([2, 4.5]);
    expect(result.col("b").values).toEqual([3, 4]);
  });

  test("DataFrame × DataFrame — basic", () => {
    const df1 = dfFromCols({ a: [10, 20], b: [30, 40] });
    const df2 = dfFromCols({ a: [2, 4], b: [5, 8] });
    const result = dataFrameDiv(df1, df2);
    expect(result.col("a").values).toEqual([5, 5]);
    expect(result.col("b").values).toEqual([6, 5]);
  });

  test("division by zero — Infinity", () => {
    const df = dfFromCols({ a: [1, -1] });
    const result = dataFrameDiv(df, 0);
    expect(result.col("a").values).toEqual([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]);
  });
});

// ─── dataFrameRdiv ────────────────────────────────────────────────────────────

describe("dataFrameRdiv", () => {
  test("scalar rdiv: scalar / df[col][i]", () => {
    const df = dfFromCols({ a: [2, 4], b: [5, 10] });
    const result = dataFrameRdiv(df, 20);
    expect(result.col("a").values).toEqual([10, 5]);
    expect(result.col("b").values).toEqual([4, 2]);
  });
});
