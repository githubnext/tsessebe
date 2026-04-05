/**
 * Tests for src/reshape/melt.ts — melt (wide → long).
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Scalar } from "../../src/index.ts";
import { melt } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

// ─── basic melt ───────────────────────────────────────────────────────────────

describe("melt", () => {
  describe("basic usage", () => {
    it("melts all columns when no id_vars", () => {
      const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] });
      const result = melt(df);
      expect(result.shape[0]).toBe(4);
      expect(result.columns.values).toEqual(["variable", "value"]);
      expect(colValues(result, "variable")).toEqual(["A", "A", "B", "B"]);
      expect(colValues(result, "value")).toEqual([1, 2, 3, 4]);
    });

    it("preserves id_vars and melts value_vars", () => {
      const df = DataFrame.fromColumns({
        id: ["a", "b"],
        x: [1, 2],
        y: [3, 4],
      });
      const result = melt(df, { id_vars: "id" });
      expect(result.shape[0]).toBe(4);
      expect(result.columns.values).toEqual(["id", "variable", "value"]);
      expect(colValues(result, "id")).toEqual(["a", "b", "a", "b"]);
      expect(colValues(result, "variable")).toEqual(["x", "x", "y", "y"]);
      expect(colValues(result, "value")).toEqual([1, 2, 3, 4]);
    });

    it("uses custom var_name and value_name", () => {
      const df = DataFrame.fromColumns({ id: [1, 2], val: [10, 20] });
      const result = melt(df, {
        id_vars: "id",
        var_name: "metric",
        value_name: "amount",
      });
      expect(result.columns.values).toContain("metric");
      expect(result.columns.values).toContain("amount");
    });

    it("respects explicit value_vars", () => {
      const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4], C: [5, 6] });
      const result = melt(df, { value_vars: ["A", "C"] });
      expect(result.shape[0]).toBe(4);
      expect(colValues(result, "variable")).toEqual(["A", "A", "C", "C"]);
    });

    it("handles multiple id_vars", () => {
      const df = DataFrame.fromColumns({
        id1: ["a", "b"],
        id2: [1, 2],
        v: [10, 20],
      });
      const result = melt(df, { id_vars: ["id1", "id2"] });
      expect(result.shape[0]).toBe(2);
      expect(colValues(result, "id1")).toEqual(["a", "b"]);
      expect(colValues(result, "id2")).toEqual([1, 2]);
      expect(colValues(result, "value")).toEqual([10, 20]);
    });
  });

  describe("edge cases", () => {
    it("empty DataFrame returns empty", () => {
      const df = DataFrame.fromColumns({});
      const result = melt(df);
      expect(result.shape[0]).toBe(0);
    });

    it("no value_vars produces empty result", () => {
      const df = DataFrame.fromColumns({ id: [1, 2] });
      const result = melt(df, { id_vars: "id", value_vars: [] });
      expect(result.shape[0]).toBe(0);
    });

    it("preserves null values", () => {
      const df = DataFrame.fromColumns({ id: [1, 2], v: [null, 5] });
      const result = melt(df, { id_vars: "id" });
      expect(colValues(result, "value")).toEqual([null, 5]);
    });

    it("ignore_index=true resets to RangeIndex", () => {
      const df = DataFrame.fromColumns({ A: [10, 20], B: [30, 40] });
      const result = melt(df, { ignore_index: true });
      expect(result.index.at(0)).toBe(0);
      expect(result.index.at(3)).toBe(3);
    });

    it("throws on unknown id_vars column", () => {
      const df = DataFrame.fromColumns({ A: [1] });
      expect(() => melt(df, { id_vars: "NONEXISTENT" })).toThrow();
    });

    it("throws on unknown value_vars column", () => {
      const df = DataFrame.fromColumns({ A: [1] });
      expect(() => melt(df, { value_vars: ["NONEXISTENT"] })).toThrow();
    });
  });

  describe("property tests", () => {
    it("total rows = nRows * nValueCols", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          (nRows, nCols) => {
            const colData: Record<string, number[]> = {};
            for (let c = 0; c < nCols; c++) {
              colData[`c${c}`] = Array.from({ length: nRows }, (_, i) => i * c);
            }
            const df = DataFrame.fromColumns(colData);
            const result = melt(df);
            expect(result.shape[0]).toBe(nRows * nCols);
          },
        ),
      );
    });

    it("id columns have correct length", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 8 }),
          fc.integer({ min: 1, max: 4 }),
          (nRows, nValueCols) => {
            const idArr = Array.from({ length: nRows }, (_, i): number => i);
            const valueCols: Record<string, number[]> = {};
            for (let c = 0; c < nValueCols; c++) {
              valueCols[`v${c}`] = Array.from({ length: nRows }, (_, i): number => i);
            }
            const df = DataFrame.fromColumns({ id: idArr, ...valueCols });
            const result = melt(df, { id_vars: "id" });
            expect(colValues(result, "id").length).toBe(nRows * nValueCols);
          },
        ),
      );
    });
  });
});
