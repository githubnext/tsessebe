/**
 * Tests for swaplevel / reorderLevels.
 *
 * Covers:
 * - swapLevelSeries: basic swap, negative indices, named levels, idempotent
 * - swapLevelDataFrame: row index swap, axis=0
 * - reorderLevelsSeries: arbitrary reorder, all permutations
 * - reorderLevelsDataFrame: row index reorder
 * - Error cases: flat index, out-of-range levels, wrong order length
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  MultiIndex,
  Series,
  reorderLevelsDataFrame,
  reorderLevelsSeries,
  swapLevelDataFrame,
  swapLevelSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import type { Index } from "../../src/index.ts";
import type { Label } from "../../src/types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function miToTuples(mi: MultiIndex): (readonly Label[])[] {
  return Array.from({ length: mi.size }, (_, i) => mi.at(i));
}

function seriesWithMultiIndex(
  data: number[],
  tuples: (readonly Label[])[],
  names?: (string | null)[],
): Series<Scalar> {
  const mi = MultiIndex.fromTuples(tuples, names !== undefined ? { names } : undefined);
  return new Series<Scalar>({
    data,
    index: mi as unknown as Index<Label>,
  });
}

function dfWithMultiIndex(
  data: Record<string, number[]>,
  tuples: (readonly Label[])[],
  names?: (string | null)[],
): DataFrame {
  const mi = MultiIndex.fromTuples(tuples, names !== undefined ? { names } : undefined);
  const _firstCol = Object.keys(data)[0]!;
  const df = DataFrame.fromColumns(data, {
    index: mi as unknown as Index<Label>,
  });
  return df;
}

// ─── swapLevelSeries ──────────────────────────────────────────────────────────

describe("swapLevelSeries", () => {
  const tuples = [
    ["a", 1],
    ["a", 2],
    ["b", 1],
    ["b", 2],
  ] as const;

  test("default swap (last two levels)", () => {
    const s = seriesWithMultiIndex([10, 20, 30, 40], [...tuples]);
    const swapped = swapLevelSeries(s);
    const result = miToTuples(swapped.index as unknown as MultiIndex);
    expect(result[0]).toEqual([1, "a"]);
    expect(result[1]).toEqual([2, "a"]);
    expect(result[2]).toEqual([1, "b"]);
    expect(result[3]).toEqual([2, "b"]);
  });

  test("values are preserved", () => {
    const s = seriesWithMultiIndex([10, 20, 30, 40], [...tuples]);
    const swapped = swapLevelSeries(s);
    expect(swapped.values).toEqual([10, 20, 30, 40]);
  });

  test("explicit i=0, j=1", () => {
    const s = seriesWithMultiIndex(
      [1, 2, 3],
      [
        ["x", "A"],
        ["y", "B"],
        ["z", "C"],
      ],
    );
    const swapped = swapLevelSeries(s, 0, 1);
    const result = miToTuples(swapped.index as unknown as MultiIndex);
    expect(result[0]).toEqual(["A", "x"]);
    expect(result[1]).toEqual(["B", "y"]);
    expect(result[2]).toEqual(["C", "z"]);
  });

  test("negative index -2, -1 is the default", () => {
    const s = seriesWithMultiIndex(
      [1, 2],
      [
        ["a", 1],
        ["b", 2],
      ],
    );
    const explicit = swapLevelSeries(s, 0, 1);
    const defaultSwap = swapLevelSeries(s);
    expect(miToTuples(explicit.index as unknown as MultiIndex)).toEqual(
      miToTuples(defaultSwap.index as unknown as MultiIndex),
    );
  });

  test("swap same level is identity", () => {
    const s = seriesWithMultiIndex(
      [1, 2],
      [
        ["a", 1],
        ["b", 2],
      ],
    );
    const result = swapLevelSeries(s, 0, 0);
    expect(miToTuples(result.index as unknown as MultiIndex)).toEqual(
      miToTuples(s.index as unknown as MultiIndex),
    );
  });

  test("swap by name", () => {
    const s = seriesWithMultiIndex(
      [10, 20],
      [
        ["a", 1],
        ["b", 2],
      ],
      ["letter", "number"],
    );
    const swapped = swapLevelSeries(s, "letter", "number");
    const mi = swapped.index as unknown as MultiIndex;
    expect(mi.names).toEqual(["number", "letter"]);
    expect(miToTuples(mi)[0]).toEqual([1, "a"]);
  });

  test("throws for flat index", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(() => swapLevelSeries(s)).toThrow(/MultiIndex/);
  });

  test("throws for out-of-range level", () => {
    const s = seriesWithMultiIndex([1], [["a", 1]]);
    expect(() => swapLevelSeries(s, 0, 5)).toThrow(/out of range/);
  });

  test("three-level swap preserves third level unchanged", () => {
    const tuples3 = [
      ["a", 1, "x"],
      ["b", 2, "y"],
    ] as (readonly Label[])[];
    const s = seriesWithMultiIndex([10, 20], tuples3);
    const swapped = swapLevelSeries(s, 0, 1);
    const result = miToTuples(swapped.index as unknown as MultiIndex);
    expect(result[0]).toEqual([1, "a", "x"]);
    expect(result[1]).toEqual([2, "b", "y"]);
  });

  test("double swap restores original", () => {
    const s = seriesWithMultiIndex(
      [10, 20, 30],
      [
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ],
    );
    const once = swapLevelSeries(s, 0, 1);
    const twice = swapLevelSeries(once, 0, 1);
    expect(miToTuples(twice.index as unknown as MultiIndex)).toEqual(
      miToTuples(s.index as unknown as MultiIndex),
    );
  });

  test("property: swap is its own inverse", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.string({ minLength: 1, maxLength: 3 }), fc.integer({ min: 0, max: 9 })),
          { minLength: 1, maxLength: 8 },
        ),
        (pairs) => {
          const s = seriesWithMultiIndex(
            pairs.map((_, i) => i),
            pairs.map(([a, b]) => [a, b] as const),
          );
          const swapped = swapLevelSeries(s, 0, 1);
          const restored = swapLevelSeries(swapped, 0, 1);
          const orig = miToTuples(s.index as unknown as MultiIndex);
          const back = miToTuples(restored.index as unknown as MultiIndex);
          return JSON.stringify(orig) === JSON.stringify(back);
        },
      ),
    );
  });
});

// ─── swapLevelDataFrame ───────────────────────────────────────────────────────

describe("swapLevelDataFrame", () => {
  test("swaps row index levels", () => {
    const df = dfWithMultiIndex({ x: [1, 2, 3], y: [4, 5, 6] }, [
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    const swapped = swapLevelDataFrame(df, 0, 1);
    const mi = swapped.index as unknown as MultiIndex;
    expect(miToTuples(mi)[0]).toEqual([1, "a"]);
    expect(miToTuples(mi)[2]).toEqual([3, "c"]);
  });

  test("data values are preserved after swap", () => {
    const df = dfWithMultiIndex({ val: [10, 20] }, [
      ["x", 1],
      ["y", 2],
    ]);
    const swapped = swapLevelDataFrame(df, 0, 1);
    expect(swapped.col("val").values).toEqual([10, 20]);
  });

  test("default axes parameter is 0 (rows)", () => {
    const df = dfWithMultiIndex({ v: [1, 2] }, [
      ["a", 1],
      ["b", 2],
    ]);
    const dfAxis0 = swapLevelDataFrame(df, 0, 1, { axis: 0 });
    const dfDefault = swapLevelDataFrame(df, 0, 1);
    const mi0 = dfAxis0.index as unknown as MultiIndex;
    const miD = dfDefault.index as unknown as MultiIndex;
    expect(miToTuples(mi0)).toEqual(miToTuples(miD));
  });

  test("throws for flat row index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(() => swapLevelDataFrame(df, 0, 1)).toThrow(/MultiIndex/);
  });
});

// ─── reorderLevelsSeries ──────────────────────────────────────────────────────

describe("reorderLevelsSeries", () => {
  test("reorder [0,1,2] → [2,0,1]", () => {
    const tuples = [
      ["a", 1, "x"],
      ["b", 2, "y"],
    ] as (readonly Label[])[];
    const s = seriesWithMultiIndex([10, 20], tuples);
    const reordered = reorderLevelsSeries(s, [2, 0, 1]);
    const result = miToTuples(reordered.index as unknown as MultiIndex);
    expect(result[0]).toEqual(["x", "a", 1]);
    expect(result[1]).toEqual(["y", "b", 2]);
  });

  test("identity reorder preserves tuples", () => {
    const s = seriesWithMultiIndex(
      [1, 2],
      [
        ["a", 1],
        ["b", 2],
      ],
    );
    const result = reorderLevelsSeries(s, [0, 1]);
    expect(miToTuples(result.index as unknown as MultiIndex)).toEqual(
      miToTuples(s.index as unknown as MultiIndex),
    );
  });

  test("reorder preserves values", () => {
    const s = seriesWithMultiIndex(
      [100, 200, 300],
      [
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ],
    );
    expect(reorderLevelsSeries(s, [1, 0]).values).toEqual([100, 200, 300]);
  });

  test("reorder by name", () => {
    const s = seriesWithMultiIndex(
      [1, 2],
      [
        ["a", 1],
        ["b", 2],
      ],
      ["letter", "number"],
    );
    const reordered = reorderLevelsSeries(s, ["number", "letter"]);
    const mi = reordered.index as unknown as MultiIndex;
    expect(mi.names).toEqual(["number", "letter"]);
    expect(miToTuples(mi)[0]).toEqual([1, "a"]);
  });

  test("throws for wrong order length", () => {
    const s = seriesWithMultiIndex([1], [["a", 1]]);
    expect(() => reorderLevelsSeries(s, [0])).toThrow(/order length/);
    expect(() => reorderLevelsSeries(s, [0, 1, 2])).toThrow(/order length/);
  });

  test("throws for flat index", () => {
    const s = new Series<Scalar>({ data: [1, 2] });
    expect(() => reorderLevelsSeries(s, [0])).toThrow(/MultiIndex/);
  });
});

// ─── reorderLevelsDataFrame ───────────────────────────────────────────────────

describe("reorderLevelsDataFrame", () => {
  test("reorders row index levels", () => {
    const df = dfWithMultiIndex({ a: [1, 2] }, [
      ["x", 10],
      ["y", 20],
    ]);
    const reordered = reorderLevelsDataFrame(df, [1, 0]);
    const mi = reordered.index as unknown as MultiIndex;
    expect(miToTuples(mi)[0]).toEqual([10, "x"]);
    expect(miToTuples(mi)[1]).toEqual([20, "y"]);
  });

  test("data preserved after reorder", () => {
    const df = dfWithMultiIndex({ v: [5, 15] }, [
      ["a", 1],
      ["b", 2],
    ]);
    const reordered = reorderLevelsDataFrame(df, [1, 0]);
    expect(reordered.col("v").values).toEqual([5, 15]);
  });

  test("throws for flat row index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(() => reorderLevelsDataFrame(df, [0])).toThrow(/MultiIndex/);
  });
});
