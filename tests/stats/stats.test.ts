/**
 * Tests for src/stats/ — describe, corr, cov, skewness, kurtosis.
 */

import { describe as bunDescribe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import {
  corrDataFrame,
  corrSeries,
  covDataFrame,
  covSeries,
  describe,
  describeDataFrame,
  kurtDataFrame,
  kurtSeries,
  kurtosisDataFrame,
  kurtosisSeries,
  skewDataFrame,
  skewSeries,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function closeEnough(a: number, b: number, tol = 1e-9): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  return Math.abs(a - b) < tol;
}

// ─── describe (Series) ────────────────────────────────────────────────────────

bunDescribe("describe — numeric Series", () => {
  test("basic stats for [1,2,3,4,5]", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const d = describe(s);
    expect(d.at("count")).toBe(5);
    expect(d.at("mean")).toBe(3);
    expect(closeEnough(d.at("std") as number, Math.sqrt(2.5))).toBe(true);
    expect(d.at("min")).toBe(1);
    expect(d.at("max")).toBe(5);
    expect(d.at("50%")).toBe(3);
  });

  test("25th / 75th percentiles", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8] });
    const d = describe(s);
    // pandas uses linear interpolation
    expect(d.at("25%")).toBe(2.75);
    expect(d.at("75%")).toBe(6.25);
  });

  test("skips missing values", () => {
    const s = new Series({ data: [1, null, 2, null, 3] });
    const d = describe(s);
    expect(d.at("count")).toBe(3);
    expect(d.at("mean")).toBe(2);
  });

  test("empty series returns NaN stats", () => {
    const s = new Series<number>({ data: [] });
    const d = describe(s);
    expect(d.at("count")).toBe(0);
    expect(Number.isNaN(d.at("mean") as number)).toBe(true);
  });

  test("single-element series", () => {
    const s = new Series({ data: [42] });
    const d = describe(s);
    expect(d.at("count")).toBe(1);
    expect(d.at("mean")).toBe(42);
    expect(Number.isNaN(d.at("std") as number)).toBe(true);
  });
});

bunDescribe("describe — object Series", () => {
  test("count/unique/top/freq for string series", () => {
    const s = new Series({ data: ["a", "b", "a", "c", "a"] });
    const d = describe(s);
    expect(d.at("count")).toBe(5);
    expect(d.at("unique")).toBe(3);
    expect(d.at("top")).toBe("a");
    expect(d.at("freq")).toBe(3);
  });
});

// ─── describeDataFrame ────────────────────────────────────────────────────────

bunDescribe("describeDataFrame", () => {
  test("includes only numeric columns", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2, 3],
      b: ["x", "y", "z"],
      c: [4.0, 5.0, 6.0],
    });
    const d = describeDataFrame(df);
    expect(d.columns.values).toEqual(["a", "c"]);
    expect(d.index.values).toEqual(["count", "mean", "std", "min", "25%", "50%", "75%", "max"]);
  });

  test("correct stats for each column", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3, 4, 5] });
    const d = describeDataFrame(df);
    expect(d.col("x").at("count")).toBe(5);
    expect(d.col("x").at("mean")).toBe(3);
    expect(d.col("x").at("min")).toBe(1);
    expect(d.col("x").at("max")).toBe(5);
  });
});

// ─── corrSeries ───────────────────────────────────────────────────────────────

bunDescribe("corrSeries", () => {
  test("perfect positive correlation", () => {
    const a = new Series({ data: [1, 2, 3, 4, 5] });
    const b = new Series({ data: [1, 2, 3, 4, 5] });
    expect(closeEnough(corrSeries(a, b), 1)).toBe(true);
  });

  test("perfect negative correlation", () => {
    const a = new Series({ data: [1, 2, 3, 4, 5] });
    const b = new Series({ data: [5, 4, 3, 2, 1] });
    expect(closeEnough(corrSeries(a, b), -1)).toBe(true);
  });

  test("zero correlation (orthogonal)", () => {
    // x = [1,2,3,4], y = [1,2,2,1]: Cov(x,y) = 0 (verified analytically)
    const a = new Series({ data: [1, 2, 3, 4] });
    const b = new Series({ data: [1, 2, 2, 1] });
    expect(closeEnough(corrSeries(a, b), 0, 1e-9)).toBe(true);
  });

  test("handles missing values", () => {
    const a = new Series({ data: [1, 2, null, 4, 5] });
    const b = new Series({ data: [1, 2, 3, 4, 5] });
    // position 2 dropped from both
    const r = corrSeries(a, b);
    expect(typeof r).toBe("number");
    expect(!Number.isNaN(r)).toBe(true);
  });

  test("NaN for single-element", () => {
    const a = new Series({ data: [1] });
    const b = new Series({ data: [1] });
    expect(Number.isNaN(corrSeries(a, b))).toBe(true);
  });

  test("spearman perfect monotone", () => {
    const a = new Series({ data: [1, 2, 3, 4, 5] });
    const b = new Series({ data: [1, 4, 9, 16, 25] }); // monotone transform
    expect(closeEnough(corrSeries(a, b, "spearman"), 1)).toBe(true);
  });

  test("kendall perfect concordance", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [1, 2, 3] });
    expect(closeEnough(corrSeries(a, b, "kendall"), 1)).toBe(true);
  });

  test("kendall perfect discordance", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [3, 2, 1] });
    expect(closeEnough(corrSeries(a, b, "kendall"), -1)).toBe(true);
  });
});

// ─── corrDataFrame ────────────────────────────────────────────────────────────

bunDescribe("corrDataFrame", () => {
  test("diagonal is 1", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [3, 2, 1], c: [1, 2, 3] });
    const corr = corrDataFrame(df);
    for (const col of corr.columns.values) {
      expect(closeEnough(corr.col(col).at(col) as number, 1)).toBe(true);
    }
  });

  test("symmetric", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [4, 3, 2, 1], c: [1, 3, 2, 4] });
    const corr = corrDataFrame(df);
    expect(closeEnough(corr.col("a").at("b") as number, corr.col("b").at("a") as number)).toBe(
      true,
    );
  });

  test("excludes non-numeric columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], label: ["x", "y"] });
    const corr = corrDataFrame(df);
    expect(corr.columns.values).toEqual(["a"]);
  });
});

// ─── covSeries ────────────────────────────────────────────────────────────────

bunDescribe("covSeries", () => {
  test("cov([1,2,3], [1,2,3]) = variance", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(closeEnough(covSeries(s, s), s.var())).toBe(true);
  });

  test("negative covariance", () => {
    const a = new Series({ data: [1, 2, 3, 4] });
    const b = new Series({ data: [4, 3, 2, 1] });
    expect(covSeries(a, b)).toBeLessThan(0);
  });

  test("ddof=0 population covariance", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [1, 2, 3] });
    expect(closeEnough(covSeries(a, b, 0), 2 / 3)).toBe(true);
  });

  test("NaN for single pair", () => {
    const a = new Series({ data: [1] });
    const b = new Series({ data: [1] });
    expect(Number.isNaN(covSeries(a, b))).toBe(true);
  });
});

// ─── covDataFrame ─────────────────────────────────────────────────────────────

bunDescribe("covDataFrame", () => {
  test("diagonal equals column variance", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] });
    const cov = covDataFrame(df);
    const aVar = df.col("a").var();
    expect(closeEnough(cov.col("a").at("a") as number, aVar)).toBe(true);
  });

  test("symmetric matrix", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [3, 1, 2] });
    const cov = covDataFrame(df);
    expect(closeEnough(cov.col("a").at("b") as number, cov.col("b").at("a") as number)).toBe(true);
  });
});

// ─── skewSeries ───────────────────────────────────────────────────────────────

bunDescribe("skewSeries", () => {
  test("symmetric distribution has skew ~0", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(closeEnough(skewSeries(s), 0, 1e-9)).toBe(true);
  });

  test("right-skewed distribution", () => {
    const s = new Series({ data: [1, 1, 1, 1, 10] });
    expect(skewSeries(s)).toBeGreaterThan(0);
  });

  test("left-skewed distribution", () => {
    const s = new Series({ data: [-10, 1, 1, 1, 1] });
    expect(skewSeries(s)).toBeLessThan(0);
  });

  test("NaN for fewer than 3 values", () => {
    expect(Number.isNaN(skewSeries(new Series({ data: [1, 2] })))).toBe(true);
    expect(Number.isNaN(skewSeries(new Series({ data: [1] })))).toBe(true);
    expect(Number.isNaN(skewSeries(new Series<number>({ data: [] })))).toBe(true);
  });

  test("constant series has skew 0", () => {
    const s = new Series({ data: [3, 3, 3, 3, 3] });
    expect(skewSeries(s)).toBe(0);
  });

  test("skips missing values (3 valid → skew is defined)", () => {
    const s = new Series({ data: [1, null, 2, null, 3] });
    // [1,2,3] is symmetric → skew = 0, not NaN (n=3 ≥ 3)
    expect(closeEnough(skewSeries(s), 0, 1e-9)).toBe(true);
  });
});

// ─── skewDataFrame ────────────────────────────────────────────────────────────

bunDescribe("skewDataFrame", () => {
  test("returns Series indexed by column name", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] });
    const sk = skewDataFrame(df);
    expect(sk.index.values).toContain("a");
    expect(sk.index.values).toContain("b");
  });

  test("symmetric columns have skew ~0", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3, 4, 5] });
    const sk = skewDataFrame(df);
    expect(closeEnough(sk.at("x") as number, 0, 1e-9)).toBe(true);
  });
});

// ─── kurtosisSeries ───────────────────────────────────────────────────────────

bunDescribe("kurtosisSeries", () => {
  test("NaN for fewer than 4 values", () => {
    expect(Number.isNaN(kurtosisSeries(new Series({ data: [1, 2, 3] })))).toBe(true);
    expect(Number.isNaN(kurtosisSeries(new Series({ data: [1, 2] })))).toBe(true);
  });

  test("uniform distribution is platykurtic (excess kurtosis < 0)", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(kurtosisSeries(s)).toBeLessThan(0);
  });

  test("constant series has kurtosis 0", () => {
    const s = new Series({ data: [5, 5, 5, 5, 5, 5] });
    expect(kurtosisSeries(s)).toBe(0);
  });

  test("kurtSeries is an alias for kurtosisSeries", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(kurtSeries(s)).toBe(kurtosisSeries(s));
  });
});

// ─── kurtosisDataFrame ────────────────────────────────────────────────────────

bunDescribe("kurtosisDataFrame", () => {
  test("returns Series indexed by column name", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5], b: [5, 4, 3, 2, 1] });
    const k = kurtosisDataFrame(df);
    expect(k.index.values).toContain("a");
    expect(k.index.values).toContain("b");
  });

  test("kurtDataFrame is alias", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    expect(kurtDataFrame(df).at("a")).toBe(kurtosisDataFrame(df).at("a"));
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

bunDescribe("property tests", () => {
  test("corrSeries(s, s) = 1 for non-constant numeric Series of length ≥ 2", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1e6, max: 1e6, noNaN: true }), { minLength: 3, maxLength: 20 }),
        (arr) => {
          // Skip constant arrays (undefined correlation)
          const min = Math.min(...arr);
          const max = Math.max(...arr);
          if (min === max) {
            return true;
          }
          const s = new Series({ data: arr });
          return closeEnough(corrSeries(s, s), 1, 1e-6);
        },
      ),
    );
  });

  test("covSeries(s, s, 1) = s.var() for length ≥ 2", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1e6, max: 1e6, noNaN: true }), { minLength: 2, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          return closeEnough(covSeries(s, s), s.var(), 1e-6);
        },
      ),
    );
  });

  test("describe count matches non-null count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.float({ noNaN: true }), fc.constant(null as null)), {
          minLength: 0,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series<number | null>({ data: arr });
          const d = describe(s);
          const expected = arr.filter((v) => v !== null).length;
          return (d.at("count") as number) === expected;
        },
      ),
    );
  });
});
