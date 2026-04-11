/**
 * Tests for src/stats/reduce_ops.ts — nunique, any, all.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  allDataFrame,
  allSeries,
  anyDataFrame,
  anySeries,
  nunique,
  nuniqueSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDf(): DataFrame {
  return DataFrame.fromColumns({
    a: [1, 2, 2, null],
    b: [true, false, true, true],
    c: ["x", "y", "x", "z"],
  });
}

// ─── nuniqueSeries ────────────────────────────────────────────────────────────

describe("nuniqueSeries", () => {
  it("counts distinct non-null values by default", () => {
    const s = new Series<Scalar>({ data: [1, 2, 2, null] });
    expect(nuniqueSeries(s)).toBe(2);
  });

  it("includes null when dropna=false", () => {
    const s = new Series<Scalar>({ data: [1, 2, 2, null] });
    expect(nuniqueSeries(s, { dropna: false })).toBe(3);
  });

  it("returns 0 for empty series", () => {
    const s = new Series<Scalar>({ data: [] });
    expect(nuniqueSeries(s)).toBe(0);
  });

  it("counts 1 for all-same series", () => {
    const s = new Series<Scalar>({ data: [3, 3, 3] });
    expect(nuniqueSeries(s)).toBe(1);
  });

  it("treats NaN as missing by default", () => {
    const s = new Series<Scalar>({ data: [1, Number.NaN, 1] });
    expect(nuniqueSeries(s)).toBe(1);
  });

  it("includes NaN when dropna=false", () => {
    const s = new Series<Scalar>({ data: [1, Number.NaN, 1] });
    expect(nuniqueSeries(s, { dropna: false })).toBe(2);
  });
});

// ─── nunique DataFrame ────────────────────────────────────────────────────────

describe("nunique — DataFrame axis=0 (default)", () => {
  it("counts distinct per column", () => {
    const df = makeDf();
    const result = nunique(df);
    expect(result.values[0]).toBe(2); // a: 1,2 (null dropped)
    expect(result.values[1]).toBe(2); // b: true, false
    expect(result.values[2]).toBe(3); // c: x,y,z
  });

  it("result is indexed by column names", () => {
    const df = makeDf();
    const result = nunique(df);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  it("includes null when dropna=false", () => {
    const df = makeDf();
    const result = nunique(df, { dropna: false });
    expect(result.values[0]).toBe(3); // a: 1,2,null
  });
});

describe("nunique — DataFrame axis=1", () => {
  it("counts distinct per row", () => {
    const df = DataFrame.fromColumns({ a: [1, 1], b: [1, 2] });
    const result = nunique(df, { axis: 1 });
    expect(result.values[0]).toBe(1); // row 0: 1,1 → 1 unique
    expect(result.values[1]).toBe(2); // row 1: 1,2 → 2 unique
  });

  it("result is indexed by row index", () => {
    const df = makeDf();
    const result = nunique(df, { axis: "columns" });
    expect(result.index.size).toBe(df.index.size);
  });
});

// ─── anySeries ────────────────────────────────────────────────────────────────

describe("anySeries", () => {
  it("returns true when any element is truthy", () => {
    const s = new Series<Scalar>({ data: [0, 0, 1] });
    expect(anySeries(s)).toBe(true);
  });

  it("returns false when all elements are falsy", () => {
    const s = new Series<Scalar>({ data: [0, 0, 0] });
    expect(anySeries(s)).toBe(false);
  });

  it("returns false for empty series", () => {
    const s = new Series<Scalar>({ data: [] });
    expect(anySeries(s)).toBe(false);
  });

  it("skips null by default (skipna=true)", () => {
    const s = new Series<Scalar>({ data: [null, null] });
    expect(anySeries(s)).toBe(false);
  });

  it("treats null as falsy when skipna=false", () => {
    const s = new Series<Scalar>({ data: [null] });
    expect(anySeries(s, { skipna: false })).toBe(false);
  });

  it("returns true for boolean true", () => {
    const s = new Series<Scalar>({ data: [false, true] });
    expect(anySeries(s)).toBe(true);
  });
});

// ─── anyDataFrame ─────────────────────────────────────────────────────────────

describe("anyDataFrame — axis=0 (default)", () => {
  it("returns true for columns with any truthy value", () => {
    const df = DataFrame.fromColumns({ a: [0, 0, 1], b: [0, 0, 0] });
    const result = anyDataFrame(df);
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(false);
  });

  it("result indexed by column names", () => {
    const df = makeDf();
    const result = anyDataFrame(df);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  it("boolOnly skips non-boolean columns", () => {
    const df = makeDf();
    const result = anyDataFrame(df, { boolOnly: true });
    expect([...result.index.values]).toEqual(["b"]);
  });
});

describe("anyDataFrame — axis=1", () => {
  it("returns true for rows with any truthy value", () => {
    const df = DataFrame.fromColumns({ a: [0, 1], b: [0, 0] });
    const result = anyDataFrame(df, { axis: 1 });
    expect(result.values[0]).toBe(false);
    expect(result.values[1]).toBe(true);
  });
});

// ─── allSeries ────────────────────────────────────────────────────────────────

describe("allSeries", () => {
  it("returns true when all elements are truthy", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3] });
    expect(allSeries(s)).toBe(true);
  });

  it("returns false when any element is falsy", () => {
    const s = new Series<Scalar>({ data: [1, 0, 3] });
    expect(allSeries(s)).toBe(false);
  });

  it("returns true for empty series", () => {
    const s = new Series<Scalar>({ data: [] });
    expect(allSeries(s)).toBe(true);
  });

  it("skips null by default", () => {
    const s = new Series<Scalar>({ data: [1, null, 2] });
    expect(allSeries(s)).toBe(true);
  });

  it("treats null as falsy when skipna=false", () => {
    const s = new Series<Scalar>({ data: [1, null, 2] });
    expect(allSeries(s, { skipna: false })).toBe(false);
  });
});

// ─── allDataFrame ─────────────────────────────────────────────────────────────

describe("allDataFrame — axis=0 (default)", () => {
  it("returns per-column all", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [0, 1, 1] });
    const result = allDataFrame(df);
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(false);
  });

  it("result indexed by column names", () => {
    const df = makeDf();
    const result = allDataFrame(df);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  it("boolOnly skips non-boolean columns", () => {
    const df = makeDf();
    const result = allDataFrame(df, { boolOnly: true });
    expect([...result.index.values]).toEqual(["b"]);
  });
});

describe("allDataFrame — axis=1", () => {
  it("returns per-row all", () => {
    const df = DataFrame.fromColumns({ a: [1, 0], b: [1, 1] });
    const result = allDataFrame(df, { axis: 1 });
    expect(result.values[0]).toBe(true);
    expect(result.values[1]).toBe(false);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("nuniqueSeries — property tests", () => {
  it("result is always between 0 and length", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer(), fc.constant(null))), (arr) => {
        const s = new Series<Scalar>({ data: arr as Scalar[] });
        const u = nuniqueSeries(s);
        return u >= 0 && u <= arr.length;
      }),
    );
  });

  it("nunique with dropna=false >= dropna=true", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer(), fc.constant(null))), (arr) => {
        const s = new Series<Scalar>({ data: arr as Scalar[] });
        return nuniqueSeries(s, { dropna: false }) >= nuniqueSeries(s, { dropna: true });
      }),
    );
  });
});

describe("anySeries — property tests", () => {
  it("any(s) === !all(!s) for boolean arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean()), (arr) => {
        const s = new Series<Scalar>({ data: arr as Scalar[] });
        const negated = new Series<Scalar>({ data: arr.map((v) => !v) as Scalar[] });
        return anySeries(s) === !allSeries(negated);
      }),
    );
  });
});

describe("allSeries — property tests", () => {
  it("all true array → allSeries returns true", () => {
    fc.assert(
      fc.property(fc.array(fc.constant(true)), (arr) => {
        const s = new Series<Scalar>({ data: arr as Scalar[] });
        return allSeries(s) === true;
      }),
    );
  });

  it("array with any false → allSeries returns false", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean()).filter((arr) => arr.includes(false)),
        (arr) => {
          const s = new Series<Scalar>({ data: arr as Scalar[] });
          return allSeries(s) === false;
        },
      ),
    );
  });
});
