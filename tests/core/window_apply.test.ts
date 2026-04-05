import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameExpandingApply,
  dataFrameRollingApply,
  expandingApply,
  rollingApply,
} from "../../src/index.ts";

// ─── rollingApply ─────────────────────────────────────────────────────────────

describe("rollingApply", () => {
  test("basic trailing window sum", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = rollingApply(s, 3, (w) => w.reduce((a, x) => a + x, 0));
    expect(result.values).toEqual([null, null, 6, 9, 12]);
  });

  test("window of 1 passes each element", () => {
    const s = new Series({ data: [10, 20, 30] });
    const result = rollingApply(s, 1, (w) => w[0] ?? 0);
    expect(result.values).toEqual([10, 20, 30]);
  });

  test("window larger than series returns all nulls", () => {
    const s = new Series({ data: [1, 2] });
    const result = rollingApply(s, 5, (w) => w[0] ?? 0);
    expect(result.values).toEqual([null, null]);
  });

  test("preserves index", () => {
    const s = new Series({ data: [1, 2, 3], index: ["x", "y", "z"] });
    const result = rollingApply(s, 2, (w) => w[0] ?? 0);
    expect(result.index.values).toEqual(["x", "y", "z"]);
  });

  test("preserves name", () => {
    const s = new Series({ data: [1, 2, 3], name: "myname" });
    const result = rollingApply(s, 2, (w) => w[0] ?? 0);
    expect(result.name).toBe("myname");
  });

  test("minPeriods option", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    const result = rollingApply(s, 3, (w) => w.length, { minPeriods: 1 });
    expect(result.values).toEqual([1, 2, 3, 3]);
  });

  test("center option", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = rollingApply(s, 3, (w) => w.reduce((a, x) => a + x, 0), { center: true });
    // center: position 0 => [1,2], 1 => [1,2,3], 2 => [2,3,4], 3 => [3,4,5], 4 => [4,5]
    expect(result.values[2]).toBe(9); // [2,3,4]
  });

  test("throws on window < 1", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(() => rollingApply(s, 0, (w) => w[0] ?? 0)).toThrow(RangeError);
  });

  test("null values are excluded from window", () => {
    const s = new Series({ data: [1, null, 3, 4] });
    const result = rollingApply(s, 3, (w) => w.reduce((a, x) => a + x, 0), { minPeriods: 1 });
    // position 2: window=[1,null,3] → nums=[1,3] → sum=4
    expect(result.values[2]).toBe(4);
  });
});

// ─── expandingApply ───────────────────────────────────────────────────────────

describe("expandingApply", () => {
  test("running sum", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = expandingApply(s, (w) => w.reduce((a, x) => a + x, 0));
    expect(result.values).toEqual([1, 3, 6, 10, 15]);
  });

  test("minPeriods: first n-1 positions are null", () => {
    const s = new Series({ data: [1, 2, 3, 4] });
    const result = expandingApply(s, (w) => w.reduce((a, x) => a + x, 0), { minPeriods: 3 });
    expect(result.values).toEqual([null, null, 6, 10]);
  });

  test("preserves index and name", () => {
    const s = new Series({ data: [1, 2], index: ["a", "b"], name: "n" });
    const result = expandingApply(s, (w) => w[0] ?? 0);
    expect(result.index.values).toEqual(["a", "b"]);
    expect(result.name).toBe("n");
  });

  test("running max", () => {
    const s = new Series({ data: [3, 1, 4, 1, 5] });
    const result = expandingApply(s, (w) => Math.max(...w));
    expect(result.values).toEqual([3, 3, 4, 4, 5]);
  });
});

// ─── dataFrameRollingApply ───────────────────────────────────────────────────

describe("dataFrameRollingApply", () => {
  test("applies independently per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
    const result = dataFrameRollingApply(df, 2, (w) => w.reduce((x, y) => x + y, 0));
    expect(result.col("a")?.values).toEqual([null, 3, 5]);
    expect(result.col("b")?.values).toEqual([null, 9, 11]);
  });

  test("preserves columns", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3] });
    const result = dataFrameRollingApply(df, 2, (w) => w[0] ?? 0);
    expect(result.columns.values).toEqual(["x"]);
  });
});

// ─── dataFrameExpandingApply ─────────────────────────────────────────────────

describe("dataFrameExpandingApply", () => {
  test("cumulative sum per column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [10, 20, 30] });
    const result = dataFrameExpandingApply(df, (w) => w.reduce((x, y) => x + y, 0));
    expect(result.col("a")?.values).toEqual([1, 3, 6]);
    expect(result.col("b")?.values).toEqual([10, 30, 60]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("property tests", () => {
  test("output length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (arr, w) => {
          const s = new Series({ data: arr });
          const result = rollingApply(s, w, (win) => win.reduce((a, x) => a + x, 0));
          expect(result.values.length).toBe(arr.length);
        },
      ),
    );
  });

  test("expanding result first element equals first non-null value", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: 0.1 }), { minLength: 1, maxLength: 30 }),
        (arr) => {
          const s = new Series({ data: arr });
          const result = expandingApply(s, (w) => w[0] ?? 0);
          expect(result.values[0]).toBe(arr[0] ?? null);
        },
      ),
    );
  });
});
