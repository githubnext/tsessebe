/**
 * Tests for src/reshape/pivot.ts
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { Index } from "../../src/index.ts";
import { pivot, pivotTable } from "../../src/index.ts";

// ─── pivot ────────────────────────────────────────────────────────────────────

describe("pivot", () => {
  test("basic wide reshape", () => {
    const df = DataFrame.fromColumns({
      date: ["2020-01", "2020-01", "2020-02", "2020-02"],
      city: ["A", "B", "A", "B"],
      temp: [10, 20, 15, 25],
    });
    const wide = pivot(df, { index: "date", columns: "city", values: "temp" });

    expect([...wide.columns.values]).toEqual(["A", "B"]);
    expect([...wide.index.values]).toEqual(["2020-01", "2020-02"]);
    expect([...wide.col("A").values]).toEqual([10, 15]);
    expect([...wide.col("B").values]).toEqual([20, 25]);
  });

  test("missing combinations are null", () => {
    const df = DataFrame.fromColumns({
      row: ["r1", "r1", "r2"],
      col: ["c1", "c2", "c1"],
      val: [1, 2, 3],
    });
    const wide = pivot(df, { index: "row", columns: "col", values: "val" });

    expect(wide.col("c1").values[0]).toBe(1);
    expect(wide.col("c2").values[0]).toBe(2);
    expect(wide.col("c1").values[1]).toBe(3);
    expect(wide.col("c2").values[1]).toBe(null);
  });

  test("preserves row index", () => {
    const df = DataFrame.fromColumns({
      k: ["a", "b"],
      col: ["x", "x"],
      v: [10, 20],
    });
    const wide = pivot(df, { index: "k", columns: "col", values: "v" });
    expect([...wide.index.values]).toEqual(["a", "b"]);
  });

  test("numeric index values", () => {
    const df = DataFrame.fromColumns({
      year: [2020, 2020, 2021, 2021],
      region: ["N", "S", "N", "S"],
      sales: [100, 200, 150, 250],
    });
    const wide = pivot(df, { index: "year", columns: "region", values: "sales" });
    expect([...wide.col("N").values]).toEqual([100, 150]);
    expect([...wide.col("S").values]).toEqual([200, 250]);
  });

  test("boolean column values", () => {
    const df = DataFrame.fromColumns({
      id: ["a", "a", "b", "b"],
      flag: [true, false, true, false],
      val: [1, 2, 3, 4],
    });
    const wide = pivot(df, { index: "id", columns: "flag", values: "val" });
    // column names are string representations of booleans
    expect(wide.shape[1]).toBe(2);
  });

  test("throws on duplicate (index, columns) pairs", () => {
    const df = DataFrame.fromColumns({
      k: ["a", "a"],
      col: ["x", "x"],
      v: [1, 2],
    });
    expect(() => pivot(df, { index: "k", columns: "col", values: "v" })).toThrow(
      "pivot: duplicate",
    );
  });

  test("single row and single column", () => {
    const df = DataFrame.fromColumns({ k: ["a"], col: ["x"], v: [42] });
    const wide = pivot(df, { index: "k", columns: "col", values: "v" });
    expect(wide.shape).toEqual([1, 1]);
    expect(wide.col("x").values[0]).toBe(42);
  });

  test("column ordering matches appearance order", () => {
    // columns "B" appears first, "A" appears second
    const df = DataFrame.fromColumns({
      row: ["r1", "r1"],
      col: ["B", "A"],
      val: [2, 1],
    });
    const wide = pivot(df, { index: "row", columns: "col", values: "val" });
    expect([...wide.columns.values]).toEqual(["B", "A"]);
  });

  test("custom Index-based row index", () => {
    const df = DataFrame.fromColumns(
      { k: ["x", "y"], col: ["a", "a"], val: [10, 20] },
      {
        index: new Index<string | number>(["row0", "row1"]) as unknown as Index<
          import("../../src/index.ts").Label
        >,
      },
    );
    const wide = pivot(df, { index: "k", columns: "col", values: "val" });
    // pivot uses values from the "k" column — row index of result = unique k values
    expect([...wide.index.values]).toEqual(["x", "y"]);
  });
});

// ─── pivotTable ───────────────────────────────────────────────────────────────

describe("pivotTable", () => {
  const df = DataFrame.fromColumns({
    region: ["N", "N", "N", "S", "S", "S"],
    product: ["A", "A", "B", "A", "B", "B"],
    revenue: [10, 20, 30, 40, 50, 60],
  });

  test("mean aggregation (default)", () => {
    const pt = pivotTable(df, { index: "region", columns: "product", values: "revenue" });
    // N/A: mean([10,20]) = 15; N/B: mean([30]) = 30
    // S/A: mean([40]) = 40; S/B: mean([50,60]) = 55
    expect(pt.col("A").values[0]).toBe(15);
    expect(pt.col("B").values[0]).toBe(30);
    expect(pt.col("A").values[1]).toBe(40);
    expect(pt.col("B").values[1]).toBe(55);
  });

  test("sum aggregation", () => {
    const pt = pivotTable(df, {
      index: "region",
      columns: "product",
      values: "revenue",
      aggfunc: "sum",
    });
    expect(pt.col("A").values[0]).toBe(30); // N/A: 10+20
    expect(pt.col("B").values[1]).toBe(110); // S/B: 50+60
  });

  test("count aggregation", () => {
    const pt = pivotTable(df, {
      index: "region",
      columns: "product",
      values: "revenue",
      aggfunc: "count",
    });
    expect(pt.col("A").values[0]).toBe(2); // N has 2 A entries
    expect(pt.col("B").values[0]).toBe(1); // N has 1 B entry
  });

  test("min aggregation", () => {
    const pt = pivotTable(df, {
      index: "region",
      columns: "product",
      values: "revenue",
      aggfunc: "min",
    });
    expect(pt.col("A").values[0]).toBe(10);
  });

  test("max aggregation", () => {
    const pt = pivotTable(df, {
      index: "region",
      columns: "product",
      values: "revenue",
      aggfunc: "max",
    });
    expect(pt.col("A").values[0]).toBe(20);
  });

  test("first aggregation", () => {
    const pt = pivotTable(df, {
      index: "region",
      columns: "product",
      values: "revenue",
      aggfunc: "first",
    });
    expect(pt.col("A").values[0]).toBe(10);
  });

  test("last aggregation", () => {
    const pt = pivotTable(df, {
      index: "region",
      columns: "product",
      values: "revenue",
      aggfunc: "last",
    });
    expect(pt.col("A").values[0]).toBe(20);
  });

  test("missing cells are null by default", () => {
    const df2 = DataFrame.fromColumns({
      r: ["x", "y"],
      c: ["A", "B"],
      v: [1, 2],
    });
    const pt = pivotTable(df2, { index: "r", columns: "c", values: "v" });
    // x/A=1, x/B=null, y/A=null, y/B=2
    expect(pt.col("B").values[0]).toBe(null);
    expect(pt.col("A").values[1]).toBe(null);
  });

  test("fillValue replaces missing cells", () => {
    const df2 = DataFrame.fromColumns({
      r: ["x", "y"],
      c: ["A", "B"],
      v: [1, 2],
    });
    const pt = pivotTable(df2, { index: "r", columns: "c", values: "v", fillValue: 0 });
    expect(pt.col("B").values[0]).toBe(0);
  });

  test("multi-column index joined with __", () => {
    const df2 = DataFrame.fromColumns({
      year: [2020, 2020, 2021],
      region: ["N", "S", "N"],
      product: ["A", "A", "A"],
      revenue: [10, 20, 30],
    });
    const pt = pivotTable(df2, {
      index: ["year", "region"],
      columns: "product",
      values: "revenue",
    });
    expect([...pt.index.values]).toEqual(["2020__N", "2020__S", "2021__N"]);
    expect(pt.col("A").values[0]).toBe(10);
  });

  test("shape matches unique index × unique columns", () => {
    const pt = pivotTable(df, { index: "region", columns: "product", values: "revenue" });
    expect(pt.shape).toEqual([2, 2]); // 2 regions × 2 products
  });

  // ─── property tests ───────────────────────────────────────────────────────

  test("property: pivotTable sum == sum of all matching values", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            region: fc.constantFrom("N", "S", "E"),
            product: fc.constantFrom("A", "B"),
            revenue: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (rows) => {
          const df2 = DataFrame.fromColumns({
            region: rows.map((r) => r.region),
            product: rows.map((r) => r.product),
            revenue: rows.map((r) => r.revenue),
          });
          const pt = pivotTable(df2, {
            index: "region",
            columns: "product",
            values: "revenue",
            aggfunc: "sum",
          });
          // Total sum should equal total revenue
          let ptTotal = 0;
          for (const col of pt.columns.values) {
            for (const v of pt.col(col).values) {
              if (typeof v === "number") {
                ptTotal += v;
              }
            }
          }
          const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
          return ptTotal === totalRevenue;
        },
      ),
    );
  });
});
