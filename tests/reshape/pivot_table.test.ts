/**
 * Tests for src/reshape/pivot_table.ts — pivotTableFull with margins, sort.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Label, type Scalar } from "../../src/index.ts";
import { pivotTableFull } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

function numCell(df: DataFrame, rowLabel: Label, col: string): number {
  const rowIdx = [...df.index.values].indexOf(rowLabel);
  if (rowIdx === -1) {
    throw new Error(`Row "${String(rowLabel)}" not found`);
  }
  const v = df.col(col).values[rowIdx];
  if (typeof v !== "number") {
    throw new Error(`Expected number at row="${String(rowLabel)}", col="${col}"`);
  }
  return v;
}

// ─── basic (no margins) ───────────────────────────────────────────────────────

describe("pivotTableFull — basic (no margins)", () => {
  it("produces same result as pivotTable for simple sum", () => {
    const df = DataFrame.fromColumns({
      region: ["N", "N", "S", "S"],
      product: ["A", "B", "A", "B"],
      sales: [100, 200, 150, 250],
    });
    const result = pivotTableFull(df, {
      index: "region",
      columns: "product",
      values: "sales",
      aggfunc: "sum",
      sort: false,
    });
    expect(result.shape).toEqual([2, 2]);
    expect(numCell(result, "N", "A")).toBe(100);
    expect(numCell(result, "N", "B")).toBe(200);
    expect(numCell(result, "S", "A")).toBe(150);
    expect(numCell(result, "S", "B")).toBe(250);
  });

  it("aggregates duplicate (row,col) entries with mean", () => {
    const df = DataFrame.fromColumns({
      cat: ["X", "X", "Y", "Y"],
      grp: ["P", "P", "P", "Q"],
      val: [10, 20, 30, 40],
    });
    const result = pivotTableFull(df, {
      index: "cat",
      columns: "grp",
      values: "val",
      aggfunc: "mean",
    });
    expect(numCell(result, "X", "P")).toBeCloseTo(15);
    expect(numCell(result, "Y", "P")).toBe(30);
    expect(numCell(result, "Y", "Q")).toBe(40);
  });

  it("sorts row and column labels when sort=true (default)", () => {
    const df = DataFrame.fromColumns({
      r: ["Z", "A", "M"],
      c: ["b", "a", "c"],
      v: [1, 2, 3],
    });
    const result = pivotTableFull(df, { index: "r", columns: "c", values: "v", aggfunc: "sum" });
    expect([...result.index.values]).toEqual(["A", "M", "Z"]);
    expect(result.columns.values).toEqual(["a", "b", "c"]);
  });

  it("preserves insertion order when sort=false", () => {
    const df = DataFrame.fromColumns({
      r: ["Z", "A", "M"],
      c: ["b", "a", "c"],
      v: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "sum",
      sort: false,
    });
    expect([...result.index.values]).toEqual(["Z", "A", "M"]);
    expect(result.columns.values).toEqual(["b", "a", "c"]);
  });

  it("uses fill_value for missing cells", () => {
    const df = DataFrame.fromColumns({
      r: ["A", "B"],
      c: ["X", "Y"],
      v: [1, 2],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "sum",
      fill_value: -1,
    });
    expect(numCell(result, "A", "X")).toBe(1);
    expect(numCell(result, "A", "Y")).toBe(-1);
    expect(numCell(result, "B", "X")).toBe(-1);
    expect(numCell(result, "B", "Y")).toBe(2);
  });

  it("supports count aggfunc", () => {
    const df = DataFrame.fromColumns({
      r: ["A", "A", "B"],
      c: ["X", "X", "X"],
      v: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "count",
    });
    expect(numCell(result, "A", "X")).toBe(2);
    expect(numCell(result, "B", "X")).toBe(1);
  });

  it("throws for non-existent index column", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect(() =>
      pivotTableFull(df, { index: "z", columns: "b", values: "a", aggfunc: "sum" }),
    ).toThrow();
  });

  it("throws for non-existent values column", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect(() =>
      pivotTableFull(df, { index: "a", columns: "b", values: "zzz", aggfunc: "sum" }),
    ).toThrow();
  });
});

// ─── margins ──────────────────────────────────────────────────────────────────

describe("pivotTableFull — margins=true", () => {
  it("adds All row and column with sum", () => {
    const df = DataFrame.fromColumns({
      region: ["N", "N", "S", "S"],
      product: ["A", "B", "A", "B"],
      sales: [100, 200, 150, 250],
    });
    const result = pivotTableFull(df, {
      index: "region",
      columns: "product",
      values: "sales",
      aggfunc: "sum",
      margins: true,
    });
    // data rows
    expect(numCell(result, "N", "A")).toBe(100);
    expect(numCell(result, "N", "B")).toBe(200);
    expect(numCell(result, "S", "A")).toBe(150);
    expect(numCell(result, "S", "B")).toBe(250);
    // "All" column (row margins)
    expect(numCell(result, "N", "All")).toBe(300);
    expect(numCell(result, "S", "All")).toBe(400);
    // "All" row (column margins)
    expect(numCell(result, "All", "A")).toBe(250);
    expect(numCell(result, "All", "B")).toBe(450);
    // grand total
    expect(numCell(result, "All", "All")).toBe(700);
  });

  it("grand total with mean is mean of all raw values", () => {
    // mean(100, 200, 300) = 200 — NOT mean of means
    const df = DataFrame.fromColumns({
      r: ["A", "A", "B"],
      c: ["X", "X", "Y"],
      v: [100, 200, 300],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "mean",
      margins: true,
    });
    // "A" row: mean of [100,200] = 150
    expect(numCell(result, "A", "All")).toBeCloseTo(150);
    // "B" row: mean of [300] = 300
    expect(numCell(result, "B", "All")).toBeCloseTo(300);
    // "All" row, "X" col: mean of [100,200] = 150
    expect(numCell(result, "All", "X")).toBeCloseTo(150);
    // "All" row, "Y" col: mean of [300] = 300
    expect(numCell(result, "All", "Y")).toBeCloseTo(300);
    // grand total: mean of [100,200,300] = 200
    expect(numCell(result, "All", "All")).toBeCloseTo(200);
  });

  it("grand total count = total non-missing values", () => {
    const df = DataFrame.fromColumns({
      r: ["A", "A", "B", "B"],
      c: ["X", "Y", "X", "Y"],
      v: [1, 2, 3, 4],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "count",
      margins: true,
    });
    expect(numCell(result, "All", "All")).toBe(4);
    expect(numCell(result, "A", "All")).toBe(2);
    expect(numCell(result, "All", "X")).toBe(2);
  });

  it("uses custom margins_name", () => {
    const df = DataFrame.fromColumns({
      r: ["A", "B"],
      c: ["X", "Y"],
      v: [1, 2],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "sum",
      margins: true,
      margins_name: "Total",
    });
    expect([...result.index.values]).toContain("Total");
    expect(result.columns.values).toContain("Total");
  });

  it("margins row is the last row", () => {
    const df = DataFrame.fromColumns({
      r: ["A", "B", "C"],
      c: ["X", "Y", "Z"],
      v: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "sum",
      margins: true,
    });
    const rowLabels = [...result.index.values];
    expect(rowLabels.at(-1)).toBe("All");
    expect(result.columns.values.at(-1)).toBe("All");
  });

  it("margins with multiple row/col keys (composite)", () => {
    const df = DataFrame.fromColumns({
      country: ["US", "US", "UK", "UK"],
      region: ["E", "W", "E", "W"],
      product: ["A", "B", "A", "B"],
      revenue: [10, 20, 30, 40],
    });
    const result = pivotTableFull(df, {
      index: ["country", "region"],
      columns: "product",
      values: "revenue",
      aggfunc: "sum",
      margins: true,
    });
    // grand total should be 100
    expect(numCell(result, "All", "All")).toBe(100);
  });
});

// ─── aggfuncs ─────────────────────────────────────────────────────────────────

describe("pivotTableFull — aggfuncs", () => {
  const df = DataFrame.fromColumns({
    r: ["A", "A", "B"],
    c: ["X", "Y", "X"],
    v: [10, 20, 30],
  });

  it("min", () => {
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "min",
    });
    expect(numCell(result, "A", "X")).toBe(10);
  });

  it("max", () => {
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "max",
    });
    expect(numCell(result, "A", "X")).toBe(10);
    expect(numCell(result, "B", "X")).toBe(30);
  });

  it("first", () => {
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "first",
    });
    expect(numCell(result, "A", "X")).toBe(10);
  });

  it("last", () => {
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "last",
    });
    expect(numCell(result, "A", "X")).toBe(10);
  });
});

// ─── dropna ───────────────────────────────────────────────────────────────────

describe("pivotTableFull — dropna", () => {
  it("removes all-null columns when dropna=true", () => {
    const df = DataFrame.fromColumns({
      r: ["A", "B"],
      c: ["X", "Y"],
      v: [1, 2],
    });
    const result = pivotTableFull(df, {
      index: "r",
      columns: "c",
      values: "v",
      aggfunc: "sum",
      dropna: true,
    });
    // X is null for B, Y is null for A — both have some values, so neither dropped
    expect(result.columns.values.length).toBe(2);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("pivotTableFull — property tests", () => {
  it("sum grand total equals sum of all input values", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            r: fc.constantFrom("A", "B", "C"),
            c: fc.constantFrom("X", "Y", "Z"),
            v: fc.float({ min: 0, max: 1000, noNaN: true }),
          }),
          { minLength: 4, maxLength: 20 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            r: rows.map((x) => x.r),
            c: rows.map((x) => x.c),
            v: rows.map((x) => x.v),
          });
          const result = pivotTableFull(df, {
            index: "r",
            columns: "c",
            values: "v",
            aggfunc: "sum",
            margins: true,
          });
          const grand = numCell(result, "All", "All");
          const expected = rows.reduce((s, x) => s + x.v, 0);
          expect(grand).toBeCloseTo(expected, 5);
        },
      ),
    );
  });

  it("count grand total equals number of data rows", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            r: fc.constantFrom("A", "B"),
            c: fc.constantFrom("X", "Y"),
            v: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 2, maxLength: 16 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            r: rows.map((x) => x.r),
            c: rows.map((x) => x.c),
            v: rows.map((x) => x.v),
          });
          const result = pivotTableFull(df, {
            index: "r",
            columns: "c",
            values: "v",
            aggfunc: "count",
            margins: true,
          });
          const grand = numCell(result, "All", "All");
          expect(grand).toBe(rows.length);
        },
      ),
    );
  });

  it("row margins sum equals All column values", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            r: fc.constantFrom("A", "B"),
            c: fc.constantFrom("X", "Y", "Z"),
            v: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 4, maxLength: 20 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            r: rows.map((x) => x.r),
            c: rows.map((x) => x.c),
            v: rows.map((x) => x.v),
          });
          const result = pivotTableFull(df, {
            index: "r",
            columns: "c",
            values: "v",
            aggfunc: "sum",
            margins: true,
          });
          // "All" col for row "A" should equal sum of all v where r="A"
          for (const rLabel of ["A", "B"]) {
            const hasRow = [...result.index.values].includes(rLabel);
            if (!hasRow) {
              continue;
            }
            const rowTotal = numCell(result, rLabel, "All");
            const expected = rows.filter((x) => x.r === rLabel).reduce((s, x) => s + x.v, 0);
            expect(rowTotal).toBeCloseTo(expected, 5);
          }
        },
      ),
    );
  });
});
