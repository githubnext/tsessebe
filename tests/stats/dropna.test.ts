/**
 * Tests for dropna — standalone missing-value removal.
 *
 * Covers:
 * - Series: basic drop, index/name/dtype preservation, all-null, none-null
 * - DataFrame axis=0 (rows): any, all, thresh, subset
 * - DataFrame axis=1 (cols): any, all, thresh
 * - Edge cases: empty DataFrame, all rows dropped, zero-column result
 * - Property-based: output is always a subset of input
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { Series } from "../../src/core/series.ts";
import { dropna, dropnaDataFrame, dropnaSeries } from "../../src/stats/dropna.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDf(a: (number | null)[], b: (number | null)[]): DataFrame {
  return DataFrame.fromColumns({ a, b });
}

// ─── Series ───────────────────────────────────────────────────────────────────

describe("dropna — Series", () => {
  test("drops null and undefined and NaN", () => {
    const s = new Series({ data: [1, null, undefined, Number.NaN, 5] });
    const result = dropnaSeries(s);
    expect([...result.values]).toEqual([1, 5]);
  });

  test("preserves non-missing values unchanged", () => {
    const s = new Series({ data: [0, "", false, 42] });
    const result = dropnaSeries(s);
    expect([...result.values]).toEqual([0, "", false, 42]);
  });

  test("empty Series stays empty", () => {
    const s = new Series<number>({ data: [] });
    expect(dropnaSeries(s).size).toBe(0);
  });

  test("all null → empty", () => {
    const s = new Series({ data: [null, null, null] });
    expect(dropnaSeries(s).size).toBe(0);
  });

  test("no nulls → same values", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect([...dropnaSeries(s).values]).toEqual([1, 2, 3]);
  });

  test("preserves Series name", () => {
    const s = new Series({ data: [1, null, 3], name: "myCol" });
    expect(dropnaSeries(s).name).toBe("myCol");
  });

  test("unified dropna() dispatches to Series path", () => {
    const s = new Series({ data: [10, null, 30] });
    const r = dropna(s);
    expect([...r.values]).toEqual([10, 30]);
  });
});

// ─── DataFrame axis = 0 (rows) ────────────────────────────────────────────────

describe("dropna — DataFrame rows (axis=0 default)", () => {
  test("drops rows with any null (default how='any')", () => {
    const df = makeDf([1, null, 3], [4, 5, null]);
    const r = dropnaDataFrame(df);
    expect(r.shape).toEqual([1, 2]);
    expect([...(r.col("a").values as number[])]).toEqual([1]);
    expect([...(r.col("b").values as number[])]).toEqual([4]);
  });

  test("how='all' — keeps rows that have at least one non-null value", () => {
    const df = makeDf([1, null, null], [4, null, null]);
    // Row 0: both present — keep. Row 1: both null — drop. Row 2: both null — drop.
    const r = dropnaDataFrame(df, { how: "all" });
    expect(r.shape).toEqual([1, 2]);
  });

  test("how='all' partial null rows are kept", () => {
    const df = makeDf([1, null, 3], [4, 5, null]);
    // All rows have at least one non-null → nothing dropped with how='all'
    const r = dropnaDataFrame(df, { how: "all" });
    expect(r.shape).toEqual([3, 2]);
  });

  test("thresh=2 — keeps rows with ≥ 2 non-null values", () => {
    const df = makeDf([1, null, 3], [4, null, null]);
    // Row 0: 2 non-null — keep. Row 1: 0 non-null — drop. Row 2: 1 non-null — drop.
    const r = dropnaDataFrame(df, { thresh: 2 });
    expect(r.shape).toEqual([1, 2]);
  });

  test("thresh=1 — drops only fully null rows", () => {
    const df = makeDf([1, null, null], [4, 5, null]);
    // Row 0: 2. Row 1: 1. Row 2: 0. thresh=1 keeps rows 0 and 1.
    const r = dropnaDataFrame(df, { thresh: 1 });
    expect(r.shape).toEqual([2, 2]);
  });

  test("subset restricts check to specified columns", () => {
    const df = makeDf([1, null, 3], [4, 5, null]);
    // Only check col "a": row 1 has null in a → drop. Row 2 has null in b (not checked) → keep.
    const r = dropnaDataFrame(df, { subset: ["a"] });
    expect(r.shape).toEqual([2, 2]);
    expect([...(r.col("a").values as (number | null)[])]).toEqual([1, 3]);
  });

  test("subset empty array — no columns checked, nothing dropped", () => {
    const df = makeDf([1, null, 3], [4, 5, null]);
    const r = dropnaDataFrame(df, { subset: [] });
    expect(r.shape).toEqual([3, 2]);
  });

  test("axis='index' same as axis=0", () => {
    const df = makeDf([1, null, 3], [4, 5, null]);
    const r0 = dropnaDataFrame(df, { axis: 0 });
    const ri = dropnaDataFrame(df, { axis: "index" });
    expect(r0.shape).toEqual(ri.shape);
  });

  test("no missing values — returns same shape", () => {
    const df = makeDf([1, 2, 3], [4, 5, 6]);
    expect(dropnaDataFrame(df).shape).toEqual([3, 2]);
  });

  test("all rows dropped → empty DataFrame", () => {
    const df = makeDf([null, null], [null, null]);
    const r = dropnaDataFrame(df);
    expect(r.shape[0]).toBe(0);
    expect(r.shape[1]).toBe(2);
  });

  test("empty DataFrame returns empty", () => {
    const df = DataFrame.fromColumns({ a: [] as number[], b: [] as number[] });
    const r = dropnaDataFrame(df);
    expect(r.shape).toEqual([0, 2]);
  });

  test("unified dropna() dispatches to DataFrame path", () => {
    const df = makeDf([1, null, 3], [4, 5, null]);
    const r = dropna(df);
    expect(r.shape).toEqual([1, 2]);
  });

  test("unified dropna() passes options", () => {
    const df = makeDf([1, null, null], [4, null, null]);
    const r = dropna(df, { how: "all" });
    expect(r.shape).toEqual([1, 2]);
  });
});

// ─── DataFrame axis = 1 (columns) ────────────────────────────────────────────

describe("dropna — DataFrame columns (axis=1)", () => {
  test("drops columns with any null (default how='any')", () => {
    const df = makeDf([1, null, 3], [4, 5, 6]);
    const r = dropnaDataFrame(df, { axis: 1 });
    // col "a" has null → dropped; col "b" has none → kept
    expect(r.shape).toEqual([3, 1]);
    expect(r.columns.toArray()).toEqual(["b"]);
  });

  test("how='all' — only drops columns where all values are null", () => {
    const df = makeDf([null, null, null], [4, null, 6]);
    // col "a": all null → drop. col "b": not all null → keep.
    const r = dropnaDataFrame(df, { axis: 1, how: "all" });
    expect(r.shape).toEqual([3, 1]);
    expect(r.columns.toArray()).toEqual(["b"]);
  });

  test("thresh keeps columns with ≥ N non-null values", () => {
    const df = makeDf([1, null, 3], [null, null, 6]);
    // col "a": 2 non-null. col "b": 1 non-null. thresh=2 keeps only "a".
    const r = dropnaDataFrame(df, { axis: 1, thresh: 2 });
    expect(r.shape).toEqual([3, 1]);
    expect(r.columns.toArray()).toEqual(["a"]);
  });

  test("axis='columns' same as axis=1", () => {
    const df = makeDf([1, null, 3], [4, 5, 6]);
    const r1 = dropnaDataFrame(df, { axis: 1 });
    const rc = dropnaDataFrame(df, { axis: "columns" });
    expect(r1.columns.toArray()).toEqual(rc.columns.toArray());
  });

  test("no missing columns — same shape", () => {
    const df = makeDf([1, 2, 3], [4, 5, 6]);
    expect(dropnaDataFrame(df, { axis: 1 }).shape).toEqual([3, 2]);
  });

  test("all columns dropped → zero columns", () => {
    const df = makeDf([1, null, 3], [4, null, null]);
    const r = dropnaDataFrame(df, { axis: 1 });
    expect(r.shape[1]).toBe(0);
    expect(r.shape[0]).toBe(3);
  });
});

// ─── property-based ───────────────────────────────────────────────────────────

describe("dropna — property-based", () => {
  test("result is always a subset of input (Series)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.double({ noNaN: false }), { nil: null }), {
          minLength: 0,
          maxLength: 50,
        }),
        (data) => {
          const s = new Series({ data: data as (number | null)[] });
          const r = dropnaSeries(s);
          // Every value in result is not null/NaN
          for (const v of r.values) {
            if (typeof v === "number" && Number.isNaN(v as number)) {
              return false;
            }
            if (v === null || v === undefined) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  test("dropna(axis=0) row count ≤ original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.array(fc.option(fc.integer({ min: -100, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        (col1, col2) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as (number | null)[],
            b: col2.slice(0, len) as (number | null)[],
          });
          const r = dropnaDataFrame(df);
          return r.shape[0] <= df.shape[0] && r.shape[1] === df.shape[1];
        },
      ),
    );
  });

  test("dropna(how='any') result has no nulls in any cell", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.array(fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        (col1, col2) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as (number | null)[],
            b: col2.slice(0, len) as (number | null)[],
          });
          const r = dropnaDataFrame(df, { how: "any" });
          for (const col of r.columns.toArray() as string[]) {
            for (const v of r.col(col).values) {
              if (v === null || v === undefined) {
                return false;
              }
            }
          }
          return true;
        },
      ),
    );
  });

  test("thresh=nCols ⟺ how='any' for integer columns", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.array(fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }), {
          minLength: 0,
          maxLength: 20,
        }),
        (col1, col2) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len) as (number | null)[],
            b: col2.slice(0, len) as (number | null)[],
          });
          const rAny = dropnaDataFrame(df, { how: "any" });
          const rThresh = dropnaDataFrame(df, { thresh: 2 });
          return rAny.shape[0] === rThresh.shape[0];
        },
      ),
    );
  });
});
