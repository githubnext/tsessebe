/**
 * Tests for src/core/pipe_apply.ts
 *
 * Covers:
 * - pipe: identity (no fns) returns value unchanged
 * - pipe: single function transforms value
 * - pipe: two functions applied left-to-right
 * - pipe: three functions applied left-to-right
 * - pipe: four functions applied left-to-right
 * - pipe: works with number, string, boolean, object, Series, DataFrame
 * - pipe: fn receives output of prior fn (composition)
 * - seriesApply: maps fn over every element
 * - seriesApply: fn receives (value, label, position)
 * - seriesApply: preserves index labels
 * - seriesApply: preserves series name
 * - seriesApply: handles null values (passed through)
 * - seriesApply: empty series returns empty series
 * - seriesTransform: maps scalar fn over every element
 * - seriesTransform: fn only receives value (no label/pos)
 * - seriesTransform: preserves name and index
 * - seriesTransform: empty series returns empty series
 * - dataFrameApply axis=0: applies fn to each column, indexed by column names
 * - dataFrameApply axis=0: fn receives column Series and column name
 * - dataFrameApply axis=1: applies fn to each row, indexed by row labels
 * - dataFrameApply axis=1: row Series has column names as index
 * - dataFrameApply: default axis is 0
 * - dataFrameApply: empty DataFrame (no rows) returns empty result
 * - dataFrameApplyMap: applies fn to every cell
 * - dataFrameApplyMap: fn receives (value, rowLabel, colName)
 * - dataFrameApplyMap: output has same shape
 * - dataFrameApplyMap: output has same index and columns
 * - dataFrameApplyMap: does not mutate input
 * - dataFrameTransform: replaces each column with fn(col)
 * - dataFrameTransform: fn receives (col, colName)
 * - dataFrameTransform: output has same index and columns
 * - dataFrameTransform: throws RangeError when fn returns wrong length
 * - dataFrameTransformRows: applies fn to each row record
 * - dataFrameTransformRows: fn receives (row, rowLabel, position)
 * - dataFrameTransformRows: partial row updates merge correctly
 * - dataFrameTransformRows: output has same shape
 * - Property: pipe(v, f, g) === g(f(v))
 * - Property: seriesApply with identity fn produces identical values
 * - Property: seriesTransform with identity fn produces identical values
 * - Property: dataFrameApplyMap with identity fn produces identical df
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series } from "../../src/core/index.ts";
import {
  dataFrameApply,
  dataFrameApplyMap,
  dataFrameTransform,
  dataFrameTransformRows,
  pipe,
  seriesApply,
  seriesTransform,
} from "../../src/core/pipe_apply.ts";
import type { Label, Scalar } from "../../src/types.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSeries(data: Scalar[], labels?: Label[], name?: string): Series<Scalar> {
  return new Series({ data, ...(labels ? { index: labels } : {}), ...(name ? { name } : {}) });
}

function makeDF(obj: Record<string, Scalar[]>, rowLabels?: Label[]): DataFrame {
  return DataFrame.fromColumns(obj, rowLabels ? { index: rowLabels } : undefined);
}

// ─── pipe ───────────────────────────────────────────────────────────────────

describe("pipe", () => {
  test("identity — no fns returns value unchanged", () => {
    expect(pipe(42)).toBe(42);
    expect(pipe("hello")).toBe("hello");
    expect(pipe(null)).toBe(null);
  });

  test("single fn transforms value", () => {
    expect(pipe(3, (x: number) => x * 2)).toBe(6);
    expect(pipe("hi", (s: string) => s.toUpperCase())).toBe("HI");
  });

  test("two fns applied left-to-right", () => {
    const result = pipe(
      1,
      (x: number) => x + 10,
      (x: number) => x * 3,
    );
    expect(result).toBe(33); // (1+10)*3
  });

  test("three fns applied left-to-right", () => {
    const result = pipe(
      2,
      (x: number) => x + 1,
      (x: number) => x * x,
      (x: number) => x - 1,
    );
    expect(result).toBe(8); // (2+1)^2 - 1
  });

  test("four fns applied left-to-right", () => {
    const result = pipe(
      0,
      (x: number) => x + 1,
      (x: number) => x * 2,
      (x: number) => x + 3,
      (x: number) => x.toString(),
    );
    expect(result).toBe("5"); // (0+1)*2+3 = 5
  });

  test("works with Series", () => {
    const s = makeSeries([1, 2, 3]);
    const result = pipe(s, (s2: Series<Scalar>) => s2.sum());
    expect(result).toBe(6);
  });

  test("works with DataFrame", () => {
    const df = makeDF({ a: [1, 2], b: [3, 4] });
    const result = pipe(df, (d: DataFrame) => d.sum());
    expect(result.at("a")).toBe(3);
    expect(result.at("b")).toBe(7);
  });

  test("fn receives output of prior fn (composition)", () => {
    const calls: string[] = [];
    pipe(
      10,
      (x: number) => {
        calls.push(`fn1:${x}`);
        return x + 1;
      },
      (x: number) => {
        calls.push(`fn2:${x}`);
        return x * 2;
      },
    );
    expect(calls).toEqual(["fn1:10", "fn2:11"]);
  });
});

// ─── seriesApply ─────────────────────────────────────────────────────────────

describe("seriesApply", () => {
  test("maps fn over every element", () => {
    const s = makeSeries([1, 2, 3]);
    const out = seriesApply(s, (v) => (v as number) * 2);
    expect(out.values).toEqual([2, 4, 6]);
  });

  test("fn receives (value, label, position)", () => {
    const s = makeSeries([10, 20, 30], ["a", "b", "c"]);
    const labels: Label[] = [];
    const positions: number[] = [];
    const vals: Scalar[] = [];
    seriesApply(s, (v, lbl, pos) => {
      vals.push(v);
      labels.push(lbl);
      positions.push(pos);
      return v;
    });
    expect(vals).toEqual([10, 20, 30]);
    expect(labels).toEqual(["a", "b", "c"]);
    expect(positions).toEqual([0, 1, 2]);
  });

  test("preserves index labels", () => {
    const s = makeSeries([1, 2], ["x", "y"]);
    const out = seriesApply(s, (v) => v);
    expect(out.index.values).toEqual(["x", "y"]);
  });

  test("preserves series name", () => {
    const s = makeSeries([1, 2], undefined, "myCol");
    const out = seriesApply(s, (v) => v);
    expect(out.name).toBe("myCol");
  });

  test("null values are passed to fn", () => {
    const s = makeSeries([1, null, 3]);
    const out = seriesApply(s, (v) => (v === null ? 0 : (v as number) + 1));
    expect(out.values).toEqual([2, 0, 4]);
  });

  test("empty series returns empty series", () => {
    const s = makeSeries([]);
    const out = seriesApply(s, (v) => v);
    expect(out.size).toBe(0);
  });
});

// ─── seriesTransform ─────────────────────────────────────────────────────────

describe("seriesTransform", () => {
  test("maps scalar fn over every element", () => {
    const s = makeSeries([1, 2, 3]);
    const out = seriesTransform(s, (v) => (v as number) ** 2);
    expect(out.values).toEqual([1, 4, 9]);
  });

  test("preserves index and name", () => {
    const s = makeSeries([5, 6], ["p", "q"], "z");
    const out = seriesTransform(s, (v) => v);
    expect(out.index.values).toEqual(["p", "q"]);
    expect(out.name).toBe("z");
  });

  test("empty series returns empty series", () => {
    const s = makeSeries([]);
    const out = seriesTransform(s, (v) => v);
    expect(out.size).toBe(0);
  });

  test("fn only receives value (no label/pos)", () => {
    const callCount = { n: 0 };
    const s = makeSeries([1, 2]);
    seriesTransform(s, (v) => {
      callCount.n++;
      return v;
    });
    expect(callCount.n).toBe(2);
  });
});

// ─── dataFrameApply ──────────────────────────────────────────────────────────

describe("dataFrameApply", () => {
  const df = makeDF({ a: [1, 2, 3], b: [10, 20, 30] });

  test("axis=0: fn applied to each column, indexed by column names", () => {
    const out = dataFrameApply(df, (s) => s.sum());
    expect(out.at("a")).toBe(6);
    expect(out.at("b")).toBe(60);
    expect(out.index.values).toEqual(["a", "b"]);
  });

  test("axis=0: fn receives column Series and column name", () => {
    const received: string[] = [];
    dataFrameApply(df, (_s, name) => {
      received.push(name as string);
      return 0;
    });
    expect(received).toEqual(["a", "b"]);
  });

  test("default axis is 0", () => {
    const out1 = dataFrameApply(df, (s) => s.mean());
    const out2 = dataFrameApply(df, (s) => s.mean(), 0);
    expect(out1.values).toEqual(out2.values);
  });

  test("axis=1: fn applied to each row, indexed by row labels", () => {
    const out = dataFrameApply(df, (s) => s.sum(), 1);
    expect(out.values).toEqual([11, 22, 33]);
    expect(out.index.values).toEqual([0, 1, 2]);
  });

  test("axis=1: row Series has column names as index", () => {
    const colNames: string[][] = [];
    dataFrameApply(
      df,
      (s) => {
        colNames.push([...s.index.values] as string[]);
        return 0;
      },
      1,
    );
    expect(colNames[0]).toEqual(["a", "b"]);
    expect(colNames[1]).toEqual(["a", "b"]);
  });

  test("axis=1: fn receives row label as second arg", () => {
    const dfLabeled = makeDF({ x: [1, 2] }, ["row0", "row1"]);
    const labels: Label[] = [];
    dataFrameApply(
      dfLabeled,
      (_s, lbl) => {
        labels.push(lbl);
        return 0;
      },
      1,
    );
    expect(labels).toEqual(["row0", "row1"]);
  });

  test("empty DataFrame (no rows) returns empty result", () => {
    const dfEmpty = makeDF({ a: [], b: [] });
    const out = dataFrameApply(dfEmpty, (s) => s.sum(), 1);
    expect(out.size).toBe(0);
  });
});

// ─── dataFrameApplyMap ───────────────────────────────────────────────────────

describe("dataFrameApplyMap", () => {
  const df = makeDF({ x: [1, 2], y: [3, 4] }, ["r0", "r1"]);

  test("applies fn to every cell", () => {
    const out = dataFrameApplyMap(df, (v) => (v as number) * 10);
    expect(out.col("x").values).toEqual([10, 20]);
    expect(out.col("y").values).toEqual([30, 40]);
  });

  test("fn receives (value, rowLabel, colName)", () => {
    const calls: [Scalar, Label, string][] = [];
    dataFrameApplyMap(df, (v, row, col) => {
      calls.push([v, row, col]);
      return v;
    });
    expect(calls).toEqual([
      [1, "r0", "x"],
      [2, "r1", "x"],
      [3, "r0", "y"],
      [4, "r1", "y"],
    ]);
  });

  test("output has same shape", () => {
    const out = dataFrameApplyMap(df, (v) => v);
    expect(out.shape).toEqual(df.shape);
  });

  test("output has same index and columns", () => {
    const out = dataFrameApplyMap(df, (v) => v);
    expect(out.index.values).toEqual(df.index.values);
    expect(out.columns.values).toEqual(df.columns.values);
  });

  test("does not mutate input", () => {
    const before = df.col("x").values.slice();
    dataFrameApplyMap(df, () => 999);
    expect(df.col("x").values).toEqual(before);
  });
});

// ─── dataFrameTransform ──────────────────────────────────────────────────────

describe("dataFrameTransform", () => {
  const df = makeDF({ a: [1, 2, 3], b: [4, 5, 6] });

  test("replaces each column with fn(col)", () => {
    const out = dataFrameTransform(df, (col) => seriesTransform(col, (v) => -(v as number)));
    expect(out.col("a").values).toEqual([-1, -2, -3]);
    expect(out.col("b").values).toEqual([-4, -5, -6]);
  });

  test("fn receives (col, colName)", () => {
    const names: string[] = [];
    dataFrameTransform(df, (col, name) => {
      names.push(name);
      return col;
    });
    expect(names).toEqual(["a", "b"]);
  });

  test("output has same index and columns", () => {
    const out = dataFrameTransform(df, (col) => col);
    expect(out.index.values).toEqual(df.index.values);
    expect(out.columns.values).toEqual(df.columns.values);
  });

  test("throws RangeError when fn returns wrong length", () => {
    expect(() => dataFrameTransform(df, (_col) => makeSeries([1]))).toThrow(RangeError);
  });
});

// ─── dataFrameTransformRows ──────────────────────────────────────────────────

describe("dataFrameTransformRows", () => {
  const df = makeDF({ a: [1, 2, 3], b: [10, 20, 30] });

  test("applies fn to each row record", () => {
    const out = dataFrameTransformRows(df, (row) => ({
      a: (row["a"] as number) + 100,
      b: row["b"],
    }));
    expect(out.col("a").values).toEqual([101, 102, 103]);
    expect(out.col("b").values).toEqual([10, 20, 30]);
  });

  test("fn receives (row, rowLabel, position)", () => {
    const labels: Label[] = [];
    const positions: number[] = [];
    const dfL = makeDF({ a: [1, 2] }, ["r0", "r1"]);
    dataFrameTransformRows(dfL, (row, lbl, pos) => {
      labels.push(lbl);
      positions.push(pos);
      return row;
    });
    expect(labels).toEqual(["r0", "r1"]);
    expect(positions).toEqual([0, 1]);
  });

  test("partial row update merges correctly (unspecified keys keep original)", () => {
    const out = dataFrameTransformRows(df, (_row) => ({ a: 999 }));
    // 'b' not returned by fn → keeps original
    expect(out.col("a").values).toEqual([999, 999, 999]);
    expect(out.col("b").values).toEqual([10, 20, 30]);
  });

  test("output has same shape", () => {
    const out = dataFrameTransformRows(df, (row) => row);
    expect(out.shape).toEqual(df.shape);
  });

  test("output preserves index", () => {
    const dfL = makeDF({ a: [1, 2] }, ["p", "q"]);
    const out = dataFrameTransformRows(dfL, (row) => row);
    expect(out.index.values).toEqual(["p", "q"]);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("pipe — property tests", () => {
  test("pipe(v, f, g) === g(f(v)) for number inputs", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true }), (n) => {
        const f = (x: number) => x * 2;
        const g = (x: number) => x + 1;
        expect(pipe(n, f, g)).toBe(g(f(n)));
      }),
    );
  });
});

describe("seriesApply — property tests", () => {
  test("identity fn produces identical values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.constant(null)), { minLength: 0, maxLength: 20 }),
        (data) => {
          const s = makeSeries(data as Scalar[]);
          const out = seriesApply(s, (v) => v);
          expect([...out.values]).toEqual([...s.values]);
        },
      ),
    );
  });
});

describe("seriesTransform — property tests", () => {
  test("identity fn produces identical values", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 0, maxLength: 20 }), (data) => {
        const s = makeSeries(data as Scalar[]);
        const out = seriesTransform(s, (v) => v);
        expect([...out.values]).toEqual([...s.values]);
      }),
    );
  });
});

describe("dataFrameApplyMap — property tests", () => {
  test("identity fn produces equal DataFrame values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 6 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 6 }),
        (col1, col2) => {
          const n = Math.min(col1.length, col2.length);
          const df = makeDF({ a: col1.slice(0, n), b: col2.slice(0, n) });
          const out = dataFrameApplyMap(df, (v) => v);
          expect([...out.col("a").values]).toEqual([...df.col("a").values]);
          expect([...out.col("b").values]).toEqual([...df.col("b").values]);
        },
      ),
    );
  });
});
