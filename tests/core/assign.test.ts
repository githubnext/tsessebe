/**
 * Tests for src/core/assign.ts — dataFrameAssign() and DataFrame.assign() callable support.
 *
 * Covers:
 * - Array specifier
 * - Series specifier
 * - Callable specifier (chained derivations)
 * - Mixed specifiers in one call
 * - Column replacement (not just addition)
 * - Empty spec (no-op)
 * - Column order preservation for replacements
 * - dataFrameAssign() standalone function
 * - property-based tests (fast-check)
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, dataFrameAssign } from "../../src/index.ts";
import type { AssignSpec } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDF(): DataFrame {
  return DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
}

// ─── unit tests ───────────────────────────────────────────────────────────────

describe("dataFrameAssign", () => {
  test("adds a new column from an array", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, { c: [7, 8, 9] });

    expect(df2.columns.values).toEqual(["a", "b", "c"]);
    expect(df2.col("c").values).toEqual([7, 8, 9]);
    // Original unchanged
    expect(df.columns.values).toEqual(["a", "b"]);
  });

  test("adds a new column from a Series", () => {
    const df = makeDF();
    const s = new Series({ data: [100, 200, 300] });
    const df2 = dataFrameAssign(df, { c: s });

    expect(df2.col("c").values).toEqual([100, 200, 300]);
  });

  test("callable receives current DataFrame", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, {
      c: (d) => d.col("a").values.map((v) => (v as number) * 2),
    });

    expect(df2.col("c").values).toEqual([2, 4, 6]);
  });

  test("callable sees earlier columns added in the same assign call", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, {
      c: [5, 10, 15],
      d: (d) => d.col("c").values.map((v) => (v as number) + 1),
    });

    expect(df2.col("c").values).toEqual([5, 10, 15]);
    expect(df2.col("d").values).toEqual([6, 11, 16]);
  });

  test("callable can return a Series", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, {
      c: (d) => new Series({ data: [100, 200, 300], index: d.index }),
    });

    expect(df2.col("c").values).toEqual([100, 200, 300]);
  });

  test("replaces an existing column by name", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, { a: [99, 98, 97] });

    expect(df2.col("a").values).toEqual([99, 98, 97]);
    expect(df2.columns.values).toEqual(["a", "b"]); // order unchanged
  });

  test("replacement preserves column order", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, { b: [100, 200, 300] });

    expect(df2.columns.values).toEqual(["a", "b"]);
    expect(df2.col("b").values).toEqual([100, 200, 300]);
  });

  test("empty spec returns an equivalent DataFrame", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, {});

    expect(df2.columns.values).toEqual(df.columns.values);
    expect(df2.shape).toEqual(df.shape);
  });

  test("multiple new columns added in order", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, {
      c: [1, 2, 3],
      d: [4, 5, 6],
      e: [7, 8, 9],
    });

    expect(df2.columns.values).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("shape is correct after assign", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, { c: [1, 2, 3], d: [4, 5, 6] });

    expect(df2.shape).toEqual([3, 4]);
  });

  test("row index is preserved", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, { c: [9, 8, 7] });

    expect(df2.index.values).toEqual(df.index.values);
  });

  test("chain of three callables", () => {
    const df = makeDF();
    const df2 = dataFrameAssign(df, {
      sum: (d) => d.col("a").values.map((v, i) => (v as number) + (d.col("b").values[i] as number)),
      double_sum: (d) => d.col("sum").values.map((v) => (v as number) * 2),
      diff: (d) =>
        d.col("double_sum").values.map(
          (v, i) => (v as number) - (d.col("sum").values[i] as number),
        ),
    });

    // sum: [11, 22, 33], double_sum: [22, 44, 66], diff: [11, 22, 33]
    expect(df2.col("sum").values).toEqual([11, 22, 33]);
    expect(df2.col("double_sum").values).toEqual([22, 44, 66]);
    expect(df2.col("diff").values).toEqual([11, 22, 33]);
  });
});

describe("DataFrame.assign (instance method with callables)", () => {
  test("instance method supports callables", () => {
    const df = makeDF();
    const df2 = df.assign({
      c: (d: DataFrame) => d.col("a").values.map((v) => (v as number) + 100),
    });

    expect(df2.col("c").values).toEqual([101, 102, 103]);
  });

  test("instance method: callable sees previously added columns", () => {
    const df = makeDF();
    const df2 = df.assign({
      x: [0, 1, 2],
      y: (d: DataFrame) => d.col("x").values.map((v) => (v as number) * 10),
    });

    expect(df2.col("y").values).toEqual([0, 10, 20]);
  });

  test("instance method: arrays still work", () => {
    const df = makeDF();
    const df2 = df.assign({ z: [7, 7, 7] });

    expect(df2.col("z").values).toEqual([7, 7, 7]);
  });
});

// ─── AssignSpec type test ─────────────────────────────────────────────────────

describe("AssignSpec type", () => {
  test("spec can hold all three kinds simultaneously", () => {
    const df = makeDF();
    const spec: AssignSpec = {
      arr: [1, 2, 3],
      ser: new Series({ data: [4, 5, 6] }),
      fn: (d) => d.col("a").values,
    };
    const df2 = dataFrameAssign(df, spec);

    expect(df2.columns.values).toContain("arr");
    expect(df2.columns.values).toContain("ser");
    expect(df2.columns.values).toContain("fn");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("dataFrameAssign — property tests", () => {
  test("assigning n new columns increases column count by n", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 10 }),
        (nRows, nNew) => {
          const data: Record<string, readonly number[]> = {
            a: Array.from({ length: nRows }, (_, i) => i),
          };
          const df = DataFrame.fromColumns(data);

          const spec: Record<string, readonly number[]> = {};
          for (let i = 0; i < nNew; i++) {
            spec[`new_${i}`] = Array.from({ length: nRows }, () => 0);
          }

          const df2 = dataFrameAssign(df, spec);
          expect(df2.columns.length).toBe(1 + nNew);
          expect(df2.shape[0]).toBe(nRows);
        },
      ),
    );
  });

  test("replacing all columns keeps shape identical", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        (nRows) => {
          const vals = Array.from({ length: nRows }, (_, i) => i);
          const df = DataFrame.fromColumns({ a: vals, b: vals });
          const df2 = dataFrameAssign(df, {
            a: vals.map((v) => v + 1),
            b: vals.map((v) => v + 2),
          });

          expect(df2.shape).toEqual(df.shape);
          expect(df2.columns.values).toEqual(df.columns.values);
        },
      ),
    );
  });

  test("callable result equals directly computed values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        (arr) => {
          const df = DataFrame.fromColumns({ v: arr });
          const df2 = dataFrameAssign(df, {
            doubled: (d) => d.col("v").values.map((x) => (x as number) * 2),
          });
          const expected = arr.map((x) => x * 2);

          expect(df2.col("doubled").values).toEqual(expected);
        },
      ),
    );
  });

  test("original DataFrame is never mutated", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 8 }),
        (arr) => {
          const df = DataFrame.fromColumns({ x: arr });
          const origColCount = df.columns.length;
          dataFrameAssign(df, { y: arr, z: arr });

          expect(df.columns.length).toBe(origColCount);
        },
      ),
    );
  });
});
