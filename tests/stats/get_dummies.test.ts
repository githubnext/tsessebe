/**
 * Tests for get_dummies / fromDummies — one-hot encoding.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  fromDummies,
  getDummies,
  getDummiesDataFrame,
  getDummiesSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── getDummiesSeries ─────────────────────────────────────────────────────────

describe("getDummiesSeries", () => {
  it("encodes a string series with default prefix", () => {
    const s = new Series<Scalar>({ data: ["cat", "dog", "cat", "fish"], name: "animal" });
    const df = getDummiesSeries(s);
    expect(df.columns.values).toEqual(["animal_cat", "animal_dog", "animal_fish"]);
    expect(df.col("animal_cat").values).toEqual([1, 0, 1, 0]);
    expect(df.col("animal_dog").values).toEqual([0, 1, 0, 0]);
    expect(df.col("animal_fish").values).toEqual([0, 0, 0, 1]);
  });

  it("uses custom prefix and separator", () => {
    const s = new Series<Scalar>({ data: ["a", "b"], name: "x" });
    const df = getDummiesSeries(s, { prefix: "col", prefixSep: "__" });
    expect(df.columns.values).toEqual(["col__a", "col__b"]);
  });

  it("drops first level when dropFirst=true", () => {
    const s = new Series<Scalar>({ data: ["a", "b", "c"] });
    const df = getDummiesSeries(s, { dropFirst: true });
    expect(df.columns.values.length).toBe(2);
    // alphabetically sorted: a, b, c → drop a → b, c
    expect(df.columns.values).toEqual(["_b", "_c"]);
  });

  it("includes NaN column when dummyNa=true", () => {
    const s = new Series<Scalar>({ data: ["a", null, "b"], name: "x" });
    const df = getDummiesSeries(s, { dummyNa: true });
    expect(df.columns.values).toContain("x_nan");
    expect(df.col("x_nan").values).toEqual([0, 1, 0]);
  });

  it("ignores NaN by default", () => {
    const s = new Series<Scalar>({ data: ["a", null, "b"], name: "x" });
    const df = getDummiesSeries(s);
    expect(df.columns.values).not.toContain("x_nan");
    expect(df.col("x_a").values).toEqual([1, 0, 0]);
  });

  it("unnamed series uses empty prefix", () => {
    const s = new Series<Scalar>({ data: ["a", "b"] });
    const df = getDummiesSeries(s);
    expect(df.columns.values).toEqual(["_a", "_b"]);
  });

  it("preserves row index from series", () => {
    const s = new Series<Scalar>({ data: ["a", "b"], index: [10, 20], name: "x" });
    const df = getDummiesSeries(s);
    expect(df.index.values).toEqual([10, 20]);
  });

  it("handles boolean series", () => {
    const s = new Series<Scalar>({ data: [true, false, true], name: "flag" });
    const df = getDummiesSeries(s);
    expect(df.columns.values).toEqual(["flag_false", "flag_true"]);
  });

  it("handles numeric series", () => {
    const s = new Series<Scalar>({ data: [1, 2, 1, 3], name: "num" });
    const df = getDummiesSeries(s);
    expect(df.columns.values).toEqual(["num_1", "num_2", "num_3"]);
    expect(df.col("num_1").values).toEqual([1, 0, 1, 0]);
  });

  it("empty series returns empty DataFrame", () => {
    const s = new Series<Scalar>({ data: [], name: "x" });
    const df = getDummiesSeries(s);
    expect(df.columns.values.length).toBe(0);
    expect(df.index.size).toBe(0);
  });

  it("single-element series", () => {
    const s = new Series<Scalar>({ data: ["only"], name: "x" });
    const df = getDummiesSeries(s);
    expect(df.col("x_only").values).toEqual([1]);
  });

  it("all-NaN series with dummyNa=true only has nan column", () => {
    const s = new Series<Scalar>({ data: [null, null], name: "x" });
    const df = getDummiesSeries(s, { dummyNa: true });
    expect(df.columns.values).toEqual(["x_nan"]);
    expect(df.col("x_nan").values).toEqual([1, 1]);
  });
});

// ─── getDummiesDataFrame ──────────────────────────────────────────────────────

describe("getDummiesDataFrame", () => {
  it("encodes categorical columns, preserves numeric", () => {
    const df = DataFrame.fromColumns({
      x: [1, 2, 3],
      color: ["red", "blue", "red"],
    });
    const result = getDummiesDataFrame(df);
    expect(result.columns.values).toContain("x");
    expect(result.columns.values).toContain("color_blue");
    expect(result.columns.values).toContain("color_red");
    expect(result.col("x").values).toEqual([1, 2, 3]);
    expect(result.col("color_blue").values).toEqual([0, 1, 0]);
    expect(result.col("color_red").values).toEqual([1, 0, 1]);
  });

  it("encodes only specified columns", () => {
    const df = DataFrame.fromColumns({
      a: ["x", "y"],
      b: ["p", "q"],
      n: [1, 2],
    });
    const result = getDummiesDataFrame(df, { columns: ["a"] });
    expect(result.columns.values).toContain("a_x");
    expect(result.columns.values).toContain("a_y");
    expect(result.columns.values).toContain("b");
    expect(result.columns.values).toContain("n");
    expect(result.columns.values).not.toContain("b_p");
  });

  it("applies prefix array aligned to encoded columns", () => {
    const df = DataFrame.fromColumns({ a: ["x", "y"], b: ["p", "q"] });
    const result = getDummiesDataFrame(df, { prefix: ["pfxA", "pfxB"] });
    expect(result.columns.values).toContain("pfxA_x");
    expect(result.columns.values).toContain("pfxB_p");
  });

  it("applies record prefix mapping", () => {
    const df = DataFrame.fromColumns({ color: ["r", "g"] });
    const result = getDummiesDataFrame(df, { prefix: { color: "clr" } });
    expect(result.columns.values).toContain("clr_r");
    expect(result.columns.values).toContain("clr_g");
  });

  it("dropFirst drops first level", () => {
    const df = DataFrame.fromColumns({ cat: ["a", "b", "c"] });
    const result = getDummiesDataFrame(df, { dropFirst: true });
    // sorted levels: a, b, c → drop a → cat_b, cat_c
    expect(result.columns.values).toEqual(["cat_b", "cat_c"]);
  });

  it("dummyNa includes nan column", () => {
    const df = DataFrame.fromColumns({ cat: ["a", null, "b"] });
    const result = getDummiesDataFrame(df, { dummyNa: true });
    expect(result.columns.values).toContain("cat_nan");
  });

  it("all numeric DataFrame returns unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const result = getDummiesDataFrame(df);
    expect(result.columns.values).toEqual(["a", "b"]);
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns({ cat: ["a", "b"] }, { index: [5, 10] });
    const result = getDummiesDataFrame(df);
    expect(result.index.values).toEqual([5, 10]);
  });
});

// ─── getDummies (unified) ─────────────────────────────────────────────────────

describe("getDummies (unified)", () => {
  it("dispatches to getDummiesSeries for Series input", () => {
    const s = new Series<Scalar>({ data: ["a", "b"], name: "x" });
    const result = getDummies(s);
    expect(result.columns.values).toContain("x_a");
  });

  it("dispatches to getDummiesDataFrame for DataFrame input", () => {
    const df = DataFrame.fromColumns({ cat: ["a", "b"] });
    const result = getDummies(df);
    expect(result.columns.values).toContain("cat_a");
  });
});

// ─── fromDummies ──────────────────────────────────────────────────────────────

describe("fromDummies", () => {
  it("reconstructs a series from dummy columns", () => {
    const df = DataFrame.fromColumns({
      x_a: [1, 0, 1, 0],
      x_b: [0, 1, 0, 0],
      x_c: [0, 0, 0, 1],
    });
    const s = fromDummies(df, { sep: "_" });
    expect([...s.values]).toEqual(["a", "b", "a", "c"]);
    expect(s.name).toBe("x");
  });

  it("uses null for all-zero rows by default", () => {
    const df = DataFrame.fromColumns({
      x_a: [1, 0],
      x_b: [0, 0],
    });
    const s = fromDummies(df);
    expect(s.values[1]).toBeNull();
  });

  it("uses defaultCategory for all-zero rows when provided", () => {
    const df = DataFrame.fromColumns({
      x_a: [1, 0],
      x_b: [0, 0],
    });
    const s = fromDummies(df, { defaultCategory: "unknown" });
    expect(s.values[1]).toBe("unknown");
  });

  it("throws if row has multiple active dummies", () => {
    const df = DataFrame.fromColumns({
      x_a: [1, 1],
      x_b: [1, 0],
    });
    expect(() => fromDummies(df)).toThrow(RangeError);
  });

  it("empty DataFrame returns empty Series", () => {
    const df = DataFrame.fromColumns({});
    const s = fromDummies(df);
    expect(s.values.length).toBe(0);
  });

  it("columns without sep produce null name", () => {
    const df = DataFrame.fromColumns({ a: [1, 0], b: [0, 1] });
    const s = fromDummies(df, { sep: "_" });
    // no "_" in column names → prefix="" for all → seriesName=""→null
    expect(s.name).toBeNull();
  });

  it("round-trips getDummiesSeries → fromDummies", () => {
    const original = new Series<Scalar>({
      data: ["alpha", "beta", "alpha", "gamma"],
      name: "word",
    });
    const dummies = getDummiesSeries(original);
    const recovered = fromDummies(dummies, { sep: "_" });
    expect([...recovered.values]).toEqual(["alpha", "beta", "alpha", "gamma"]);
    expect(recovered.name).toBe("word");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("getDummiesSeries — property tests", () => {
  it("each row has exactly one 1 (no NaN, no dropFirst)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c", "d"), { minLength: 1, maxLength: 30 }),
        (data) => {
          const s = new Series<Scalar>({ data, name: "v" });
          const df = getDummiesSeries(s);
          for (let i = 0; i < data.length; i++) {
            const rowSum = df.columns.values.reduce((sum, c) => {
              const v = df.col(c).values[i];
              return sum + (typeof v === "number" ? v : 0);
            }, 0);
            if (rowSum !== 1) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("number of dummy columns equals number of unique non-null values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("x", "y", "z", null), { minLength: 0, maxLength: 20 }),
        (data) => {
          const s = new Series<Scalar>({ data, name: "v" });
          const df = getDummiesSeries(s);
          const unique = new Set(data.filter((v) => v !== null));
          return df.columns.values.length === unique.size;
        },
      ),
    );
  });

  it("round-trip: getDummies → fromDummies recovers original values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("cat", "dog", "fish"), { minLength: 1, maxLength: 20 }),
        (data) => {
          const s = new Series<Scalar>({ data, name: "animal" });
          const dummies = getDummiesSeries(s);
          const recovered = fromDummies(dummies, { sep: "_" });
          return (
            recovered.values.length === data.length &&
            recovered.values.every((v, i) => v === data[i])
          );
        },
      ),
    );
  });
});
