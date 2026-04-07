/**
 * Tests for src/stats/elem_ops.ts — clip, seriesAbs, seriesRound and DataFrame variants.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  clip,
  dataFrameAbs,
  dataFrameClip,
  dataFrameRound,
  seriesAbs,
  seriesRound,
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
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!nanEq(a[i] as Scalar, b[i] as Scalar)) {
      return false;
    }
  }
  return true;
}

function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

// ─── clip — Series ────────────────────────────────────────────────────────────

describe("clip — Series", () => {
  it("clips values below lower bound", () => {
    const r = clip(s([-5, -2, 0, 3]), { lower: 0 });
    expect(arrEq(r.values, [0, 0, 0, 3])).toBe(true);
  });

  it("clips values above upper bound", () => {
    const r = clip(s([1, 5, 10, 20]), { upper: 8 });
    expect(arrEq(r.values, [1, 5, 8, 8])).toBe(true);
  });

  it("clips both lower and upper", () => {
    const r = clip(s([-3, 1, 5, 10]), { lower: 0, upper: 6 });
    expect(arrEq(r.values, [0, 1, 5, 6])).toBe(true);
  });

  it("no options — values unchanged", () => {
    const r = clip(s([-100, 0, 100]));
    expect(arrEq(r.values, [-100, 0, 100])).toBe(true);
  });

  it("null passes through", () => {
    const r = clip(s([null, 5, null]), { lower: 0, upper: 3 });
    expect(arrEq(r.values, [null, 3, null])).toBe(true);
  });

  it("NaN passes through", () => {
    const r = clip(s([Number.NaN, 5]), { lower: 0, upper: 3 });
    expect(arrEq(r.values, [Number.NaN, 3])).toBe(true);
  });

  it("empty series", () => {
    expect(clip(s([])).values.length).toBe(0);
  });

  it("lower === upper — all valid values equal that bound", () => {
    const r = clip(s([1, 5, 10]), { lower: 4, upper: 4 });
    expect(arrEq(r.values, [4, 4, 4])).toBe(true);
  });

  it("preserves index and name", () => {
    const series = new Series({ data: [-1, 5], index: ["a", "b"], name: "x" });
    const r = clip(series, { lower: 0, upper: 3 });
    expect([...r.index.values]).toEqual(["a", "b"]);
    expect(r.name).toBe("x");
  });

  it("property: clipped values are within [lower, upper]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 50,
        }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        (data, lo, hi) => {
          const lower = Math.min(lo, hi);
          const upper = Math.max(lo, hi);
          const r = clip(new Series({ data }), { lower, upper });
          for (const v of r.values) {
            if (typeof v === "number" && !Number.isNaN(v) && (v < lower || v > upper)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── clip — DataFrame ─────────────────────────────────────────────────────────

describe("dataFrameClip", () => {
  it("clips all columns", () => {
    const df = DataFrame.fromColumns({ a: [-1, 2, 5], b: [0, 3, 8] });
    const r = dataFrameClip(df, { lower: 0, upper: 4 });
    expect([...r.col("a").values]).toEqual([0, 2, 4]);
    expect([...r.col("b").values]).toEqual([0, 3, 4]);
  });

  it("only lower bound", () => {
    const df = DataFrame.fromColumns({ a: [-5, 0, 5] });
    const r = dataFrameClip(df, { lower: 0 });
    expect([...r.col("a").values]).toEqual([0, 0, 5]);
  });

  it("null passes through", () => {
    const df = DataFrame.fromColumns({ a: [null, 5, null] as Scalar[] });
    const r = dataFrameClip(df, { lower: 0, upper: 3 });
    expect(arrEq(r.col("a").values, [null, 3, null])).toBe(true);
  });
});

// ─── seriesAbs ────────────────────────────────────────────────────────────────

describe("seriesAbs", () => {
  it("returns absolute values", () => {
    const r = seriesAbs(s([-3, -1, 0, 2, 5]));
    expect([...r.values]).toEqual([3, 1, 0, 2, 5]);
  });

  it("all positive — unchanged", () => {
    const r = seriesAbs(s([1, 2, 3]));
    expect([...r.values]).toEqual([1, 2, 3]);
  });

  it("null passes through", () => {
    const r = seriesAbs(s([null, -3, null]));
    expect(arrEq(r.values, [null, 3, null])).toBe(true);
  });

  it("NaN passes through", () => {
    const r = seriesAbs(s([Number.NaN, -2]));
    expect(arrEq(r.values, [Number.NaN, 2])).toBe(true);
  });

  it("empty series", () => {
    expect(seriesAbs(s([])).values.length).toBe(0);
  });

  it("preserves index and name", () => {
    const series = new Series({ data: [-1, -2], index: [10, 20], name: "vals" });
    const r = seriesAbs(series);
    expect([...r.index.values]).toEqual([10, 20]);
    expect(r.name).toBe("vals");
  });

  it("property: abs result is always >= 0 for finite inputs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 50,
        }),
        (data) => {
          const r = seriesAbs(new Series({ data }));
          for (const v of r.values) {
            if (typeof v === "number" && !Number.isNaN(v) && v < 0) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("property: abs(abs(x)) === abs(x)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 50,
        }),
        (data) => {
          const ser = new Series({ data });
          const once = seriesAbs(ser);
          const twice = seriesAbs(once);
          return arrEq(once.values, twice.values);
        },
      ),
    );
  });
});

// ─── dataFrameAbs ─────────────────────────────────────────────────────────────

describe("dataFrameAbs", () => {
  it("returns absolute values for all columns", () => {
    const df = DataFrame.fromColumns({ a: [-1, 2, -3], b: [4, -5, 6] });
    const r = dataFrameAbs(df);
    expect([...r.col("a").values]).toEqual([1, 2, 3]);
    expect([...r.col("b").values]).toEqual([4, 5, 6]);
  });

  it("null passes through", () => {
    const df = DataFrame.fromColumns({ a: [null, -3, null] as Scalar[] });
    const r = dataFrameAbs(df);
    expect(arrEq(r.col("a").values, [null, 3, null])).toBe(true);
  });
});

// ─── seriesRound ──────────────────────────────────────────────────────────────

describe("seriesRound", () => {
  it("rounds to 0 decimals (default)", () => {
    const r = seriesRound(s([1.4, 1.5, 2.5, -0.5]));
    expect([...r.values]).toEqual([1, 2, 3, -0]);
  });

  it("rounds to 2 decimals", () => {
    const r = seriesRound(s([1.234, 2.567, 3.001]), { decimals: 2 });
    for (const [got, want] of [
      [r.values[0], 1.23],
      [r.values[1], 2.57],
      [r.values[2], 3.0],
    ] as [Scalar, number][]) {
      expect(typeof got === "number" && approx(got, want)).toBe(true);
    }
  });

  it("negative decimals — rounds to nearest 10", () => {
    const r = seriesRound(s([14, 25, 36]), { decimals: -1 });
    expect([...r.values]).toEqual([10, 30, 40]);
  });

  it("null passes through", () => {
    const r = seriesRound(s([null, 1.6, null]));
    expect(arrEq(r.values, [null, 2, null])).toBe(true);
  });

  it("NaN passes through", () => {
    const r = seriesRound(s([Number.NaN, 1.6]));
    expect(arrEq(r.values, [Number.NaN, 2])).toBe(true);
  });

  it("empty series", () => {
    expect(seriesRound(s([])).values.length).toBe(0);
  });

  it("already integer — unchanged", () => {
    const r = seriesRound(s([1, 2, 3]), { decimals: 2 });
    expect([...r.values]).toEqual([1, 2, 3]);
  });

  it("property: round(decimals=0) produces integers for finite inputs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 50,
        }),
        (data) => {
          const r = seriesRound(new Series({ data }), { decimals: 0 });
          for (const v of r.values) {
            if (
              typeof v === "number" &&
              !Number.isNaN(v) &&
              Number.isFinite(v) &&
              v !== Math.round(v)
            ) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── dataFrameRound ───────────────────────────────────────────────────────────

describe("dataFrameRound", () => {
  it("rounds all columns to 1 decimal", () => {
    const df = DataFrame.fromColumns({ a: [1.15, 2.45], b: [3.14, 2.71] });
    const r = dataFrameRound(df, { decimals: 1 });
    const a = r.col("a").values;
    const b = r.col("b").values;
    expect(typeof a[0] === "number" && approx(a[0], 1.2)).toBe(true);
    expect(typeof a[1] === "number" && approx(a[1], 2.5)).toBe(true);
    expect(typeof b[0] === "number" && approx(b[0], 3.1)).toBe(true);
    expect(typeof b[1] === "number" && approx(b[1], 2.7)).toBe(true);
  });

  it("default decimals=0", () => {
    const df = DataFrame.fromColumns({ x: [1.7, 2.3] });
    const r = dataFrameRound(df);
    expect([...r.col("x").values]).toEqual([2, 2]);
  });

  it("null passes through", () => {
    const df = DataFrame.fromColumns({ x: [null, 1.6, null] as Scalar[] });
    const r = dataFrameRound(df);
    expect(arrEq(r.col("x").values, [null, 2, null])).toBe(true);
  });
});
