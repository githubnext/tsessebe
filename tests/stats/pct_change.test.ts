/**
 * Tests for src/stats/pct_change.ts — pctChangeSeries, pctChangeDataFrame
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  pctChangeDataFrame,
  pctChangeSeries,
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

function close(a: Scalar, b: Scalar, eps = 1e-9): boolean {
  if (a === null && b === null) return true;
  if (typeof a !== "number" || typeof b !== "number") return false;
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < eps;
}

function arrClose(a: readonly Scalar[], b: readonly Scalar[], eps = 1e-9): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!close(a[i] as Scalar, b[i] as Scalar, eps)) return false;
  }
  return true;
}

// ─── pctChangeSeries ─────────────────────────────────────────────────────────

describe("pctChangeSeries", () => {
  it("basic increasing sequence", () => {
    const result = pctChangeSeries(s([100, 110, 121, 133.1]));
    expect(result.values[0]).toBeNull();
    expect(close(result.values[1] as Scalar, 0.1)).toBe(true);
    expect(close(result.values[2] as Scalar, 0.1)).toBe(true);
    expect(close(result.values[3] as Scalar, 0.1)).toBe(true);
  });

  it("decreasing sequence", () => {
    const result = pctChangeSeries(s([200, 180, 162]));
    expect(result.values[0]).toBeNull();
    expect(close(result.values[1] as Scalar, -0.1)).toBe(true);
    expect(close(result.values[2] as Scalar, -0.1)).toBe(true);
  });

  it("periods=2", () => {
    const result = pctChangeSeries(s([100, 105, 110, 121]), { periods: 2 });
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
    expect(close(result.values[2] as Scalar, 0.1)).toBe(true);
    expect(close(result.values[3] as Scalar, (121 - 105) / 105)).toBe(true);
  });

  it("negative periods (look forward)", () => {
    const result = pctChangeSeries(s([100, 110, 121]), { periods: -1 });
    expect(close(result.values[0] as Scalar, 0.1)).toBe(true);
    expect(close(result.values[1] as Scalar, 0.1)).toBe(true);
    expect(result.values[2]).toBeNull();
  });

  it("NaN/null propagates when fillMethod=null", () => {
    const result = pctChangeSeries(s([100, null, 110]), { fillMethod: null });
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
    expect(result.values[2]).toBeNull();
  });

  it("fillMethod=pad fills NaN before computing", () => {
    const result = pctChangeSeries(s([100, null, 110]), { fillMethod: "pad" });
    // after pad-fill: [100, 100, 110]
    // pct: [null, 0, 0.1]
    expect(result.values[0]).toBeNull();
    expect(close(result.values[1] as Scalar, 0)).toBe(true);
    expect(close(result.values[2] as Scalar, 0.1)).toBe(true);
  });

  it("fillMethod=bfill fills NaN backward before computing", () => {
    const result = pctChangeSeries(s([100, null, 110, 121]), { fillMethod: "bfill" });
    // after bfill: [100, 110, 110, 121]
    // pct: [null, 0.1, 0, 0.1]
    expect(result.values[0]).toBeNull();
    expect(close(result.values[1] as Scalar, 0.1)).toBe(true);
    expect(close(result.values[2] as Scalar, 0)).toBe(true);
    expect(close(result.values[3] as Scalar, 0.1)).toBe(true);
  });

  it("limit=1 caps forward-fill", () => {
    const result = pctChangeSeries(s([100, null, null, 130]), {
      fillMethod: "pad",
      limit: 1,
    });
    // after pad with limit=1: [100, 100, null, 130]
    // pct: [null, 0, null, null]  (null/100 → null)
    expect(result.values[0]).toBeNull();
    expect(close(result.values[1] as Scalar, 0)).toBe(true);
    expect(result.values[2]).toBeNull();
    expect(result.values[3]).toBeNull();
  });

  it("zero denominator returns Infinity", () => {
    const result = pctChangeSeries(s([0, 10]), { fillMethod: null });
    expect(result.values[1]).toBe(Infinity);
  });

  it("zero/zero denominator returns NaN", () => {
    const result = pctChangeSeries(s([0, 0]), { fillMethod: null });
    expect(Number.isNaN(result.values[1] as number)).toBe(true);
  });

  it("preserves Series name and index", () => {
    const src = new Series({ data: [10, 20, 30], name: "price" });
    const result = pctChangeSeries(src);
    expect(result.name).toBe("price");
    expect(result.index.length).toBe(3);
  });

  it("empty series returns empty", () => {
    const result = pctChangeSeries(s([]));
    expect(result.values.length).toBe(0);
  });

  it("single-element series returns [null]", () => {
    const result = pctChangeSeries(s([42]));
    expect(result.values[0]).toBeNull();
  });
});

// ─── pctChangeDataFrame ───────────────────────────────────────────────────────

describe("pctChangeDataFrame", () => {
  it("column-wise (default)", () => {
    const df = new DataFrame(
      new Map([
        ["a", new Series({ data: [100, 110, 121] })],
        ["b", new Series({ data: [200, 180, 198] })],
      ]),
    );
    const result = pctChangeDataFrame(df);
    const colA = result.col("a").values;
    const colB = result.col("b").values;
    expect(colA[0]).toBeNull();
    expect(close(colA[1] as Scalar, 0.1)).toBe(true);
    expect(close(colA[2] as Scalar, 0.1)).toBe(true);
    expect(colB[0]).toBeNull();
    expect(close(colB[1] as Scalar, -0.1)).toBe(true);
    expect(close(colB[2] as Scalar, 0.1)).toBe(true);
  });

  it("row-wise (axis=1)", () => {
    const df = new DataFrame(
      new Map([
        ["a", new Series({ data: [100, 200] })],
        ["b", new Series({ data: [110, 220] })],
        ["c", new Series({ data: [121, 242] })],
      ]),
    );
    const result = pctChangeDataFrame(df, { axis: 1 });
    // row 0: [100, 110, 121] → [null, 0.1, 0.1]
    // row 1: [200, 220, 242] → [null, 0.1, 0.1]
    const row0a = result.col("a").values[0];
    const row0b = result.col("b").values[0];
    const row0c = result.col("c").values[0];
    expect(row0a).toBeNull();
    expect(close(row0b as Scalar, 0.1)).toBe(true);
    expect(close(row0c as Scalar, 0.1)).toBe(true);
    const row1a = result.col("a").values[1];
    const row1b = result.col("b").values[1];
    expect(row1a).toBeNull();
    expect(close(row1b as Scalar, 0.1)).toBe(true);
  });

  it("preserves column order", () => {
    const df = new DataFrame(
      new Map([
        ["x", new Series({ data: [1, 2] })],
        ["y", new Series({ data: [3, 6] })],
      ]),
    );
    const result = pctChangeDataFrame(df);
    expect(result.columns.values).toEqual(["x", "y"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("pctChangeSeries — property tests", () => {
  it("result length equals input length", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 50 }), (arr) => {
        const result = pctChangeSeries(s(arr));
        return result.values.length === arr.length;
      }),
    );
  });

  it("first element is always null for periods=1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 50 }),
        (arr) => {
          const result = pctChangeSeries(s(arr));
          return result.values[0] === null;
        },
      ),
    );
  });

  it("pct_change(x, -p) equals pct_change_reversed pattern", () => {
    // For a sequence of positive numbers with periods=1 and periods=-1:
    // result[-1][i] represents the change looking forward, so result[-1][i] = (x[i+1]-x[i])/x[i]
    // and result[+1][i+1] = (x[i+1]-x[i])/x[i], so they should agree on matching indices
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: 1, max: 1000 }), { minLength: 3, maxLength: 20 }),
        (arr) => {
          const fwd = pctChangeSeries(s(arr), { periods: -1, fillMethod: null });
          const bwd = pctChangeSeries(s(arr), { periods: 1, fillMethod: null });
          // fwd[i] = (arr[i+1] - arr[i]) / arr[i]
          // bwd[i+1] = (arr[i+1] - arr[i]) / arr[i]  ← same ratio
          for (let i = 0; i < arr.length - 1; i++) {
            if (!close(fwd.values[i] as Scalar, bwd.values[i + 1] as Scalar, 1e-6)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
