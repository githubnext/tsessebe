/**
 * Tests for src/core/missing.ts — standalone missing-value utilities.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Index,
  Series,
  bfill,
  bfillDataFrame,
  dropnaDataFrame,
  dropnaSeries,
  ffill,
  ffillDataFrame,
  fillnaDataFrame,
  fillnaSeries,
  interpolate,
  interpolateDataFrame,
  isna,
  isnull,
  notna,
  notnull,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSeries<T extends number | string | boolean | null>(data: readonly T[]): Series<T> {
  return new Series<T>({ data });
}

function makeDF(obj: Record<string, readonly (number | string | null)[]>): DataFrame {
  return DataFrame.fromColumns(obj);
}

// ─── isna / notna (scalar) ────────────────────────────────────────────────────

describe("isna — scalar", () => {
  it("returns true for null", () => {
    expect(isna(null)).toBe(true);
  });
  it("returns true for undefined", () => {
    expect(isna(undefined)).toBe(true);
  });
  it("returns true for NaN", () => {
    expect(isna(Number.NaN)).toBe(true);
  });
  it("returns false for 0", () => {
    expect(isna(0)).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isna("")).toBe(false);
  });
  it("returns false for false", () => {
    expect(isna(false)).toBe(false);
  });
  it("isnull is an alias for isna", () => {
    expect(isnull(null)).toBe(true);
    expect(isnull(1)).toBe(false);
  });
});

describe("notna — scalar", () => {
  it("returns false for null", () => {
    expect(notna(null)).toBe(false);
  });
  it("returns true for 1", () => {
    expect(notna(1)).toBe(true);
  });
  it("notnull is an alias", () => {
    expect(notnull(null)).toBe(false);
    expect(notnull("x")).toBe(true);
  });
});

// ─── isna — Series ────────────────────────────────────────────────────────────

describe("isna — Series", () => {
  it("detects nulls and NaN", () => {
    const s = makeSeries([1, null, Number.NaN, 4]);
    const result = isna(s);
    expect(result.values).toEqual([false, true, true, false]);
  });

  it("all non-null → all false", () => {
    const s = makeSeries([1, 2, 3]);
    expect(isna(s).values).toEqual([false, false, false]);
  });

  it("all null → all true", () => {
    const s = makeSeries([null, null]);
    expect(isna(s).values).toEqual([true, true]);
  });

  it("notna Series is element-wise inverse", () => {
    const s = makeSeries([1, null, 3]);
    const na = isna(s).values;
    const nna = notna(s).values;
    for (let i = 0; i < na.length; i++) {
      expect(na[i]).toBe(!nna[i]);
    }
  });
});

// ─── isna — DataFrame ─────────────────────────────────────────────────────────

describe("isna — DataFrame", () => {
  it("returns boolean DataFrame", () => {
    const df = makeDF({ a: [1, null, 3], b: [null, 2, null] });
    const result = isna(df);
    expect(result.col("a").values).toEqual([false, true, false]);
    expect(result.col("b").values).toEqual([true, false, true]);
  });

  it("notna DataFrame is element-wise inverse", () => {
    const df = makeDF({ a: [1, null], b: [null, 2] });
    const naDF = isna(df);
    const nnaDF = notna(df);
    for (const col of ["a", "b"]) {
      const naVals = naDF.col(col).values;
      const nnaVals = nnaDF.col(col).values;
      for (let i = 0; i < naVals.length; i++) {
        expect(naVals[i]).toBe(!nnaVals[i]);
      }
    }
  });
});

// ─── ffill ────────────────────────────────────────────────────────────────────

describe("ffill — Series", () => {
  it("fills gaps with previous value", () => {
    const s = makeSeries([1, null, null, 4]);
    expect(ffill(s).values).toEqual([1, 1, 1, 4]);
  });

  it("leading nulls are left alone", () => {
    const s = makeSeries([null, null, 3]);
    expect(ffill(s).values).toEqual([null, null, 3]);
  });

  it("trailing nulls get filled", () => {
    const s = makeSeries([1, 2, null, null]);
    expect(ffill(s).values).toEqual([1, 2, 2, 2]);
  });

  it("no nulls → unchanged", () => {
    const s = makeSeries([1, 2, 3]);
    expect(ffill(s).values).toEqual([1, 2, 3]);
  });

  it("respects limit option", () => {
    const s = makeSeries([1, null, null, null, 5]);
    expect(ffill(s, { limit: 1 }).values).toEqual([1, 1, null, null, 5]);
    expect(ffill(s, { limit: 2 }).values).toEqual([1, 1, 1, null, 5]);
  });

  it("preserves index and name", () => {
    const idx = new Index<string | number>(["a", "b", "c"]);
    const s = new Series<number | null>({
      data: [1, null, 3],
      index: idx as Index<string | number>,
      name: "test",
    });
    const result = ffill(s);
    expect(result.name).toBe("test");
    expect(result.index.values).toEqual(["a", "b", "c"]);
  });
});

describe("ffillDataFrame", () => {
  it("fills each column independently", () => {
    const df = makeDF({ a: [1, null, 3], b: [null, 2, null] });
    const result = ffillDataFrame(df);
    expect(result.col("a").values).toEqual([1, 1, 3]);
    expect(result.col("b").values).toEqual([null, 2, 2]);
  });

  it("respects limit", () => {
    const df = makeDF({ a: [1, null, null, 4] });
    const result = ffillDataFrame(df, { limit: 1 });
    expect(result.col("a").values).toEqual([1, 1, null, 4]);
  });
});

// ─── bfill ────────────────────────────────────────────────────────────────────

describe("bfill — Series", () => {
  it("fills gaps with next value", () => {
    const s = makeSeries([null, null, 3, null]);
    expect(bfill(s).values).toEqual([3, 3, 3, null]);
  });

  it("trailing nulls are left alone", () => {
    const s = makeSeries([1, null, null]);
    expect(bfill(s).values).toEqual([1, null, null]);
  });

  it("leading nulls get filled", () => {
    const s = makeSeries([null, null, 3, 4]);
    expect(bfill(s).values).toEqual([3, 3, 3, 4]);
  });

  it("respects limit", () => {
    const s = makeSeries([null, null, null, 4]);
    expect(bfill(s, { limit: 1 }).values).toEqual([null, null, 4, 4]);
    expect(bfill(s, { limit: 2 }).values).toEqual([null, 4, 4, 4]);
  });
});

describe("bfillDataFrame", () => {
  it("fills each column backwards", () => {
    const df = makeDF({ a: [null, null, 3], b: [1, null, null] });
    const result = bfillDataFrame(df);
    expect(result.col("a").values).toEqual([3, 3, 3]);
    expect(result.col("b").values).toEqual([1, null, null]);
  });
});

// ─── fillnaSeries ─────────────────────────────────────────────────────────────

describe("fillnaSeries", () => {
  it("fills with scalar value", () => {
    const s = makeSeries([1, null, 3]);
    expect(fillnaSeries(s, { value: 0 }).values).toEqual([1, 0, 3]);
  });

  it("fills with method ffill", () => {
    const s = makeSeries([1, null, null, 4]);
    expect(fillnaSeries(s, { method: "ffill" }).values).toEqual([1, 1, 1, 4]);
  });

  it("fills with method pad (alias for ffill)", () => {
    const s = makeSeries([1, null, 4]);
    expect(fillnaSeries(s, { method: "pad" }).values).toEqual([1, 1, 4]);
  });

  it("fills with method bfill", () => {
    const s = makeSeries([null, null, 3]);
    expect(fillnaSeries(s, { method: "bfill" }).values).toEqual([3, 3, 3]);
  });

  it("fills with method backfill (alias for bfill)", () => {
    const s = makeSeries([null, 2, 3]);
    expect(fillnaSeries(s, { method: "backfill" }).values).toEqual([2, 2, 3]);
  });

  it("respects limit with method", () => {
    const s = makeSeries([1, null, null, null]);
    expect(fillnaSeries(s, { method: "ffill", limit: 1 }).values).toEqual([1, 1, null, null]);
  });

  it("returns unchanged if no options given", () => {
    const s = makeSeries([1, null, 3]);
    expect(fillnaSeries(s, {}).values).toEqual([1, null, 3]);
  });
});

describe("fillnaDataFrame", () => {
  it("fills with scalar", () => {
    const df = makeDF({ a: [1, null, 3] });
    expect(fillnaDataFrame(df, { value: 0 }).col("a").values).toEqual([1, 0, 3]);
  });

  it("fills with ffill method", () => {
    const df = makeDF({ a: [1, null, 3], b: [null, 2, null] });
    const result = fillnaDataFrame(df, { method: "ffill" });
    expect(result.col("a").values).toEqual([1, 1, 3]);
    expect(result.col("b").values).toEqual([null, 2, 2]);
  });

  it("fills with bfill method", () => {
    const df = makeDF({ a: [null, 2, null] });
    const result = fillnaDataFrame(df, { method: "bfill" });
    expect(result.col("a").values).toEqual([2, 2, null]);
  });
});

// ─── dropnaSeries ─────────────────────────────────────────────────────────────

describe("dropnaSeries", () => {
  it("removes nulls", () => {
    const s = makeSeries([1, null, 3, null, 5]);
    expect(dropnaSeries(s).values).toEqual([1, 3, 5]);
  });

  it("removes NaN", () => {
    const s = makeSeries([1, Number.NaN, 3]);
    expect(dropnaSeries(s).values).toEqual([1, 3]);
  });

  it("no nulls → unchanged", () => {
    const s = makeSeries([1, 2, 3]);
    expect(dropnaSeries(s).values).toEqual([1, 2, 3]);
  });

  it("all nulls → empty", () => {
    const s = makeSeries([null, null]);
    expect(dropnaSeries(s).values).toHaveLength(0);
  });
});

// ─── dropnaDataFrame ──────────────────────────────────────────────────────────

describe("dropnaDataFrame — axis=0 (rows)", () => {
  it("drops rows with any null (default)", () => {
    const df = makeDF({ a: [1, null, 3], b: [4, 5, null] });
    const result = dropnaDataFrame(df);
    expect(result.shape).toEqual([1, 2]);
    expect(result.col("a").values).toEqual([1]);
    expect(result.col("b").values).toEqual([4]);
  });

  it("how=all: only drops fully-null rows", () => {
    const df = makeDF({ a: [1, null, null], b: [4, null, null] });
    const result = dropnaDataFrame(df, { how: "all" });
    expect(result.shape[0]).toBe(2);
  });

  it("thresh: keeps rows with enough non-null values", () => {
    const df = makeDF({ a: [1, null, null], b: [4, 5, null] });
    const result = dropnaDataFrame(df, { thresh: 2 });
    expect(result.shape[0]).toBe(1);
    expect(result.col("a").values).toEqual([1]);
  });

  it("subset: only checks specified columns", () => {
    const df = makeDF({ a: [1, null, 3], b: [null, 2, null] });
    // Only check column 'a' — only row 1 (null in a) is dropped
    const result = dropnaDataFrame(df, { subset: ["a"] });
    expect(result.shape[0]).toBe(2);
    expect(result.col("a").values).toEqual([1, 3]);
  });
});

describe("dropnaDataFrame — axis=1 (columns)", () => {
  it("drops columns with any null", () => {
    const df = makeDF({ a: [1, 2, 3], b: [4, null, 6] });
    const result = dropnaDataFrame(df, { axis: 1 });
    expect(result.columns.values).toEqual(["a"]);
  });

  it("how=all: drops only fully-null columns", () => {
    const df = makeDF({ a: [null, null, null], b: [1, null, 3] });
    const result = dropnaDataFrame(df, { axis: 1, how: "all" });
    expect(result.columns.values).toEqual(["b"]);
  });
});

// ─── interpolate ─────────────────────────────────────────────────────────────

describe("interpolate — linear", () => {
  it("fills a single interior gap", () => {
    const s = makeSeries([1, null, null, 4]);
    const result = interpolate(s);
    expect(result.values[1]).toBeCloseTo(2);
    expect(result.values[2]).toBeCloseTo(3);
  });

  it("does not extrapolate leading nulls", () => {
    const s = makeSeries([null, null, 3, 4]);
    const result = interpolate(s);
    expect(result.values[0]).toBe(null);
    expect(result.values[1]).toBe(null);
    expect(result.values[2]).toBe(3);
  });

  it("does not extrapolate trailing nulls", () => {
    const s = makeSeries([1, 2, null, null]);
    const result = interpolate(s);
    expect(result.values[2]).toBe(null);
    expect(result.values[3]).toBe(null);
  });

  it("multiple gaps interpolated independently", () => {
    const s = makeSeries([0, null, 4, null, 10]);
    const result = interpolate(s);
    expect(result.values[1]).toBeCloseTo(2);
    expect(result.values[3]).toBeCloseTo(7);
  });

  it("no nulls → unchanged", () => {
    const s = makeSeries([1, 2, 3]);
    expect(interpolate(s).values).toEqual([1, 2, 3]);
  });

  it("preserves name and index", () => {
    const idx = new Index<string | number>(["x", "y", "z"]);
    const s = new Series<number | null>({
      data: [1, null, 3],
      index: idx as Index<string | number>,
      name: "v",
    });
    const result = interpolate(s);
    expect(result.name).toBe("v");
    expect(result.index.values).toEqual(["x", "y", "z"]);
  });

  it("respects limit", () => {
    const s = makeSeries([0, null, null, null, 8]);
    const result = interpolate(s, { limit: 1 });
    // Only first gap position filled
    expect(result.values[1]).toBeCloseTo(2);
    expect(result.values[2]).toBe(null);
    expect(result.values[3]).toBe(null);
  });
});

describe("interpolateDataFrame", () => {
  it("interpolates each column independently", () => {
    const df = makeDF({ a: [0, null, 4], b: [10, null, 30] });
    const result = interpolateDataFrame(df);
    expect(result.col("a").values[1] as number).toBeCloseTo(2);
    expect(result.col("b").values[1] as number).toBeCloseTo(20);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property: ffill preserves non-null values", () => {
  it("ffill never changes non-null values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.double({ noNaN: true }), { nil: null }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<number | null>({ data: arr });
          const result = ffill(s);
          const origVals = s.values;
          const resVals = result.values;
          for (let i = 0; i < origVals.length; i++) {
            const orig = origVals[i];
            if (orig !== null) {
              expect(resVals[i]).toBe(orig);
            }
          }
        },
      ),
    );
  });
});

describe("property: bfill preserves non-null values", () => {
  it("bfill never changes non-null values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.double({ noNaN: true }), { nil: null }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<number | null>({ data: arr });
          const result = bfill(s);
          const origVals = s.values;
          const resVals = result.values;
          for (let i = 0; i < origVals.length; i++) {
            const orig = origVals[i];
            if (orig !== null) {
              expect(resVals[i]).toBe(orig);
            }
          }
        },
      ),
    );
  });
});

describe("property: fillnaSeries idempotent with scalar fill", () => {
  it("filling a fully-filled series produces no change", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true }), { minLength: 1, maxLength: 20 }), (arr) => {
        const s = new Series<number>({ data: arr });
        const filled = fillnaSeries(s, { value: 0 });
        // Already has no nulls
        const refilled = fillnaSeries(filled, { value: 99 });
        expect(refilled.values).toEqual(filled.values);
      }),
    );
  });
});

describe("property: dropna produces no nulls", () => {
  it("result series contains no null/undefined/NaN", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.double({ noNaN: true }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<number | null>({ data: arr });
          const result = dropnaSeries(s);
          for (const v of result.values) {
            expect(
              v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)),
            ).toBe(false);
          }
        },
      ),
    );
  });
});

describe("property: interpolate count", () => {
  it("interpolate produces at most as many nulls as input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.double({ noNaN: true }), { nil: null }), {
          minLength: 2,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<number | null>({ data: arr });
          const result = interpolate(s);
          const inputNulls = arr.filter((v) => v === null).length;
          const outputNulls = result.values.filter((v) => v === null || v === undefined).length;
          expect(outputNulls).toBeLessThanOrEqual(inputNulls);
        },
      ),
    );
  });
});
