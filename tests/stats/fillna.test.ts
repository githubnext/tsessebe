/**
 * Tests for src/stats/fillna.ts — fillnaSeries, fillnaDataFrame
 *
 * Covers:
 *  - scalar value fill (Series and DataFrame)
 *  - ffill / pad (forward fill) with and without limit
 *  - bfill / backfill (backward fill) with and without limit
 *  - no-op (neither value nor method provided)
 *  - DataFrame column-map fill
 *  - DataFrame Series-fill (index → column mapping)
 *  - DataFrame axis=1 row-wise method fill
 *  - property-based tests (fast-check)
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  fillnaDataFrame,
  fillnaSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── fillnaSeries — scalar value ──────────────────────────────────────────────

describe("fillnaSeries — scalar value", () => {
  it("fills null with 0", () => {
    const result = fillnaSeries(s([1, null, 3]), { value: 0 });
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBe(0);
    expect(result.values[2]).toBe(3);
  });

  it("fills NaN with 99", () => {
    const result = fillnaSeries(s([Number.NaN, 2, Number.NaN]), { value: 99 });
    expect(result.values[0]).toBe(99);
    expect(result.values[1]).toBe(2);
    expect(result.values[2]).toBe(99);
  });

  it("does not overwrite non-missing values", () => {
    const result = fillnaSeries(s([1, 2, 3]), { value: -1 });
    expect(result.values).toEqual([1, 2, 3]);
  });

  it("fills with string scalar", () => {
    const result = fillnaSeries(s([null, "a", null]), { value: "x" });
    expect(result.values[0]).toBe("x");
    expect(result.values[1]).toBe("a");
    expect(result.values[2]).toBe("x");
  });

  it("preserves index and name", () => {
    const orig = new Series({ data: [null, 1], name: "myCol" });
    const result = fillnaSeries(orig, { value: 0 });
    expect(result.name).toBe("myCol");
    expect(result.index.size).toBe(2);
  });
});

// ─── fillnaSeries — ffill ─────────────────────────────────────────────────────

describe("fillnaSeries — ffill / pad", () => {
  it("forward fills interior NaN", () => {
    const result = fillnaSeries(s([1, null, null, 4]), { method: "ffill" });
    expect(result.values).toEqual([1, 1, 1, 4]);
  });

  it("does not fill leading NaN (no prior value)", () => {
    const result = fillnaSeries(s([null, null, 3]), { method: "ffill" });
    expect(isMissing(result.values[0] as Scalar)).toBe(true);
    expect(isMissing(result.values[1] as Scalar)).toBe(true);
    expect(result.values[2]).toBe(3);
  });

  it("fills trailing NaN", () => {
    const result = fillnaSeries(s([1, null, null]), { method: "ffill" });
    expect(result.values).toEqual([1, 1, 1]);
  });

  it("pad is an alias for ffill", () => {
    const ffill = fillnaSeries(s([1, null, 3, null]), { method: "ffill" });
    const pad = fillnaSeries(s([1, null, 3, null]), { method: "pad" });
    expect(ffill.values).toEqual(pad.values);
  });

  it("limit=1 stops after one consecutive fill", () => {
    const result = fillnaSeries(s([1, null, null, 4]), { method: "ffill", limit: 1 });
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBe(1);
    expect(isMissing(result.values[2] as Scalar)).toBe(true);
    expect(result.values[3]).toBe(4);
  });

  it("limit=2 fills exactly 2 consecutive gaps", () => {
    const result = fillnaSeries(s([1, null, null, null, 5]), { method: "ffill", limit: 2 });
    expect(result.values[1]).toBe(1);
    expect(result.values[2]).toBe(1);
    expect(isMissing(result.values[3] as Scalar)).toBe(true);
    expect(result.values[4]).toBe(5);
  });
});

// ─── fillnaSeries — bfill ─────────────────────────────────────────────────────

describe("fillnaSeries — bfill / backfill", () => {
  it("backward fills interior NaN", () => {
    const result = fillnaSeries(s([1, null, null, 4]), { method: "bfill" });
    expect(result.values).toEqual([1, 4, 4, 4]);
  });

  it("does not fill trailing NaN (no next value)", () => {
    const result = fillnaSeries(s([1, null, null]), { method: "bfill" });
    expect(result.values[0]).toBe(1);
    expect(isMissing(result.values[1] as Scalar)).toBe(true);
    expect(isMissing(result.values[2] as Scalar)).toBe(true);
  });

  it("fills leading NaN", () => {
    const result = fillnaSeries(s([null, null, 3]), { method: "bfill" });
    expect(result.values).toEqual([3, 3, 3]);
  });

  it("backfill is an alias for bfill", () => {
    const bfill = fillnaSeries(s([null, 2, null, 4]), { method: "bfill" });
    const backfill = fillnaSeries(s([null, 2, null, 4]), { method: "backfill" });
    expect(bfill.values).toEqual(backfill.values);
  });

  it("limit=1 stops after one consecutive backward fill", () => {
    const result = fillnaSeries(s([1, null, null, 4]), { method: "bfill", limit: 1 });
    expect(result.values[0]).toBe(1);
    expect(isMissing(result.values[1] as Scalar)).toBe(true);
    expect(result.values[2]).toBe(4);
    expect(result.values[3]).toBe(4);
  });
});

// ─── fillnaSeries — no-op ─────────────────────────────────────────────────────

describe("fillnaSeries — no-op", () => {
  it("returns identical values when no option given", () => {
    const data: Scalar[] = [1, null, 3];
    const result = fillnaSeries(s(data));
    expect(result.values[0]).toBe(1);
    expect(isMissing(result.values[1] as Scalar)).toBe(true);
    expect(result.values[2]).toBe(3);
  });
});

// ─── fillnaDataFrame — scalar ──────────────────────────────────────────────────

describe("fillnaDataFrame — scalar value", () => {
  it("fills all missing cells with constant 0", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] as Scalar[], b: [null, 2, null] as Scalar[] });
    const result = fillnaDataFrame(df, { value: 0 });
    expect(result.col("a").values).toEqual([1, 0, 3]);
    expect(result.col("b").values).toEqual([0, 2, 0]);
  });

  it("does not overwrite non-missing values", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] as Scalar[] });
    const result = fillnaDataFrame(df, { value: -1 });
    expect(result.col("x").values).toEqual([10, 20, 30]);
  });
});

// ─── fillnaDataFrame — ColumnFillMap ──────────────────────────────────────────

describe("fillnaDataFrame — ColumnFillMap", () => {
  it("fills each column with its own scalar", () => {
    const df = DataFrame.fromColumns({
      a: [null, 2, null] as Scalar[],
      b: [1, null, 3] as Scalar[],
    });
    const result = fillnaDataFrame(df, { value: { a: -1, b: 99 } });
    expect(result.col("a").values).toEqual([-1, 2, -1]);
    expect(result.col("b").values).toEqual([1, 99, 3]);
  });

  it("leaves unlisted columns unchanged", () => {
    const df = DataFrame.fromColumns({
      a: [null, 1] as Scalar[],
      b: [null, 2] as Scalar[],
    });
    const result = fillnaDataFrame(df, { value: { a: 0 } });
    expect(result.col("a").values).toEqual([0, 1]);
    expect(isMissing(result.col("b").values[0] as Scalar)).toBe(true);
  });
});

// ─── fillnaDataFrame — Series fill ────────────────────────────────────────────

describe("fillnaDataFrame — Series fill", () => {
  it("uses Series index labels to match column names", () => {
    const df = DataFrame.fromColumns({
      a: [null, 2] as Scalar[],
      b: [1, null] as Scalar[],
    });
    const fillSeries = new Series({ data: [10, 20] as Scalar[], index: ["a", "b"] });
    const result = fillnaDataFrame(df, { value: fillSeries });
    expect(result.col("a").values).toEqual([10, 2]);
    expect(result.col("b").values).toEqual([1, 20]);
  });
});

// ─── fillnaDataFrame — method (axis=0) ────────────────────────────────────────

describe("fillnaDataFrame — method axis=0 (column-wise, default)", () => {
  it("ffill down each column", () => {
    const df = DataFrame.fromColumns({
      a: [1, null, null, 4] as Scalar[],
      b: [null, 2, null, null] as Scalar[],
    });
    const result = fillnaDataFrame(df, { method: "ffill" });
    expect(result.col("a").values).toEqual([1, 1, 1, 4]);
    expect(result.col("b").values[0]).toBeNull();
    expect(result.col("b").values[1]).toBe(2);
    expect(result.col("b").values[2]).toBe(2);
    expect(result.col("b").values[3]).toBe(2);
  });

  it("bfill up each column", () => {
    const df = DataFrame.fromColumns({
      a: [null, null, 3] as Scalar[],
    });
    const result = fillnaDataFrame(df, { method: "bfill" });
    expect(result.col("a").values).toEqual([3, 3, 3]);
  });

  it("ffill with limit=1", () => {
    const df = DataFrame.fromColumns({ a: [1, null, null, 4] as Scalar[] });
    const result = fillnaDataFrame(df, { method: "ffill", limit: 1 });
    expect(result.col("a").values[1]).toBe(1);
    expect(isMissing(result.col("a").values[2] as Scalar)).toBe(true);
  });
});

// ─── fillnaDataFrame — method axis=1 (row-wise) ───────────────────────────────

describe("fillnaDataFrame — method axis=1 (row-wise)", () => {
  it("ffill across each row", () => {
    const df = DataFrame.fromColumns({
      a: [1, null] as Scalar[],
      b: [null, null] as Scalar[],
      c: [3, 4] as Scalar[],
    });
    const result = fillnaDataFrame(df, { method: "ffill", axis: 1 });
    // row 0: [1, null, 3] → ffill → [1, 1, 3]
    expect(result.col("a").values[0]).toBe(1);
    expect(result.col("b").values[0]).toBe(1);
    expect(result.col("c").values[0]).toBe(3);
    // row 1: [null, null, 4] → ffill → [null, null, 4]
    expect(isMissing(result.col("a").values[1] as Scalar)).toBe(true);
    expect(isMissing(result.col("b").values[1] as Scalar)).toBe(true);
    expect(result.col("c").values[1]).toBe(4);
  });

  it("bfill across each row", () => {
    const df = DataFrame.fromColumns({
      a: [null, null] as Scalar[],
      b: [2, null] as Scalar[],
      c: [3, null] as Scalar[],
    });
    const result = fillnaDataFrame(df, { method: "bfill", axis: 1 });
    // row 0: [null, 2, 3] → bfill → [2, 2, 3]
    expect(result.col("a").values[0]).toBe(2);
    expect(result.col("b").values[0]).toBe(2);
    expect(result.col("c").values[0]).toBe(3);
    // row 1: [null, null, null] → no fill
    expect(isMissing(result.col("a").values[1] as Scalar)).toBe(true);
    expect(isMissing(result.col("b").values[1] as Scalar)).toBe(true);
    expect(isMissing(result.col("c").values[1] as Scalar)).toBe(true);
  });
});

// ─── fillnaDataFrame — no-op ──────────────────────────────────────────────────

describe("fillnaDataFrame — no-op", () => {
  it("returns the same DataFrame when no option given", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] as Scalar[] });
    const result = fillnaDataFrame(df);
    expect(result).toBe(df);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("fillnaSeries — property tests", () => {
  const scalarArb = fc.oneof(
    fc.float({ noNaN: true }),
    fc.constant(null),
    fc.constant(undefined),
    fc.constant(Number.NaN),
  ) as fc.Arbitrary<Scalar>;

  it("scalar fill: no missing values remain after fill", () => {
    fc.assert(
      fc.property(
        fc.array(scalarArb, { minLength: 0, maxLength: 30 }),
        fc.float({ noNaN: true }),
        (data, fill) => {
          const result = fillnaSeries(new Series({ data }), { value: fill });
          for (const v of result.values) {
            if (isMissing(v)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("scalar fill: non-missing values are never changed", () => {
    fc.assert(
      fc.property(
        fc.array(scalarArb, { minLength: 0, maxLength: 30 }),
        fc.float({ noNaN: true }),
        (data, fill) => {
          const orig = new Series({ data });
          const result = fillnaSeries(orig, { value: fill });
          for (let i = 0; i < data.length; i++) {
            const ov = orig.values[i] as Scalar;
            const rv = result.values[i] as Scalar;
            if (!isMissing(ov) && ov !== rv) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("ffill: length is preserved", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { minLength: 0, maxLength: 30 }), (data) => {
        const result = fillnaSeries(new Series({ data }), { method: "ffill" });
        return result.values.length === data.length;
      }),
    );
  });

  it("ffill: non-missing values are unchanged", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { minLength: 0, maxLength: 30 }), (data) => {
        const orig = new Series({ data });
        const result = fillnaSeries(orig, { method: "ffill" });
        for (let i = 0; i < data.length; i++) {
          const ov = orig.values[i] as Scalar;
          const rv = result.values[i] as Scalar;
          if (!isMissing(ov) && ov !== rv) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("ffill: filled values are non-missing (when fill occurred)", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { minLength: 0, maxLength: 30 }), (data) => {
        const orig = new Series({ data });
        const result = fillnaSeries(orig, { method: "ffill" });
        for (let i = 0; i < data.length; i++) {
          const ov = orig.values[i] as Scalar;
          const rv = result.values[i] as Scalar;
          // If originally missing but now filled — the fill must be non-missing
          if (isMissing(ov) && !isMissing(rv)) {
            // rv should come from a preceding non-missing value
            let prevNonMissing: Scalar = null;
            for (let j = i - 1; j >= 0; j--) {
              const pv = orig.values[j] as Scalar;
              if (!isMissing(pv)) {
                prevNonMissing = pv;
                break;
              }
            }
            if (rv !== prevNonMissing) {
              return false;
            }
          }
        }
        return true;
      }),
    );
  });

  it("bfill: filled values come from next non-missing value", () => {
    fc.assert(
      fc.property(fc.array(scalarArb, { minLength: 0, maxLength: 30 }), (data) => {
        const orig = new Series({ data });
        const result = fillnaSeries(orig, { method: "bfill" });
        for (let i = 0; i < data.length; i++) {
          const ov = orig.values[i] as Scalar;
          const rv = result.values[i] as Scalar;
          if (isMissing(ov) && !isMissing(rv)) {
            let nextNonMissing: Scalar = null;
            for (let j = i + 1; j < data.length; j++) {
              const nv = orig.values[j] as Scalar;
              if (!isMissing(nv)) {
                nextNonMissing = nv;
                break;
              }
            }
            if (rv !== nextNonMissing) {
              return false;
            }
          }
        }
        return true;
      }),
    );
  });

  it("limit: at most `limit` consecutive values are filled per run", () => {
    fc.assert(
      fc.property(
        fc.array(scalarArb, { minLength: 0, maxLength: 30 }),
        fc.nat({ max: 5 }),
        (data, limit) => {
          const result = fillnaSeries(new Series({ data }), { method: "ffill", limit });
          // count consecutive fills after each non-missing anchor
          let runFilled = 0;
          for (let i = 0; i < data.length; i++) {
            const ov = data[i] as Scalar;
            const rv = result.values[i] as Scalar;
            if (!isMissing(ov)) {
              runFilled = 0;
            } else if (!isMissing(rv)) {
              runFilled++;
              if (runFilled > limit) {
                return false;
              }
            } else {
              // still missing after limit — ok
              runFilled = 0;
            }
          }
          return true;
        },
      ),
    );
  });
});
