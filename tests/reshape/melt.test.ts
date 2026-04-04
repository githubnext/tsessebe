/**
 * Tests for src/reshape/melt.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { melt } from "../../src/index.ts";

// ─── basic melt ───────────────────────────────────────────────────────────────

describe("melt", () => {
  const df = DataFrame.fromColumns({
    id: [1, 2],
    A: [10, 20],
    B: [30, 40],
  });

  test("melt with id_vars", () => {
    const long = melt(df, { id_vars: ["id"] });
    expect(long.shape).toEqual([4, 3]); // 2 rows × 2 value cols = 4 rows, plus id + variable + value
    expect([...long.columns.values]).toEqual(["id", "variable", "value"]);
    expect([...long.col("variable").values]).toEqual(["A", "A", "B", "B"]);
    expect([...long.col("value").values]).toEqual([10, 20, 30, 40]);
    expect([...long.col("id").values]).toEqual([1, 2, 1, 2]);
  });

  test("melt without id_vars melts all columns", () => {
    const long = melt(df);
    // No id columns → 3 cols × 2 rows = 6 rows, 2 output columns
    expect(long.shape).toEqual([6, 2]);
    expect([...long.columns.values]).toEqual(["variable", "value"]);
  });

  test("custom var_name and value_name", () => {
    const long = melt(df, { id_vars: ["id"], var_name: "col", value_name: "data" });
    expect([...long.columns.values]).toEqual(["id", "col", "data"]);
  });

  test("explicit value_vars subset", () => {
    const long = melt(df, { id_vars: ["id"], value_vars: ["A"] });
    expect(long.shape).toEqual([2, 3]);
    expect([...long.col("variable").values]).toEqual(["A", "A"]);
  });

  test("preserves id column values correctly", () => {
    const df2 = DataFrame.fromColumns({
      key: ["x", "y", "z"],
      c1: [1, 2, 3],
      c2: [4, 5, 6],
    });
    const long = melt(df2, { id_vars: ["key"] });
    expect([...long.col("key").values]).toEqual(["x", "y", "z", "x", "y", "z"]);
  });

  test("multiple id_vars", () => {
    const df2 = DataFrame.fromColumns({
      a: [1, 2],
      b: ["x", "y"],
      c1: [10, 20],
      c2: [30, 40],
    });
    const long = melt(df2, { id_vars: ["a", "b"] });
    expect([...long.columns.values]).toEqual(["a", "b", "variable", "value"]);
    expect(long.shape[0]).toBe(4); // 2 rows × 2 value cols
    expect([...long.col("a").values]).toEqual([1, 2, 1, 2]);
    expect([...long.col("b").values]).toEqual(["x", "y", "x", "y"]);
  });

  test("empty value_vars returns empty DataFrame", () => {
    const long = melt(df, { id_vars: ["id", "A", "B"] });
    // All columns are ids → no value vars → 0 output rows
    expect(long.shape[0]).toBe(0);
  });

  test("null values in melt", () => {
    const df2 = DataFrame.fromColumns({
      id: [1, 2],
      val: [null, 3],
    });
    const long = melt(df2, { id_vars: ["id"] });
    expect(long.col("value").values[0]).toBe(null);
    expect(long.col("value").values[1]).toBe(3);
  });

  test("throws when id_vars column not found", () => {
    expect(() => melt(df, { id_vars: ["nonexistent"] })).toThrow("id_vars column");
  });

  test("throws when value_vars column not found", () => {
    expect(() => melt(df, { value_vars: ["nonexistent"] })).toThrow("value_vars column");
  });

  test("throws when var_name equals value_name", () => {
    expect(() => melt(df, { var_name: "same", value_name: "same" })).toThrow(
      "var_name and value_name must differ",
    );
  });

  test("variable column contains original column names", () => {
    const df2 = DataFrame.fromColumns({ x: [1], y: [2], z: [3] });
    const long = melt(df2);
    expect(new Set(long.col("variable").values)).toEqual(new Set(["x", "y", "z"]));
  });

  test("RangeIndex used for output", () => {
    const long = melt(df, { id_vars: ["id"] });
    expect([...long.index.values]).toEqual([0, 1, 2, 3]);
  });

  // ─── property tests ───────────────────────────────────────────────────────

  test("property: total rows = nRows × len(value_vars)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (nRows, nCols) => {
          const data: Record<string, readonly number[]> = {};
          for (let c = 0; c < nCols; c++) {
            data[`c${c}`] = Array.from({ length: nRows }, (_, i) => i * c);
          }
          const df2 = DataFrame.fromColumns(data);
          const long = melt(df2);
          return long.shape[0] === nRows * nCols;
        },
      ),
    );
  });

  test("property: all original values appear in melt output", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 8 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 8 }),
        (colA, colB) => {
          const len = Math.min(colA.length, colB.length);
          const df2 = DataFrame.fromColumns({
            A: colA.slice(0, len),
            B: colB.slice(0, len),
          });
          const long = melt(df2);
          const values = new Set(long.col("value").values);
          const original = new Set([...colA.slice(0, len), ...colB.slice(0, len)]);
          for (const v of original) {
            if (!values.has(v)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
