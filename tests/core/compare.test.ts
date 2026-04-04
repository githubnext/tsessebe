/**
 * Tests for src/core/compare.ts — element-wise comparison and boolean ops.
 */
import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  allDataFrame,
  allSeries,
  anyDataFrame,
  anySeries,
  compareDataFrame,
  eqDataFrame,
  eqSeries,
  geDataFrame,
  geSeries,
  gtDataFrame,
  gtSeries,
  leDataFrame,
  leSeries,
  logicalAndSeries,
  logicalNotSeries,
  logicalOrSeries,
  logicalXorSeries,
  ltDataFrame,
  ltSeries,
  neDataFrame,
  neSeries,
} from "../../src/index.ts";

// ─── Series comparisons ───────────────────────────────────────────────────────

describe("compareSeries — vs scalar", () => {
  const s = new Series({ data: [1, 2, 3, null] });

  test("eq", () => {
    expect(eqSeries(s, 2).values).toEqual([false, true, false, false]);
  });

  test("ne", () => {
    expect(neSeries(s, 2).values).toEqual([true, false, true, true]);
  });

  test("lt", () => {
    expect(ltSeries(s, 2).values).toEqual([true, false, false, false]);
  });

  test("gt", () => {
    expect(gtSeries(s, 2).values).toEqual([false, false, true, false]);
  });

  test("le", () => {
    expect(leSeries(s, 2).values).toEqual([true, true, false, false]);
  });

  test("ge", () => {
    expect(geSeries(s, 2).values).toEqual([false, true, true, false]);
  });

  test("null vs scalar: all ops return false except ne", () => {
    const ns = new Series({ data: [null] });
    expect(eqSeries(ns, 1).values[0]).toBe(false);
    expect(neSeries(ns, 1).values[0]).toBe(true);
    expect(ltSeries(ns, 1).values[0]).toBe(false);
    expect(gtSeries(ns, 1).values[0]).toBe(false);
    expect(leSeries(ns, 1).values[0]).toBe(false);
    expect(geSeries(ns, 1).values[0]).toBe(false);
  });

  test("returns boolean dtype", () => {
    expect(eqSeries(s, 2).dtype.name).toBe("bool");
  });

  test("string equality", () => {
    const ss = new Series({ data: ["a", "b", "c"] });
    expect(eqSeries(ss, "b").values).toEqual([false, true, false]);
  });
});

describe("compareSeries — vs Series (with alignment)", () => {
  test("same index", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [3, 2, 1] });
    expect(ltSeries(a, b).values).toEqual([true, false, false]);
    expect(gtSeries(a, b).values).toEqual([false, false, true]);
    expect(eqSeries(a, b).values).toEqual([false, true, false]);
  });

  test("alignment: outer join fills with null — null != null returns true for ne", () => {
    const a = new Series({ data: [1, 2], index: ["x", "y"] });
    const b = new Series({ data: [1, 3], index: ["x", "z"] });
    const result = eqSeries(a, b);
    // aligned on ["x","y","z"]: a=[1,2,null], b=[1,null,3]
    expect(result.index.values).toEqual(["x", "y", "z"]);
    expect(result.values).toEqual([true, false, false]); // null comparisons → false
  });

  test("alignment: ne returns true for null slots", () => {
    const a = new Series({ data: [1], index: ["x"] });
    const b = new Series({ data: [1], index: ["y"] });
    const result = neSeries(a, b);
    // a=[1,null], b=[null,1]; null ne anything → true
    expect(result.values).toEqual([true, true]);
  });

  test("fillValue option", () => {
    const a = new Series({ data: [1, 2], index: ["x", "y"] });
    const b = new Series({ data: [0], index: ["x"] });
    // without fillValue: a=["x"=1,"y"=2], b=["x"=0,"y"=null]
    // with fillValue=2: b=["x"=0,"y"=2]
    const result = eqSeries(a, b, { fillValue: 2 });
    expect(result.values).toEqual([false, true]);
  });
});

// ─── Boolean aggregation (Series) ─────────────────────────────────────────────

describe("anySeries / allSeries", () => {
  test("anySeries: true when at least one truthy", () => {
    expect(anySeries(new Series({ data: [false, true, false] }))).toBe(true);
    expect(anySeries(new Series({ data: [false, false] }))).toBe(false);
    expect(anySeries(new Series({ data: [] }))).toBe(false);
  });

  test("allSeries: true only when all truthy", () => {
    expect(allSeries(new Series({ data: [true, true, true] }))).toBe(true);
    expect(allSeries(new Series({ data: [true, false, true] }))).toBe(false);
    expect(allSeries(new Series({ data: [] }))).toBe(true); // vacuous truth
  });

  test("anySeries ignores nulls (null is falsy)", () => {
    expect(anySeries(new Series({ data: [null, null] }))).toBe(false);
    expect(anySeries(new Series({ data: [null, true] }))).toBe(true);
  });

  test("allSeries treats null as false", () => {
    expect(allSeries(new Series({ data: [true, null] }))).toBe(false);
  });

  test("works on numbers (nonzero = truthy)", () => {
    expect(anySeries(new Series({ data: [0, 0, 1] }))).toBe(true);
    expect(allSeries(new Series({ data: [1, 2, 3] }))).toBe(true);
    expect(allSeries(new Series({ data: [1, 0, 3] }))).toBe(false);
  });
});

// ─── Logical ops (Series) ─────────────────────────────────────────────────────

describe("logicalAndSeries", () => {
  test("basic AND", () => {
    const a = new Series({ data: [true, true, false, false] });
    const b = new Series({ data: [true, false, true, false] });
    expect(logicalAndSeries(a, b).values).toEqual([true, false, false, false]);
  });

  test("alignment: absent slots default to false", () => {
    const a = new Series({ data: [true], index: ["x"] });
    const b = new Series({ data: [true], index: ["y"] });
    const result = logicalAndSeries(a, b);
    // a=["x"=true,"y"=false], b=["x"=false,"y"=true]
    expect(result.values).toEqual([false, false]);
  });
});

describe("logicalOrSeries", () => {
  test("basic OR", () => {
    const a = new Series({ data: [true, true, false, false] });
    const b = new Series({ data: [true, false, true, false] });
    expect(logicalOrSeries(a, b).values).toEqual([true, true, true, false]);
  });
});

describe("logicalXorSeries", () => {
  test("basic XOR", () => {
    const a = new Series({ data: [true, true, false, false] });
    const b = new Series({ data: [true, false, true, false] });
    expect(logicalXorSeries(a, b).values).toEqual([false, true, true, false]);
  });
});

describe("logicalNotSeries", () => {
  test("inverts booleans", () => {
    const s = new Series({ data: [true, false, true] });
    expect(logicalNotSeries(s).values).toEqual([false, true, false]);
  });

  test("null remains null", () => {
    const s = new Series({ data: [true, null, false] });
    expect(logicalNotSeries(s).values).toEqual([false, null, true]);
  });

  test("numeric: 0 → true, nonzero → false", () => {
    const s = new Series({ data: [0, 1, 2] });
    expect(logicalNotSeries(s).values).toEqual([true, false, false]);
  });
});

// ─── DataFrame comparisons ────────────────────────────────────────────────────

describe("compareDataFrame — vs scalar", () => {
  const df = DataFrame.fromRecords([
    { a: 1, b: 2 },
    { a: 3, b: 4 },
  ]);

  test("eq", () => {
    const result = eqDataFrame(df, 2);
    expect(result.col("a").values).toEqual([false, false]);
    expect(result.col("b").values).toEqual([true, false]);
  });

  test("ne", () => {
    const result = neDataFrame(df, 2);
    expect(result.col("a").values).toEqual([true, true]);
    expect(result.col("b").values).toEqual([false, true]);
  });

  test("lt", () => {
    const result = ltDataFrame(df, 3);
    expect(result.col("a").values).toEqual([true, false]);
    expect(result.col("b").values).toEqual([true, false]);
  });

  test("gt", () => {
    const result = gtDataFrame(df, 2);
    expect(result.col("a").values).toEqual([false, true]);
    expect(result.col("b").values).toEqual([false, true]);
  });

  test("le", () => {
    const result = leDataFrame(df, 2);
    expect(result.col("a").values).toEqual([true, false]);
    expect(result.col("b").values).toEqual([true, false]);
  });

  test("ge", () => {
    const result = geDataFrame(df, 2);
    expect(result.col("a").values).toEqual([false, true]);
    expect(result.col("b").values).toEqual([true, true]);
  });

  test("returns boolean dtype", () => {
    expect(eqDataFrame(df, 1).col("a").dtype.name).toBe("bool");
  });

  test("null values in DataFrame", () => {
    const dfn = DataFrame.fromRecords([{ a: 1, b: null }]);
    expect(eqDataFrame(dfn, 1).col("b").values).toEqual([false]);
    expect(neDataFrame(dfn, 1).col("b").values).toEqual([true]);
  });
});

describe("compareDataFrame — vs DataFrame (with alignment)", () => {
  test("same structure", () => {
    const df1 = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const df2 = DataFrame.fromRecords([
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ]);
    const result = eqDataFrame(df1, df2);
    expect(result.col("a").values).toEqual([true, false]);
    expect(result.col("b").values).toEqual([false, true]);
  });

  test("column alignment: new columns filled with null (ne → true)", () => {
    const df1 = DataFrame.fromRecords([{ a: 1 }]);
    const df2 = DataFrame.fromRecords([{ b: 1 }]);
    const result = neDataFrame(df1, df2);
    // col "a": df2 missing → null, 1 ne null → true
    expect(result.col("a").values).toEqual([true]);
    // col "b": df1 missing → null, null ne 1 → true
    expect(result.col("b").values).toEqual([true]);
  });
});

describe("compareDataFrame — vs Series (axis=columns default)", () => {
  test("broadcasts Series values to each row by column name", () => {
    const df = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const s = new Series({ data: [1, 4], index: ["a", "b"] });
    const result = eqDataFrame(df, s);
    // col a: [1==1, 3==1] = [true, false]
    // col b: [2==4, 4==4] = [false, true]
    expect(result.col("a").values).toEqual([true, false]);
    expect(result.col("b").values).toEqual([false, true]);
  });

  test("new columns from Series filled with null (axis=columns)", () => {
    const df = DataFrame.fromRecords([{ a: 1 }]);
    const s = new Series({ data: [1, 2], index: ["a", "c"] });
    const result = gtDataFrame(df, s);
    // col a: 1>1 → false
    expect(result.col("a").values).toEqual([false]);
    // col c: null>2 → false
    expect(result.col("c").values).toEqual([false]);
  });
});

describe("compareDataFrame — vs Series (axis=index)", () => {
  test("broadcasts Series values to each column by row label", () => {
    const df = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    // row 0 → compare against 2, row 1 → compare against 3
    const s = new Series({ data: [2, 3] }); // default integer index 0, 1
    const result = compareDataFrame("eq", df, s, { axis: "index" });
    // col a: [1==2, 3==3] = [false, true]
    // col b: [2==2, 4==3] = [true, false]
    expect(result.col("a").values).toEqual([false, true]);
    expect(result.col("b").values).toEqual([true, false]);
  });
});

// ─── Boolean aggregation (DataFrame) ─────────────────────────────────────────

describe("anyDataFrame / allDataFrame", () => {
  test("anyDataFrame: true per column if any row truthy", () => {
    const df = DataFrame.fromRecords([
      { a: true, b: false },
      { a: false, b: false },
    ]);
    const result = anyDataFrame(df);
    expect(result.values).toEqual([true, false]);
    expect(result.index.values).toEqual(["a", "b"]);
  });

  test("allDataFrame: true per column only if all rows truthy", () => {
    const df = DataFrame.fromRecords([
      { a: true, b: true },
      { a: true, b: false },
    ]);
    const result = allDataFrame(df);
    expect(result.values).toEqual([true, false]);
  });

  test("anyDataFrame with numeric: nonzero counts", () => {
    const df = DataFrame.fromRecords([
      { a: 0, b: 1 },
      { a: 0, b: 0 },
    ]);
    expect(anyDataFrame(df).values).toEqual([false, true]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based", () => {
  test("eqSeries(s, scalar) is symmetric: eqSeries(s, v).values all boolean", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -10, max: 10 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: -10, max: 10 }),
        (data, v) => {
          const s = new Series({ data });
          const result = eqSeries(s, v);
          return result.size === s.size && result.values.every((x) => typeof x === "boolean");
        },
      ),
    );
  });

  test("neSeries is complement of eqSeries (no nulls in either)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -5, max: 5 }), { minLength: 1, maxLength: 15 }),
        fc.array(fc.integer({ min: -5, max: 5 }), { minLength: 1, maxLength: 15 }),
        (dataA, dataB) => {
          const a = new Series({ data: dataA });
          const b = new Series({ data: dataB });
          const eq = eqSeries(a, b);
          const ne = neSeries(a, b);
          return eq.values.every((v, i) => v !== ne.values[i]);
        },
      ),
    );
  });

  test("logicalNotSeries is involutory on boolean arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 0, maxLength: 20 }), (data) => {
        const s = new Series({ data });
        const doubled = logicalNotSeries(logicalNotSeries(s) as Series<boolean | null>);
        return s.values.every((v, i) => doubled.values[i] === v);
      }),
    );
  });

  test("anyDataFrame result length equals column count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (col1, col2) => {
          // Ensure same number of rows
          const n = Math.min(col1.length, col2.length);
          const df = DataFrame.fromRecords(
            Array.from({ length: n }, (_, i) => ({
              a: col1[i] as boolean,
              b: col2[i] as boolean,
            })),
          );
          const result = anyDataFrame(df);
          return result.size === 2;
        },
      ),
    );
  });
});
