/**
 * Tests for src/stats/select_dtypes.ts
 *
 * Covers: selectDtypes with include/exclude, generic aliases,
 * concrete dtype names, overlap validation, property-based tests.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import type { Index } from "../../src/core/base-index.ts";
import { Dtype } from "../../src/core/dtype.ts";
import { RangeIndex } from "../../src/core/range-index.ts";
import { DataFrame, Series } from "../../src/index.ts";
import type { Label, Scalar } from "../../src/index.ts";
import { selectDtypes } from "../../src/stats/select_dtypes.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a DataFrame from a map of name → Series (preserves custom dtypes). */
function dfFromSeries(cols: Record<string, Series<Scalar>>): DataFrame {
  const colMap = new Map<string, Series<Scalar>>(Object.entries(cols));
  const firstSeries = colMap.values().next().value;
  const len = firstSeries ? firstSeries.size : 0;
  return new DataFrame(colMap, new RangeIndex(len) as unknown as Index<Label>);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a mixed-type DataFrame for testing. */
function buildMixedDf(): DataFrame {
  return DataFrame.fromColumns({
    int_col: [1, 2, 3],
    float_col: [1.1, 2.2, 3.3],
    bool_col: [true, false, true],
    str_col: ["a", "b", "c"],
  });
}

// ─── include ──────────────────────────────────────────────────────────────────

describe("selectDtypes — include", () => {
  it('include "number" keeps int and float columns', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "number" });
    expect(result.columns.toArray()).toEqual(["int_col", "float_col"]);
  });

  it('include "integer" keeps int columns only', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "integer" });
    expect(result.columns.toArray()).toEqual(["int_col"]);
  });

  it('include "floating" keeps float columns only', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "floating" });
    expect(result.columns.toArray()).toEqual(["float_col"]);
  });

  it('include "bool" keeps bool columns only', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "bool" });
    expect(result.columns.toArray()).toEqual(["bool_col"]);
  });

  it('include "string" keeps string columns only', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "string" });
    expect(result.columns.toArray()).toEqual(["str_col"]);
  });

  it("include with array of selectors keeps union", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: ["bool", "string"] });
    expect(result.columns.toArray()).toEqual(["bool_col", "str_col"]);
  });

  it("include concrete dtype name 'int64'", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "int64" });
    expect(result.columns.toArray()).toEqual(["int_col"]);
  });

  it("include concrete dtype name 'float64'", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "float64" });
    expect(result.columns.toArray()).toEqual(["float_col"]);
  });

  it("include with no matching columns returns empty DataFrame", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "datetime" });
    expect(result.columns.toArray()).toEqual([]);
    expect(result.shape[0]).toBe(3);
    expect(result.shape[1]).toBe(0);
  });

  it("include all dtypes returns full DataFrame", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: ["number", "bool", "string"] });
    expect(result.columns.toArray()).toEqual(df.columns.toArray());
  });
});

// ─── exclude ──────────────────────────────────────────────────────────────────

describe("selectDtypes — exclude", () => {
  it('exclude "number" drops int and float columns', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { exclude: "number" });
    expect(result.columns.toArray()).toEqual(["bool_col", "str_col"]);
  });

  it('exclude "bool" drops bool columns', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { exclude: "bool" });
    expect(result.columns.toArray()).toEqual(["int_col", "float_col", "str_col"]);
  });

  it('exclude "string" drops string columns', () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { exclude: "string" });
    expect(result.columns.toArray()).toEqual(["int_col", "float_col", "bool_col"]);
  });

  it("exclude concrete dtype name 'float64'", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { exclude: "float64" });
    expect(result.columns.toArray()).toEqual(["int_col", "bool_col", "str_col"]);
  });

  it("exclude with array of selectors", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { exclude: ["bool", "string"] });
    expect(result.columns.toArray()).toEqual(["int_col", "float_col"]);
  });
});

// ─── include + exclude combined ───────────────────────────────────────────────

describe("selectDtypes — include + exclude combined", () => {
  it("include number but exclude float64 keeps only int columns", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "number", exclude: "floating" });
    expect(result.columns.toArray()).toEqual(["int_col"]);
  });

  it("include integer + float but exclude int64", () => {
    const df = dfFromSeries({
      i8: new Series({ data: [1, 2], dtype: Dtype.from("int8") }),
      i64: new Series({ data: [10, 20], dtype: Dtype.int64 }),
      f64: new Series({ data: [1.5, 2.5], dtype: Dtype.float64 }),
    });
    const result = selectDtypes(df, { include: ["integer", "floating"], exclude: "int64" });
    expect(result.columns.toArray()).toEqual(["i8", "f64"]);
  });
});

// ─── signed / unsigned integer aliases ───────────────────────────────────────

describe("selectDtypes — signed/unsigned integer aliases", () => {
  it('"signed integer" keeps int kinds only', () => {
    const df = dfFromSeries({
      s8: new Series({ data: [1], dtype: Dtype.from("int8") }),
      u8: new Series({ data: [1], dtype: Dtype.from("uint8") }),
      f: new Series({ data: [1.5], dtype: Dtype.float64 }),
    });
    const result = selectDtypes(df, { include: "signed integer" });
    expect(result.columns.toArray()).toEqual(["s8"]);
  });

  it('"unsigned integer" keeps uint kinds only', () => {
    const df = dfFromSeries({
      s8: new Series({ data: [1], dtype: Dtype.from("int8") }),
      u8: new Series({ data: [1], dtype: Dtype.from("uint8") }),
      f: new Series({ data: [1.5], dtype: Dtype.float64 }),
    });
    const result = selectDtypes(df, { include: "unsigned integer" });
    expect(result.columns.toArray()).toEqual(["u8"]);
  });
});

// ─── error cases ─────────────────────────────────────────────────────────────

describe("selectDtypes — validation errors", () => {
  it("throws when neither include nor exclude is provided", () => {
    const df = buildMixedDf();
    expect(() => selectDtypes(df, {})).toThrow(/at least one/);
  });

  it("throws when same selector is in both include and exclude", () => {
    const df = buildMixedDf();
    expect(() => selectDtypes(df, { include: "number", exclude: "number" })).toThrow(
      /include and exclude/,
    );
  });

  it("throws when same concrete name is in both", () => {
    const df = buildMixedDf();
    expect(() => selectDtypes(df, { include: "int64", exclude: "int64" })).toThrow(
      /include and exclude/,
    );
  });
});

// ─── preserves row data ───────────────────────────────────────────────────────

describe("selectDtypes — row data integrity", () => {
  it("selected columns retain their values", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "number" });
    expect(result.col("int_col").values).toEqual([1, 2, 3]);
    expect(result.col("float_col").values).toEqual([1.1, 2.2, 3.3]);
  });

  it("row count is preserved", () => {
    const df = buildMixedDf();
    const result = selectDtypes(df, { include: "string" });
    expect(result.shape[0]).toBe(3);
  });
});

// ─── datetime / timedelta / object / category ─────────────────────────────────

describe("selectDtypes — datetime/timedelta/object/category", () => {
  it('include "datetime" keeps datetime columns', () => {
    const df = dfFromSeries({
      dt: new Series({ data: [new Date(2020, 0, 1)], dtype: Dtype.datetime }),
      n: new Series({ data: [1], dtype: Dtype.int64 }),
    });
    const result = selectDtypes(df, { include: "datetime" });
    expect(result.columns.toArray()).toEqual(["dt"]);
  });

  it('include "object" keeps object columns', () => {
    const df = dfFromSeries({
      obj: new Series({ data: [{ x: 1 } as unknown as Scalar], dtype: Dtype.object }),
      n: new Series({ data: [1], dtype: Dtype.int64 }),
    });
    const result = selectDtypes(df, { include: "object" });
    expect(result.columns.toArray()).toEqual(["obj"]);
  });

  it('include "category" keeps category columns', () => {
    const df = dfFromSeries({
      cat: new Series({ data: ["a", "b"], dtype: Dtype.from("category") }),
      n: new Series({ data: [1, 2], dtype: Dtype.int64 }),
    });
    const result = selectDtypes(df, { include: "category" });
    expect(result.columns.toArray()).toEqual(["cat"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("selectDtypes — properties", () => {
  it("result columns are a subset of source columns", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 0, maxLength: 4 }), { minLength: 1, maxLength: 10 }),
        (ints, floats, strs) => {
          const len = Math.min(ints.length, floats.length, strs.length);
          const df = DataFrame.fromColumns({
            i: ints.slice(0, len),
            f: floats.slice(0, len),
            s: strs.slice(0, len),
          });
          const result = selectDtypes(df, { include: "number" });
          const resultCols = new Set(result.columns.toArray());
          const srcCols = new Set(df.columns.toArray());
          for (const c of resultCols) {
            expect(srcCols.has(c)).toBe(true);
          }
        },
      ),
    );
  });

  it("result column count + excluded column count = source column count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.double({ min: 0.1, max: 1, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (ints, floats) => {
          const len = Math.min(ints.length, floats.length);
          const df = DataFrame.fromColumns({
            i: ints.slice(0, len),
            f: floats.slice(0, len),
          });
          const included = selectDtypes(df, { include: "integer" });
          const excluded = selectDtypes(df, { exclude: "integer" });
          expect(included.shape[1] + excluded.shape[1]).toBe(df.shape[1]);
        },
      ),
    );
  });

  it("include X ∪ exclude X covers all columns exactly once", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 4 }), { minLength: 1, maxLength: 5 }),
        (ints, strs) => {
          const len = Math.min(ints.length, strs.length);
          const df = DataFrame.fromColumns({
            i: ints.slice(0, len),
            s: strs.slice(0, len),
          });
          const inc = selectDtypes(df, { include: "integer" }).columns.toArray();
          const exc = selectDtypes(df, { exclude: "integer" }).columns.toArray();
          const union = new Set([...inc, ...exc]);
          expect(union.size).toBe(df.shape[1]);
        },
      ),
    );
  });
});
