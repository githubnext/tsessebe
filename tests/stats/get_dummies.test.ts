/**
 * Tests for src/stats/get_dummies.ts
 *
 * Covers: getDummies (Series → DataFrame), dataFrameGetDummies,
 * prefix / prefixSep / dummyNa / dropFirst options,
 * and property-based tests via fast-check.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { RangeIndex } from "../../src/core/range-index.ts";
import { DataFrame, Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import { dataFrameGetDummies, getDummies } from "../../src/stats/get_dummies.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

// ─── getDummies — basic ───────────────────────────────────────────────────────

describe("getDummies — basic Series", () => {
  it("returns empty DataFrame for empty Series", () => {
    const df = getDummies(s([]));
    expect(df.columns.size).toBe(0);
    expect(df.shape[0]).toBe(0);
  });

  it("creates one binary column per unique value", () => {
    const df = getDummies(s(["a", "b", "a", "c"]));
    expect(df.columns.values).toEqual(["a", "b", "c"]);
    expect(df.col("a").values).toEqual([1, 0, 1, 0]);
    expect(df.col("b").values).toEqual([0, 1, 0, 0]);
    expect(df.col("c").values).toEqual([0, 0, 0, 1]);
  });

  it("columns appear in first-seen order", () => {
    const df = getDummies(s(["c", "b", "a", "c"]));
    expect(df.columns.values).toEqual(["c", "b", "a"]);
  });

  it("numeric values become column names", () => {
    const df = getDummies(s([1, 2, 1]));
    expect(df.columns.values).toEqual(["1", "2"]);
    expect(df.col("1").values).toEqual([1, 0, 1]);
  });

  it("handles single unique value", () => {
    const df = getDummies(s(["x", "x", "x"]));
    expect(df.columns.values).toEqual(["x"]);
    expect(df.col("x").values).toEqual([1, 1, 1]);
  });

  it("missing values are encoded as 0 by default", () => {
    const df = getDummies(s(["a", null, "b", Number.NaN]));
    expect(df.columns.values).toEqual(["a", "b"]);
    expect(df.col("a").values).toEqual([1, 0, 0, 0]);
    expect(df.col("b").values).toEqual([0, 0, 1, 0]);
  });

  it("columns have correct row count", () => {
    const df = getDummies(s(["a", "b", "c", "a"]));
    for (const c of df.columns.values as string[]) {
      expect(df.col(c).size).toBe(4);
    }
  });
});

// ─── getDummies — prefix / prefixSep ─────────────────────────────────────────

describe("getDummies — prefix option", () => {
  it("prepends prefix with default sep '_'", () => {
    const df = getDummies(s(["red", "blue"]), { prefix: "color" });
    expect(df.columns.values).toEqual(["color_red", "color_blue"]);
  });

  it("uses custom prefixSep", () => {
    const df = getDummies(s(["x", "y"]), { prefix: "v", prefixSep: "-" });
    expect(df.columns.values).toEqual(["v-x", "v-y"]);
  });

  it("empty prefix string yields no prefix", () => {
    const df = getDummies(s(["a", "b"]), { prefix: "" });
    expect(df.columns.values).toEqual(["a", "b"]);
  });

  it("null prefix yields no prefix", () => {
    const df = getDummies(s(["a", "b"]), { prefix: null });
    expect(df.columns.values).toEqual(["a", "b"]);
  });
});

// ─── getDummies — dummyNa ─────────────────────────────────────────────────────

describe("getDummies — dummyNa option", () => {
  it("adds NaN column when dummyNa=true", () => {
    const df = getDummies(s(["a", null, "b"]), { dummyNa: true });
    expect(df.columns.values).toContain("NaN");
    expect(df.col("NaN").values).toEqual([0, 1, 0]);
  });

  it("NaN column reflects NaN values too", () => {
    const df = getDummies(s(["a", Number.NaN, "b"]), { dummyNa: true });
    expect(df.col("NaN").values).toEqual([0, 1, 0]);
  });

  it("NaN column is named with prefix when provided", () => {
    const df = getDummies(s(["a", null]), { dummyNa: true, prefix: "col" });
    expect(df.columns.values).toContain("col_NaN");
  });

  it("no NaN column when dummyNa=false (default)", () => {
    const df = getDummies(s(["a", null, "b"]));
    expect((df.columns.values as string[]).includes("NaN")).toBe(false);
  });
});

// ─── getDummies — dropFirst ───────────────────────────────────────────────────

describe("getDummies — dropFirst option", () => {
  it("drops first category column", () => {
    const df = getDummies(s(["a", "b", "c"]), { dropFirst: true });
    // first category "a" is dropped
    expect(df.columns.values).toEqual(["b", "c"]);
  });

  it("single unique value → empty DataFrame when dropFirst=true", () => {
    const df = getDummies(s(["a", "a"]), { dropFirst: true });
    expect(df.columns.size).toBe(0);
  });

  it("dropFirst=false (default) keeps all columns", () => {
    const df = getDummies(s(["a", "b"]), { dropFirst: false });
    expect(df.columns.values).toEqual(["a", "b"]);
  });
});

// ─── dataFrameGetDummies ──────────────────────────────────────────────────────

describe("dataFrameGetDummies — basic", () => {
  it("encodes string columns, preserves numeric columns", () => {
    const df = DataFrame.fromColumns({ color: ["red", "blue", "red"], n: [1, 2, 3] });
    const result = dataFrameGetDummies(df);
    // String column 'color' expanded; numeric column 'n' kept
    expect((result.columns.values as string[]).includes("n")).toBe(true);
    expect((result.columns.values as string[]).includes("color")).toBe(false);
    expect((result.columns.values as string[]).includes("color_red")).toBe(true);
    expect((result.columns.values as string[]).includes("color_blue")).toBe(true);
    expect(result.col("color_red").values).toEqual([1, 0, 1]);
    expect(result.col("color_blue").values).toEqual([0, 1, 0]);
    expect(result.col("n").values).toEqual([1, 2, 3]);
  });

  it("target specific columns via columns option", () => {
    const df = DataFrame.fromColumns({ a: ["x", "y"], b: ["p", "q"], n: [1, 2] });
    const result = dataFrameGetDummies(df, { columns: ["a"] });
    // Only 'a' is encoded; 'b' and 'n' kept
    expect((result.columns.values as string[]).includes("b")).toBe(true);
    expect((result.columns.values as string[]).includes("n")).toBe(true);
    expect((result.columns.values as string[]).includes("a")).toBe(false);
    expect((result.columns.values as string[]).includes("a_x")).toBe(true);
  });

  it("empty DataFrame returns empty DataFrame", () => {
    const df = new DataFrame(new Map(), new RangeIndex(0));
    const result = dataFrameGetDummies(df);
    expect(result.columns.size).toBe(0);
  });

  it("uses global prefix override", () => {
    const df = DataFrame.fromColumns({ cat: ["a", "b"] });
    const result = dataFrameGetDummies(df, { prefix: "x" });
    expect((result.columns.values as string[]).includes("x_a")).toBe(true);
    expect((result.columns.values as string[]).includes("x_b")).toBe(true);
  });

  it("dropFirst on DataFrame columns", () => {
    const df = DataFrame.fromColumns({ cat: ["a", "b", "c"] });
    const result = dataFrameGetDummies(df, { dropFirst: true });
    // "a" dropped, only "cat_b" and "cat_c"
    expect(result.columns.values).toEqual(["cat_b", "cat_c"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("getDummies — property tests", () => {
  it("each row sums to 1 for non-missing values (no prefix, no dummyNa)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 20 }),
        (data) => {
          const series = s(data);
          const df = getDummies(series);
          const cols = df.columns.values as string[];
          for (let i = 0; i < data.length; i++) {
            const rowSum = cols.reduce((acc, c) => acc + (df.col(c).values[i] as number), 0);
            expect(rowSum).toBe(1);
          }
        },
      ),
    );
  });

  it("column count equals unique non-missing value count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c", "d"), { minLength: 0, maxLength: 30 }),
        (data) => {
          const unique = new Set(data).size;
          const df = getDummies(s(data));
          expect(df.columns.size).toBe(unique);
        },
      ),
    );
  });

  it("all values in dummy columns are 0 or 1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("x", "y", "z"), { minLength: 1, maxLength: 20 }),
        (data) => {
          const df = getDummies(s(data));
          for (const c of df.columns.values as string[]) {
            for (const v of df.col(c).values) {
              expect(v === 0 || v === 1).toBe(true);
            }
          }
        },
      ),
    );
  });

  it("dropFirst reduces column count by exactly 1 (when >0 categories)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 20 }),
        (data) => {
          const dfAll = getDummies(s(data));
          const dfDrop = getDummies(s(data), { dropFirst: true });
          if (dfAll.columns.size > 0) {
            expect(dfDrop.columns.size).toBe(dfAll.columns.size - 1);
          }
        },
      ),
    );
  });

  it("prefix prepends to every column name", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (data, pfx) => {
          const df = getDummies(s(data), { prefix: pfx });
          for (const c of df.columns.values as string[]) {
            expect((c as string).startsWith(`${pfx}_`)).toBe(true);
          }
        },
      ),
    );
  });

  it("dummyNa adds exactly one extra column for mixed null/non-null input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", null), { minLength: 2, maxLength: 20 }),
        (data) => {
          const hasNull = data.some((v) => v === null);
          const dfBase = getDummies(s(data as Scalar[]));
          const dfNa = getDummies(s(data as Scalar[]), { dummyNa: true });
          const expectedExtra = hasNull ? 1 : 1; // NaN col always added when dummyNa=true
          expect(dfNa.columns.size).toBe(dfBase.columns.size + expectedExtra);
        },
      ),
    );
  });
});
