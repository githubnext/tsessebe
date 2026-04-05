/**
 * Tests for src/stats/describe.ts — describe() and quantile().
 */
import { describe as bDescribe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, describe, quantile } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── quantile ─────────────────────────────────────────────────────────────────

bDescribe("quantile", () => {
  it("returns NaN for empty array", () => {
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
  });

  it("returns the single element at any q for a one-element array", () => {
    expect(quantile([42], 0)).toBe(42);
    expect(quantile([42], 0.5)).toBe(42);
    expect(quantile([42], 1)).toBe(42);
  });

  it("min at q=0, max at q=1", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(quantile(sorted, 0)).toBe(1);
    expect(quantile(sorted, 1)).toBe(5);
  });

  it("median at q=0.5 for even-length array", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5);
  });

  it("median at q=0.5 for odd-length array", () => {
    expect(quantile([1, 2, 3], 0.5)).toBe(2);
  });

  it("Q1 and Q3 for [1,2,3,4,5]", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(quantile(sorted, 0.25)).toBe(2);
    expect(quantile(sorted, 0.75)).toBe(4);
  });

  it("linear interpolation between neighbours", () => {
    expect(quantile([0, 10], 0.3)).toBeCloseTo(3);
  });

  it("property: result is within [min, max]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 50,
        }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (arr, q) => {
          const sorted = [...arr].sort((a, b) => a - b);
          const result = quantile(sorted, q);
          return result >= (sorted[0] as number) && result <= (sorted.at(-1) as number);
        },
      ),
    );
  });
});

// ─── Series.quantile ─────────────────────────────────────────────────────────

bDescribe("Series.quantile", () => {
  it("matches standalone quantile function", () => {
    const s = new Series({ data: [3, 1, 4, 1, 5, 9, 2, 6] });
    const sorted = [1, 1, 2, 3, 4, 5, 6, 9];
    expect(s.quantile(0.5)).toBeCloseTo(quantile(sorted, 0.5));
    expect(s.quantile(0.25)).toBeCloseTo(quantile(sorted, 0.25));
    expect(s.quantile(0.75)).toBeCloseTo(quantile(sorted, 0.75));
  });

  it("returns NaN for empty Series", () => {
    const s = new Series({ data: [] });
    expect(Number.isNaN(s.quantile(0.5))).toBe(true);
  });

  it("ignores null values", () => {
    const s = new Series({ data: [1, null, 3, null, 5] });
    const sorted = [1, 3, 5];
    expect(s.quantile(0.5)).toBeCloseTo(quantile(sorted, 0.5));
  });
});

// ─── describe(Series) ─────────────────────────────────────────────────────────

bDescribe("describe(Series)", () => {
  it("numeric Series has correct stat labels", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = describe(s) as Series<Scalar>;
    expect(result.index.values).toEqual([
      "count",
      "mean",
      "std",
      "min",
      "25%",
      "50%",
      "75%",
      "max",
    ]);
  });

  it("numeric Series counts correctly", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("count")).toBe(5);
  });

  it("numeric Series mean is correct", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("mean")).toBeCloseTo(3);
  });

  it("numeric Series std is correct (ddof=1)", () => {
    // [1,2,3,4,5]: variance = 2.5, std = sqrt(2.5) ≈ 1.5811
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("std")).toBeCloseTo(Math.sqrt(2.5), 5);
  });

  it("numeric Series min and max", () => {
    const s = new Series({ data: [3, 1, 4, 1, 5, 9] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("min")).toBe(1);
    expect(result.at("max")).toBe(9);
  });

  it("numeric Series 50% matches median", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("50%")).toBeCloseTo(3);
  });

  it("custom percentiles appear correctly", () => {
    const s = new Series({ data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    const result = describe(s, { percentiles: [0.1, 0.9] }) as Series<Scalar>;
    expect(result.index.values).toContain("10%");
    expect(result.index.values).toContain("90%");
    expect(result.index.values).not.toContain("25%");
  });

  it("handles single-element numeric Series", () => {
    const s = new Series({ data: [42] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("count")).toBe(1);
    expect(result.at("mean")).toBeCloseTo(42);
    expect(result.at("min")).toBe(42);
    expect(result.at("max")).toBe(42);
    expect(Number.isNaN(result.at("std") as number)).toBe(true);
  });

  it("handles all-null numeric Series (empty numerics)", async () => {
    const { Dtype } = await import("../../src/index.ts");
    const s = new Series({ data: [null, null], dtype: Dtype.float64 });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("count")).toBe(0);
    expect(Number.isNaN(result.at("mean") as number)).toBe(true);
  });

  it("categorical Series has correct stat labels", () => {
    const s = new Series({ data: ["a", "b", "a", "c"] });
    const result = describe(s) as Series<Scalar>;
    expect(result.index.values).toEqual(["count", "unique", "top", "freq"]);
  });

  it("categorical Series count", () => {
    const s = new Series({ data: ["a", "b", "a", "c"] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("count")).toBe(4);
  });

  it("categorical Series unique", () => {
    const s = new Series({ data: ["a", "b", "a", "c"] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("unique")).toBe(3);
  });

  it("categorical Series top and freq", () => {
    const s = new Series({ data: ["a", "b", "a", "c"] });
    const result = describe(s) as Series<Scalar>;
    expect(result.at("top")).toBe("a");
    expect(result.at("freq")).toBe(2);
  });

  it("series name is preserved in result", () => {
    const s = new Series({ data: [1, 2, 3], name: "score" });
    const result = describe(s) as Series<Scalar>;
    expect(result.name).toBe("score");
  });
});

// ─── describe(DataFrame) ─────────────────────────────────────────────────────

bDescribe("describe(DataFrame)", () => {
  it("numeric-only DataFrame has expected columns and rows", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = describe(df) as DataFrame;
    expect(result.columns.values).toEqual(["a", "b"]);
    expect(result.index.values).toEqual([
      "count",
      "mean",
      "std",
      "min",
      "25%",
      "50%",
      "75%",
      "max",
    ]);
  });

  it("count row equals number of non-null values", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, null, 4] });
    const result = describe(df) as DataFrame;
    expect(result.col("x").at("count")).toBe(3);
  });

  it("mean is correct per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = describe(df) as DataFrame;
    expect(result.col("a").at("mean")).toBeCloseTo(2);
  });

  it("include='object' shows only string columns", () => {
    const df = DataFrame.fromColumns({ name: ["Alice", "Bob", "Alice"], age: [25, 30, 25] });
    const result = describe(df, { include: "object" }) as DataFrame;
    expect(result.columns.values).toEqual(["name"]);
    expect(result.index.values).toEqual(["count", "unique", "top", "freq"]);
  });

  it("include='all' shows both numeric and categorical columns", () => {
    const df = DataFrame.fromColumns({ name: ["A", "B", "A"], score: [10, 20, 30] });
    const result = describe(df, { include: "all" }) as DataFrame;
    expect(result.columns.values).toContain("name");
    expect(result.columns.values).toContain("score");
    // numeric rows present
    expect(result.index.values).toContain("mean");
    // categorical rows present
    expect(result.index.values).toContain("unique");
  });

  it("returns empty DataFrame when no columns match include filter", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = describe(df, { include: "object" }) as DataFrame;
    expect(result.columns.values).toEqual([]);
  });

  it("property: count row never exceeds column length for numeric data", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.float({ noNaN: true, noDefaultInfinity: true }), fc.constant<null>(null)),
          { minLength: 1, maxLength: 20 },
        ),
        (arr) => {
          // ensure at least one non-null number so column is treated as numeric
          const data = [1, ...arr];
          const df = DataFrame.fromColumns({ x: data });
          const result = describe(df) as DataFrame;
          if (!result.columns.values.includes("x")) {
            return true; // filtered out
          }
          const cnt = result.col("x").at("count") as number;
          return cnt >= 0 && cnt <= data.length;
        },
      ),
    );
  });
});
