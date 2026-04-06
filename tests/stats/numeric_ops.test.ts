/**
 * Tests for src/stats/numeric_ops.ts
 * — floor, ceil, trunc, sqrt, exp, log, log2, log10, sign for Series and DataFrame.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameCeil,
  dataFrameExp,
  dataFrameFloor,
  dataFrameLog,
  dataFrameLog10,
  dataFrameLog2,
  dataFrameSign,
  dataFrameSqrt,
  dataFrameTrunc,
  seriesCeil,
  seriesExp,
  seriesFloor,
  seriesLog,
  seriesLog10,
  seriesLog2,
  seriesSign,
  seriesSqrt,
  seriesTrunc,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

function nanEq(a: Scalar, b: Scalar): boolean {
  if (typeof a === "number" && Number.isNaN(a) && typeof b === "number" && Number.isNaN(b)) {
    return true;
  }
  return a === b;
}

function arrEq(a: readonly Scalar[], b: readonly Scalar[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!nanEq(a[i] as Scalar, b[i] as Scalar)) return false;
  }
  return true;
}

function approx(a: Scalar, b: Scalar, eps = 1e-9): boolean {
  if (typeof a !== "number" || typeof b !== "number") return a === b;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < eps;
}

function arrApprox(a: readonly Scalar[], b: readonly Scalar[], eps = 1e-9): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!approx(a[i] as Scalar, b[i] as Scalar, eps)) return false;
  }
  return true;
}

function dfFromCols(cols: Record<string, number[]>): DataFrame {
  return DataFrame.fromColumns(cols);
}

// ─── floor — Series ───────────────────────────────────────────────────────────

describe("seriesFloor", () => {
  it("floors positive fractions", () => {
    expect(arrEq(seriesFloor(s([1.2, 1.7, 1.9999])).values, [1, 1, 1])).toBe(true);
  });
  it("floors negative fractions", () => {
    expect(arrEq(seriesFloor(s([-1.2, -1.7, -1.9999])).values, [-2, -2, -2])).toBe(true);
  });
  it("integers unchanged", () => {
    expect(arrEq(seriesFloor(s([0, 3, -5])).values, [0, 3, -5])).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesFloor(s([null, 1.5, null])).values, [null, 1, null])).toBe(true);
  });
  it("NaN passes through", () => {
    const r = seriesFloor(s([Number.NaN, 2.5])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
    expect(r[1]).toBe(2);
  });
  it("string passes through", () => {
    const r = seriesFloor(s(["hello", 1.7])).values;
    expect(r[0]).toBe("hello");
    expect(r[1]).toBe(1);
  });
  it("empty series", () => {
    expect(seriesFloor(s([])).values.length).toBe(0);
  });
  it("preserves name and index", () => {
    const src = new Series({ data: [1.5, 2.5], name: "x" });
    const r = seriesFloor(src);
    expect(r.name).toBe("x");
  });
  it("property: floor(n) <= n for finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesFloor(s(arr));
        return r.values.every((v, i) => typeof v === "number" && v <= (arr[i] as number));
      }),
    );
  });
  it("property: floor(n) === Math.floor(n) for finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesFloor(s(arr));
        return r.values.every((v, i) => v === Math.floor(arr[i] as number));
      }),
    );
  });
});

// ─── floor — DataFrame ────────────────────────────────────────────────────────

describe("dataFrameFloor", () => {
  it("floors all columns", () => {
    const df = dfFromCols({ a: [1.7, 2.3], b: [-0.5, 4.9] });
    const r = dataFrameFloor(df);
    expect(arrEq(r.col("a").values, [1, 2])).toBe(true);
    expect(arrEq(r.col("b").values, [-1, 4])).toBe(true);
  });
  it("null passes through in DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [null, 1.5] });
    const r = dataFrameFloor(df);
    expect(arrEq(r.col("a").values, [null, 1])).toBe(true);
  });
  it("empty DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const r = dataFrameFloor(df);
    expect(r.columns.values.length).toBe(0);
  });
});

// ─── ceil — Series ────────────────────────────────────────────────────────────

describe("seriesCeil", () => {
  it("ceils positive fractions", () => {
    expect(arrEq(seriesCeil(s([1.2, 1.7, 1.0001])).values, [2, 2, 2])).toBe(true);
  });
  it("ceils negative fractions", () => {
    expect(arrEq(seriesCeil(s([-1.2, -1.7, -1.9999])).values, [-1, -1, -1])).toBe(true);
  });
  it("integers unchanged", () => {
    expect(arrEq(seriesCeil(s([0, 3, -5])).values, [0, 3, -5])).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesCeil(s([null, 1.5, null])).values, [null, 2, null])).toBe(true);
  });
  it("property: ceil(n) >= n for finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesCeil(s(arr));
        return r.values.every((v, i) => typeof v === "number" && v >= (arr[i] as number));
      }),
    );
  });
  it("property: ceil(n) === Math.ceil(n)", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesCeil(s(arr));
        return r.values.every((v, i) => v === Math.ceil(arr[i] as number));
      }),
    );
  });
});

// ─── ceil — DataFrame ─────────────────────────────────────────────────────────

describe("dataFrameCeil", () => {
  it("ceils all columns", () => {
    const df = dfFromCols({ a: [1.2, 2.8], b: [-0.5, 4.1] });
    const r = dataFrameCeil(df);
    expect(arrEq(r.col("a").values, [2, 3])).toBe(true);
    expect(arrEq(r.col("b").values, [0, 5])).toBe(true);
  });
});

// ─── trunc — Series ───────────────────────────────────────────────────────────

describe("seriesTrunc", () => {
  it("truncates positive", () => {
    expect(arrEq(seriesTrunc(s([1.9, 2.1, 3.5])).values, [1, 2, 3])).toBe(true);
  });
  it("truncates negative — toward zero (not like floor)", () => {
    expect(arrEq(seriesTrunc(s([-1.9, -2.1, -3.5])).values, [-1, -2, -3])).toBe(true);
  });
  it("integers unchanged", () => {
    expect(arrEq(seriesTrunc(s([0, 7, -7])).values, [0, 7, -7])).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesTrunc(s([null, 1.9])).values, [null, 1])).toBe(true);
  });
  it("property: trunc is integer-valued", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesTrunc(s(arr));
        return r.values.every((v) => typeof v === "number" && Number.isInteger(v));
      }),
    );
  });
  it("property: trunc(n) === Math.trunc(n)", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesTrunc(s(arr));
        return r.values.every((v, i) => v === Math.trunc(arr[i] as number));
      }),
    );
  });
});

// ─── trunc — DataFrame ────────────────────────────────────────────────────────

describe("dataFrameTrunc", () => {
  it("truncates all columns", () => {
    const df = dfFromCols({ a: [1.9, -1.9], b: [0.5, -0.5] });
    const r = dataFrameTrunc(df);
    expect(arrEq(r.col("a").values, [1, -1])).toBe(true);
    expect(arrEq(r.col("b").values, [0, 0])).toBe(true);
  });
});

// ─── sqrt — Series ────────────────────────────────────────────────────────────

describe("seriesSqrt", () => {
  it("basic sqrt", () => {
    expect(arrEq(seriesSqrt(s([0, 1, 4, 9, 16, 25])).values, [0, 1, 2, 3, 4, 5])).toBe(true);
  });
  it("negative gives NaN", () => {
    const r = seriesSqrt(s([-1])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesSqrt(s([null, 4])).values, [null, 2])).toBe(true);
  });
  it("NaN passes through", () => {
    const r = seriesSqrt(s([Number.NaN, 4])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
    expect(r[1]).toBe(2);
  });
  it("property: sqrt(n)^2 ≈ n for non-negative bounded floats", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 0, max: 1e12, noNaN: true })), (arr) => {
        const r = seriesSqrt(s(arr));
        return r.values.every((v, i) => {
          const vn = v as number;
          const orig = arr[i] as number;
          // Allow relative error for large values
          const tol = Math.max(1e-6, orig * 1e-10);
          return Math.abs(vn * vn - orig) <= tol;
        });
      }),
    );
  });
});

// ─── sqrt — DataFrame ─────────────────────────────────────────────────────────

describe("dataFrameSqrt", () => {
  it("sqrts all columns", () => {
    const df = dfFromCols({ a: [0, 4, 9], b: [1, 16, 25] });
    const r = dataFrameSqrt(df);
    expect(arrEq(r.col("a").values, [0, 2, 3])).toBe(true);
    expect(arrEq(r.col("b").values, [1, 4, 5])).toBe(true);
  });
});

// ─── exp — Series ─────────────────────────────────────────────────────────────

describe("seriesExp", () => {
  it("exp(0) = 1", () => {
    expect(arrApprox(seriesExp(s([0])).values, [1])).toBe(true);
  });
  it("exp(1) = e", () => {
    expect(arrApprox(seriesExp(s([1])).values, [Math.E])).toBe(true);
  });
  it("exp(2) ≈ 7.389", () => {
    expect(arrApprox(seriesExp(s([2])).values, [Math.exp(2)])).toBe(true);
  });
  it("exp(-1) ≈ 0.368", () => {
    expect(arrApprox(seriesExp(s([-1])).values, [Math.exp(-1)])).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesExp(s([null])).values, [null])).toBe(true);
  });
  it("property: exp(log(x)) ≈ x for positive x", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 0.001, max: 10, noNaN: true })), (arr) => {
        const r = seriesExp(new Series({ data: arr.map(Math.log) }));
        return r.values.every((v, i) => approx(v as number, arr[i] as number, 1e-6));
      }),
    );
  });
});

// ─── exp — DataFrame ──────────────────────────────────────────────────────────

describe("dataFrameExp", () => {
  it("exp applied to all columns", () => {
    const df = dfFromCols({ a: [0, 1], b: [2, -1] });
    const r = dataFrameExp(df);
    expect(arrApprox(r.col("a").values, [1, Math.E])).toBe(true);
    expect(arrApprox(r.col("b").values, [Math.exp(2), Math.exp(-1)])).toBe(true);
  });
});

// ─── log — Series ─────────────────────────────────────────────────────────────

describe("seriesLog", () => {
  it("log(1) = 0", () => {
    expect(arrApprox(seriesLog(s([1])).values, [0])).toBe(true);
  });
  it("log(e) = 1", () => {
    expect(arrApprox(seriesLog(s([Math.E])).values, [1])).toBe(true);
  });
  it("log(0) = -Infinity", () => {
    expect(seriesLog(s([0])).values[0]).toBe(Number.NEGATIVE_INFINITY);
  });
  it("log(-1) = NaN", () => {
    const r = seriesLog(s([-1])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesLog(s([null])).values, [null])).toBe(true);
  });
  it("property: log(exp(x)) ≈ x for x in [-100, 100]", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ min: -100, max: 100, noNaN: true })), (arr) => {
        const r = seriesLog(new Series({ data: arr.map(Math.exp) }));
        return r.values.every((v, i) => approx(v as number, arr[i] as number, 1e-6));
      }),
    );
  });
});

// ─── log — DataFrame ──────────────────────────────────────────────────────────

describe("dataFrameLog", () => {
  it("log applied to all columns", () => {
    const df = dfFromCols({ a: [1, Math.E], b: [Math.E ** 2, 1] });
    const r = dataFrameLog(df);
    expect(arrApprox(r.col("a").values, [0, 1])).toBe(true);
    expect(arrApprox(r.col("b").values, [2, 0])).toBe(true);
  });
});

// ─── log2 — Series ────────────────────────────────────────────────────────────

describe("seriesLog2", () => {
  it("log2(1) = 0", () => {
    expect(arrApprox(seriesLog2(s([1])).values, [0])).toBe(true);
  });
  it("log2(2) = 1", () => {
    expect(arrApprox(seriesLog2(s([2])).values, [1])).toBe(true);
  });
  it("log2(4) = 2", () => {
    expect(arrApprox(seriesLog2(s([4])).values, [2])).toBe(true);
  });
  it("log2(8) = 3", () => {
    expect(arrApprox(seriesLog2(s([8])).values, [3])).toBe(true);
  });
  it("log2(0) = -Infinity", () => {
    expect(seriesLog2(s([0])).values[0]).toBe(Number.NEGATIVE_INFINITY);
  });
  it("log2(-1) = NaN", () => {
    const r = seriesLog2(s([-1])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesLog2(s([null])).values, [null])).toBe(true);
  });
  it("property: log2(2^k) ≈ k for integer k", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 30 })), (arr) => {
        const r = seriesLog2(new Series({ data: arr.map((k) => 2 ** k) }));
        return r.values.every((v, i) => approx(v as number, arr[i] as number, 1e-6));
      }),
    );
  });
});

// ─── log2 — DataFrame ─────────────────────────────────────────────────────────

describe("dataFrameLog2", () => {
  it("log2 applied to all columns", () => {
    const df = dfFromCols({ a: [1, 2], b: [4, 8] });
    const r = dataFrameLog2(df);
    expect(arrApprox(r.col("a").values, [0, 1])).toBe(true);
    expect(arrApprox(r.col("b").values, [2, 3])).toBe(true);
  });
});

// ─── log10 — Series ───────────────────────────────────────────────────────────

describe("seriesLog10", () => {
  it("log10(1) = 0", () => {
    expect(arrApprox(seriesLog10(s([1])).values, [0])).toBe(true);
  });
  it("log10(10) = 1", () => {
    expect(arrApprox(seriesLog10(s([10])).values, [1])).toBe(true);
  });
  it("log10(100) = 2", () => {
    expect(arrApprox(seriesLog10(s([100])).values, [2])).toBe(true);
  });
  it("log10(1000) = 3", () => {
    expect(arrApprox(seriesLog10(s([1000])).values, [3])).toBe(true);
  });
  it("log10(0) = -Infinity", () => {
    expect(seriesLog10(s([0])).values[0]).toBe(Number.NEGATIVE_INFINITY);
  });
  it("log10(-1) = NaN", () => {
    const r = seriesLog10(s([-1])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesLog10(s([null])).values, [null])).toBe(true);
  });
  it("property: log10(10^k) ≈ k for integer k", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 15 })), (arr) => {
        const r = seriesLog10(new Series({ data: arr.map((k) => 10 ** k) }));
        return r.values.every((v, i) => approx(v as number, arr[i] as number, 1e-6));
      }),
    );
  });
});

// ─── log10 — DataFrame ────────────────────────────────────────────────────────

describe("dataFrameLog10", () => {
  it("log10 applied to all columns", () => {
    const df = dfFromCols({ a: [1, 10], b: [100, 1000] });
    const r = dataFrameLog10(df);
    expect(arrApprox(r.col("a").values, [0, 1])).toBe(true);
    expect(arrApprox(r.col("b").values, [2, 3])).toBe(true);
  });
});

// ─── sign — Series ────────────────────────────────────────────────────────────

describe("seriesSign", () => {
  it("positive → 1", () => {
    expect(arrEq(seriesSign(s([0.001, 100, 1])).values, [1, 1, 1])).toBe(true);
  });
  it("negative → -1", () => {
    expect(arrEq(seriesSign(s([-0.001, -100, -1])).values, [-1, -1, -1])).toBe(true);
  });
  it("zero → 0", () => {
    expect(arrEq(seriesSign(s([0])).values, [0])).toBe(true);
  });
  it("mixed", () => {
    expect(arrEq(seriesSign(s([-5, -0.1, 0, 0.1, 7])).values, [-1, -1, 0, 1, 1])).toBe(true);
  });
  it("null passes through", () => {
    expect(arrEq(seriesSign(s([null, 5, null])).values, [null, 1, null])).toBe(true);
  });
  it("NaN passes through", () => {
    const r = seriesSign(s([Number.NaN, -3])).values;
    expect(nanEq(r[0] as Scalar, Number.NaN)).toBe(true);
    expect(r[1]).toBe(-1);
  });
  it("string passes through", () => {
    const r = seriesSign(s(["hello", -3])).values;
    expect(r[0]).toBe("hello");
    expect(r[1]).toBe(-1);
  });
  it("property: sign output is always -1, 0, or 1 for finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true })), (arr) => {
        const r = seriesSign(s(arr));
        return r.values.every((v) => v === -1 || v === 0 || v === 1);
      }),
    );
  });
  it("property: sign(n) * abs(n) ≈ n for finite numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true, noDefaultInfinity: true })), (arr) => {
        const r = seriesSign(s(arr));
        return r.values.every((v, i) => {
          const vn = v as number;
          const an = Math.abs(arr[i] as number);
          return approx(vn * an, arr[i] as number, 1e-9);
        });
      }),
    );
  });
});

// ─── sign — DataFrame ─────────────────────────────────────────────────────────

describe("dataFrameSign", () => {
  it("sign applied to all columns", () => {
    const df = dfFromCols({ a: [-5, 0, 3], b: [1, -1, 0] });
    const r = dataFrameSign(df);
    expect(arrEq(r.col("a").values, [-1, 0, 1])).toBe(true);
    expect(arrEq(r.col("b").values, [1, -1, 0])).toBe(true);
  });
  it("null passes through in DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [null, -2, 3] });
    const r = dataFrameSign(df);
    expect(arrEq(r.col("a").values, [null, -1, 1])).toBe(true);
  });
  it("empty DataFrame", () => {
    const df = DataFrame.fromColumns({});
    const r = dataFrameSign(df);
    expect(r.columns.values.length).toBe(0);
  });
});

// ─── cross-function round-trips ───────────────────────────────────────────────

describe("cross-function round-trips", () => {
  it("exp(log(x)) ≈ x for positive x", () => {
    const data = [0.5, 1, 2, 10, 100];
    const r = seriesExp(seriesLog(s(data)));
    expect(arrApprox(r.values, data, 1e-9)).toBe(true);
  });
  it("log2(2^floor(x)) = floor(x) for x in [0, 10]", () => {
    const data = [0.5, 1.7, 2.3, 3.9, 5.0];
    const floored = seriesFloor(s(data)).values as number[];
    const r = seriesLog2(new Series({ data: floored.map((k) => 2 ** k) }));
    expect(arrApprox(r.values, floored, 1e-9)).toBe(true);
  });
  it("ceil(x) = floor(x) for integers", () => {
    const data = [0, 1, 2, -3, -4, 100];
    expect(
      arrEq(seriesCeil(s(data)).values, seriesFloor(s(data)).values),
    ).toBe(true);
  });
  it("floor(x) <= trunc(x) for negative fractions", () => {
    const data = [-1.5, -2.9, -0.1];
    const fl = seriesFloor(s(data)).values as number[];
    const tr = seriesTrunc(s(data)).values as number[];
    expect(fl.every((v, i) => v <= (tr[i] as number))).toBe(true);
  });
  it("sqrt(x)^2 ≈ x for non-negative", () => {
    const data = [0, 1, 4, 9, 16, 25, 0.25, 2];
    const sq = seriesSqrt(s(data)).values as number[];
    expect(sq.every((v, i) => approx(v * v, data[i] as number, 1e-9))).toBe(true);
  });
});
