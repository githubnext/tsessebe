/**
 * Tests for src/core/insert_pop.ts — insertColumn(), popColumn(), reorderColumns(), moveColumn().
 *
 * Covers:
 * - insertColumn: basic insertion at various positions
 * - insertColumn: insertion at start (loc=0) and end (loc=nCols)
 * - insertColumn: insertion with a Series value
 * - insertColumn: error on duplicate column name (allowDuplicates=false)
 * - insertColumn: allowDuplicates=true bypasses duplicate check
 * - insertColumn: error on out-of-range loc
 * - insertColumn: error on wrong-length values
 * - popColumn: removes column and returns Series + new DataFrame
 * - popColumn: error on missing column
 * - reorderColumns: reorders to specified order
 * - reorderColumns: error on missing column in order
 * - moveColumn: moves column to new position
 * - Property-based: insertColumn then popColumn round-trips shape
 * - Property-based: column order after insert is correct
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { insertColumn, moveColumn, popColumn, reorderColumns } from "../../src/core/insert_pop.ts";
import { DataFrame, Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDF(): DataFrame {
  return DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
}

// ─── insertColumn ─────────────────────────────────────────────────────────────

describe("insertColumn", () => {
  test("inserts at position 0 (start)", () => {
    const df = makeDF();
    const df2 = insertColumn(df, 0, "x", [10, 20, 30]);
    expect(df2.columns.values).toEqual(["x", "a", "b", "c"]);
    expect(df2.col("x").values).toEqual([10, 20, 30]);
  });

  test("inserts at position 1 (middle)", () => {
    const df = makeDF();
    const df2 = insertColumn(df, 1, "x", [10, 20, 30]);
    expect(df2.columns.values).toEqual(["a", "x", "b", "c"]);
    expect(df2.col("x").values).toEqual([10, 20, 30]);
  });

  test("inserts at end (loc = nCols)", () => {
    const df = makeDF();
    const df2 = insertColumn(df, 3, "x", [10, 20, 30]);
    expect(df2.columns.values).toEqual(["a", "b", "c", "x"]);
  });

  test("inserts using a Series value", () => {
    const df = makeDF();
    const s = new Series({ data: [100, 200, 300], name: "s" });
    const df2 = insertColumn(df, 2, "s", s);
    expect(df2.columns.values).toEqual(["a", "b", "s", "c"]);
    expect(df2.col("s").values).toEqual([100, 200, 300]);
  });

  test("preserves original DataFrame (immutable)", () => {
    const df = makeDF();
    insertColumn(df, 1, "x", [10, 20, 30]);
    expect(df.columns.values).toEqual(["a", "b", "c"]);
  });

  test("preserves row index", () => {
    const df = makeDF();
    const df2 = insertColumn(df, 0, "z", [0, 0, 0]);
    expect(df2.shape[0]).toBe(3);
    expect(df2.index.values).toEqual(df.index.values);
  });

  test("throws on duplicate column (allowDuplicates=false)", () => {
    const df = makeDF();
    expect(() => insertColumn(df, 1, "a", [1, 2, 3])).toThrow(RangeError);
  });

  test("allows duplicate column when allowDuplicates=true", () => {
    const df = makeDF();
    const df2 = insertColumn(df, 1, "a", [99, 99, 99], true);
    // columnNames array preserves duplicates; shape grows to 4
    expect(df2.shape[1]).toBe(4);
    // col("a") returns the last-set value in the Map (the new column)
    expect(df2.col("a").values).toEqual([99, 99, 99]);
  });

  test("throws on loc < 0", () => {
    const df = makeDF();
    expect(() => insertColumn(df, -1, "x", [1, 2, 3])).toThrow(RangeError);
  });

  test("throws on loc > nCols", () => {
    const df = makeDF();
    expect(() => insertColumn(df, 10, "x", [1, 2, 3])).toThrow(RangeError);
  });

  test("throws on wrong-length values array", () => {
    const df = makeDF();
    expect(() => insertColumn(df, 1, "x", [1, 2])).toThrow(RangeError);
  });

  test("inserts into empty DataFrame (0 rows) at pos 0", () => {
    const df = DataFrame.fromColumns({});
    const df2 = insertColumn(df, 0, "a", []);
    expect(df2.columns.values).toEqual(["a"]);
    expect(df2.shape[0]).toBe(0);
  });

  test("shape[1] increases by 1", () => {
    const df = makeDF();
    const df2 = insertColumn(df, 2, "new", [1, 2, 3]);
    expect(df2.shape[1]).toBe(df.shape[1] + 1);
  });
});

// ─── popColumn ────────────────────────────────────────────────────────────────

describe("popColumn", () => {
  test("removes column and returns it as Series", () => {
    const df = makeDF();
    const { series, df: df2 } = popColumn(df, "b");
    expect(series.values).toEqual([4, 5, 6]);
    expect(df2.columns.values).toEqual(["a", "c"]);
  });

  test("popping first column", () => {
    const df = makeDF();
    const { series, df: df2 } = popColumn(df, "a");
    expect(series.values).toEqual([1, 2, 3]);
    expect(df2.columns.values).toEqual(["b", "c"]);
  });

  test("popping last column", () => {
    const df = makeDF();
    const { series, df: df2 } = popColumn(df, "c");
    expect(series.values).toEqual([7, 8, 9]);
    expect(df2.columns.values).toEqual(["a", "b"]);
  });

  test("preserves original DataFrame (immutable)", () => {
    const df = makeDF();
    popColumn(df, "b");
    expect(df.columns.values).toEqual(["a", "b", "c"]);
  });

  test("shape[1] decreases by 1", () => {
    const df = makeDF();
    const { df: df2 } = popColumn(df, "a");
    expect(df2.shape[1]).toBe(df.shape[1] - 1);
  });

  test("throws on missing column", () => {
    const df = makeDF();
    expect(() => popColumn(df, "z")).toThrow(RangeError);
  });

  test("popping all columns leaves empty-column DataFrame", () => {
    const df = DataFrame.fromColumns({ x: [1, 2] });
    const { df: df2 } = popColumn(df, "x");
    expect(df2.shape[1]).toBe(0);
    expect(df2.shape[0]).toBe(2);
  });
});

// ─── reorderColumns ──────────────────────────────────────────────────────────

describe("reorderColumns", () => {
  test("reorders columns to new order", () => {
    const df = makeDF();
    const df2 = reorderColumns(df, ["c", "a", "b"]);
    expect(df2.columns.values).toEqual(["c", "a", "b"]);
  });

  test("values are preserved after reorder", () => {
    const df = makeDF();
    const df2 = reorderColumns(df, ["c", "b", "a"]);
    expect(df2.col("a").values).toEqual([1, 2, 3]);
    expect(df2.col("b").values).toEqual([4, 5, 6]);
    expect(df2.col("c").values).toEqual([7, 8, 9]);
  });

  test("can select subset of columns (acts like df[subset])", () => {
    const df = makeDF();
    const df2 = reorderColumns(df, ["a", "c"]);
    expect(df2.columns.values).toEqual(["a", "c"]);
    expect(df2.shape[1]).toBe(2);
  });

  test("throws on column not in DataFrame", () => {
    const df = makeDF();
    expect(() => reorderColumns(df, ["a", "z"])).toThrow(RangeError);
  });
});

// ─── moveColumn ──────────────────────────────────────────────────────────────

describe("moveColumn", () => {
  test("moves last column to position 0", () => {
    const df = makeDF();
    const df2 = moveColumn(df, "c", 0);
    expect(df2.columns.values).toEqual(["c", "a", "b"]);
  });

  test("moves first column to end", () => {
    const df = makeDF();
    const df2 = moveColumn(df, "a", 2);
    expect(df2.columns.values).toEqual(["b", "c", "a"]);
  });

  test("values are preserved", () => {
    const df = makeDF();
    const df2 = moveColumn(df, "b", 0);
    expect(df2.col("b").values).toEqual([4, 5, 6]);
    expect(df2.col("a").values).toEqual([1, 2, 3]);
  });

  test("shape is unchanged", () => {
    const df = makeDF();
    const df2 = moveColumn(df, "b", 2);
    expect(df2.shape).toEqual(df.shape);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("insertColumn + popColumn property tests", () => {
  test("insert then pop round-trips shape", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (nCols, nRows) => {
          // Build a DataFrame with nCols columns
          const colData: Record<string, number[]> = {};
          for (let i = 0; i < nCols; i++) {
            colData[`col${i}`] = Array.from({ length: nRows }, (_, j) => i * nRows + j);
          }
          const df = DataFrame.fromColumns(colData);

          const loc = Math.floor(nCols / 2);
          const values = Array.from({ length: nRows }, () => 99);
          const df2 = insertColumn(df, loc, "inserted", values);

          // pop the inserted column back out
          const { df: df3 } = popColumn(df2, "inserted");
          expect(df3.shape).toEqual(df.shape);
          expect(df3.columns.values).toEqual(df.columns.values);
        },
      ),
    );
  });

  test("insertColumn: new column appears at correct position", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 1, max: 4 }),
        (insertLoc, nCols) => {
          const loc = Math.min(insertLoc, nCols);
          const colData: Record<string, number[]> = {};
          for (let i = 0; i < nCols; i++) {
            colData[`c${i}`] = [i, i + 1, i + 2];
          }
          const df = DataFrame.fromColumns(colData);
          const df2 = insertColumn(df, loc, "NEW", [0, 0, 0]);
          expect(df2.columns.values[loc]).toBe("NEW");
          expect(df2.shape[1]).toBe(nCols + 1);
        },
      ),
    );
  });

  test("popColumn: returned series values match original column", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        (vals) => {
          const df = DataFrame.fromColumns({ x: vals, y: vals.map((v) => v * 2) });
          const { series } = popColumn(df, "x");
          expect(series.values).toEqual(vals);
        },
      ),
    );
  });
});
