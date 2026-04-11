/**
 * Tests for na_ops — missing-value utilities (isna, notna, ffill, bfill).
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  bfillSeries,
  dataFrameBfill,
  dataFrameFfill,
  ffillSeries,
  isna,
  isnull,
  notna,
  notnull,
} from "../../src/index.ts";

// ─── isna / notna ─────────────────────────────────────────────────────────────

describe("isna (scalar)", () => {
  it("returns true for null", () => expect(isna(null)).toBe(true));
  it("returns true for undefined", () => expect(isna(undefined)).toBe(true));
  it("returns true for NaN", () => expect(isna(Number.NaN)).toBe(true));
  it("returns false for 0", () => expect(isna(0)).toBe(false));
  it("returns false for empty string", () => expect(isna("")).toBe(false));
  it("returns false for false", () => expect(isna(false)).toBe(false));
  it("returns false for a number", () => expect(isna(42)).toBe(false));
});

describe("notna (scalar)", () => {
  it("returns false for null", () => expect(notna(null)).toBe(false));
  it("returns false for NaN", () => expect(notna(Number.NaN)).toBe(false));
  it("returns true for 42", () => expect(notna(42)).toBe(true));
  it("returns true for a string", () => expect(notna("hello")).toBe(true));
});

describe("isnull / notnull aliases", () => {
  it("isnull equals isna for scalar", () => {
    expect(isnull(null)).toBe(isna(null));
    expect(isnull(42)).toBe(isna(42));
  });
  it("notnull equals notna for scalar", () => {
    expect(notnull(null)).toBe(notna(null));
    expect(notnull(42)).toBe(notna(42));
  });
});

describe("isna (Series)", () => {
  it("returns boolean Series of correct length", () => {
    const s = new Series({ data: [1, null, Number.NaN, 4] });
    const result = isna(s);
    expect(result).toBeInstanceOf(Series);
    expect([...result.values]).toEqual([false, true, true, false]);
  });

  it("all present", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect([...isna(s).values]).toEqual([false, false, false]);
  });

  it("all missing", () => {
    const s = new Series({ data: [null, null, Number.NaN] });
    expect([...isna(s).values]).toEqual([true, true, true]);
  });
});

describe("notna (Series)", () => {
  it("is the inverse of isna", () => {
    const s = new Series({ data: [1, null, Number.NaN, 4] });
    const na = isna(s).values;
    const nna = notna(s).values;
    for (let i = 0; i < na.length; i++) {
      expect(nna[i]).toBe(!na[i]);
    }
  });
});

describe("isna (DataFrame)", () => {
  it("returns DataFrame of booleans", () => {
    const df = DataFrame.fromColumns({ a: [1, null], b: [Number.NaN, 2] });
    const result = isna(df);
    expect(result).toBeInstanceOf(DataFrame);
    expect([...result.col("a").values]).toEqual([false, true]);
    expect([...result.col("b").values]).toEqual([true, false]);
  });
});

describe("notna (DataFrame)", () => {
  it("returns inverse of isna DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, null], b: [Number.NaN, 2] });
    expect([...notna(df).col("a").values]).toEqual([true, false]);
    expect([...notna(df).col("b").values]).toEqual([false, true]);
  });
});

// ─── ffillSeries ──────────────────────────────────────────────────────────────

describe("ffillSeries", () => {
  it("fills nulls with preceding value", () => {
    const s = new Series({ data: [1, null, null, 4] });
    expect([...ffillSeries(s).values]).toEqual([1, 1, 1, 4]);
  });

  it("leaves leading nulls untouched", () => {
    const s = new Series({ data: [null, null, 3, null] });
    expect([...ffillSeries(s).values]).toEqual([null, null, 3, 3]);
  });

  it("NaN is treated as missing", () => {
    const s = new Series({ data: [2, Number.NaN, 5] });
    const result = ffillSeries(s).values;
    expect(result[0]).toBe(2);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(5);
  });

  it("respects limit option", () => {
    const s = new Series({ data: [1, null, null, null, 5] });
    expect([...ffillSeries(s, { limit: 1 }).values]).toEqual([1, 1, null, null, 5]);
  });

  it("preserves original Series", () => {
    const s = new Series({ data: [1, null, 3] });
    ffillSeries(s);
    expect([...s.values]).toEqual([1, null, 3]);
  });

  it("empty Series returns empty", () => {
    const s = new Series({ data: [] });
    expect([...ffillSeries(s).values]).toEqual([]);
  });

  it("preserves name and index", () => {
    const s = new Series({ data: [1, null], name: "x" });
    const filled = ffillSeries(s);
    expect(filled.name).toBe("x");
    expect(filled.index.size).toBe(2);
  });
});

// ─── bfillSeries ──────────────────────────────────────────────────────────────

describe("bfillSeries", () => {
  it("fills nulls with following value", () => {
    const s = new Series({ data: [1, null, null, 4] });
    expect([...bfillSeries(s).values]).toEqual([1, 4, 4, 4]);
  });

  it("leaves trailing nulls untouched", () => {
    const s = new Series({ data: [null, 3, null, null] });
    expect([...bfillSeries(s).values]).toEqual([3, 3, null, null]);
  });

  it("respects limit option", () => {
    const s = new Series({ data: [1, null, null, null, 5] });
    expect([...bfillSeries(s, { limit: 2 }).values]).toEqual([1, null, 5, 5, 5]);
  });

  it("empty Series returns empty", () => {
    const s = new Series({ data: [] });
    expect([...bfillSeries(s).values]).toEqual([]);
  });
});

// ─── dataFrameFfill ───────────────────────────────────────────────────────────

describe("dataFrameFfill (column-wise)", () => {
  it("fills each column independently", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3], b: [null, 2, null] });
    const result = dataFrameFfill(df);
    expect([...result.col("a").values]).toEqual([1, 1, 3]);
    expect([...result.col("b").values]).toEqual([null, 2, 2]);
  });

  it("preserves index", () => {
    const df = DataFrame.fromColumns({ x: [1, null] });
    expect(dataFrameFfill(df).index.size).toBe(2);
  });
});

describe("dataFrameFfill (row-wise)", () => {
  it("fills across columns per row", () => {
    const df = DataFrame.fromColumns({ a: [1, null], b: [null, null], c: [3, 4] });
    const result = dataFrameFfill(df, { axis: 1 });
    expect([...result.col("a").values]).toEqual([1, null]);
    expect([...result.col("b").values]).toEqual([1, null]);
    expect([...result.col("c").values]).toEqual([3, 4]);
  });
});

// ─── dataFrameBfill ───────────────────────────────────────────────────────────

describe("dataFrameBfill (column-wise)", () => {
  it("fills each column backward", () => {
    const df = DataFrame.fromColumns({ a: [null, null, 3], b: [1, null, null] });
    const result = dataFrameBfill(df);
    expect([...result.col("a").values]).toEqual([3, 3, 3]);
    expect([...result.col("b").values]).toEqual([1, null, null]);
  });
});

describe("dataFrameBfill (row-wise)", () => {
  it("fills backward across columns per row", () => {
    const df = DataFrame.fromColumns({ a: [null, 1], b: [null, null], c: [3, null] });
    const result = dataFrameBfill(df, { axis: 1 });
    expect([...result.col("a").values]).toEqual([3, 1]);
    expect([...result.col("b").values]).toEqual([3, null]);
    expect([...result.col("c").values]).toEqual([3, null]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property: ffill followed by bfill fills all if any non-null", () => {
  it("all values filled when at least one is present", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }), {
          minLength: 1,
          maxLength: 20,
        }),
        (raw) => {
          const hasNonNull = raw.some((v) => v !== null);
          if (!hasNonNull) {
            return true;
          }
          const s = new Series({ data: raw });
          const result = bfillSeries(ffillSeries(s));
          return result.values.every((v) => v !== null);
        },
      ),
    );
  });
});

describe("property: ffill never introduces new non-null values beyond last valid", () => {
  it("ffilled series has no nulls after first valid value", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -50, max: 50 }), { nil: null }), {
          minLength: 0,
          maxLength: 30,
        }),
        (raw) => {
          const s = new Series({ data: raw });
          const filled = ffillSeries(s).values;
          let sawValid = false;
          for (const v of filled) {
            if (v !== null) {
              sawValid = true;
            }
            if (sawValid && v === null) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

describe("property: isna is inverse of notna for scalars", () => {
  it("isna(v) === !notna(v)", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float({ noNaN: false }),
          fc.constant(null),
          fc.string(),
          fc.boolean(),
        ),
        (v) => isna(v as Parameters<typeof isna>[0]) === !notna(v as Parameters<typeof notna>[0]),
      ),
    );
  });
});
