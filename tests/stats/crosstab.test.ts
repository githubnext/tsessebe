/**
 * Tests for src/stats/crosstab.ts
 *
 * Covers: crosstab (array × array, Series × Series), seriesCrosstab,
 * options (margins, normalize, dropna, aggfunc/values),
 * edge cases (empty input, single category, missing values),
 * and property-based tests via fast-check.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/index.ts";
import { crosstab, seriesCrosstab } from "../../src/stats/crosstab.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[], name?: string): Series<Scalar> {
  return new Series({ data: [...data], name: name ?? null });
}

/** Get a cell value from the result DataFrame. */
function cell(df: ReturnType<typeof crosstab>, row: string, col: string): number {
  return df.col(col).at(row) as number;
}

// ─── basic frequency count ───────────────────────────────────────────────────

describe("crosstab — basic counts", () => {
  it("returns empty DataFrame for empty inputs", () => {
    const ct = crosstab([], []);
    expect(ct.shape[0]).toBe(0);
    expect(ct.shape[1]).toBe(0);
  });

  it("single observation produces 1×1 table", () => {
    const ct = crosstab(["a"], ["x"]);
    expect(ct.shape).toEqual([1, 1]);
    expect(cell(ct, "a", "x")).toBe(1);
  });

  it("2×2 balanced table", () => {
    const idx = ["foo", "foo", "bar", "bar"];
    const col = ["A", "B", "A", "B"];
    const ct = crosstab(idx, col);
    expect([...ct.columns.values].sort()).toEqual(["A", "B"]);
    expect([...ct.index.values].sort()).toEqual(["bar", "foo"]);
    expect(cell(ct, "foo", "A")).toBe(1);
    expect(cell(ct, "foo", "B")).toBe(1);
    expect(cell(ct, "bar", "A")).toBe(1);
    expect(cell(ct, "bar", "B")).toBe(1);
  });

  it("unbalanced — some cells are zero", () => {
    const idx = ["a", "a", "b"];
    const col = ["x", "y", "x"];
    const ct = crosstab(idx, col);
    expect(cell(ct, "a", "x")).toBe(1);
    expect(cell(ct, "a", "y")).toBe(1);
    expect(cell(ct, "b", "x")).toBe(1);
    expect(cell(ct, "b", "y")).toBe(0);
  });

  it("accepts numeric factor values", () => {
    const idx = [1, 1, 2];
    const col = [10, 20, 10];
    const ct = crosstab(idx, col);
    expect(cell(ct, "1", "10")).toBe(1);
    expect(cell(ct, "1", "20")).toBe(1);
    expect(cell(ct, "2", "10")).toBe(1);
    expect(cell(ct, "2", "20")).toBe(0);
  });

  it("preserves first-seen order for rows and columns", () => {
    const idx = ["c", "a", "b", "c", "a"];
    const col = ["y", "x", "y", "x", "y"];
    const ct = crosstab(idx, col);
    expect(ct.index.values).toEqual(["c", "a", "b"]);
    expect(ct.columns.values).toEqual(["y", "x"]);
  });

  it("row index has the rowname", () => {
    const ct = crosstab(["a"], ["x"], { rowname: "myrow" });
    expect(ct.index.name).toBe("myrow");
  });
});

// ─── missing value handling ───────────────────────────────────────────────────

describe("crosstab — dropna", () => {
  it("dropna=true (default) excludes null rows/cols", () => {
    const idx: Scalar[] = ["a", null, "b", "a"];
    const col: Scalar[] = ["x", "y", "x", null];
    const ct = crosstab(idx, col);
    // null in row or column → pair dropped
    expect(ct.index.values).toEqual(["a", "b"]);
    expect(cell(ct, "a", "x")).toBe(1);
  });

  it("dropna=false keeps NaN as a category", () => {
    const idx: Scalar[] = ["a", null, "a"];
    const col: Scalar[] = ["x", "x", "x"];
    const ct = crosstab(idx, col, { dropna: false });
    expect(ct.index.values).toContain("NaN");
    expect(cell(ct, "NaN", "x")).toBe(1);
  });

  it("NaN numeric value treated as missing by default", () => {
    const idx: Scalar[] = ["a", NaN, "a"];
    const col: Scalar[] = ["x", "x", "x"];
    const ct = crosstab(idx, col);
    expect(ct.index.values).not.toContain("NaN");
    expect(ct.index.values).toEqual(["a"]);
    expect(cell(ct, "a", "x")).toBe(2);
  });
});

// ─── margins ─────────────────────────────────────────────────────────────────

describe("crosstab — margins", () => {
  it("adds All row and All column", () => {
    const idx = ["a", "a", "b"];
    const col = ["x", "y", "x"];
    const ct = crosstab(idx, col, { margins: true });
    // Columns should include "x", "y", and "All"
    expect(ct.columns.values).toContain("All");
    // Rows should include "a", "b", and "All"
    expect(ct.index.values).toContain("All");
  });

  it("row totals are correct", () => {
    const idx = ["a", "a", "b"];
    const col = ["x", "y", "x"];
    const ct = crosstab(idx, col, { margins: true });
    expect(cell(ct, "a", "All")).toBe(2);
    expect(cell(ct, "b", "All")).toBe(1);
  });

  it("column totals are correct", () => {
    const idx = ["a", "a", "b"];
    const col = ["x", "y", "x"];
    const ct = crosstab(idx, col, { margins: true });
    expect(cell(ct, "All", "x")).toBe(2);
    expect(cell(ct, "All", "y")).toBe(1);
  });

  it("grand total is correct", () => {
    const idx = ["a", "a", "b"];
    const col = ["x", "y", "x"];
    const ct = crosstab(idx, col, { margins: true });
    expect(cell(ct, "All", "All")).toBe(3);
  });

  it("respects custom marginsName", () => {
    const ct = crosstab(["a"], ["x"], { margins: true, marginsName: "Total" });
    expect(ct.index.values).toContain("Total");
    expect(ct.columns.values).toContain("Total");
  });
});

// ─── normalization ────────────────────────────────────────────────────────────

describe("crosstab — normalize", () => {
  const idx = ["a", "a", "b", "b"];
  const col = ["x", "y", "x", "x"];

  it("normalize=true divides by grand total", () => {
    const ct = crosstab(idx, col, { normalize: true });
    // grand total = 4; each cell is count/4
    expect(cell(ct, "a", "x")).toBeCloseTo(0.25, 10);
    expect(cell(ct, "b", "x")).toBeCloseTo(0.5, 10);
    // row sums × col sums should sum to 1
    let sum = 0;
    for (const r of ct.index.values) {
      for (const c of ct.columns.values) {
        sum += ct.col(c as string).at(r as string) as number;
      }
    }
    expect(sum).toBeCloseTo(1, 10);
  });

  it("normalize='all' same as normalize=true", () => {
    const ct1 = crosstab(idx, col, { normalize: true });
    const ct2 = crosstab(idx, col, { normalize: "all" });
    for (const r of ct1.index.values) {
      for (const c of ct1.columns.values) {
        const v1 = ct1.col(c as string).at(r as string) as number;
        const v2 = ct2.col(c as string).at(r as string) as number;
        expect(v1).toBeCloseTo(v2, 10);
      }
    }
  });

  it("normalize='index' each row sums to 1", () => {
    const ct = crosstab(idx, col, { normalize: "index" });
    for (const r of ct.index.values) {
      let rowSum = 0;
      for (const c of ct.columns.values) {
        rowSum += ct.col(c as string).at(r as string) as number;
      }
      expect(rowSum).toBeCloseTo(1, 10);
    }
  });

  it("normalize='columns' each column sums to 1", () => {
    const ct = crosstab(idx, col, { normalize: "columns" });
    for (const c of ct.columns.values) {
      let colSum = 0;
      for (const r of ct.index.values) {
        colSum += ct.col(c as string).at(r as string) as number;
      }
      expect(colSum).toBeCloseTo(1, 10);
    }
  });

  it("normalize=false (default) returns raw counts", () => {
    const ct = crosstab(idx, col);
    expect(cell(ct, "a", "x")).toBe(1);
    expect(cell(ct, "b", "x")).toBe(2);
  });
});

// ─── values + aggfunc ────────────────────────────────────────────────────────

describe("crosstab — values + aggfunc", () => {
  const sum: (vs: readonly number[]) => number = (vs) => vs.reduce((s, v) => s + v, 0);
  const mean: (vs: readonly number[]) => number = (vs) =>
    vs.reduce((s, v) => s + v, 0) / vs.length;

  it("sum aggregation", () => {
    const idx = ["a", "a", "b"];
    const col = ["x", "x", "y"];
    const vals: Scalar[] = [10, 20, 5];
    const ct = crosstab(idx, col, { values: vals, aggfunc: sum });
    expect(cell(ct, "a", "x")).toBe(30);
    expect(cell(ct, "b", "y")).toBe(5);
    expect(cell(ct, "a", "y")).toBe(0); // no obs
    expect(cell(ct, "b", "x")).toBe(0); // no obs
  });

  it("mean aggregation", () => {
    const idx = ["a", "a"];
    const col = ["x", "x"];
    const vals: Scalar[] = [10, 20];
    const ct = crosstab(idx, col, { values: vals, aggfunc: mean });
    expect(cell(ct, "a", "x")).toBeCloseTo(15, 10);
  });

  it("throws when values provided without aggfunc", () => {
    expect(() =>
      crosstab(["a"], ["x"], { values: [1] }),
    ).toThrow(TypeError);
  });

  it("non-numeric values are ignored in aggregation", () => {
    const idx = ["a", "a"];
    const col = ["x", "x"];
    const vals: Scalar[] = ["bad", 10];
    const ct = crosstab(idx, col, { values: vals, aggfunc: sum });
    // Only the numeric value (10) should be included
    expect(cell(ct, "a", "x")).toBe(10);
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe("crosstab — errors", () => {
  it("throws when index and columns have different lengths", () => {
    expect(() => crosstab(["a", "b"], ["x"])).toThrow(RangeError);
  });
});

// ─── seriesCrosstab ───────────────────────────────────────────────────────────

describe("seriesCrosstab", () => {
  it("accepts Series inputs and produces correct table", () => {
    const idx = s(["a", "a", "b"], "letters");
    const col = s(["x", "y", "x"], "symbols");
    const ct = seriesCrosstab(idx, col);
    expect(cell(ct, "a", "x")).toBe(1);
    expect(cell(ct, "a", "y")).toBe(1);
    expect(cell(ct, "b", "x")).toBe(1);
    expect(cell(ct, "b", "y")).toBe(0);
  });

  it("uses series names as default axis names", () => {
    const idx = s(["a"], "myindex");
    const col = s(["x"], "mycol");
    const ct = seriesCrosstab(idx, col);
    expect(ct.index.name).toBe("myindex");
  });

  it("explicit rowname overrides series name", () => {
    const idx = s(["a"], "letters");
    const col = s(["x"], "symbols");
    const ct = seriesCrosstab(idx, col, { rowname: "override" });
    expect(ct.index.name).toBe("override");
  });

  it("falls back to 'row' when series has no name", () => {
    const idx = new Series({ data: ["a"] as Scalar[] });
    const col = new Series({ data: ["x"] as Scalar[] });
    const ct = seriesCrosstab(idx, col);
    expect(ct.index.name).toBe("row");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("crosstab — property tests", () => {
  const smallCat = (): fc.Arbitrary<string> => fc.constantFrom("a", "b", "c");
  const smallPairs = (): fc.Arbitrary<{ idx: string[]; col: string[] }> =>
    fc.integer({ min: 1, max: 20 }).chain((n) =>
      fc.record({
        idx: fc.array(smallCat(), { minLength: n, maxLength: n }),
        col: fc.array(smallCat(), { minLength: n, maxLength: n }),
      }),
    );

  it("all cell values are non-negative integers", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col);
        for (const c of ct.columns.values) {
          for (const r of ct.index.values) {
            const v = ct.col(c as string).at(r as string) as number;
            expect(Number.isInteger(v) && v >= 0).toBe(true);
          }
        }
      }),
    );
  });

  it("sum of all cells equals number of observations", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col);
        let total = 0;
        for (const c of ct.columns.values) {
          for (const r of ct.index.values) {
            total += ct.col(c as string).at(r as string) as number;
          }
        }
        expect(total).toBe(idx.length);
      }),
    );
  });

  it("normalize='all' grand total ≈ 1", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col, { normalize: "all" });
        let sum = 0;
        for (const c of ct.columns.values) {
          for (const r of ct.index.values) {
            sum += ct.col(c as string).at(r as string) as number;
          }
        }
        expect(sum).toBeCloseTo(1, 8);
      }),
    );
  });

  it("normalize='index' all row sums ≈ 1", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col, { normalize: "index" });
        for (const r of ct.index.values) {
          let rowSum = 0;
          for (const c of ct.columns.values) {
            rowSum += ct.col(c as string).at(r as string) as number;
          }
          expect(rowSum).toBeCloseTo(1, 8);
        }
      }),
    );
  });

  it("normalize='columns' all column sums ≈ 1", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col, { normalize: "columns" });
        for (const c of ct.columns.values) {
          let colSum = 0;
          for (const r of ct.index.values) {
            colSum += ct.col(c as string).at(r as string) as number;
          }
          expect(colSum).toBeCloseTo(1, 8);
        }
      }),
    );
  });

  it("margins All column equals sum of other columns per row", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col, { margins: true });
        const dataCols = ct.columns.values.filter((c) => c !== "All") as string[];
        for (const r of ct.index.values.filter((r) => r !== "All") as string[]) {
          const rowSum = dataCols.reduce(
            (s, c) => s + (ct.col(c).at(r) as number),
            0,
          );
          expect(ct.col("All").at(r) as number).toBe(rowSum);
        }
      }),
    );
  });

  it("number of unique rows ≤ number of unique index values", () => {
    fc.assert(
      fc.property(smallPairs(), ({ idx, col }) => {
        const ct = crosstab(idx, col);
        const uniqueIdx = new Set(idx).size;
        expect(ct.shape[0]).toBeLessThanOrEqual(uniqueIdx);
      }),
    );
  });
});
