/**
 * Tests for src/reshape/wide_to_long.ts — wideToLong.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, wideToLong } from "../../src/index.ts";

// ─── basic reshaping ──────────────────────────────────────────────────────────

describe("wideToLong — basic reshaping", () => {
  it("reshapes a simple wide DataFrame to long", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2],
      x1: [10, 20],
      x2: [11, 21],
    });
    const long = wideToLong(df, "x", "id", "time");
    // 2 rows × 2 suffixes = 4 long rows
    expect(long.index.size).toBe(4);
    expect([...long.columns.values]).toContain("id");
    expect([...long.columns.values]).toContain("time");
    expect([...long.columns.values]).toContain("x");
  });

  it("correctly maps id values across stubs", () => {
    const df = DataFrame.fromColumns({
      A: [1, 2],
      x1: [10, 20],
      x2: [11, 21],
    });
    const long = wideToLong(df, "x", "A", "time");
    const ids = long.col("A").values;
    const times = long.col("time").values;
    const xs = long.col("x").values;
    // Rows: (A=1,time=1,x=10), (A=1,time=2,x=11), (A=2,time=1,x=20), (A=2,time=2,x=21)
    expect(ids).toEqual([1, 2, 1, 2]);
    expect(times).toEqual([1, 1, 2, 2]);
    expect(xs).toEqual([10, 20, 11, 21]);
  });

  it("handles multiple stubs", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2],
      math1: [90, 80],
      math2: [95, 85],
      eng1: [70, 75],
      eng2: [72, 78],
    });
    const long = wideToLong(df, ["math", "eng"], "id", "year");
    expect(long.index.size).toBe(4);
    expect([...long.columns.values]).toContain("math");
    expect([...long.columns.values]).toContain("eng");
    expect([...long.columns.values]).toContain("year");
    // Year suffix 1 → time=1
    const mathVals = long.col("math").values;
    expect(mathVals).toContain(90);
    expect(mathVals).toContain(80);
  });

  it("uses sep option to split stub from suffix", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2],
      math_2020: [90, 80],
      math_2021: [95, 85],
      eng_2020: [70, 75],
      eng_2021: [72, 78],
    });
    const long = wideToLong(df, ["math", "eng"], "id", "year", { sep: "_" });
    expect(long.index.size).toBe(4);
    const yearVals = long.col("year").values;
    expect(yearVals).toContain(2020);
    expect(yearVals).toContain(2021);
  });

  it("converts digit suffixes to numbers in j column", () => {
    const df = DataFrame.fromColumns({
      grp: ["a", "b"],
      val1: [1, 2],
      val2: [3, 4],
    });
    const long = wideToLong(df, "val", "grp", "t");
    const tVals = long.col("t").values;
    expect(tVals.every((v) => typeof v === "number")).toBe(true);
    expect(tVals).toContain(1);
    expect(tVals).toContain(2);
  });

  it("handles string suffixes with custom suffix pattern", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2],
      x_a: [10, 20],
      x_b: [11, 21],
    });
    const long = wideToLong(df, "x", "id", "level", { sep: "_", suffix: "[a-z]+" });
    expect(long.index.size).toBe(4);
    const levelVals = long.col("level").values;
    expect(levelVals).toContain("a");
    expect(levelVals).toContain("b");
  });

  it("preserves non-stub columns as id columns", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2],
      name: ["Alice", "Bob"],
      score1: [10, 20],
      score2: [15, 25],
    });
    const long = wideToLong(df, "score", ["id", "name"], "period");
    expect(long.index.size).toBe(4);
    const names = long.col("name").values;
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });

  it("output column order is: idCols, j, stubs", () => {
    const df = DataFrame.fromColumns({
      id: [1],
      a1: [10],
      b1: [20],
    });
    const long = wideToLong(df, ["a", "b"], "id", "t");
    const cols = [...long.columns.values];
    expect(cols.indexOf("id")).toBeLessThan(cols.indexOf("t"));
    expect(cols.indexOf("t")).toBeLessThan(cols.indexOf("a"));
    expect(cols.indexOf("t")).toBeLessThan(cols.indexOf("b"));
  });

  it("returns empty DataFrame when no stub columns match", () => {
    const df = DataFrame.fromColumns({
      id: [1, 2],
      foo: [10, 20],
    });
    const long = wideToLong(df, "x", "id", "t");
    expect(long.index.size).toBe(0);
  });

  it("handles single row input", () => {
    const df = DataFrame.fromColumns({ id: [1], val1: [99], val2: [88] });
    const long = wideToLong(df, "val", "id", "t");
    expect(long.index.size).toBe(2);
  });

  it("sorts numeric suffixes ascending", () => {
    const df = DataFrame.fromColumns({
      id: [1],
      x10: [100],
      x2: [20],
      x1: [10],
    });
    const long = wideToLong(df, "x", "id", "t");
    const tVals = long.col("t").values;
    expect(tVals).toEqual([1, 2, 10]);
  });

  it("handles multiple id columns", () => {
    const df = DataFrame.fromColumns({
      grp: ["a", "b"],
      subgrp: [1, 2],
      v1: [10, 20],
      v2: [30, 40],
    });
    const long = wideToLong(df, "v", ["grp", "subgrp"], "t");
    expect(long.index.size).toBe(4);
    expect([...long.columns.values]).toContain("grp");
    expect([...long.columns.values]).toContain("subgrp");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("wideToLong — property-based", () => {
  it("output rows = input rows × number of matched suffixes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 4 }),
        (nRows, nSuffixes) => {
          const colData: Record<string, number[]> = { id: [] };
          for (let r = 0; r < nRows; r++) {
            colData.id?.push(r);
          }
          for (let s = 1; s <= nSuffixes; s++) {
            colData[`val${s}`] = Array.from({ length: nRows }, (_, r) => r * 10 + s);
          }
          const df = DataFrame.fromColumns(
            colData as unknown as Record<
              string,
              readonly (string | number | boolean | bigint | null | undefined | Date)[]
            >,
          );
          const long = wideToLong(df, "val", "id", "t");
          return long.index.size === nRows * nSuffixes;
        },
      ),
    );
  });

  it("all original id values appear in output", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 }),
        (ids) => {
          const colData: Record<string, number[]> = {
            id: ids,
            x1: ids.map((v) => v + 1),
            x2: ids.map((v) => v + 2),
          };
          const df = DataFrame.fromColumns(
            colData as unknown as Record<
              string,
              readonly (string | number | boolean | bigint | null | undefined | Date)[]
            >,
          );
          const long = wideToLong(df, "x", "id", "t");
          const outIds = new Set(long.col("id").values);
          return ids.every((id) => outIds.has(id));
        },
      ),
    );
  });

  it("j column values are exactly the discovered suffixes (repeated nRows times)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (nSuffixes) => {
        const colData: Record<string, number[]> = { id: [1] };
        for (let s = 1; s <= nSuffixes; s++) {
          colData[`v${s}`] = [s * 10];
        }
        const df = DataFrame.fromColumns(
          colData as unknown as Record<
            string,
            readonly (string | number | boolean | bigint | null | undefined | Date)[]
          >,
        );
        const long = wideToLong(df, "v", "id", "t");
        const tVals = long.col("t").values;
        return tVals.length === nSuffixes;
      }),
    );
  });
});
