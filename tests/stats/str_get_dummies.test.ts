/**
 * Tests for strGetDummies — pandas.Series.str.get_dummies(sep) port.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, strGetDummies } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series<Scalar>({ data: [...data] });
}

// ─── Basic functionality ──────────────────────────────────────────────────────

describe("strGetDummies — basic", () => {
  test("splits by default pipe separator", () => {
    const df = strGetDummies(s(["a|b", "b|c", "a"]));
    expect(df).toBeInstanceOf(DataFrame);
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
    expect(df.shape).toEqual([3, 3]);
  });

  test("correct indicator values", () => {
    const df = strGetDummies(s(["a|b", "b|c", "a"]));
    expect([...df.col("a").values]).toEqual([1, 0, 1]);
    expect([...df.col("b").values]).toEqual([1, 1, 0]);
    expect([...df.col("c").values]).toEqual([0, 1, 0]);
  });

  test("custom separator", () => {
    const df = strGetDummies(s(["x,y", "y,z", "x"]), { sep: "," });
    expect([...df.columns.values]).toEqual(["x", "y", "z"]);
    expect([...df.col("x").values]).toEqual([1, 0, 1]);
  });

  test("single-value elements", () => {
    const df = strGetDummies(s(["a", "b", "c"]));
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
    expect([...df.col("a").values]).toEqual([1, 0, 0]);
  });

  test("columns are sorted lexicographically", () => {
    const df = strGetDummies(s(["z|a|m", "a|z"]));
    expect([...df.columns.values]).toEqual(["a", "m", "z"]);
  });

  test("null values produce all-zero rows", () => {
    const df = strGetDummies(s(["a|b", null, "b"]));
    expect([...df.col("a").values]).toEqual([1, 0, 0]);
    expect([...df.col("b").values]).toEqual([1, 0, 1]);
  });

  test("undefined values produce all-zero rows", () => {
    const df = strGetDummies(s(["a", undefined as unknown as Scalar, "b"]));
    expect([...df.col("a").values]).toEqual([1, 0, 0]);
    expect([...df.col("b").values]).toEqual([0, 0, 1]);
  });

  test("NaN values produce all-zero rows", () => {
    const df = strGetDummies(s(["a|b", Number.NaN, "b"]));
    expect([...df.col("a").values]).toEqual([1, 0, 0]);
    expect([...df.col("b").values]).toEqual([1, 0, 1]);
  });

  test("empty-string elements produce all-zero rows", () => {
    const df = strGetDummies(s(["a|b", ""]));
    expect([...df.col("a").values]).toEqual([1, 0]);
    expect([...df.col("b").values]).toEqual([1, 0]);
  });

  test("all nulls returns empty-column DataFrame with preserved row count", () => {
    const df = strGetDummies(s([null, null]));
    expect([...df.columns.values]).toEqual([]);
    expect(df.shape).toEqual([2, 0]);
  });

  test("empty series returns empty DataFrame", () => {
    const df = strGetDummies(s([]));
    expect(df.shape).toEqual([0, 0]);
  });

  test("preserves original index", () => {
    const ser = new Series<Scalar>({ data: ["a|b", "c"], index: ["r1", "r2"] });
    const df = strGetDummies(ser);
    expect([...df.index.values]).toEqual(["r1", "r2"]);
  });

  test("duplicate tokens in same element are counted once", () => {
    const df = strGetDummies(s(["a|a|b"]));
    expect([...df.col("a").values]).toEqual([1]);
    expect([...df.col("b").values]).toEqual([1]);
  });

  test("whitespace tokens are preserved as-is (not stripped)", () => {
    const df = strGetDummies(s([" a | b "]));
    expect([...df.columns.values]).toEqual([" a ", " b "]);
  });

  test("prefix and prefixSep option", () => {
    const df = strGetDummies(s(["x|y"]), { prefix: "tag", prefixSep: "-" });
    expect([...df.columns.values]).toEqual(["tag-x", "tag-y"]);
  });
});

// ─── Result shape and types ───────────────────────────────────────────────────

describe("strGetDummies — result shape", () => {
  test("row count matches input series length", () => {
    const df = strGetDummies(s(["a|b", "c", "d|e|f"]));
    expect(df.shape[0]).toBe(3);
  });

  test("column count equals unique token count", () => {
    const df = strGetDummies(s(["a|b|c", "b|d"]));
    expect(df.shape[1]).toBe(4);
  });

  test("all values are 0 or 1", () => {
    const df = strGetDummies(s(["x|y", "y|z", "x|z"]));
    for (const col of df.columns.values as readonly string[]) {
      for (const v of df.col(col).values) {
        expect(v === 0 || v === 1).toBe(true);
      }
    }
  });

  test("sum of row values equals unique-token count per row", () => {
    const df = strGetDummies(s(["a|b|c", "a", "b|c"]));
    const cols = df.columns.values as readonly string[];
    const rowSums = [0, 1, 2].map((i) =>
      cols.reduce((acc, col) => {
        const v = df.col(col).values[i];
        return acc + (typeof v === "number" ? v : 0);
      }, 0),
    );
    expect(rowSums).toEqual([3, 1, 2]);
  });
});

// ─── Pandas parity examples ───────────────────────────────────────────────────

describe("strGetDummies — pandas parity", () => {
  test("pandas example: a|b, b|c, a", () => {
    // >>> pd.Series(['a|b', 'b|c', 'a']).str.get_dummies()
    //    a  b  c
    // 0  1  1  0
    // 1  0  1  1
    // 2  1  0  0
    const df = strGetDummies(s(["a|b", "b|c", "a"]));
    expect(df.toRecords()).toEqual([
      { a: 1, b: 1, c: 0 },
      { a: 0, b: 1, c: 1 },
      { a: 1, b: 0, c: 0 },
    ]);
  });

  test("pandas example: custom sep comma", () => {
    const df = strGetDummies(s(["a,b", "b,c", "a"]), { sep: "," });
    expect(df.toRecords()).toEqual([
      { a: 1, b: 1, c: 0 },
      { a: 0, b: 1, c: 1 },
      { a: 1, b: 0, c: 0 },
    ]);
  });

  test("multi-label tags scenario", () => {
    const df = strGetDummies(s(["python|pandas", "python|numpy", "pandas|numpy|scipy"]));
    expect([...df.columns.values]).toEqual(["numpy", "pandas", "python", "scipy"]);
    expect([...df.col("python").values]).toEqual([1, 1, 0]);
    expect([...df.col("scipy").values]).toEqual([0, 0, 1]);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("strGetDummies — property-based", () => {
  test("row count always equals series length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.string({ maxLength: 10 }), { nil: null }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const df = strGetDummies(s(arr as Scalar[]));
          return df.shape[0] === arr.length;
        },
      ),
    );
  });

  test("all cell values are 0 or 1", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.option(
            fc
              .array(fc.string({ minLength: 1, maxLength: 5 }), {
                minLength: 1,
                maxLength: 4,
              })
              .map((parts) => parts.join("|")),
            { nil: null },
          ),
          { minLength: 1, maxLength: 15 },
        ),
        (arr) => {
          const df = strGetDummies(s(arr as Scalar[]));
          for (const col of df.columns.values as readonly string[]) {
            for (const v of df.col(col).values) {
              if (v !== 0 && v !== 1) {
                return false;
              }
            }
          }
          return true;
        },
      ),
    );
  });

  test("index is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 10 }), { minLength: 1, maxLength: 15 }),
        (arr) => {
          const ser = s(arr as Scalar[]);
          const df = strGetDummies(ser);
          const origIdx = [...ser.index.values];
          const dfIdx = [...df.index.values];
          return origIdx.length === dfIdx.length && origIdx.every((v, i) => v === dfIdx[i]);
        },
      ),
    );
  });

  test("columns are always sorted lexicographically", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .array(fc.string({ minLength: 1, maxLength: 5 }), {
              minLength: 1,
              maxLength: 4,
            })
            .map((parts) => parts.join("|")),
          { minLength: 1, maxLength: 10 },
        ),
        (arr) => {
          const df = strGetDummies(s(arr as Scalar[]));
          const cols = (df.columns.values as readonly string[]).map(String);
          const sorted = [...cols].sort();
          return cols.every((c, i) => c === sorted[i]);
        },
      ),
    );
  });

  test("null/undefined/NaN rows always have row-sum 0", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(Number.NaN),
            fc
              .array(fc.string({ minLength: 1, maxLength: 4 }), {
                minLength: 1,
                maxLength: 3,
              })
              .map((parts) => parts.join("|")),
          ),
          { minLength: 1, maxLength: 10 },
        ),
        (arr) => {
          const df = strGetDummies(s(arr as Scalar[]));
          const cols = df.columns.values as readonly string[];
          for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            const isMissing =
              v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
            if (!isMissing) {
              continue;
            }
            for (const col of cols) {
              if (df.col(col).values[i] !== 0) {
                return false;
              }
            }
          }
          return true;
        },
      ),
    );
  });
});
