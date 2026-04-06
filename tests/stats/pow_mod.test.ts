/**
 * Tests for src/stats/pow_mod.ts — seriesPow, dataFramePow, seriesMod,
 * dataFrameMod, seriesFloorDiv, dataFrameFloorDiv.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/index.ts";
import { Series } from "../../src/core/index.ts";
import {
  dataFrameFloorDiv,
  dataFrameMod,
  dataFramePow,
  seriesFloorDiv,
  seriesMod,
  seriesPow,
} from "../../src/stats/pow_mod.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: (number | null)[], name: string | null = null): Series<number | null> {
  return new Series<number | null>({ data, name });
}

function dfFromCols(cols: Record<string, number[]>): DataFrame {
  return DataFrame.fromColumns(cols);
}

// ─── seriesPow ────────────────────────────────────────────────────────────────

describe("seriesPow", () => {
  test("scalar exponent — basic", () => {
    expect(seriesPow(s([2, 3, 4]), 2).values).toEqual([4, 9, 16]);
  });

  test("scalar exponent — zero power", () => {
    expect(seriesPow(s([5, -3, 0]), 0).values).toEqual([1, 1, 1]);
  });

  test("scalar exponent — fractional power", () => {
    const result = seriesPow(s([4, 9, 16]), 0.5).values as number[];
    expect(result[0]).toBeCloseTo(2);
    expect(result[1]).toBeCloseTo(3);
    expect(result[2]).toBeCloseTo(4);
  });

  test("missing values propagated — null", () => {
    expect(seriesPow(s([1, null, 3]), 2).values).toEqual([1, null, 9]);
  });

  test("missing values propagated — NaN", () => {
    const result = seriesPow(s([1, NaN, 3]), 2).values as number[];
    expect(result[0]).toBe(1);
    expect(Number.isNaN(result[1] as number)).toBe(true);
    expect(result[2]).toBe(9);
  });

  test("Series × Series — basic", () => {
    expect(seriesPow(s([2, 3, 4]), s([3, 2, 1])).values).toEqual([8, 9, 4]);
  });

  test("preserves name and index", () => {
    const result = seriesPow(s([2, 3], "x"), 2);
    expect(result.name).toBe("x");
    expect(result.values).toEqual([4, 9]);
  });

  test("negative base — even exponent", () => {
    expect(seriesPow(s([-3]), 2).values).toEqual([9]);
  });

  test("property: x^1 === x for finite numbers", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const result = seriesPow(s(data), 1).values as number[];
          return data.every((v, i) => result[i] === v);
        },
      ),
    );
  });

  test("property: x^0 === 1 for finite non-zero numbers", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.001 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const result = seriesPow(s(data), 0).values as number[];
          return result.every((v) => v === 1);
        },
      ),
    );
  });
});

// ─── dataFramePow ─────────────────────────────────────────────────────────────

describe("dataFramePow", () => {
  test("scalar exponent — basic", () => {
    const df = dfFromCols({ a: [2, 3], b: [4, 5] });
    const result = dataFramePow(df, 2);
    expect(result.col("a").values).toEqual([4, 9]);
    expect(result.col("b").values).toEqual([16, 25]);
  });

  test("DataFrame × DataFrame", () => {
    const df1 = dfFromCols({ a: [2, 3], b: [4, 5] });
    const df2 = dfFromCols({ a: [3, 2], b: [1, 2] });
    const result = dataFramePow(df1, df2);
    expect(result.col("a").values).toEqual([8, 9]);
    expect(result.col("b").values).toEqual([4, 25]);
  });

  test("preserves column names and row count", () => {
    const df = dfFromCols({ x: [1, 2, 3] });
    const result = dataFramePow(df, 2);
    expect(result.columns.values).toEqual(["x"]);
    expect(result.shape[0]).toBe(3);
  });
});

// ─── seriesMod ────────────────────────────────────────────────────────────────

describe("seriesMod", () => {
  test("basic positive values", () => {
    expect(seriesMod(s([10, 11, 12]), 3).values).toEqual([1, 2, 0]);
  });

  test("Python/pandas sign semantics — negative dividend", () => {
    // Python: -7 % 3 = 2  (result has sign of divisor)
    expect(seriesMod(s([-7, -1, 7]), 3).values).toEqual([2, 2, 1]);
  });

  test("Python/pandas sign semantics — negative divisor", () => {
    // Python: 7 % -3 = -2  (result has sign of divisor)
    const result = seriesMod(s([7, -7, 0]), -3).values as number[];
    expect(result[0]).toBe(-2);
    expect(result[1]).toBe(-1);
    // 0 mod anything = 0 (not -0)
    expect(Object.is(result[2], 0)).toBe(true);
  });

  test("missing values propagated", () => {
    expect(seriesMod(s([9, null, 15]), 4).values).toEqual([1, null, 3]);
  });

  test("Series × Series", () => {
    expect(seriesMod(s([10, 11, 12]), s([3, 4, 5])).values).toEqual([1, 3, 2]);
  });

  test("preserves name", () => {
    expect(seriesMod(s([7], "y"), 3).name).toBe("y");
  });

  test("property: 0 <= (a mod b) < b for positive integer b", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -10000, max: 10000 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10000 }),
        (data, divisor) => {
          const result = seriesMod(s(data), divisor).values as number[];
          return result.every((v) => v >= 0 && v < divisor);
        },
      ),
    );
  });

  test("property: (a floordiv b)*b + (a mod b) === a for positive integer divisor", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -10000, max: 10000 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10000 }),
        (data, divisor) => {
          const q = seriesFloorDiv(s(data), divisor).values as number[];
          const r = seriesMod(s(data), divisor).values as number[];
          return data.every((v, i) => (q[i] as number) * divisor + (r[i] as number) === v);
        },
      ),
    );
  });
});

// ─── dataFrameMod ─────────────────────────────────────────────────────────────

describe("dataFrameMod", () => {
  test("scalar divisor — basic", () => {
    const df = dfFromCols({ a: [10, 11], b: [12, 13] });
    const result = dataFrameMod(df, 4);
    expect(result.col("a").values).toEqual([2, 3]);
    expect(result.col("b").values).toEqual([0, 1]);
  });

  test("DataFrame × DataFrame", () => {
    const df1 = dfFromCols({ a: [10, 11], b: [12, 13] });
    const df2 = dfFromCols({ a: [3, 4], b: [5, 6] });
    const result = dataFrameMod(df1, df2);
    expect(result.col("a").values).toEqual([1, 3]);
    expect(result.col("b").values).toEqual([2, 1]);
  });
});

// ─── seriesFloorDiv ───────────────────────────────────────────────────────────

describe("seriesFloorDiv", () => {
  test("basic positive values", () => {
    expect(seriesFloorDiv(s([10, 11, 12]), 3).values).toEqual([3, 3, 4]);
  });

  test("negative dividend — rounds toward -∞", () => {
    // -7 // 2 = -4  (not -3, which would be trunc-towards-zero)
    expect(seriesFloorDiv(s([-7, -1, 7]), 2).values).toEqual([-4, -1, 3]);
  });

  test("negative divisor — rounds toward -∞", () => {
    // 7 // -2 = -4
    const result = seriesFloorDiv(s([7, -7, 0]), -2).values as number[];
    expect(result[0]).toBe(-4);
    expect(result[1]).toBe(3);
    // 0 // -2 = 0 (not -0)
    expect(Object.is(result[2], 0)).toBe(true);
  });

  test("missing values propagated", () => {
    expect(seriesFloorDiv(s([10, null, 12]), 3).values).toEqual([3, null, 4]);
  });

  test("Series × Series", () => {
    expect(seriesFloorDiv(s([10, 11, 12]), s([3, 4, 5])).values).toEqual([3, 2, 2]);
  });

  test("preserves name", () => {
    expect(seriesFloorDiv(s([10], "z"), 3).name).toBe("z");
  });

  test("property: result === floor(a/b) for positive divisor", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 20 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.001 }),
        (data, divisor) => {
          const result = seriesFloorDiv(s(data), divisor).values as number[];
          return data.every((v, i) => result[i] === Math.floor(v / divisor));
        },
      ),
    );
  });

  test("property: floordiv of negative aligns with Python semantics", () => {
    // For integer arithmetic: floordiv(-7, 2) = -4, but trunc(-7/2) = -3
    const vals = [-7, -1, -10, -3];
    const result = seriesFloorDiv(s(vals), 2).values as number[];
    const expected = vals.map((v) => Math.floor(v / 2));
    expect(result).toEqual(expected);
  });
});

// ─── dataFrameFloorDiv ────────────────────────────────────────────────────────

describe("dataFrameFloorDiv", () => {
  test("scalar divisor — basic", () => {
    const df = dfFromCols({ a: [10, -7], b: [12, 11] });
    const result = dataFrameFloorDiv(df, 3);
    expect(result.col("a").values).toEqual([3, -3]);
    expect(result.col("b").values).toEqual([4, 3]);
  });

  test("DataFrame × DataFrame", () => {
    const df1 = dfFromCols({ a: [10, 11], b: [12, 13] });
    const df2 = dfFromCols({ a: [3, 4], b: [5, 6] });
    const result = dataFrameFloorDiv(df1, df2);
    expect(result.col("a").values).toEqual([3, 2]);
    expect(result.col("b").values).toEqual([2, 2]);
  });

  test("negative dividend — rounds toward -∞ for each column", () => {
    const df = dfFromCols({ a: [-7, -1], b: [-10, 7] });
    const result = dataFrameFloorDiv(df, 2);
    expect(result.col("a").values).toEqual([-4, -1]);
    expect(result.col("b").values).toEqual([-5, 3]);
  });

  test("preserves shape", () => {
    const df = dfFromCols({ x: [1, 2, 3], y: [4, 5, 6] });
    const result = dataFrameFloorDiv(df, 2);
    expect(result.shape).toEqual([3, 2]);
  });

  test("property: each cell equals Math.floor(v / divisor)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 6 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.5 }),
        (data, divisor) => {
          const df = dfFromCols({ a: data });
          const result = dataFrameFloorDiv(df, divisor);
          const vals = result.col("a").values as number[];
          return data.every((v, i) => vals[i] === Math.floor(v / divisor));
        },
      ),
    );
  });
});
