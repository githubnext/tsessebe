/**
 * Tests for src/reshape/wide_to_long.ts
 *
 * Covers:
 * - Basic two-stub wide-to-long conversion
 * - Single stub
 * - Custom separator
 * - Custom suffix regex
 * - Single id column (string)
 * - Multiple id columns (array)
 * - Alphabetic suffixes
 * - Missing stub columns default to null
 * - Output row count = nRows × nSuffixes
 * - Output column order: id cols, j, stub cols
 * - Error on missing id column
 * - Property: output row count = input rows × distinct suffixes
 * - Property: id values repeat for each suffix
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { wideToLong } from "../../src/reshape/wide_to_long.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeWideDF(): DataFrame {
  return DataFrame.fromColumns({
    id: ["x", "y"],
    A1: [1, 2],
    A2: [3, 4],
    B1: [5, 6],
    B2: [7, 8],
  });
}

// ─── basic ─────────────────────────────────────────────────────────────────────

describe("wideToLong — basic", () => {
  test("two stubs, two suffixes, single id", () => {
    const df = makeWideDF();
    const long = wideToLong(df, ["A", "B"], "id", "num");
    expect(long.shape).toEqual([4, 4]); // 2 rows × 2 suffixes = 4; 4 cols: id, num, A, B
    expect(long.columns.values).toEqual(["id", "num", "A", "B"]);
  });

  test("j column holds suffix values", () => {
    const df = makeWideDF();
    const long = wideToLong(df, ["A", "B"], "id", "num");
    // Suffixes 1, 2 — repeated for each original row
    expect(long.col("num").values).toEqual([1, 1, 2, 2]);
  });

  test("id column values repeat for each suffix", () => {
    const df = makeWideDF();
    const long = wideToLong(df, ["A", "B"], "id", "num");
    expect(long.col("id").values).toEqual(["x", "y", "x", "y"]);
  });

  test("stub A values are correct", () => {
    const df = makeWideDF();
    const long = wideToLong(df, ["A", "B"], "id", "num");
    // suffix=1 rows: A1=[1,2]; suffix=2 rows: A2=[3,4]
    expect(long.col("A").values).toEqual([1, 2, 3, 4]);
  });

  test("stub B values are correct", () => {
    const df = makeWideDF();
    const long = wideToLong(df, ["A", "B"], "id", "num");
    expect(long.col("B").values).toEqual([5, 6, 7, 8]);
  });
});

// ─── single stub ──────────────────────────────────────────────────────────────

describe("wideToLong — single stub", () => {
  test("string stubname is normalised to array", () => {
    const df = DataFrame.fromColumns({ id: [1, 2], val1: [10, 20], val2: [30, 40] });
    const long = wideToLong(df, "val", "id", "num");
    expect(long.shape).toEqual([4, 3]); // 2×2 rows, 3 cols: id, num, val
    expect(long.col("val").values).toEqual([10, 20, 30, 40]);
  });
});

// ─── separator ────────────────────────────────────────────────────────────────

describe("wideToLong — sep option", () => {
  test("underscore separator", () => {
    const df = DataFrame.fromColumns({
      id: ["a"],
      score_2021: [100],
      score_2022: [200],
    });
    const long = wideToLong(df, "score", "id", "year", { sep: "_" });
    expect(long.shape).toEqual([2, 3]);
    expect(long.col("year").values).toEqual([2021, 2022]);
    expect(long.col("score").values).toEqual([100, 200]);
  });
});

// ─── custom suffix ────────────────────────────────────────────────────────────

describe("wideToLong — suffix option", () => {
  test("alphabetic suffix regex", () => {
    const df = DataFrame.fromColumns({
      id: [1],
      vala: [10],
      valb: [20],
    });
    const long = wideToLong(df, "val", "id", "letter", { suffix: "[a-z]" });
    expect(long.shape).toEqual([2, 3]);
    expect(long.col("letter").values).toEqual(["a", "b"]);
  });
});

// ─── multiple id columns ──────────────────────────────────────────────────────

describe("wideToLong — multiple id columns", () => {
  test("two id columns are both preserved", () => {
    const df = DataFrame.fromColumns({
      grp: ["G1", "G2"],
      subgrp: ["S1", "S2"],
      v1: [10, 20],
      v2: [30, 40],
    });
    const long = wideToLong(df, "v", ["grp", "subgrp"], "n");
    expect(long.columns.values).toEqual(["grp", "subgrp", "n", "v"]);
    expect(long.col("grp").values).toEqual(["G1", "G2", "G1", "G2"]);
    expect(long.col("subgrp").values).toEqual(["S1", "S2", "S1", "S2"]);
  });
});

// ─── missing stub column → null ───────────────────────────────────────────────

describe("wideToLong — missing stub columns", () => {
  test("missing wide column fills with null", () => {
    // A1 exists but A2 does not — A2 values should be null
    const df = DataFrame.fromColumns({ id: [1], A1: [10] });
    const long = wideToLong(df, "A", "id", "n", { suffix: "[12]" });
    // suffix 1 → A1=10, suffix 2 → A2=null
    expect(long.col("A").values).toEqual([10, null]);
  });
});

// ─── output row count ─────────────────────────────────────────────────────────

describe("wideToLong — output shape", () => {
  test("row count equals nRows × nSuffixes", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2, 3],
      x1: [1, 2, 3],
      x2: [4, 5, 6],
      x3: [7, 8, 9],
    });
    const long = wideToLong(df, "x", "id", "k");
    expect(long.shape[0]).toBe(9); // 3 rows × 3 suffixes
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe("wideToLong — errors", () => {
  test("throws on missing id column", () => {
    const df = DataFrame.fromColumns({ A1: [1] });
    expect(() => wideToLong(df, "A", "id", "n")).toThrow(RangeError);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based", () => {
  test("output row count = input rows × distinct suffix count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 1, max: 3 }),
        (idVals, nSuffix) => {
          const colData: Record<string, readonly number[]> = { id: idVals };
          for (let s = 1; s <= nSuffix; s++) {
            colData[`x${s}`] = idVals.map((v) => v * s);
          }
          const df = DataFrame.fromColumns(colData);
          const long = wideToLong(df, "x", "id", "n");
          return long.shape[0] === idVals.length * nSuffix;
        },
      ),
    );
  });

  test("id column values repeat exactly nSuffix times each", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 4 }),
        fc.integer({ min: 1, max: 3 }),
        (idVals, nSuffix) => {
          const colData: Record<string, readonly number[]> = { id: idVals };
          for (let s = 1; s <= nSuffix; s++) {
            colData[`v${s}`] = idVals.map(() => s);
          }
          const df = DataFrame.fromColumns(colData);
          const long = wideToLong(df, "v", "id", "n");
          const outId = long.col("id").values;
          // Each original id value should appear nSuffix times
          return idVals.every(
            (v) => outId.filter((x) => x === v).length === nSuffix,
          );
        },
      ),
    );
  });
});
