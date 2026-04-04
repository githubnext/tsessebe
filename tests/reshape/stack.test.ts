/**
 * Tests for src/reshape/stack.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { Index } from "../../src/index.ts";
import { stack, unstack } from "../../src/index.ts";
import type { Label } from "../../src/index.ts";

// ─── stack ────────────────────────────────────────────────────────────────────

describe("stack", () => {
  const df = DataFrame.fromColumns(
    { A: [1, 2], B: [3, 4] },
    { index: new Index<Label>(["x", "y"]) },
  );

  test("basic stack produces correct shape", () => {
    const long = stack(df);
    // 2 rows × 2 cols = 4 rows; columns: _index, variable, value
    expect(long.shape).toEqual([4, 3]);
    expect([...long.columns.values]).toEqual(["_index", "variable", "value"]);
  });

  test("_index column holds original row labels", () => {
    const long = stack(df);
    expect([...long.col("_index").values]).toEqual(["x", "x", "y", "y"]);
  });

  test("variable column holds column names", () => {
    const long = stack(df);
    expect([...long.col("variable").values]).toEqual(["A", "B", "A", "B"]);
  });

  test("value column holds correct values", () => {
    const long = stack(df);
    expect([...long.col("value").values]).toEqual([1, 3, 2, 4]);
  });

  test("custom index_name, var_name, value_name", () => {
    const long = stack(df, { index_name: "row", var_name: "col", value_name: "data" });
    expect([...long.columns.values]).toEqual(["row", "col", "data"]);
  });

  test("subset of columns via value_vars", () => {
    const df2 = DataFrame.fromColumns({ id: [1, 2], A: [10, 20], B: [30, 40] });
    const long = stack(df2, { value_vars: ["A"] });
    // id is an id_var, A is stacked → 2 rows × 1 col = 2 output rows
    expect(long.shape[0]).toBe(2);
    expect([...long.columns.values]).toEqual(["_index", "id", "variable", "value"]);
    expect([...long.col("variable").values]).toEqual(["A", "A"]);
  });

  test("id_vars appear repeated in output", () => {
    const df2 = DataFrame.fromColumns({ id: ["a", "b"], A: [1, 2], B: [3, 4] });
    const long = stack(df2, { value_vars: ["A", "B"] });
    expect([...long.col("id").values]).toEqual(["a", "a", "b", "b"]);
  });

  test("RangeIndex used for output", () => {
    const long = stack(df);
    expect([...long.index.values]).toEqual([0, 1, 2, 3]);
  });

  test("null values are preserved", () => {
    const df2 = DataFrame.fromColumns({ A: [null, 2], B: [3, null] });
    const long = stack(df2);
    const values = [...long.col("value").values];
    expect(values[0]).toBe(null);
    expect(values[3]).toBe(null);
  });

  test("throws when value_vars column not found", () => {
    expect(() => stack(df, { value_vars: ["nonexistent"] })).toThrow("stack: column");
  });

  test("single column DataFrame", () => {
    const df2 = DataFrame.fromColumns({ X: [10, 20, 30] });
    const long = stack(df2);
    expect(long.shape[0]).toBe(3);
    expect([...long.col("variable").values]).toEqual(["X", "X", "X"]);
  });
});

// ─── unstack ──────────────────────────────────────────────────────────────────

describe("unstack", () => {
  test("round-trip: stack then unstack recovers original data", () => {
    const df = DataFrame.fromColumns(
      { A: [1, 2], B: [3, 4] },
      { index: new Index<Label>(["x", "y"]) },
    );
    const long = stack(df);
    const wide = unstack(long);

    // Shape should be 2×2
    expect(wide.shape).toEqual([2, 2]);
    // Index should match original row labels
    expect([...wide.index.values]).toEqual(["x", "y"]);
    // Column values should match
    expect([...wide.col("A").values]).toEqual([1, 2]);
    expect([...wide.col("B").values]).toEqual([3, 4]);
  });

  test("custom column names round-trip", () => {
    const df = DataFrame.fromColumns(
      { A: [10, 20], B: [30, 40] },
      { index: new Index<Label>(["p", "q"]) },
    );
    const long = stack(df, { index_name: "row", var_name: "col", value_name: "data" });
    const wide = unstack(long, { index_col: "row", var_col: "col", value_col: "data" });
    expect([...wide.col("A").values]).toEqual([10, 20]);
    expect([...wide.col("B").values]).toEqual([30, 40]);
  });

  test("fill_value used for missing cells", () => {
    // A long DataFrame with a missing (x, B) combination
    const long = DataFrame.fromColumns({
      _index: ["x", "y", "y"],
      variable: ["A", "A", "B"],
      value: [1, 2, 3],
    });
    const wide = unstack(long, { fill_value: 0 });
    // x/B is missing → should be 0
    expect(wide.col("B").values[0]).toBe(0);
  });

  test("default fill is null", () => {
    const long = DataFrame.fromColumns({
      _index: ["x", "y", "y"],
      variable: ["A", "A", "B"],
      value: [1, 2, 3],
    });
    const wide = unstack(long);
    expect(wide.col("B").values[0]).toBe(null);
  });

  test("numeric index values round-trip", () => {
    const df = DataFrame.fromColumns(
      { C1: [5, 6, 7], C2: [8, 9, 10] },
      { index: new Index<Label>([100, 200, 300]) },
    );
    const long = stack(df);
    const wide = unstack(long);
    expect([...wide.index.values]).toEqual([100, 200, 300]);
    expect([...wide.col("C1").values]).toEqual([5, 6, 7]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("stack/unstack properties", () => {
  test("property: stack row count = nRows × nCols", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 5 }),
        (nRows, nCols) => {
          const data: Record<string, readonly number[]> = {};
          for (let c = 0; c < nCols; c++) {
            data[`col${c}`] = Array.from({ length: nRows }, (_, i) => i + c);
          }
          const df = DataFrame.fromColumns(data);
          const long = stack(df);
          return long.shape[0] === nRows * nCols;
        },
      ),
    );
  });

  test("property: stack→unstack recovers column values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 6 }),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 6 }),
        (colA, colB) => {
          const len = Math.min(colA.length, colB.length);
          const df = DataFrame.fromColumns({
            A: colA.slice(0, len),
            B: colB.slice(0, len),
          });
          const wide = unstack(stack(df));
          const recoveredA = [...wide.col("A").values];
          const recoveredB = [...wide.col("B").values];
          return (
            recoveredA.every((v, i) => v === colA[i]) && recoveredB.every((v, i) => v === colB[i])
          );
        },
      ),
    );
  });
});
