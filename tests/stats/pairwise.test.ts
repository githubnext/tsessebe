/**
 * Tests for pairwise statistics.
 */
import { describe, expect, it } from "bun:test";
import {
  DataFrame,
  Series,
  corrwith,
  pairwiseCorr,
  pairwiseCov,
  rollCov,
  rollingCorr,
} from "../../src/index.ts";

const EPS = 1e-9;

function makeDF(): DataFrame {
  return DataFrame.fromColumns({
    a: [1, 2, 3, 4, 5],
    b: [5, 4, 3, 2, 1],
    c: [2, 3, 4, 5, 6],
  });
}

// ─── pairwiseCorr ─────────────────────────────────────────────────────────────

describe("pairwiseCorr", () => {
  it("diagonal is 1.0 (self-correlation)", () => {
    const corr = pairwiseCorr(makeDF());
    expect(Math.abs((corr.col("a").iloc(0) as number) - 1.0)).toBeLessThan(EPS);
    expect(Math.abs((corr.col("b").iloc(1) as number) - 1.0)).toBeLessThan(EPS);
    expect(Math.abs((corr.col("c").iloc(2) as number) - 1.0)).toBeLessThan(EPS);
  });

  it("a and b are perfectly negatively correlated", () => {
    const corr = pairwiseCorr(makeDF());
    // a is column 0 (index row a), b is column index b
    // corr(a,b) should be -1
    const corrAB = corr.col("b").iloc(0) as number; // row a, col b
    expect(Math.abs(corrAB - -1.0)).toBeLessThan(EPS);
  });

  it("a and c are perfectly positively correlated", () => {
    const corr = pairwiseCorr(makeDF());
    const corrAC = corr.col("c").iloc(0) as number;
    expect(Math.abs(corrAC - 1.0)).toBeLessThan(EPS);
  });

  it("result has same column names as input numeric columns", () => {
    const corr = pairwiseCorr(makeDF());
    expect(corr.columns.values).toEqual(["a", "b", "c"]);
  });

  it("result is square", () => {
    const corr = pairwiseCorr(makeDF());
    const [rows, cols] = corr.shape;
    expect(rows).toBe(cols);
    expect(rows).toBe(3);
  });

  it("matrix is symmetric", () => {
    const corr = pairwiseCorr(makeDF());
    const ab = corr.col("b").iloc(0) as number;
    const ba = corr.col("a").iloc(1) as number;
    expect(Math.abs(ab - ba)).toBeLessThan(EPS);
  });
});

// ─── pairwiseCov ─────────────────────────────────────────────────────────────

describe("pairwiseCov", () => {
  it("diagonal is variance of each column", () => {
    const cov = pairwiseCov(makeDF());
    // variance of [1,2,3,4,5] = 2.5
    expect(Math.abs((cov.col("a").iloc(0) as number) - 2.5)).toBeLessThan(EPS);
  });

  it("a and b covariance is -2.5", () => {
    const cov = pairwiseCov(makeDF());
    const covAB = cov.col("b").iloc(0) as number;
    expect(Math.abs(covAB - -2.5)).toBeLessThan(EPS);
  });

  it("is symmetric", () => {
    const cov = pairwiseCov(makeDF());
    const ab = cov.col("b").iloc(0) as number;
    const ba = cov.col("a").iloc(1) as number;
    expect(Math.abs(ab - ba)).toBeLessThan(EPS);
  });
});

// ─── corrwith ─────────────────────────────────────────────────────────────────

describe("corrwith", () => {
  it("perfect correlation for identical columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const other = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const result = corrwith(df, other);
    expect(Math.abs((result.iloc(0) as number) - 1.0)).toBeLessThan(EPS);
  });

  it("perfect negative correlation for reversed columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const other = DataFrame.fromColumns({ a: [5, 4, 3, 2, 1] });
    const result = corrwith(df, other);
    expect(Math.abs((result.iloc(0) as number) - -1.0)).toBeLessThan(EPS);
  });

  it("only includes shared columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const other = DataFrame.fromColumns({ a: [1, 2, 3], c: [7, 8, 9] });
    const result = corrwith(df, other);
    expect(result.size).toBe(1);
    expect(result.index.values[0]).toBe("a");
  });

  it("returns empty Series for no shared columns", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const other = DataFrame.fromColumns({ b: [1, 2, 3] });
    const result = corrwith(df, other);
    expect(result.size).toBe(0);
  });
});

// ─── rollingCorr ─────────────────────────────────────────────────────────────

describe("rollingCorr", () => {
  it("first window-1 values are null", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [5, 4, 3, 2, 1] });
    const rc = rollingCorr(x, y, 3);
    expect(rc.iloc(0)).toBeNull();
    expect(rc.iloc(1)).toBeNull();
  });

  it("has non-null value from window position onward", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [5, 4, 3, 2, 1] });
    const rc = rollingCorr(x, y, 3);
    expect(rc.iloc(2)).not.toBeNull();
  });

  it("negatively correlated series gives -1 in full window", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [5, 4, 3, 2, 1] });
    const rc = rollingCorr(x, y, 5);
    const last = rc.iloc(4) as number;
    expect(Math.abs(last - -1.0)).toBeLessThan(EPS);
  });

  it("result has same size as input", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [5, 4, 3, 2, 1] });
    expect(rollingCorr(x, y, 3).size).toBe(5);
  });
});

// ─── rollCov ─────────────────────────────────────────────────────────────────

describe("rollCov", () => {
  it("first window-1 values are null", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [5, 4, 3, 2, 1] });
    const rc = rollCov(x, y, 3);
    expect(rc.iloc(0)).toBeNull();
    expect(rc.iloc(1)).toBeNull();
  });

  it("has correct covariance at full window", () => {
    const x = new Series({ data: [1, 2, 3, 4, 5] });
    const y = new Series({ data: [5, 4, 3, 2, 1] });
    const rc = rollCov(x, y, 5);
    // cov([1..5], [5..1]) = -2.5
    expect(Math.abs((rc.iloc(4) as number) - -2.5)).toBeLessThan(EPS);
  });
});
