/**
 * Tests for src/reshape/pivot.ts — pivot and pivotTable.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Scalar } from "../../src/index.ts";
import { pivot, pivotTable } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

/** Compute sum of all numeric cells in a DataFrame. */
function sumAllCells(df: DataFrame): number {
  let total = 0;
  for (const colName of df.columns.values) {
    for (const cv of df.col(colName).values) {
      if (typeof cv === "number" && !Number.isNaN(cv)) {
        total += cv;
      }
    }
  }
  return total;
}

// ─── pivot ────────────────────────────────────────────────────────────────────

describe("pivot", () => {
  describe("basic usage", () => {
    it("pivots a simple date/city/temp table", () => {
      const df = DataFrame.fromColumns({
        date: ["2020-01", "2020-01", "2020-02", "2020-02"],
        city: ["NYC", "LA", "NYC", "LA"],
        temp: [50, 60, 55, 65],
      });
      const result = pivot(df, { index: "date", columns: "city", values: "temp" });
      expect(result.shape).toEqual([2, 2]);
      expect(result.columns.values).toContain("NYC");
      expect(result.columns.values).toContain("LA");
      expect(colValues(result, "NYC")).toEqual([50, 55]);
      expect(colValues(result, "LA")).toEqual([60, 65]);
      expect([...result.index.values]).toEqual(["2020-01", "2020-02"]);
    });

    it("uses all remaining columns when values omitted", () => {
      const df = DataFrame.fromColumns({
        idx: ["r1", "r1", "r2", "r2"],
        col: ["A", "B", "A", "B"],
        v1: [1, 2, 3, 4],
        v2: [5, 6, 7, 8],
      });
      const result = pivot(df, { index: "idx", columns: "col" });
      expect(result.columns.values).toEqual(["v1_A", "v1_B", "v2_A", "v2_B"]);
    });

    it("uses row index when index option omitted", () => {
      const df = DataFrame.fromColumns({ col: ["A", "B"], val: [1, 2] });
      const result = pivot(df, { columns: "col", values: "val" });
      expect(result.shape[0]).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("throws on duplicate (index, column) pair", () => {
      const df = DataFrame.fromColumns({
        idx: ["r1", "r1"],
        col: ["A", "A"],
        val: [1, 2],
      });
      expect(() => pivot(df, { index: "idx", columns: "col", values: "val" })).toThrow();
    });

    it("fills missing cells with null", () => {
      const df = DataFrame.fromColumns({
        idx: ["r1", "r2"],
        col: ["A", "B"],
        val: [10, 20],
      });
      const result = pivot(df, { index: "idx", columns: "col", values: "val" });
      // r1 has A=10, B=null; r2 has A=null, B=20
      expect(colValues(result, "A")).toEqual([10, null]);
      expect(colValues(result, "B")).toEqual([null, 20]);
    });

    it("handles numeric index values", () => {
      const df = DataFrame.fromColumns({
        idx: [1, 2, 1, 2],
        col: ["x", "x", "y", "y"],
        val: [10, 20, 30, 40],
      });
      const result = pivot(df, { index: "idx", columns: "col", values: "val" });
      expect(result.shape).toEqual([2, 2]);
    });
  });
});

// ─── pivotTable ───────────────────────────────────────────────────────────────

describe("pivotTable", () => {
  describe("basic aggregation", () => {
    it("computes mean by default", () => {
      const df = DataFrame.fromColumns({
        cat: ["A", "A", "B", "B"],
        grp: ["x", "x", "x", "x"],
        val: [10, 20, 30, 40],
      });
      const result = pivotTable(df, { index: "cat", columns: "grp", values: "val" });
      expect(result.shape[0]).toBe(2);
      expect(result.columns.values).toContain("x");
      // A mean = 15, B mean = 35
      const xVals = colValues(result, "x");
      expect(xVals[0]).toBe(15);
      expect(xVals[1]).toBe(35);
    });

    it("supports sum aggfunc", () => {
      const df = DataFrame.fromColumns({
        cat: ["A", "A", "B"],
        col: ["x", "x", "x"],
        val: [10, 20, 5],
      });
      const result = pivotTable(df, {
        index: "cat",
        columns: "col",
        values: "val",
        aggfunc: "sum",
      });
      const xVals = colValues(result, "x");
      expect(xVals[0]).toBe(30); // A: 10+20
      expect(xVals[1]).toBe(5); // B: 5
    });

    it("supports count aggfunc", () => {
      const df = DataFrame.fromColumns({
        cat: ["A", "A", "B", "B", "B"],
        col: ["x", "x", "x", "x", "x"],
        val: [1, 2, 3, 4, 5],
      });
      const result = pivotTable(df, {
        index: "cat",
        columns: "col",
        values: "val",
        aggfunc: "count",
      });
      const xVals = colValues(result, "x");
      expect(xVals[0]).toBe(2); // A: 2 rows
      expect(xVals[1]).toBe(3); // B: 3 rows
    });

    it("supports min/max aggfunc", () => {
      const df = DataFrame.fromColumns({
        r: ["A", "A", "A"],
        c: ["x", "x", "x"],
        v: [5, 3, 8],
      });
      const minResult = pivotTable(df, { index: "r", columns: "c", values: "v", aggfunc: "min" });
      const maxResult = pivotTable(df, { index: "r", columns: "c", values: "v", aggfunc: "max" });
      expect(colValues(minResult, "x")[0]).toBe(3);
      expect(colValues(maxResult, "x")[0]).toBe(8);
    });

    it("fills missing cells with fill_value", () => {
      const df = DataFrame.fromColumns({
        r: ["A", "B"],
        c: ["x", "y"],
        v: [1, 2],
      });
      const result = pivotTable(df, {
        index: "r",
        columns: "c",
        values: "v",
        aggfunc: "sum",
        fill_value: 0,
      });
      // A: x=1, y=0 (filled); B: x=0 (filled), y=2
      expect(colValues(result, "x")).toEqual([1, 0]);
      expect(colValues(result, "y")).toEqual([0, 2]);
    });

    it("dropna removes all-null rows and columns", () => {
      const df = DataFrame.fromColumns({
        r: ["A", "B"],
        c: ["x", "y"],
        v: [1, 2],
      });
      const result = pivotTable(df, {
        index: "r",
        columns: "c",
        values: "v",
        aggfunc: "sum",
        dropna: true,
      });
      // With dropna=true, columns with all nulls are removed
      // A maps to x=1 and y=null; B maps to x=null and y=2
      // Neither column has all nulls — both should remain
      expect(result.shape[0]).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("throws on missing column in index", () => {
      const df = DataFrame.fromColumns({ a: [1], b: [2] });
      expect(() => pivotTable(df, { index: "NOPE", columns: "b", values: "a" })).toThrow();
    });

    it("throws on missing values column", () => {
      const df = DataFrame.fromColumns({ a: [1], b: [2] });
      expect(() => pivotTable(df, { index: "a", columns: "b", values: "NOPE" })).toThrow();
    });
  });

  describe("property tests", () => {
    it("result rows = unique index values", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 20 }),
          fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 20 }),
          (rows, cols) => {
            if (rows.length !== cols.length) {
              return;
            }
            const vals = rows.map((r, i) => r + (cols[i] ?? 0));
            const df = DataFrame.fromColumns({ r: rows, c: cols, v: vals });
            const result = pivotTable(df, {
              index: "r",
              columns: "c",
              values: "v",
              aggfunc: "count",
            });
            const uniqueRows = new Set(rows).size;
            expect(result.shape[0]).toBe(uniqueRows);
          },
        ),
      );
    });

    it("sum of all cells ≥ original sum (count only non-null)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 20 }),
          (vals) => {
            const rows = vals.map((_, i) => i % 3);
            const cols = vals.map((_, i) => i % 2);
            const df = DataFrame.fromColumns({ r: rows, c: cols, v: vals });
            const result = pivotTable(df, {
              index: "r",
              columns: "c",
              values: "v",
              aggfunc: "sum",
              fill_value: 0,
            });
            const originalSum = vals.reduce((s, v) => s + v, 0);
            expect(sumAllCells(result)).toBe(originalSum);
          },
        ),
      );
    });
  });
});
