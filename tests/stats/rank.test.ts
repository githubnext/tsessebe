/**
 * Tests for src/stats/rank.ts — rankSeries() and rankDataFrame()
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, rankDataFrame, rankSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[], index?: readonly (string | number)[]): Series<Scalar> {
  return new Series({ data: [...data], ...(index !== undefined ? { index } : {}) });
}

function approx(a: number, b: number, eps = 1e-9): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  return Math.abs(a - b) < eps;
}

function approxArr(a: readonly (number | Scalar)[], b: readonly number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    if (typeof av !== "number" || bv === undefined) {
      return false;
    }
    if (!approx(av, bv)) {
      return false;
    }
  }
  return true;
}

// ─── rankSeries — basic ──────────────────────────────────────────────────────

describe("rankSeries — method=average (default)", () => {
  it("no ties", () => {
    const r = rankSeries(s([3, 1, 2]));
    expect([...r.values]).toEqual([3, 1, 2]);
  });

  it("ties: average of positions", () => {
    const r = rankSeries(s([3, 1, 4, 1, 5]));
    expect(approxArr(r.values, [3, 1.5, 4, 1.5, 5])).toBe(true);
  });

  it("all same value: all get (n+1)/2 rank", () => {
    const r = rankSeries(s([7, 7, 7]));
    expect(approxArr(r.values, [2, 2, 2])).toBe(true);
  });

  it("single element", () => {
    expect([...rankSeries(s([42])).values]).toEqual([1]);
  });

  it("empty series", () => {
    expect([...rankSeries(s([])).values]).toEqual([]);
  });

  it("preserves index", () => {
    const r = rankSeries(s([10, 20], ["a", "b"]));
    expect([...r.index.values]).toEqual(["a", "b"]);
  });

  it("preserves name", () => {
    const ser = new Series({ data: [3, 1], name: "score" });
    expect(rankSeries(ser).name).toBe("score");
  });
});

describe("rankSeries — method=min", () => {
  it("ties get the minimum rank", () => {
    const r = rankSeries(s([3, 1, 4, 1, 5]), { method: "min" });
    expect([...r.values]).toEqual([3, 1, 4, 1, 5]);
  });

  it("three-way tie", () => {
    const r = rankSeries(s([2, 2, 2, 1]), { method: "min" });
    expect([...r.values]).toEqual([2, 2, 2, 1]);
  });
});

describe("rankSeries — method=max", () => {
  it("ties get the maximum rank", () => {
    const r = rankSeries(s([3, 1, 4, 1, 5]), { method: "max" });
    expect([...r.values]).toEqual([3, 2, 4, 2, 5]);
  });

  it("three-way tie", () => {
    const r = rankSeries(s([2, 2, 2, 1]), { method: "max" });
    expect([...r.values]).toEqual([4, 4, 4, 1]);
  });
});

describe("rankSeries — method=first", () => {
  it("ties broken by first appearance", () => {
    const r = rankSeries(s([3, 1, 4, 1, 5]), { method: "first" });
    expect([...r.values]).toEqual([3, 1, 4, 2, 5]);
  });

  it("reverse array", () => {
    // [5, 4, 3, 2, 1] → ranks [5, 4, 3, 2, 1]
    const r = rankSeries(s([5, 4, 3, 2, 1]), { method: "first" });
    expect([...r.values]).toEqual([5, 4, 3, 2, 1]);
  });

  it("three equal elements — first appearance wins", () => {
    const r = rankSeries(s([7, 7, 7]), { method: "first" });
    expect([...r.values]).toEqual([1, 2, 3]);
  });
});

describe("rankSeries — method=dense", () => {
  it("no rank gaps for dense", () => {
    const r = rankSeries(s([3, 1, 4, 1, 5]), { method: "dense" });
    expect([...r.values]).toEqual([3, 1, 4, 1, 5]);
  });

  it("dense with gap compression", () => {
    // values: [3, 1, 4, 1, 5, 9, 2, 6]
    // sorted distinct: 1(r1), 2(r2), 3(r3), 4(r4), 5(r5), 6(r6), 9(r7)
    const r = rankSeries(s([3, 1, 4, 1, 5, 9, 2, 6]), { method: "dense" });
    expect([...r.values]).toEqual([3, 1, 4, 1, 5, 7, 2, 6]);
  });
});

describe("rankSeries — ascending=false", () => {
  it("largest value gets rank 1", () => {
    const r = rankSeries(s([1, 2, 3]), { ascending: false });
    expect([...r.values]).toEqual([3, 2, 1]);
  });

  it("ties descending average", () => {
    const r = rankSeries(s([3, 1, 4, 1, 5]), { ascending: false });
    // descending order: 5(1), 4(2), 3(3), 1/1(4.5)
    expect(approxArr(r.values, [3, 4.5, 2, 4.5, 1])).toBe(true);
  });

  it("dense + descending", () => {
    const r = rankSeries(s([1, 2, 2, 3]), { method: "dense", ascending: false });
    // desc: 3→1, 2→2, 1→3
    expect([...r.values]).toEqual([3, 2, 2, 1]);
  });
});

// ─── rankSeries — na_option ──────────────────────────────────────────────────

describe("rankSeries — naOption=keep (default)", () => {
  it("NaN values remain NaN", () => {
    const r = rankSeries(s([3, null, 1]));
    expect(Number.isNaN(r.values[1] as number)).toBe(true);
    expect(r.values[2]).toBe(1);
    expect(r.values[0]).toBe(2);
  });

  it("all NaN series", () => {
    const r = rankSeries(s([null, null]));
    expect(Number.isNaN(r.values[0] as number)).toBe(true);
    expect(Number.isNaN(r.values[1] as number)).toBe(true);
  });
});

describe("rankSeries — naOption=top", () => {
  it("NaN values ranked first", () => {
    const r = rankSeries(s([3, null, 1]), { naOption: "top" });
    expect(r.values[1]).toBe(1); // null → rank 1
    expect(r.values[2]).toBe(2); // 1 → rank 2 (shifted)
    expect(r.values[0]).toBe(3); // 3 → rank 3
  });

  it("multiple NaN values at top", () => {
    const r = rankSeries(s([null, 10, null, 5]), { naOption: "top" });
    // nulls get ranks 1, 2 (in appearance order)
    expect(r.values[0]).toBe(1);
    expect(r.values[2]).toBe(2);
    expect(r.values[3]).toBe(3); // 5 → rank 3
    expect(r.values[1]).toBe(4); // 10 → rank 4
  });
});

describe("rankSeries — naOption=bottom", () => {
  it("NaN values ranked last", () => {
    const r = rankSeries(s([3, null, 1]), { naOption: "bottom" });
    expect(r.values[2]).toBe(1); // 1 → rank 1
    expect(r.values[0]).toBe(2); // 3 → rank 2
    expect(r.values[1]).toBe(3); // null → rank 3
  });

  it("multiple NaN values at bottom", () => {
    const r = rankSeries(s([10, null, 5, null]), { naOption: "bottom" });
    expect(r.values[2]).toBe(1); // 5 → rank 1
    expect(r.values[0]).toBe(2); // 10 → rank 2
    expect(r.values[1]).toBe(3); // null → rank 3
    expect(r.values[3]).toBe(4); // null → rank 4
  });
});

// ─── rankSeries — pct ────────────────────────────────────────────────────────

describe("rankSeries — pct=true", () => {
  it("percentages sum to (n+1)/2 / n for average", () => {
    const r = rankSeries(s([1, 2, 3]), { pct: true });
    // ranks 1,2,3 / 3 = 1/3, 2/3, 1
    expect(approxArr(r.values, [1 / 3, 2 / 3, 1])).toBe(true);
  });

  it("pct with ties (average)", () => {
    const r = rankSeries(s([1, 1, 2]), { pct: true });
    // average ranks: 1.5, 1.5, 3 / nValid=3
    expect(approxArr(r.values, [0.5, 0.5, 1])).toBe(true);
  });

  it("pct + naOption=bottom uses n (total) as denominator", () => {
    // [1, null, 2]: nValid=2, n=3; null→rank 3
    const r = rankSeries(s([1, null, 2]), { pct: true, naOption: "bottom" });
    expect(approxArr(r.values, [1 / 3, 1, 2 / 3])).toBe(true);
  });

  it("pct + naOption=keep uses nValid as denominator", () => {
    const r = rankSeries(s([1, null, 3]), { pct: true, naOption: "keep" });
    expect(approxArr(r.values, [0.5, Number.NaN, 1])).toBe(true);
  });
});

// ─── rankDataFrame — axis=0 (default) ────────────────────────────────────────

describe("rankDataFrame — axis=0 (columns)", () => {
  it("ranks each column independently", () => {
    const df = DataFrame.fromColumns({ a: [3, 1, 2], b: [10, 30, 20] });
    const ranked = rankDataFrame(df);
    expect([...ranked.col("a").values]).toEqual([3, 1, 2]);
    expect([...ranked.col("b").values]).toEqual([1, 3, 2]);
  });

  it("options propagate to each column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 2], b: [5, 5, 3] });
    const ranked = rankDataFrame(df, { method: "min" });
    expect([...ranked.col("a").values]).toEqual([1, 2, 2]);
    expect([...ranked.col("b").values]).toEqual([2, 2, 1]);
  });

  it("same shape and index as input", () => {
    const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [7, 8, 9] }, { index: ["p", "q", "r"] });
    const ranked = rankDataFrame(df);
    expect([...ranked.index.values]).toEqual(["p", "q", "r"]);
    expect([...ranked.columns.values]).toEqual(["x", "y"]);
  });
});

describe("rankDataFrame — axis=1 (rows)", () => {
  it("ranks each row independently", () => {
    const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 1] });
    const ranked = rankDataFrame(df, { axis: 1 });
    // row 0: [1, 2] → ranks [1, 2]
    // row 1: [3, 1] → ranks [2, 1]
    expect(ranked.col("a").values[0]).toBe(1);
    expect(ranked.col("b").values[0]).toBe(2);
    expect(ranked.col("a").values[1]).toBe(2);
    expect(ranked.col("b").values[1]).toBe(1);
  });

  it("axis='columns' is alias for axis=1", () => {
    const df = DataFrame.fromColumns({ a: [1, 3], b: [2, 1] });
    const r1 = rankDataFrame(df, { axis: 1 });
    const r2 = rankDataFrame(df, { axis: "columns" });
    expect([...r1.col("a").values]).toEqual([...r2.col("a").values]);
    expect([...r1.col("b").values]).toEqual([...r2.col("b").values]);
  });

  it("ties in a row (average)", () => {
    const df = DataFrame.fromColumns({ a: [2, 1], b: [2, 1], c: [1, 2] });
    const ranked = rankDataFrame(df, { axis: 1 });
    // row 0: [2,2,1] → ranks average: a=2.5, b=2.5, c=1
    expect(approx(ranked.col("a").values[0] as number, 2.5)).toBe(true);
    expect(approx(ranked.col("b").values[0] as number, 2.5)).toBe(true);
    expect(ranked.col("c").values[0]).toBe(1);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("rankSeries — property tests", () => {
  it("ranks form a valid permutation (no NaN, no ties in 'first')", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: false }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const ser = new Series({ data: arr });
          const ranked = rankSeries(ser, { method: "first" });
          const vals = [...ranked.values].filter((v) => !Number.isNaN(v));
          if (vals.length === 0) {
            return true;
          }
          // Should be a permutation of 1..n
          const sorted = [...vals].sort((a, b) => a - b);
          return sorted.every((v, i) => v === i + 1);
        },
      ),
    );
  });

  it("rank sum = n*(n+1)/2 for no-NaN data with average method", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 30 }),
        (arr) => {
          const n = arr.length;
          const ranked = rankSeries(new Series({ data: arr }));
          const sum = [...ranked.values].reduce<number>((acc, v) => acc + (v as number), 0);
          return approx(sum, (n * (n + 1)) / 2);
        },
      ),
    );
  });

  it("ascending=false reverses ranks (no ties, no NaN)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 20 }),
        (arr) => {
          const asc = rankSeries(new Series({ data: arr }), { method: "first" });
          const desc = rankSeries(new Series({ data: arr }), {
            method: "first",
            ascending: false,
          });
          const n = arr.length;
          return [...asc.values].every((v, i) => {
            const dv = desc.values[i];
            return typeof v === "number" && typeof dv === "number" && approx(v + dv, n + 1);
          });
        },
      ),
    );
  });

  it("dense ranks are contiguous integers starting at 1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const ranked = rankSeries(new Series({ data: arr }), { method: "dense" });
          const maxRank = Math.max(...(ranked.values as number[]));
          const minRank = Math.min(...(ranked.values as number[]));
          return minRank === 1 && Number.isInteger(maxRank);
        },
      ),
    );
  });

  it("pct ranks are in [0, 1] when naOption=keep", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const ranked = rankSeries(new Series({ data: arr }), { pct: true });
          return [...ranked.values].every(
            (v) => typeof v === "number" && (Number.isNaN(v) || (v > 0 && v <= 1)),
          );
        },
      ),
    );
  });

  it("min rank ≤ average rank ≤ max rank", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const ser = new Series({ data: arr });
          const rMin = rankSeries(ser, { method: "min" });
          const rAvg = rankSeries(ser, { method: "average" });
          const rMax = rankSeries(ser, { method: "max" });
          return [...rMin.values].every((minV, i) => {
            const avgV = rAvg.values[i];
            const maxV = rMax.values[i];
            return (
              typeof minV === "number" &&
              typeof avgV === "number" &&
              typeof maxV === "number" &&
              minV <= avgV + 1e-9 &&
              avgV <= maxV + 1e-9
            );
          });
        },
      ),
    );
  });
});

describe("rankDataFrame — property tests", () => {
  it("shape is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (a, b) => {
          const n = Math.min(a.length, b.length);
          const df = DataFrame.fromColumns({ a: a.slice(0, n), b: b.slice(0, n) });
          const ranked = rankDataFrame(df);
          return ranked.shape[0] === df.shape[0] && ranked.shape[1] === df.shape[1];
        },
      ),
    );
  });
});
