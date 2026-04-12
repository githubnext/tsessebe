/**
 * Tests for src/stats/notna_isna.ts
 * — isna, notna, isnull, notnull, fillna, dropna, countna, countValid
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  countValid,
  countna,
  dropna,
  fillna,
  isna,
  isnull,
  notna,
  notnull,
} from "../../src/stats/notna_isna.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[], name?: string): Series<Scalar> {
  return new Series({ data: [...data], name: name ?? null });
}

function sv(series: Series<Scalar>): readonly Scalar[] {
  return series.values;
}

// ─── isna — scalar ────────────────────────────────────────────────────────────

describe("isna — scalar", () => {
  it("returns true for null", () => {
    expect(isna(null)).toBe(true);
  });

  it("returns true for undefined", () => {
    expect(isna(undefined)).toBe(true);
  });

  it("returns true for NaN", () => {
    expect(isna(NaN)).toBe(true);
  });

  it("returns false for 0", () => {
    expect(isna(0)).toBe(false);
  });

  it("returns false for false", () => {
    expect(isna(false)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isna("")).toBe(false);
  });

  it("returns false for a regular number", () => {
    expect(isna(42)).toBe(false);
  });

  it("returns false for a non-empty string", () => {
    expect(isna("hello")).toBe(false);
  });

  it("returns false for a Date", () => {
    expect(isna(new Date("2024-01-01"))).toBe(false);
  });

  it("returns false for true", () => {
    expect(isna(true)).toBe(false);
  });
});

// ─── isna — array ─────────────────────────────────────────────────────────────

describe("isna — array", () => {
  it("maps correctly over mixed array", () => {
    expect(isna([1, null, NaN, "x", undefined])).toEqual([false, true, true, false, true]);
  });

  it("returns all-false for array with no missing values", () => {
    expect(isna([1, 2, 3])).toEqual([false, false, false]);
  });

  it("returns all-true for array of nulls", () => {
    expect(isna([null, null, null])).toEqual([true, true, true]);
  });

  it("handles empty array", () => {
    expect(isna([])).toEqual([]);
  });
});

// ─── isna — Series ────────────────────────────────────────────────────────────

describe("isna — Series", () => {
  it("returns boolean Series with true at missing positions", () => {
    const result = isna(s([1, null, NaN, 4]));
    expect(sv(result)).toEqual([false, true, true, false]);
  });

  it("returns all-false for complete series", () => {
    const result = isna(s([10, 20, 30]));
    expect(sv(result)).toEqual([false, false, false]);
  });

  it("preserves series name", () => {
    const result = isna(s([1, null], "x"));
    expect(result.name).toBe("x");
  });

  it("handles all-missing series", () => {
    const result = isna(s([null, undefined, NaN]));
    expect(sv(result)).toEqual([true, true, true]);
  });
});

// ─── isna — DataFrame ─────────────────────────────────────────────────────────

describe("isna — DataFrame", () => {
  it("returns boolean DataFrame", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([1, null, 3]) as Series<Scalar>],
        ["b", s([NaN, 5, null]) as Series<Scalar>],
      ]),
    );
    const result = isna(df);
    expect(sv(result.col("a"))).toEqual([false, true, false]);
    expect(sv(result.col("b"))).toEqual([true, false, true]);
  });

  it("returns all-false DataFrame for complete data", () => {
    const df = new DataFrame(
      new Map([
        ["x", s([1, 2]) as Series<Scalar>],
        ["y", s([3, 4]) as Series<Scalar>],
      ]),
    );
    const result = isna(df);
    expect(sv(result.col("x"))).toEqual([false, false]);
    expect(sv(result.col("y"))).toEqual([false, false]);
  });
});

// ─── notna — scalar ───────────────────────────────────────────────────────────

describe("notna — scalar", () => {
  it("returns false for null", () => {
    expect(notna(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(notna(undefined)).toBe(false);
  });

  it("returns false for NaN", () => {
    expect(notna(NaN)).toBe(false);
  });

  it("returns true for 0", () => {
    expect(notna(0)).toBe(true);
  });

  it("returns true for false", () => {
    expect(notna(false)).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(notna("")).toBe(true);
  });

  it("returns true for regular number", () => {
    expect(notna(42)).toBe(true);
  });
});

// ─── notna — array ────────────────────────────────────────────────────────────

describe("notna — array", () => {
  it("is the inverse of isna for arrays", () => {
    const arr: Scalar[] = [1, null, NaN, "x", undefined];
    const naFlags = isna(arr);
    const notnaFlags = notna(arr);
    for (let i = 0; i < arr.length; i++) {
      expect(notnaFlags[i]).toBe(!naFlags[i]);
    }
  });
});

// ─── notna — Series ───────────────────────────────────────────────────────────

describe("notna — Series", () => {
  it("is the inverse of isna for Series", () => {
    const series = s([1, null, NaN, 4]);
    const naResult = isna(series);
    const notnaResult = notna(series);
    for (let i = 0; i < series.values.length; i++) {
      expect(notnaResult.iat(i)).toBe(!naResult.iat(i));
    }
  });
});

// ─── isnull / notnull aliases ─────────────────────────────────────────────────

describe("isnull / notnull — aliases", () => {
  it("isnull(scalar) matches isna(scalar)", () => {
    expect(isnull(null)).toBe(isna(null));
    expect(isnull(1)).toBe(isna(1));
    expect(isnull(NaN)).toBe(isna(NaN));
  });

  it("notnull(scalar) matches notna(scalar)", () => {
    expect(notnull(null)).toBe(notna(null));
    expect(notnull(42)).toBe(notna(42));
  });

  it("isnull(array) matches isna(array)", () => {
    const arr: Scalar[] = [1, null, NaN];
    expect(isnull(arr)).toEqual(isna(arr));
  });

  it("isnull(Series) values match isna(Series) values", () => {
    const series = s([1, null, 3]);
    expect(sv(isnull(series))).toEqual(sv(isna(series)));
  });

  it("isnull(DataFrame) matches isna(DataFrame) column values", () => {
    const df = new DataFrame(
      new Map([["a", s([null, 1, NaN]) as Series<Scalar>]]),
    );
    const r1 = isnull(df);
    const r2 = isna(df);
    expect(sv(r1.col("a"))).toEqual(sv(r2.col("a")));
  });
});

// ─── fillna — scalar ──────────────────────────────────────────────────────────

describe("fillna — scalar", () => {
  it("fills null with value", () => {
    expect(fillna(null, { value: 0 })).toBe(0);
  });

  it("fills undefined with value", () => {
    expect(fillna(undefined, { value: -1 })).toBe(-1);
  });

  it("fills NaN with value", () => {
    expect(fillna(NaN, { value: 99 })).toBe(99);
  });

  it("leaves non-missing scalar unchanged", () => {
    expect(fillna(42, { value: 0 })).toBe(42);
  });

  it("leaves zero unchanged", () => {
    expect(fillna(0, { value: -1 })).toBe(0);
  });
});

// ─── fillna — array ───────────────────────────────────────────────────────────

describe("fillna — array", () => {
  it("replaces null and NaN with value, keeps rest", () => {
    expect(fillna([1, null, NaN, 3], { value: 0 })).toEqual([1, 0, 0, 3]);
  });

  it("replaces undefined", () => {
    expect(fillna([undefined, 5, null], { value: -1 })).toEqual([-1, 5, -1]);
  });

  it("handles empty array", () => {
    expect(fillna([], { value: 0 })).toEqual([]);
  });

  it("leaves complete array unchanged", () => {
    expect(fillna([1, 2, 3], { value: 0 })).toEqual([1, 2, 3]);
  });
});

// ─── fillna — Series ──────────────────────────────────────────────────────────

describe("fillna — Series", () => {
  it("replaces missing values in a Series", () => {
    const result = fillna(s([1, null, NaN, 4]), { value: 0 });
    expect(sv(result as Series<Scalar>)).toEqual([1, 0, 0, 4]);
  });

  it("leaves complete Series unchanged", () => {
    const result = fillna(s([10, 20]), { value: -1 });
    expect(sv(result as Series<Scalar>)).toEqual([10, 20]);
  });
});

// ─── fillna — DataFrame ───────────────────────────────────────────────────────

describe("fillna — DataFrame", () => {
  it("fills all missing cells with value", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([1, null]) as Series<Scalar>],
        ["b", s([NaN, 5]) as Series<Scalar>],
      ]),
    );
    const result = fillna(df, { value: 0 }) as DataFrame;
    expect(sv(result.col("a"))).toEqual([1, 0]);
    expect(sv(result.col("b"))).toEqual([0, 5]);
  });
});

// ─── dropna — array ───────────────────────────────────────────────────────────

describe("dropna — array", () => {
  it("removes null, undefined, and NaN", () => {
    expect(dropna([1, null, NaN, 3, undefined, 5])).toEqual([1, 3, 5]);
  });

  it("returns empty array when all missing", () => {
    expect(dropna([null, NaN, undefined])).toEqual([]);
  });

  it("returns unchanged array when none missing", () => {
    expect(dropna([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("handles empty array", () => {
    expect(dropna([])).toEqual([]);
  });
});

// ─── dropna — Series ──────────────────────────────────────────────────────────

describe("dropna — Series", () => {
  it("drops missing values from a Series", () => {
    const result = dropna(s([1, null, NaN, 4])) as Series<Scalar>;
    expect(sv(result)).toEqual([1, 4]);
  });

  it("returns complete Series unchanged", () => {
    const result = dropna(s([10, 20, 30])) as Series<Scalar>;
    expect(sv(result)).toEqual([10, 20, 30]);
  });

  it("returns empty Series when all missing", () => {
    const result = dropna(s([null, NaN])) as Series<Scalar>;
    expect(sv(result)).toEqual([]);
  });
});

// ─── dropna — DataFrame (axis=0, how="any") ───────────────────────────────────

describe("dropna — DataFrame axis=0 how=any", () => {
  it("drops rows with any missing value", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([1, null, 3]) as Series<Scalar>],
        ["b", s([4, 5, 6]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df) as DataFrame;
    expect(result.shape[0]).toBe(2);
    expect(sv(result.col("a"))).toEqual([1, 3]);
    expect(sv(result.col("b"))).toEqual([4, 6]);
  });

  it("keeps all rows when no missing values", () => {
    const df = new DataFrame(
      new Map([
        ["x", s([1, 2, 3]) as Series<Scalar>],
        ["y", s([4, 5, 6]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df) as DataFrame;
    expect(result.shape[0]).toBe(3);
  });

  it("drops all rows when every row has a missing value", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([null, null]) as Series<Scalar>],
        ["b", s([1, 2]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df) as DataFrame;
    expect(result.shape[0]).toBe(0);
  });
});

// ─── dropna — DataFrame (axis=0, how="all") ───────────────────────────────────

describe("dropna — DataFrame axis=0 how=all", () => {
  it("keeps rows with at least one non-missing value", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([1, null, null]) as Series<Scalar>],
        ["b", s([4, null, 6]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df, { how: "all" }) as DataFrame;
    expect(result.shape[0]).toBe(2);
    expect(sv(result.col("a"))).toEqual([1, null]);
    expect(sv(result.col("b"))).toEqual([4, 6]);
  });

  it("drops rows only when all values are missing", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([null, null]) as Series<Scalar>],
        ["b", s([null, 2]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df, { how: "all" }) as DataFrame;
    expect(result.shape[0]).toBe(1);
    expect(sv(result.col("b"))).toEqual([2]);
  });
});

// ─── dropna — DataFrame (axis=1) ─────────────────────────────────────────────

describe("dropna — DataFrame axis=1", () => {
  it("drops columns with any missing value", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([1, 2, 3]) as Series<Scalar>],
        ["b", s([4, null, 6]) as Series<Scalar>],
        ["c", s([7, 8, 9]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df, { axis: 1 }) as DataFrame;
    expect(result.columns.values).toEqual(["a", "c"]);
  });

  it("keeps all columns when no missing values", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([1, 2]) as Series<Scalar>],
        ["b", s([3, 4]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df, { axis: 1 }) as DataFrame;
    expect(result.columns.values).toEqual(["a", "b"]);
  });

  it("drops columns only when all values missing (how=all)", () => {
    const df = new DataFrame(
      new Map([
        ["a", s([null, null]) as Series<Scalar>],
        ["b", s([null, 1]) as Series<Scalar>],
      ]),
    );
    const result = dropna(df, { axis: 1, how: "all" }) as DataFrame;
    expect(result.columns.values).toEqual(["b"]);
  });
});

// ─── countna / countValid ─────────────────────────────────────────────────────

describe("countna", () => {
  it("counts nulls, undefineds, NaNs in array", () => {
    expect(countna([1, null, NaN, 3, undefined])).toBe(3);
  });

  it("returns 0 for complete array", () => {
    expect(countna([1, 2, 3])).toBe(0);
  });

  it("counts missing values in Series", () => {
    expect(countna(s([null, 1, NaN]))).toBe(2);
  });

  it("returns 0 for empty array", () => {
    expect(countna([])).toBe(0);
  });
});

describe("countValid", () => {
  it("counts non-missing values in array", () => {
    expect(countValid([1, null, NaN, 3, undefined])).toBe(2);
  });

  it("returns full length for complete array", () => {
    expect(countValid([1, 2, 3])).toBe(3);
  });

  it("counts valid values in Series", () => {
    expect(countValid(s([null, 1, NaN, 4]))).toBe(2);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

const scalarsArb = fc.array(
  fc.oneof(
    fc.integer(),
    fc.double({ noNaN: false }),
    fc.string(),
    fc.boolean(),
    fc.constant(null),
    fc.constant(undefined),
  ) as fc.Arbitrary<Scalar>,
  { minLength: 0, maxLength: 20 },
);

describe("property: isna/notna are exact inverses (array)", () => {
  it("notna[i] === !isna[i] for all arrays", () => {
    fc.assert(
      fc.property(scalarsArb, (arr) => {
        const na = isna(arr);
        const nna = notna(arr);
        return na.every((v, i) => v === !nna[i]);
      }),
    );
  });
});

describe("property: fillna removes all missing values (array)", () => {
  it("fillna([...], {value: 0}) has no missing values", () => {
    fc.assert(
      fc.property(scalarsArb, (arr) => {
        const filled = fillna(arr, { value: 0 });
        return !filled.some((v) => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)));
      }),
    );
  });
});

describe("property: countna + countValid === length (array)", () => {
  it("countna + countValid equals array length", () => {
    fc.assert(
      fc.property(scalarsArb, (arr) => {
        return countna(arr) + countValid(arr) === arr.length;
      }),
    );
  });
});
