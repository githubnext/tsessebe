/**
 * Tests for src/stats/compare.ts
 * Covers seriesEq, seriesNe, seriesLt, seriesGt, seriesLe, seriesGe
 * and their DataFrame counterparts.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameEq,
  dataFrameGe,
  dataFrameGt,
  dataFrameLe,
  dataFrameLt,
  dataFrameNe,
  seriesEq,
  seriesGe,
  seriesGt,
  seriesLe,
  seriesLt,
  seriesNe,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

// ─── seriesEq ────────────────────────────────────────────────────────────────

describe("seriesEq — scalar", () => {
  it("returns true for matching elements", () => {
    expect([...seriesEq(s([1, 2, 3]), 2).values]).toEqual([false, true, false]);
  });

  it("all elements equal", () => {
    expect([...seriesEq(s([5, 5, 5]), 5).values]).toEqual([true, true, true]);
  });

  it("no elements equal", () => {
    expect([...seriesEq(s([1, 2, 3]), 9).values]).toEqual([false, false, false]);
  });

  it("works with strings", () => {
    expect([...seriesEq(s(["a", "b", "c"]), "b").values]).toEqual([false, true, false]);
  });

  it("null elements always yield false (eq to scalar)", () => {
    expect([...seriesEq(s([null, 1, null]), 1).values]).toEqual([false, true, false]);
  });

  it("null compared to null yields false (NaN convention)", () => {
    expect([...seriesEq(s([null, 1]), null).values]).toEqual([false, false]);
  });

  it("preserves index and name", () => {
    const input = new Series({ data: [1, 2], name: "x" });
    const result = seriesEq(input, 1);
    expect(result.name).toBe("x");
    expect([...result.index.values]).toEqual([...input.index.values]);
  });
});

describe("seriesEq — Series other", () => {
  it("element-wise comparison between two Series", () => {
    expect([...seriesEq(s([1, 2, 3]), s([1, 0, 3])).values]).toEqual([true, false, true]);
  });

  it("throws when lengths differ", () => {
    expect(() => seriesEq(s([1, 2]), s([1]))).toThrow(RangeError);
  });
});

// ─── seriesNe ────────────────────────────────────────────────────────────────

describe("seriesNe — scalar", () => {
  it("returns true for non-matching elements", () => {
    expect([...seriesNe(s([1, 2, 3]), 2).values]).toEqual([true, false, true]);
  });

  it("null element yields false for ne (missing comparison)", () => {
    // Both null and non-null compared with ne → false (missing convention)
    expect([...seriesNe(s([null, 1]), 1).values]).toEqual([false, false]);
  });
});

// ─── seriesLt ────────────────────────────────────────────────────────────────

describe("seriesLt — scalar", () => {
  it("returns true for elements less than scalar", () => {
    expect([...seriesLt(s([1, 2, 3]), 2).values]).toEqual([true, false, false]);
  });

  it("boundary: equal is not less than", () => {
    expect([...seriesLt(s([2]), 2).values]).toEqual([false]);
  });

  it("null yields false", () => {
    expect([...seriesLt(s([null, 1, 3]), 2).values]).toEqual([false, true, false]);
  });
});

// ─── seriesGt ────────────────────────────────────────────────────────────────

describe("seriesGt — scalar", () => {
  it("returns true for elements greater than scalar", () => {
    expect([...seriesGt(s([1, 2, 3]), 2).values]).toEqual([false, false, true]);
  });

  it("boundary: equal is not greater than", () => {
    expect([...seriesGt(s([2]), 2).values]).toEqual([false]);
  });
});

// ─── seriesLe ────────────────────────────────────────────────────────────────

describe("seriesLe — scalar", () => {
  it("returns true for elements <= scalar", () => {
    expect([...seriesLe(s([1, 2, 3]), 2).values]).toEqual([true, true, false]);
  });

  it("boundary: equal yields true", () => {
    expect([...seriesLe(s([2]), 2).values]).toEqual([true]);
  });
});

// ─── seriesGe ────────────────────────────────────────────────────────────────

describe("seriesGe — scalar", () => {
  it("returns true for elements >= scalar", () => {
    expect([...seriesGe(s([1, 2, 3]), 2).values]).toEqual([false, true, true]);
  });

  it("boundary: equal yields true", () => {
    expect([...seriesGe(s([2]), 2).values]).toEqual([true]);
  });
});

// ─── Inverse relationship: lt + ge and gt + le partition ─────────────────────

describe("lt / ge partition property", () => {
  it("lt and ge are mutually exclusive on finite numbers (no nulls)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.float({ noNaN: true }),
        (data, threshold) => {
          const series = new Series({ data });
          const lt = [...seriesLt(series, threshold).values] as boolean[];
          const ge = [...seriesGe(series, threshold).values] as boolean[];
          // Every position must be exactly one of lt or ge
          return lt.every((v, i) => v !== ge[i]);
        },
      ),
    );
  });

  it("gt and le are mutually exclusive on finite numbers (no nulls)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.float({ noNaN: true }),
        (data, threshold) => {
          const series = new Series({ data });
          const gt = [...seriesGt(series, threshold).values] as boolean[];
          const le = [...seriesLe(series, threshold).values] as boolean[];
          return gt.every((v, i) => v !== le[i]);
        },
      ),
    );
  });
});

describe("eq / ne partition property", () => {
  it("eq(x, x) is always true for non-null finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }), (data) => {
        const series = new Series({ data });
        const eq = [...seriesEq(series, series).values] as boolean[];
        return eq.every((v) => v === true);
      }),
    );
  });
});

// ─── DataFrame eq ────────────────────────────────────────────────────────────

describe("dataFrameEq — scalar", () => {
  it("broadcasts scalar to all cells", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 2, 4] });
    const result = dataFrameEq(df, 2);
    expect([...result.col("a").values]).toEqual([false, true, false]);
    expect([...result.col("b").values]).toEqual([true, true, false]);
  });

  it("returns all false for null cells", () => {
    const df = DataFrame.fromColumns({ a: [null, 2] });
    expect([...dataFrameEq(df, 2).col("a").values]).toEqual([false, true]);
  });
});

describe("dataFrameEq — DataFrame other", () => {
  it("compares cell-by-cell", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const df2 = DataFrame.fromColumns({ a: [1, 0], b: [3, 5] });
    const result = dataFrameEq(df1, df2);
    expect([...result.col("a").values]).toEqual([true, false]);
    expect([...result.col("b").values]).toEqual([true, false]);
  });

  it("missing column in other → all false", () => {
    const df1 = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const df2 = DataFrame.fromColumns({ a: [1, 2] }); // no column b
    const result = dataFrameEq(df1, df2);
    expect([...result.col("b").values]).toEqual([false, false]);
  });
});

describe("dataFrameNe — scalar", () => {
  it("returns negation of eq", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const eq = [...dataFrameEq(df, 2).col("a").values];
    const ne = [...dataFrameNe(df, 2).col("a").values];
    // For non-null values, ne is the negation of eq
    expect(ne).toEqual([true, false, true]);
    const negatedEq = eq.map((v) => Boolean(!v));
    expect(negatedEq).toEqual(ne.map((v) => Boolean(v)));
  });
});

describe("dataFrameLt / dataFrameGe", () => {
  it("lt returns true for cells less than threshold", () => {
    const df = DataFrame.fromColumns({ x: [1, 5, 3] });
    expect([...dataFrameLt(df, 3).col("x").values]).toEqual([true, false, false]);
  });

  it("ge returns true for cells >= threshold", () => {
    const df = DataFrame.fromColumns({ x: [1, 5, 3] });
    expect([...dataFrameGe(df, 3).col("x").values]).toEqual([false, true, true]);
  });
});

describe("dataFrameGt / dataFrameLe", () => {
  it("gt returns true for cells greater than threshold", () => {
    const df = DataFrame.fromColumns({ x: [1, 5, 3] });
    expect([...dataFrameGt(df, 3).col("x").values]).toEqual([false, true, false]);
  });

  it("le returns true for cells <= threshold", () => {
    const df = DataFrame.fromColumns({ x: [1, 5, 3] });
    expect([...dataFrameLe(df, 3).col("x").values]).toEqual([true, false, true]);
  });
});

describe("dataFrameLt + dataFrameGe partition (property)", () => {
  it("every cell is either lt or ge (no overlap, no gap) for finite data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 10 }),
        fc.float({ noNaN: true }),
        (data, threshold) => {
          const df = DataFrame.fromColumns({ v: data });
          const lt = [...dataFrameLt(df, threshold).col("v").values] as boolean[];
          const ge = [...dataFrameGe(df, threshold).col("v").values] as boolean[];
          return lt.every((v, i) => v !== ge[i]);
        },
      ),
    );
  });
});
