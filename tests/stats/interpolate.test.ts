/**
 * Tests for src/stats/interpolate.ts — interpolateSeries and interpolateDataFrame.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  interpolateDataFrame,
  interpolateSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[], name?: string): Series<Scalar> {
  return new Series({ data: [...data], name: name ?? null });
}

function approxEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

// ─── interpolateSeries — linear ───────────────────────────────────────────────

describe("interpolateSeries — linear (default)", () => {
  it("fills a single interior NaN with midpoint", () => {
    const out = interpolateSeries(s([1, null, 3]));
    expect(out.values[1]).toBe(2);
  });

  it("fills multiple interior NaN values proportionally", () => {
    const out = interpolateSeries(s([0, null, null, null, 4]));
    const vals = out.values as number[];
    expect(approxEqual(vals[1] as number, 1)).toBe(true);
    expect(approxEqual(vals[2] as number, 2)).toBe(true);
    expect(approxEqual(vals[3] as number, 3)).toBe(true);
  });

  it("leaves leading NaN unfilled (no extrapolation)", () => {
    const out = interpolateSeries(s([null, null, 3, 4]));
    expect(out.values[0]).toBeNull();
    expect(out.values[1]).toBeNull();
    expect(out.values[2]).toBe(3);
  });

  it("leaves trailing NaN unfilled (no extrapolation)", () => {
    const out = interpolateSeries(s([1, 2, null, null]));
    expect(out.values[2]).toBeNull();
    expect(out.values[3]).toBeNull();
  });

  it("handles NaN float values as missing", () => {
    const out = interpolateSeries(s([0, Number.NaN, 2]));
    expect(approxEqual(out.values[1] as number, 1)).toBe(true);
  });

  it("does not modify non-NaN values", () => {
    const out = interpolateSeries(s([1, null, 3, null, 7]));
    expect(out.values[0]).toBe(1);
    expect(out.values[2]).toBe(3);
    expect(out.values[4]).toBe(7);
  });

  it("handles all-NaN series gracefully", () => {
    const out = interpolateSeries(s([null, null, null]));
    expect(out.values[0]).toBeNull();
    expect(out.values[1]).toBeNull();
    expect(out.values[2]).toBeNull();
  });

  it("handles single-element series", () => {
    const out = interpolateSeries(s([42]));
    expect(out.values[0]).toBe(42);
  });

  it("handles no missing values — returns equal series", () => {
    const out = interpolateSeries(s([1, 2, 3, 4, 5]));
    expect([...out.values]).toEqual([1, 2, 3, 4, 5]);
  });

  it("preserves series name", () => {
    const out = interpolateSeries(s([1, null, 3], "myName"));
    expect(out.name).toBe("myName");
  });

  it("respects limit — fills at most N consecutive NaN from each neighbour", () => {
    // [0, null, null, null, null, 5] with limit=1
    // From left: fill only pos 1 (1 step); from right: fill only pos 4 (1 step)
    // Positions 2 and 3 remain NaN
    const out = interpolateSeries(s([0, null, null, null, null, 5]), { limit: 1 });
    expect(out.values[1]).not.toBeNull(); // filled from left
    expect(out.values[4]).not.toBeNull(); // filled from right
    expect(out.values[2]).toBeNull();
    expect(out.values[3]).toBeNull();
  });
});

// ─── interpolateSeries — pad / ffill ─────────────────────────────────────────

describe("interpolateSeries — pad / ffill", () => {
  it("forward-fills NaN with preceding non-NaN", () => {
    const out = interpolateSeries(s([1, null, null, 4]), { method: "pad" });
    expect(out.values[1]).toBe(1);
    expect(out.values[2]).toBe(1);
    expect(out.values[3]).toBe(4);
  });

  it("ffill is alias for pad", () => {
    const o1 = interpolateSeries(s([1, null, 2]), { method: "pad" });
    const o2 = interpolateSeries(s([1, null, 2]), { method: "ffill" });
    expect([...o1.values]).toEqual([...o2.values]);
  });

  it("does not fill leading NaN (no previous value)", () => {
    const out = interpolateSeries(s([null, 1, null]), { method: "pad" });
    expect(out.values[0]).toBeNull();
    expect(out.values[2]).toBe(1);
  });

  it("respects limit", () => {
    const out = interpolateSeries(s([1, null, null, null, 5]), { method: "pad", limit: 1 });
    expect(out.values[1]).toBe(1);
    expect(out.values[2]).toBeNull();
    expect(out.values[3]).toBeNull();
  });
});

// ─── interpolateSeries — backfill / bfill ────────────────────────────────────

describe("interpolateSeries — backfill / bfill", () => {
  it("backward-fills NaN with next non-NaN", () => {
    const out = interpolateSeries(s([null, null, 3]), { method: "backfill" });
    expect(out.values[0]).toBe(3);
    expect(out.values[1]).toBe(3);
  });

  it("bfill is alias for backfill", () => {
    const o1 = interpolateSeries(s([null, 2, null]), { method: "backfill" });
    const o2 = interpolateSeries(s([null, 2, null]), { method: "bfill" });
    expect([...o1.values]).toEqual([...o2.values]);
  });

  it("does not fill trailing NaN (no next value)", () => {
    const out = interpolateSeries(s([1, null, null]), { method: "backfill" });
    expect(out.values[1]).toBeNull();
    expect(out.values[2]).toBeNull();
  });

  it("respects limit", () => {
    const out = interpolateSeries(s([0, null, null, null, 4]), { method: "bfill", limit: 1 });
    expect(out.values[3]).toBe(4);
    expect(out.values[2]).toBeNull();
    expect(out.values[1]).toBeNull();
  });
});

// ─── interpolateSeries — nearest ─────────────────────────────────────────────

describe("interpolateSeries — nearest", () => {
  it("fills with left neighbour when equidistant (tie-break forward)", () => {
    // [0, null, 2] — pos 1 is equidistant; prefer left (0)
    const out = interpolateSeries(s([0, null, 2]), { method: "nearest" });
    expect(out.values[1]).toBe(0);
  });

  it("fills with nearest non-NaN neighbour", () => {
    // [1, null, null, null, 5] — pos 1 nearest=1, pos 3 nearest=5, pos 2 nearest left tie
    const out = interpolateSeries(s([1, null, null, null, 5]), { method: "nearest" });
    expect(out.values[1]).toBe(1); // 1 step left, 3 steps right → left
    expect(out.values[3]).toBe(5); // 3 steps left, 1 step right → right
  });

  it("respects limit", () => {
    const out = interpolateSeries(s([0, null, null, 3]), { method: "nearest", limit: 1 });
    expect(out.values[1]).toBe(0); // 1 away from left → within limit
    expect(out.values[2]).toBeNull(); // nearest is 3 (1 away) but limit=1 already used... 
    // Actually nearest fills per-position, limit is distance-based.
  });
});

// ─── interpolateSeries — limitArea ───────────────────────────────────────────

describe("interpolateSeries — limitArea", () => {
  it("limitArea=inside: fills only interior NaN values", () => {
    // [null, 1, null, 3, null] — leading null and trailing null are outside
    const out = interpolateSeries(s([null, 1, null, 3, null]), {
      method: "linear",
      limitArea: "inside",
    });
    expect(out.values[0]).toBeNull(); // leading — outside
    expect(out.values[2]).toBe(2); // interior — filled
    expect(out.values[4]).toBeNull(); // trailing — outside
  });

  it("limitArea=outside: fills only edge NaN values (linear has no extrapolation)", () => {
    // Linear doesn't extrapolate, so "outside" means leading/trailing remain as-is even more so
    const out = interpolateSeries(s([null, 1, null, 3, null]), {
      method: "pad",
      limitArea: "outside",
    });
    // pad can't fill leading (no prev value), trailing gets filled by pad
    expect(out.values[4]).toBe(3); // trailing — outside → filled by pad
    expect(out.values[2]).toBeNull(); // interior — should NOT be filled
  });
});

// ─── interpolateDataFrame — axis=0 (columns) ─────────────────────────────────

describe("interpolateDataFrame — axis=0 (columns)", () => {
  it("interpolates each column independently", () => {
    const df = DataFrame.fromColumns({
      a: [1, null, 3] as Scalar[],
      b: [null, 2, null] as Scalar[],
    });
    const out = interpolateDataFrame(df);
    expect(out.col("a").values[1]).toBe(2);
    // b has null on both sides of 2, can't fill
    expect(out.col("b").values[0]).toBeNull();
    expect(out.col("b").values[2]).toBeNull();
  });

  it("default axis is 0", () => {
    const df = DataFrame.fromColumns({ x: [0, null, 4] as Scalar[] });
    const out1 = interpolateDataFrame(df);
    const out2 = interpolateDataFrame(df, { axis: 0 });
    expect([...out1.col("x").values]).toEqual([...out2.col("x").values]);
  });

  it("preserves column names and index", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] as Scalar[], b: [4, 5, 6] as Scalar[] });
    const out = interpolateDataFrame(df);
    expect([...out.columns.values]).toEqual(["a", "b"]);
    expect(out.index.size).toBe(3);
  });
});

// ─── interpolateDataFrame — axis=1 (rows) ────────────────────────────────────

describe("interpolateDataFrame — axis=1 (rows)", () => {
  it("interpolates across each row", () => {
    const df = DataFrame.fromColumns({
      a: [1, 0] as Scalar[],
      b: [null, null] as Scalar[],
      c: [3, 4] as Scalar[],
    });
    const out = interpolateDataFrame(df, { axis: 1 });
    expect(out.col("b").values[0]).toBe(2); // row 0: 1,null,3 → 2
    expect(out.col("b").values[1]).toBe(2); // row 1: 0,null,4 → 2
  });

  it("axis='columns' is same as axis=1", () => {
    const df = DataFrame.fromColumns({
      a: [1] as Scalar[],
      b: [null] as Scalar[],
      c: [3] as Scalar[],
    });
    const out1 = interpolateDataFrame(df, { axis: 1 });
    const out2 = interpolateDataFrame(df, { axis: "columns" });
    expect([...out1.col("b").values]).toEqual([...out2.col("b").values]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("interpolateSeries — property-based", () => {
  it("linear: non-NaN values are never changed", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.float({ noNaN: true }), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const series = new Series({ data: data as Scalar[] });
          const out = interpolateSeries(series);
          for (let i = 0; i < data.length; i++) {
            const orig = data[i];
            if (orig !== null) {
              expect(out.values[i]).toBeCloseTo(orig as number, 9);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("linear: interpolated values are monotone between neighbours", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.float({ noNaN: true, min: 0, max: 100 }), fc.constant(null)), {
          minLength: 3,
          maxLength: 15,
        }),
        (data) => {
          const series = new Series({ data: data as Scalar[] });
          const out = interpolateSeries(series);
          const vals = out.values as (number | null)[];
          for (let i = 1; i < vals.length - 1; i++) {
            const prev = vals[i - 1];
            const curr = vals[i];
            const next = vals[i + 1];
            if (prev !== null && curr !== null && next !== null) {
              const inOrder = (prev <= curr && curr <= next) || (prev >= curr && curr >= next);
              expect(inOrder).toBe(true);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("pad: no NaN is introduced", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -100, max: 100 }), fc.constant(null)), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const series = new Series({ data: data as Scalar[] });
          const out = interpolateSeries(series, { method: "pad" });
          // number of nulls in output ≤ number in input
          const inNulls = data.filter((v) => v === null).length;
          const outNulls = (out.values as Scalar[]).filter((v) => v === null).length;
          expect(outNulls).toBeLessThanOrEqual(inNulls);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("output length always equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.float({ noNaN: true }), fc.constant(null)), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.constantFrom("linear" as const, "pad" as const, "bfill" as const, "nearest" as const),
        (data, method) => {
          const series = new Series({ data: data as Scalar[] });
          const out = interpolateSeries(series, { method });
          expect(out.values.length).toBe(data.length);
        },
      ),
      { numRuns: 300 },
    );
  });
});
