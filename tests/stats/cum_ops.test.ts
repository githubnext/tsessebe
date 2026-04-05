/**
 * Tests for src/stats/cum_ops.ts — cumsum, cumprod, cummax, cummin
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  cummax,
  cummin,
  cumprod,
  cumsum,
  dataFrameCummax,
  dataFrameCummin,
  dataFrameCumprod,
  dataFrameCumsum,
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

// ─── cumsum ───────────────────────────────────────────────────────────────────

describe("cumsum", () => {
  it("simple increasing sequence", () => {
    const result = cumsum(s([1, 2, 3, 4]));
    expect(arrEq(result.values, [1, 3, 6, 10])).toBe(true);
  });

  it("empty series", () => {
    expect(cumsum(s([])).values).toEqual([]);
  });

  it("single element", () => {
    expect(cumsum(s([5])).values).toEqual([5]);
  });

  it("skipna=true (default): NaN position returns NaN, accumulator continues", () => {
    const result = cumsum(s([1, null, 3, 4]));
    expect(arrEq(result.values, [1, Number.NaN, 4, 8])).toBe(true);
  });

  it("skipna=true: leading NaN", () => {
    const result = cumsum(s([null, 1, 3]));
    expect(arrEq(result.values, [Number.NaN, 1, 4])).toBe(true);
  });

  it("skipna=false: NaN poisons all subsequent values", () => {
    const result = cumsum(s([1, null, 3, 4]), { skipna: false });
    expect(arrEq(result.values, [1, Number.NaN, Number.NaN, Number.NaN])).toBe(true);
  });

  it("skipna=false: no NaN — normal cumsum", () => {
    const result = cumsum(s([2, 3, 5]), { skipna: false });
    expect(arrEq(result.values, [2, 5, 10])).toBe(true);
  });

  it("all NaN values", () => {
    const result = cumsum(s([null, null, null]));
    expect(result.values.every((v) => typeof v === "number" && Number.isNaN(v))).toBe(true);
  });

  it("negative numbers", () => {
    expect(arrEq(cumsum(s([-1, -2, -3])).values, [-1, -3, -6])).toBe(true);
  });

  it("mixed positive and negative", () => {
    expect(arrEq(cumsum(s([5, -3, 2, -1])).values, [5, 2, 4, 3])).toBe(true);
  });

  it("preserves index", () => {
    const series = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const result = cumsum(series);
    expect(result.index.values).toEqual(["a", "b", "c"]);
  });

  it("preserves name", () => {
    const series = new Series({ data: [1, 2, 3], name: "myCol" });
    expect(cumsum(series).name).toBe("myCol");
  });

  it("NaN value (not null) treated as missing", () => {
    const result = cumsum(s([1, Number.NaN, 3]));
    expect(arrEq(result.values, [1, Number.NaN, 4])).toBe(true);
  });
});

// ─── cumprod ──────────────────────────────────────────────────────────────────

describe("cumprod", () => {
  it("simple sequence", () => {
    expect(arrEq(cumprod(s([1, 2, 3, 4])).values, [1, 2, 6, 24])).toBe(true);
  });

  it("empty series", () => {
    expect(cumprod(s([])).values).toEqual([]);
  });

  it("single element", () => {
    expect(cumprod(s([7])).values).toEqual([7]);
  });

  it("skipna=true: NaN position returns NaN, product continues", () => {
    const result = cumprod(s([2, null, 3, 4]));
    expect(arrEq(result.values, [2, Number.NaN, 6, 24])).toBe(true);
  });

  it("skipna=false: NaN poisons subsequent values", () => {
    const result = cumprod(s([2, null, 3, 4]), { skipna: false });
    expect(arrEq(result.values, [2, Number.NaN, Number.NaN, Number.NaN])).toBe(true);
  });

  it("contains zero", () => {
    expect(arrEq(cumprod(s([2, 0, 5])).values, [2, 0, 0])).toBe(true);
  });

  it("all zeros", () => {
    expect(arrEq(cumprod(s([0, 0, 0])).values, [0, 0, 0])).toBe(true);
  });

  it("negative values", () => {
    expect(arrEq(cumprod(s([-1, 2, -3])).values, [-1, -2, 6])).toBe(true);
  });
});

// ─── cummax ───────────────────────────────────────────────────────────────────

describe("cummax", () => {
  it("already increasing", () => {
    expect(arrEq(cummax(s([1, 2, 3, 4])).values, [1, 2, 3, 4])).toBe(true);
  });

  it("already decreasing", () => {
    expect(arrEq(cummax(s([4, 3, 2, 1])).values, [4, 4, 4, 4])).toBe(true);
  });

  it("mixed sequence", () => {
    expect(arrEq(cummax(s([3, 1, 4, 1, 5, 9, 2])).values, [3, 3, 4, 4, 5, 9, 9])).toBe(true);
  });

  it("empty series", () => {
    expect(cummax(s([])).values).toEqual([]);
  });

  it("single element", () => {
    expect(cummax(s([42])).values).toEqual([42]);
  });

  it("skipna=true: NaN position → null, max continues", () => {
    const result = cummax(s([3, null, 1, 5]));
    expect(arrEq(result.values, [3, null, 3, 5])).toBe(true);
  });

  it("skipna=false: null poisons subsequent", () => {
    const result = cummax(s([3, null, 1, 5]), { skipna: false });
    expect(arrEq(result.values, [3, null, null, null])).toBe(true);
  });

  it("leading null", () => {
    const result = cummax(s([null, 2, 5, 1]));
    expect(arrEq(result.values, [null, 2, 5, 5])).toBe(true);
  });

  it("all equal", () => {
    expect(arrEq(cummax(s([3, 3, 3])).values, [3, 3, 3])).toBe(true);
  });

  it("negative numbers", () => {
    expect(arrEq(cummax(s([-5, -3, -8, -1])).values, [-5, -3, -3, -1])).toBe(true);
  });

  it("string series", () => {
    expect(arrEq(cummax(s(["b", "a", "c", "b"])).values, ["b", "b", "c", "c"])).toBe(true);
  });
});

// ─── cummin ───────────────────────────────────────────────────────────────────

describe("cummin", () => {
  it("already decreasing", () => {
    expect(arrEq(cummin(s([4, 3, 2, 1])).values, [4, 3, 2, 1])).toBe(true);
  });

  it("already increasing", () => {
    expect(arrEq(cummin(s([1, 2, 3, 4])).values, [1, 1, 1, 1])).toBe(true);
  });

  it("mixed sequence", () => {
    expect(arrEq(cummin(s([3, 1, 4, 1, 5, 0, 2])).values, [3, 1, 1, 1, 1, 0, 0])).toBe(true);
  });

  it("empty series", () => {
    expect(cummin(s([])).values).toEqual([]);
  });

  it("single element", () => {
    expect(cummin(s([7])).values).toEqual([7]);
  });

  it("skipna=true: null position → null, min continues", () => {
    const result = cummin(s([3, null, 1, 5]));
    expect(arrEq(result.values, [3, null, 1, 1])).toBe(true);
  });

  it("skipna=false: null poisons subsequent", () => {
    const result = cummin(s([3, null, 1, 5]), { skipna: false });
    expect(arrEq(result.values, [3, null, null, null])).toBe(true);
  });

  it("all equal", () => {
    expect(arrEq(cummin(s([5, 5, 5])).values, [5, 5, 5])).toBe(true);
  });

  it("string series", () => {
    expect(arrEq(cummin(s(["b", "a", "c", "b"])).values, ["b", "a", "a", "a"])).toBe(true);
  });
});

// ─── dataFrameCumsum ──────────────────────────────────────────────────────────

describe("dataFrameCumsum", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });

  it("axis=0 (default): column-wise", () => {
    const result = dataFrameCumsum(df);
    expect(arrEq(result.col("a").values, [1, 3, 6])).toBe(true);
    expect(arrEq(result.col("b").values, [10, 30, 60])).toBe(true);
  });

  it("preserves column names and index", () => {
    const result = dataFrameCumsum(df);
    expect(result.columns.values).toEqual(["a", "b"]);
    expect(result.index.values).toEqual(df.index.values);
  });

  it("axis=1: row-wise cumulative sum", () => {
    const result = dataFrameCumsum(df, { axis: 1 });
    expect(arrEq(result.col("a").values, [1, 2, 3])).toBe(true);
    expect(arrEq(result.col("b").values, [11, 22, 33])).toBe(true);
  });

  it("axis='columns': same as axis=1", () => {
    const result = dataFrameCumsum(df, { axis: "columns" });
    expect(arrEq(result.col("b").values, [11, 22, 33])).toBe(true);
  });

  it("handles NaN with skipna=true", () => {
    const dfNull = DataFrame.fromColumns({ a: [1, null, 3], b: [4, 5, 6] });
    const result = dataFrameCumsum(dfNull);
    expect(arrEq(result.col("a").values, [1, Number.NaN, 4])).toBe(true);
    expect(arrEq(result.col("b").values, [4, 9, 15])).toBe(true);
  });

  it("empty DataFrame", () => {
    const empty = DataFrame.fromColumns({});
    expect(dataFrameCumsum(empty).columns.size).toBe(0);
  });
});

// ─── dataFrameCumprod ─────────────────────────────────────────────────────────

describe("dataFrameCumprod", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [2, 3, 4] });

  it("axis=0: column-wise", () => {
    const result = dataFrameCumprod(df);
    expect(arrEq(result.col("a").values, [1, 2, 6])).toBe(true);
    expect(arrEq(result.col("b").values, [2, 6, 24])).toBe(true);
  });

  it("axis=1: row-wise", () => {
    const result = dataFrameCumprod(df, { axis: 1 });
    expect(arrEq(result.col("a").values, [1, 2, 3])).toBe(true);
    expect(arrEq(result.col("b").values, [2, 6, 12])).toBe(true);
  });
});

// ─── dataFrameCummax ──────────────────────────────────────────────────────────

describe("dataFrameCummax", () => {
  const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 30, 20] });

  it("axis=0: column-wise", () => {
    const result = dataFrameCummax(df);
    expect(arrEq(result.col("a").values, [3, 3, 4])).toBe(true);
    expect(arrEq(result.col("b").values, [10, 30, 30])).toBe(true);
  });

  it("axis=1: row-wise max", () => {
    const result = dataFrameCummax(df, { axis: 1 });
    // row 0: [3, max(3,10)=10], row 1: [1, max(1,30)=30], row 2: [4, max(4,20)=20]
    expect(arrEq(result.col("a").values, [3, 1, 4])).toBe(true);
    expect(arrEq(result.col("b").values, [10, 30, 20])).toBe(true);
  });
});

// ─── dataFrameCummin ──────────────────────────────────────────────────────────

describe("dataFrameCummin", () => {
  const df = DataFrame.fromColumns({ a: [3, 1, 4], b: [10, 30, 20] });

  it("axis=0: column-wise", () => {
    const result = dataFrameCummin(df);
    expect(arrEq(result.col("a").values, [3, 1, 1])).toBe(true);
    expect(arrEq(result.col("b").values, [10, 10, 10])).toBe(true);
  });

  it("axis=1: row-wise min", () => {
    const result = dataFrameCummin(df, { axis: 1 });
    // row 0: [3, min(3,10)=3], row 1: [1, min(1,30)=1], row 2: [4, min(4,20)=4]
    expect(arrEq(result.col("a").values, [3, 1, 4])).toBe(true);
    expect(arrEq(result.col("b").values, [3, 1, 4])).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property tests", () => {
  it("cumsum: last value equals sum of all finite values", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }), (data) => {
        const result = cumsum(s(data));
        const vals = result.values;
        const last = vals.at(-1) as number;
        const expected = data.reduce((acc, v) => acc + v, 0);
        return Math.abs(last - expected) < 1e-6;
      }),
    );
  });

  it("cumprod: last value equals product of all finite values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        (data) => {
          const result = cumprod(s(data));
          const vals = result.values;
          const last = vals.at(-1) as number;
          const expected = data.reduce((acc, v) => acc * v, 1);
          return last === expected;
        },
      ),
    );
  });

  it("cummax: result is non-decreasing for finite series", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2 }), (data) => {
        const vals = cummax(s(data)).values;
        for (let i = 1; i < vals.length; i++) {
          const prev = vals[i - 1];
          const curr = vals[i];
          if (typeof prev !== "number" || typeof curr !== "number") {
            return true;
          }
          if (curr < prev) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("cummin: result is non-increasing for finite series", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2 }), (data) => {
        const vals = cummin(s(data)).values;
        for (let i = 1; i < vals.length; i++) {
          const prev = vals[i - 1];
          const curr = vals[i];
          if (typeof prev !== "number" || typeof curr !== "number") {
            return true;
          }
          if (curr > prev) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("cumsum length matches input length", () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(fc.integer(), fc.constant(null))), (data) => {
        return cumsum(s(data)).values.length === data.length;
      }),
    );
  });

  it("cummax: each value is the max of the prefix", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1 }), (data) => {
        const vals = cummax(s(data)).values;
        let running = data[0] as number;
        for (let i = 0; i < data.length; i++) {
          const d = data[i] as number;
          running = d > running ? d : running;
          if (vals[i] !== running) {
            return false;
          }
        }
        return true;
      }),
    );
  });
});
