/**
 * Tests for src/reshape/pivot_table.ts — pivotTableFull with margins.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Scalar } from "../../src/index.ts";
import { pivotTableFull } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

// ─── basic pivot table (no margins) ──────────────────────────────────────────

describe("pivotTableFull — basic (no margins)", () => {
  it("aggregates with sum", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo", "bar", "bar"],
      B: ["x", "y", "x", "y"],
      D: [1, 2, 3, 4],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "sum",
    });
    // sorted rows: bar, foo; sorted cols: x, y
    expect(colValues(result, "x")).toEqual([3, 1]);
    expect(colValues(result, "y")).toEqual([4, 2]);
    expect([...result.index.values]).toEqual(["bar", "foo"]);
  });

  it("aggregates with mean", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo", "bar"],
      B: ["x", "x", "x"],
      D: [2, 4, 6],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "mean",
    });
    expect(colValues(result, "x")[0]).toBe(6); // bar: 6
    expect(colValues(result, "x")[1]).toBe(3); // foo: (2+4)/2
  });

  it("aggregates with count", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo", "bar"],
      B: ["x", "x", "x"],
      D: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "count",
    });
    expect(colValues(result, "x")).toEqual([1, 2]);
  });

  it("aggregates with min and max", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo"],
      B: ["x", "x"],
      D: [10, 20],
    });
    const minResult = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "min",
    });
    const maxResult = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "max",
    });
    expect(colValues(minResult, "x")).toEqual([10]);
    expect(colValues(maxResult, "x")).toEqual([20]);
  });

  it("aggregates with first and last", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo"],
      B: ["x", "x"],
      D: [10, 20],
    });
    const firstResult = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "first",
    });
    const lastResult = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "last",
    });
    expect(colValues(firstResult, "x")).toEqual([10]);
    expect(colValues(lastResult, "x")).toEqual([20]);
  });

  it("uses fill_value for empty cells", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "bar"],
      B: ["x", "y"],
      D: [1, 2],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "sum",
      fill_value: 0,
    });
    // foo/y and bar/x are empty cells → filled with 0
    expect(colValues(result, "x")).toEqual([0, 1]); // bar:0, foo:1 (wait, sorted: bar then foo)
    expect(colValues(result, "y")).toEqual([2, 0]);
  });

  it("handles multiple index columns", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo", "bar"],
      B: ["one", "two", "one"],
      C: ["x", "x", "x"],
      D: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: ["A", "B"],
      columns: "C",
      values: "D",
      aggfunc: "sum",
    });
    expect(result.index.size).toBe(3);
    const xVals = colValues(result, "x");
    // sorted by composite key: "bar, one", "foo, one", "foo, two"
    expect(xVals).toEqual([3, 1, 2]);
  });

  it("throws on missing index column", () => {
    const df = DataFrame.fromColumns({ A: [1], B: [2] });
    expect(() => pivotTableFull(df, { index: "MISSING", columns: "B", values: "A" })).toThrow();
  });

  it("throws on missing values column", () => {
    const df = DataFrame.fromColumns({ A: [1], B: [2] });
    expect(() => pivotTableFull(df, { index: "A", columns: "B", values: "MISSING" })).toThrow();
  });
});

// ─── margins ──────────────────────────────────────────────────────────────────

describe("pivotTableFull — margins", () => {
  const makeDf = (): DataFrame =>
    DataFrame.fromColumns({
      A: ["foo", "foo", "foo", "bar", "bar", "bar"],
      C: ["small", "large", "large", "small", "small", "large"],
      D: [1, 2, 2, 3, 3, 4],
    });

  it("adds All column (row margins)", () => {
    const result = pivotTableFull(makeDf(), {
      index: "A",
      columns: "C",
      values: "D",
      aggfunc: "sum",
      margins: true,
    });
    // All column should hold sum across all C categories per row
    const allCol = colValues(result, "All");
    // sorted rows: bar, foo, All
    expect(allCol[0]).toBe(10); // bar: 3+3+4 = 10
    expect(allCol[1]).toBe(5); // foo: 1+2+2 = 5
    expect(allCol[2]).toBe(15); // grand total: 1+2+2+3+3+4
  });

  it("adds All row (column margins)", () => {
    const result = pivotTableFull(makeDf(), {
      index: "A",
      columns: "C",
      values: "D",
      aggfunc: "sum",
      margins: true,
    });
    const rowLabels = [...result.index.values];
    expect(rowLabels.at(-1)).toBe("All");
    // All row for "large" column: 2+2+4 = 8
    const largeCol = colValues(result, "large");
    expect(largeCol.at(-1)).toBe(8);
    // All row for "small" column: 1+3+3 = 7
    const smallCol = colValues(result, "small");
    expect(smallCol.at(-1)).toBe(7);
  });

  it("grand total (All/All) equals sum of all values", () => {
    const result = pivotTableFull(makeDf(), {
      index: "A",
      columns: "C",
      values: "D",
      aggfunc: "sum",
      margins: true,
    });
    const allCol = colValues(result, "All");
    const grandTotal = allCol.at(-1);
    expect(grandTotal).toBe(15); // 1+2+2+3+3+4
  });

  it("respects custom margins_name", () => {
    const result = pivotTableFull(makeDf(), {
      index: "A",
      columns: "C",
      values: "D",
      aggfunc: "sum",
      margins: true,
      margins_name: "Total",
    });
    expect(result.has("Total")).toBe(true);
    expect(result.has("All")).toBe(false);
    const rowLabels = [...result.index.values];
    expect(rowLabels.at(-1)).toBe("Total");
  });

  it("margins with mean uses raw data not cell means", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "foo", "bar"],
      C: ["x", "x", "x"],
      D: [2, 4, 6],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "C",
      values: "D",
      aggfunc: "mean",
      margins: true,
    });
    // foo/x mean = 3, bar/x mean = 6
    // All/x should be mean of all D = (2+4+6)/3 = 4
    const xVals = colValues(result, "x");
    expect(xVals.at(-1)).toBeCloseTo(4);
    // foo All = mean of [2,4] = 3
    const allVals = colValues(result, "All");
    expect(allVals[0]).toBeCloseTo(6); // bar
    expect(allVals[1]).toBeCloseTo(3); // foo
  });

  it("margins=false omits All row/column", () => {
    const result = pivotTableFull(makeDf(), {
      index: "A",
      columns: "C",
      values: "D",
      aggfunc: "sum",
      margins: false,
    });
    expect(result.has("All")).toBe(false);
    const rowLabels = [...result.index.values];
    expect(rowLabels).not.toContain("All");
  });
});

// ─── sort option ──────────────────────────────────────────────────────────────

describe("pivotTableFull — sort option", () => {
  it("sort=true (default) produces lexicographic order", () => {
    const df = DataFrame.fromColumns({
      A: ["b", "a", "c"],
      B: ["y", "x", "z"],
      D: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "sum",
    });
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
    expect([...result.columns.values]).toEqual(["x", "y", "z"]);
  });

  it("sort=false preserves insertion order", () => {
    const df = DataFrame.fromColumns({
      A: ["b", "a", "c"],
      B: ["y", "x", "z"],
      D: [1, 2, 3],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "sum",
      sort: false,
    });
    expect([...result.index.values]).toEqual(["b", "a", "c"]);
    expect([...result.columns.values]).toEqual(["y", "x", "z"]);
  });
});

// ─── dropna option ────────────────────────────────────────────────────────────

describe("pivotTableFull — dropna", () => {
  it("dropna=true excludes all-null rows", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "bar"],
      B: ["x", "y"],
      D: [1, 2],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: "D",
      aggfunc: "sum",
      dropna: true,
      fill_value: null,
    });
    // foo has only x; bar has only y — both rows have one non-null value
    expect(result.index.size).toBe(2);
  });
});

// ─── multiple values columns ──────────────────────────────────────────────────

describe("pivotTableFull — multiple values", () => {
  it("creates compound column names", () => {
    const df = DataFrame.fromColumns({
      A: ["foo", "bar"],
      B: ["x", "x"],
      D: [1, 2],
      E: [10, 20],
    });
    const result = pivotTableFull(df, {
      index: "A",
      columns: "B",
      values: ["D", "E"],
      aggfunc: "sum",
    });
    expect(result.has("D_x")).toBe(true);
    expect(result.has("E_x")).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("pivotTableFull — property tests", () => {
  it("sum grand total equals sum of all source values", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.constantFrom("alpha", "beta", "gamma"),
            b: fc.constantFrom("x", "y", "z"),
            d: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            a: rows.map((r) => r.a),
            b: rows.map((r) => r.b),
            d: rows.map((r) => r.d),
          });
          const result = pivotTableFull(df, {
            index: "a",
            columns: "b",
            values: "d",
            aggfunc: "sum",
            margins: true,
          });
          const grandTotal = colValues(result, "All").at(-1);
          const expected = rows.reduce((acc, r) => acc + r.d, 0);
          return Math.abs((grandTotal as number) - expected) < 0.001;
        },
      ),
    );
  });

  it("count grand total equals number of source rows (with numeric values)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.constantFrom("alpha", "beta"),
            b: fc.constantFrom("x", "y"),
            d: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 15 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            a: rows.map((r) => r.a),
            b: rows.map((r) => r.b),
            d: rows.map((r) => r.d),
          });
          const result = pivotTableFull(df, {
            index: "a",
            columns: "b",
            values: "d",
            aggfunc: "count",
            margins: true,
          });
          const grandTotal = colValues(result, "All").at(-1);
          return grandTotal === rows.length;
        },
      ),
    );
  });

  it("result without margins has no All column or row", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.constantFrom("alpha", "beta"),
            b: fc.constantFrom("x", "y"),
            d: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            a: rows.map((r) => r.a),
            b: rows.map((r) => r.b),
            d: rows.map((r) => r.d),
          });
          const result = pivotTableFull(df, {
            index: "a",
            columns: "b",
            values: "d",
            aggfunc: "sum",
            margins: false,
          });
          const hasAllCol = result.has("All");
          const hasAllRow = [...result.index.values].includes("All");
          return !(hasAllCol || hasAllRow);
        },
      ),
    );
  });

  it("sum(All column) per non-margin row equals sum of row cells", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.constantFrom("alpha", "beta", "gamma"),
            b: fc.constantFrom("x", "y"),
            d: fc.integer({ min: 1, max: 50 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            a: rows.map((r) => r.a),
            b: rows.map((r) => r.b),
            d: rows.map((r) => r.d),
          });
          const result = pivotTableFull(df, {
            index: "a",
            columns: "b",
            values: "d",
            aggfunc: "sum",
            margins: true,
            fill_value: 0,
          });
          const colNames = result.columns.values.filter((c) => c !== "All");
          const allVals = colValues(result, "All");
          const rowLabels = [...result.index.values];
          // for each non-margin row, All should equal sum of non-All cells
          for (let ri = 0; ri < rowLabels.length - 1; ri++) {
            const cellSum = colNames.reduce((acc, c) => {
              const v = colValues(result, c)[ri];
              return acc + (typeof v === "number" ? v : 0);
            }, 0);
            const allVal = allVals[ri];
            if (Math.abs((allVal as number) - cellSum) > 0.001) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
