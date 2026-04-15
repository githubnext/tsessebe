/**
 * Tests for src/stats/clip_with_bounds.ts — clipSeriesWithBounds / clipDataFrameWithBounds.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Index,
  Series,
  clipDataFrameWithBounds,
  clipSeriesWithBounds,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: readonly number[], labels?: readonly string[]): Series<Scalar> {
  if (labels) {
    return new Series<Scalar>({ data: [...data], index: new Index<string | number>(labels) });
  }
  return new Series<Scalar>({ data: [...data] });
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

// ─── clipSeriesWithBounds — scalar bounds ─────────────────────────────────────

describe("clipSeriesWithBounds — scalar bounds", () => {
  it("clips below scalar lower", () => {
    const r = clipSeriesWithBounds(s([-3, 0, 5]), { lower: 0 });
    expect(arrEq(r.values, [0, 0, 5])).toBe(true);
  });

  it("clips above scalar upper", () => {
    const r = clipSeriesWithBounds(s([1, 5, 10]), { upper: 7 });
    expect(arrEq(r.values, [1, 5, 7])).toBe(true);
  });

  it("clips both lower and upper scalars", () => {
    const r = clipSeriesWithBounds(s([-5, 0, 3, 9]), { lower: -1, upper: 6 });
    expect(arrEq(r.values, [-1, 0, 3, 6])).toBe(true);
  });

  it("no bounds → identity", () => {
    const orig = [-3, 0, 5, 100];
    const r = clipSeriesWithBounds(s(orig));
    expect(arrEq(r.values, orig)).toBe(true);
  });

  it("null lower/upper → no bound", () => {
    const r = clipSeriesWithBounds(s([1, 2, 3]), { lower: null, upper: null });
    expect(arrEq(r.values, [1, 2, 3])).toBe(true);
  });

  it("preserves null values", () => {
    const ser = new Series<Scalar>({ data: [null, -5, 3, null] });
    const r = clipSeriesWithBounds(ser, { lower: 0, upper: 2 });
    expect(r.values[0]).toBeNull();
    expect(r.values[3]).toBeNull();
    expect(r.values[1]).toBe(0);
    expect(r.values[2]).toBe(2);
  });

  it("preserves NaN values", () => {
    const ser = new Series<Scalar>({ data: [Number.NaN, -2, 10] });
    const r = clipSeriesWithBounds(ser, { lower: 0, upper: 8 });
    expect(Number.isNaN(r.values[0] as number)).toBe(true);
    expect(r.values[1]).toBe(0);
    expect(r.values[2]).toBe(8);
  });

  it("preserves name and index", () => {
    const ser = new Series<Scalar>({ data: [1, 2], name: "myCol" });
    const r = clipSeriesWithBounds(ser, { lower: 0 });
    expect(r.name).toBe("myCol");
    expect(r.index.size).toBe(2);
  });
});

// ─── clipSeriesWithBounds — Series bounds (aligned by label) ──────────────────

describe("clipSeriesWithBounds — Series bounds", () => {
  it("clips with Series lower bound (positional when both use RangeIndex)", () => {
    const lo = s([2, 2, 2, 2]);
    const r = clipSeriesWithBounds(s([1, 3, 5, 0]), { lower: lo });
    expect(arrEq(r.values, [2, 3, 5, 2])).toBe(true);
  });

  it("clips with Series upper bound", () => {
    const hi = s([4, 6, 8, 10]);
    const r = clipSeriesWithBounds(s([1, 7, 5, 11]), { upper: hi });
    expect(arrEq(r.values, [1, 6, 5, 10])).toBe(true);
  });

  it("clips with both Series lower and upper", () => {
    const lo = s([0, 1, 2]);
    const hi = s([5, 5, 5]);
    const r = clipSeriesWithBounds(s([-1, 3, 8]), { lower: lo, upper: hi });
    expect(arrEq(r.values, [0, 3, 5])).toBe(true);
  });

  it("aligns by label when Series has labeled index", () => {
    // input: labels a=1, b=10, c=5
    const input = s([1, 10, 5], ["a", "b", "c"]);
    // upper bound: labels c=6, a=3 (b is missing → no upper for b)
    const hi = new Series<Scalar>({
      data: [6, 3],
      index: new Index<string | number>(["c", "a"]),
    });
    const r = clipSeriesWithBounds(input, { upper: hi });
    // a: min(1, 3)=1  b: 10 (no bound)  c: min(5, 6)=5
    expect(r.values[0]).toBe(1); // a unchanged (1 < 3)
    expect(r.values[1]).toBe(10); // b: no upper bound → unchanged
    expect(r.values[2]).toBe(5); // c unchanged (5 < 6)
  });

  it("clips using per-element lower series by label", () => {
    const input = s([5, 2, 8], ["x", "y", "z"]);
    const lo = new Series<Scalar>({
      data: [6, 1, 9],
      index: new Index<string | number>(["x", "y", "z"]),
    });
    const r = clipSeriesWithBounds(input, { lower: lo });
    // x: max(5,6)=6  y: max(2,1)=2  z: max(8,9)=9
    expect(arrEq(r.values, [6, 2, 9])).toBe(true);
  });

  it("missing label in bound Series → no bound applied", () => {
    const input = s([1, 2, 3], ["a", "b", "c"]);
    // lower only has labels b and c
    const lo = new Series<Scalar>({
      data: [5, 5],
      index: new Index<string | number>(["b", "c"]),
    });
    const r = clipSeriesWithBounds(input, { lower: lo });
    // a: no lower → unchanged = 1  b: max(2,5)=5  c: max(3,5)=5
    expect(arrEq(r.values, [1, 5, 5])).toBe(true);
  });
});

// ─── clipSeriesWithBounds — array bounds ──────────────────────────────────────

describe("clipSeriesWithBounds — array bounds", () => {
  it("clips with array lower bound (positional)", () => {
    const r = clipSeriesWithBounds(s([1, 5, 2]), { lower: [3, 3, 3] });
    expect(arrEq(r.values, [3, 5, 3])).toBe(true);
  });

  it("clips with array upper bound", () => {
    const r = clipSeriesWithBounds(s([1, 5, 10]), { upper: [4, 4, 4] });
    expect(arrEq(r.values, [1, 4, 4])).toBe(true);
  });

  it("array with null entries → no bound at those positions", () => {
    const r = clipSeriesWithBounds(s([-5, 10, 2]), { lower: [null, 8, null] });
    expect(arrEq(r.values, [-5, 10, 2])).toBe(true);
  });

  it("throws when array length mismatches Series length", () => {
    expect(() => clipSeriesWithBounds(s([1, 2, 3]), { lower: [0, 0] })).toThrow(RangeError);
  });
});

// ─── clipDataFrameWithBounds — scalar bounds ──────────────────────────────────

describe("clipDataFrameWithBounds — scalar bounds", () => {
  it("clips all columns with scalar lower/upper", () => {
    const df = DataFrame.fromColumns({ a: [-5, 2, 8], b: [1, 10, 4] });
    const r = clipDataFrameWithBounds(df, { lower: 0, upper: 6 });
    expect(arrEq(r.col("a").values, [0, 2, 6])).toBe(true);
    expect(arrEq(r.col("b").values, [1, 6, 4])).toBe(true);
  });
});

// ─── clipDataFrameWithBounds — axis=0 (per-row) ───────────────────────────────

describe("clipDataFrameWithBounds — axis=0 (per-row bounds)", () => {
  it("clips each row with Series lower bound (positional RangeIndex)", () => {
    const df = DataFrame.fromColumns({ a: [-1, 3, 7], b: [0, 5, 9] });
    // 3 rows, lower bound per row: [0, 4, 8]
    const lo = new Series<Scalar>({ data: [0, 4, 8] });
    const r = clipDataFrameWithBounds(df, { lower: lo, axis: 0 });
    // row 0: clip(-1, 0)=0,  clip(0, 0)=0
    // row 1: clip(3, 4)=4,   clip(5, 4)=5
    // row 2: clip(7, 8)=8,   clip(9, 8)=9
    expect(arrEq(r.col("a").values, [0, 4, 8])).toBe(true);
    expect(arrEq(r.col("b").values, [0, 5, 9])).toBe(true);
  });

  it("clips each row with Series upper bound (label-aligned)", () => {
    const rowIndex = new Index<string | number>(["r0", "r1", "r2"]);
    const df = new DataFrame(
      new Map([
        ["a", new Series<Scalar>({ data: [1, 10, 5], index: rowIndex, name: "a" })],
        ["b", new Series<Scalar>({ data: [2, 12, 6], index: rowIndex, name: "b" })],
      ]),
      rowIndex,
    );
    // upper per row: r0→3, r1→8, r2→4
    const hi = new Series<Scalar>({
      data: [3, 8, 4],
      index: new Index<string | number>(["r0", "r1", "r2"]),
    });
    const r = clipDataFrameWithBounds(df, { upper: hi, axis: 0 });
    expect(arrEq(r.col("a").values, [1, 8, 4])).toBe(true);
    expect(arrEq(r.col("b").values, [2, 8, 4])).toBe(true);
  });

  it("axis='index' is equivalent to axis=0", () => {
    const df = DataFrame.fromColumns({ x: [1, 10] });
    const lo = new Series<Scalar>({ data: [5, 5] });
    const r0 = clipDataFrameWithBounds(df, { lower: lo, axis: 0 });
    const rIdx = clipDataFrameWithBounds(df, { lower: lo, axis: "index" });
    expect(arrEq(r0.col("x").values, rIdx.col("x").values)).toBe(true);
  });
});

// ─── clipDataFrameWithBounds — axis=1 (per-column) ───────────────────────────

describe("clipDataFrameWithBounds — axis=1 (per-column bounds)", () => {
  it("clips each column with Series lower bound (positional)", () => {
    const df = DataFrame.fromColumns({ a: [-2, 3], b: [0, 5] });
    // 2 columns: a→lower=1, b→lower=2
    const lo = new Series<Scalar>({ data: [1, 2] });
    const r = clipDataFrameWithBounds(df, { lower: lo, axis: 1 });
    expect(arrEq(r.col("a").values, [1, 3])).toBe(true);
    expect(arrEq(r.col("b").values, [2, 5])).toBe(true);
  });

  it("clips each column with Series lower/upper bounds (label-aligned by column name)", () => {
    const df = DataFrame.fromColumns({ a: [0, 10], b: [3, 8] });
    const lo = new Series<Scalar>({
      data: [4, 1],
      index: new Index<string | number>(["b", "a"]),
    });
    const hi = new Series<Scalar>({
      data: [7, 5],
      index: new Index<string | number>(["a", "b"]),
    });
    const r = clipDataFrameWithBounds(df, { lower: lo, upper: hi, axis: 1 });
    // col a: lower=1 (from 'a' in lo), upper=7; values [max(0,1)=1, min(10,7)=7]
    // col b: lower=4 (from 'b' in lo), upper=5 (from 'b' in hi); values [max(3,4)=4, min(8,5)=5]
    expect(arrEq(r.col("a").values, [1, 7])).toBe(true);
    expect(arrEq(r.col("b").values, [4, 5])).toBe(true);
  });

  it("axis='columns' is equivalent to axis=1", () => {
    const df = DataFrame.fromColumns({ x: [0, 10] });
    const lo = new Series<Scalar>({ data: [2] });
    const r1 = clipDataFrameWithBounds(df, { lower: lo, axis: 1 });
    const rC = clipDataFrameWithBounds(df, { lower: lo, axis: "columns" });
    expect(arrEq(r1.col("x").values, rC.col("x").values)).toBe(true);
  });
});

// ─── clipDataFrameWithBounds — DataFrame bounds (element-wise) ────────────────

describe("clipDataFrameWithBounds — DataFrame bounds", () => {
  it("clips element-wise with lower DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 5], b: [2, 8] });
    const lo = DataFrame.fromColumns({ a: [3, 3], b: [1, 9] });
    const r = clipDataFrameWithBounds(df, { lower: lo });
    expect(arrEq(r.col("a").values, [3, 5])).toBe(true);
    expect(arrEq(r.col("b").values, [2, 9])).toBe(true);
  });

  it("clips element-wise with upper DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [5, 10], b: [3, 7] });
    const hi = DataFrame.fromColumns({ a: [4, 8], b: [6, 5] });
    const r = clipDataFrameWithBounds(df, { upper: hi });
    expect(arrEq(r.col("a").values, [4, 8])).toBe(true);
    expect(arrEq(r.col("b").values, [3, 5])).toBe(true);
  });

  it("clips element-wise with both lower and upper DataFrames", () => {
    const df = DataFrame.fromColumns({ x: [0, 5, 10] });
    const lo = DataFrame.fromColumns({ x: [2, 2, 2] });
    const hi = DataFrame.fromColumns({ x: [8, 8, 8] });
    const r = clipDataFrameWithBounds(df, { lower: lo, upper: hi });
    expect(arrEq(r.col("x").values, [2, 5, 8])).toBe(true);
  });

  it("missing column in bound DataFrame → column is not clipped", () => {
    const df = DataFrame.fromColumns({ a: [0, 10], b: [-5, 20] });
    // lower only bounds column 'a'; 'b' has no lower bound
    const lo = DataFrame.fromColumns({ a: [5, 5] });
    const r = clipDataFrameWithBounds(df, { lower: lo });
    expect(arrEq(r.col("a").values, [5, 10])).toBe(true);
    expect(arrEq(r.col("b").values, [-5, 20])).toBe(true);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("clipSeriesWithBounds — property tests", () => {
  it("scalar bounds: all output values satisfy [lower, upper]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (data, a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const ser = new Series<Scalar>({ data });
          const r = clipSeriesWithBounds(ser, { lower: lo, upper: hi });
          for (const v of r.values) {
            if (typeof v === "number" && !Number.isNaN(v) && (v < lo || v > hi)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("scalar bounds: values already inside [lo, hi] are unchanged", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const ser = new Series<Scalar>({ data });
          const r = clipSeriesWithBounds(ser, { lower: -1000, upper: 1000 });
          return arrEq(r.values, data);
        },
      ),
    );
  });

  it("Series lower bound: result[i] >= lower[i] for all finite pairs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const n = data.length;
          const loData = data.map(() => Math.random() * 10 - 5);
          const lo = new Series<Scalar>({ data: loData });
          const ser = new Series<Scalar>({ data });
          const r = clipSeriesWithBounds(ser, { lower: lo });
          for (let i = 0; i < n; i++) {
            const rv = r.values[i];
            const lv = loData[i];
            if (
              typeof rv === "number" &&
              !Number.isNaN(rv) &&
              typeof lv === "number" &&
              rv < lv - 1e-12
            ) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("idempotent: clipping twice with the same bounds is the same as clipping once", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (data, a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const ser = new Series<Scalar>({ data });
          const once = clipSeriesWithBounds(ser, { lower: lo, upper: hi });
          const twice = clipSeriesWithBounds(once, { lower: lo, upper: hi });
          return arrEq(once.values, twice.values);
        },
      ),
    );
  });
});
