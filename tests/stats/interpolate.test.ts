/**
 * Tests for src/stats/interpolate.ts
 *
 * Covers:
 *  - linear interpolation (interior, leading/trailing, limit, limitDirection)
 *  - ffill / pad / zero
 *  - bfill / backfill
 *  - nearest
 *  - limit parameter
 *  - DataFrame column-wise and row-wise
 *  - property-based tests (fast-check)
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, dataFrameInterpolate, interpolateSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function mkSeries(data: (number | null)[]): Series<Scalar> {
  return new Series({ data });
}

function vals(s: Series<Scalar>): readonly Scalar[] {
  return s.values;
}

// ─── linear ───────────────────────────────────────────────────────────────────

describe("interpolateSeries — linear (default)", () => {
  test("basic interior gap", () => {
    const s = mkSeries([1, null, null, 4]);
    const result = vals(interpolateSeries(s));
    expect(result[0]).toBe(1);
    expect(result[1]).toBeCloseTo(2);
    expect(result[2]).toBeCloseTo(3);
    expect(result[3]).toBe(4);
  });

  test("single missing in middle", () => {
    const s = mkSeries([0, null, 10]);
    const result = vals(interpolateSeries(s));
    expect(result[1]).toBeCloseTo(5);
  });

  test("leading NaN left untouched", () => {
    const s = mkSeries([null, null, 2, 4]);
    const result = vals(interpolateSeries(s));
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(2);
    expect(result[3]).toBe(4);
  });

  test("trailing NaN left untouched", () => {
    const s = mkSeries([1, 3, null, null]);
    const result = vals(interpolateSeries(s));
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(3);
    expect(result[2]).toBeNull();
    expect(result[3]).toBeNull();
  });

  test("NaN values also treated as missing", () => {
    const s = new Series({ data: [0, Number.NaN, 4] });
    const result = vals(interpolateSeries(s));
    expect(result[1]).toBeCloseTo(2);
  });

  test("multiple gaps", () => {
    const s = mkSeries([0, null, 4, null, null, 9]);
    const result = vals(interpolateSeries(s));
    expect(result[1]).toBeCloseTo(2); // gap1: 0→4, pos1: 2
    // gap2: 4→9 over 3 steps
    expect(result[3]).toBeCloseTo(4 + 5 * (1 / 3)); // 5.667
    expect(result[4]).toBeCloseTo(4 + 5 * (2 / 3)); // 7.333
  });

  test("already complete series — unchanged", () => {
    const s = mkSeries([1, 2, 3]);
    const result = vals(interpolateSeries(s));
    expect(result).toEqual([1, 2, 3]);
  });

  test("all missing — unchanged", () => {
    const s = mkSeries([null, null, null]);
    const result = vals(interpolateSeries(s));
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
  });

  test("single value series — unchanged", () => {
    const s = mkSeries([5]);
    const result = vals(interpolateSeries(s));
    expect(result[0]).toBe(5);
  });

  test("limit=1 forward — fills only first NaN in gap", () => {
    const s = mkSeries([0, null, null, null, 4]);
    const result = vals(interpolateSeries(s, { limit: 1 }));
    expect(result[1]).toBeCloseTo(1); // filled
    expect(result[2]).toBeNull(); // not filled (limit reached)
    expect(result[3]).toBeNull(); // not filled
  });

  test("limit=1 backward — fills only last NaN in gap", () => {
    const s = mkSeries([0, null, null, null, 4]);
    const result = vals(interpolateSeries(s, { limit: 1, limitDirection: "backward" }));
    expect(result[1]).toBeNull(); // not filled
    expect(result[2]).toBeNull(); // not filled
    expect(result[3]).toBeCloseTo(3); // filled
  });

  test("limit=1 both — fills first and last NaN in gap", () => {
    const s = mkSeries([0, null, null, null, 4]);
    const result = vals(interpolateSeries(s, { limit: 1, limitDirection: "both" }));
    expect(result[1]).toBeCloseTo(1); // filled from left
    expect(result[2]).toBeNull(); // not filled (middle)
    expect(result[3]).toBeCloseTo(3); // filled from right
  });

  test("preserves index and name", () => {
    const s = new Series({ data: [1, null, 3], name: "x" });
    const result = interpolateSeries(s);
    expect(result.name).toBe("x");
    expect(result.index.values).toEqual(s.index.values);
  });
});

// ─── ffill ────────────────────────────────────────────────────────────────────

describe("interpolateSeries — ffill / pad / zero", () => {
  test("ffill basic", () => {
    const s = mkSeries([1, null, null, 4, null]);
    const result = vals(interpolateSeries(s, { method: "ffill" }));
    expect(result).toEqual([1, 1, 1, 4, 4]);
  });

  test("pad is alias for ffill", () => {
    const s = mkSeries([null, 2, null]);
    const ffillResult = vals(interpolateSeries(s, { method: "ffill" }));
    const padResult = vals(interpolateSeries(s, { method: "pad" }));
    expect(padResult).toEqual(ffillResult);
  });

  test("zero is alias for ffill (step function)", () => {
    const s = mkSeries([null, 2, null]);
    const ffillResult = vals(interpolateSeries(s, { method: "ffill" }));
    const zeroResult = vals(interpolateSeries(s, { method: "zero" }));
    expect(zeroResult).toEqual(ffillResult);
  });

  test("ffill leading NaN stays null (no left anchor)", () => {
    const s = mkSeries([null, null, 3]);
    const result = vals(interpolateSeries(s, { method: "ffill" }));
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(3);
  });

  test("ffill with limit=1", () => {
    const s = mkSeries([1, null, null, null]);
    const result = vals(interpolateSeries(s, { method: "ffill", limit: 1 }));
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1); // filled
    expect(result[2]).toBeNull(); // limit reached
    expect(result[3]).toBeNull(); // limit reached
  });
});

// ─── bfill ────────────────────────────────────────────────────────────────────

describe("interpolateSeries — bfill / backfill", () => {
  test("bfill basic", () => {
    const s = mkSeries([null, 2, null, null, 5]);
    const result = vals(interpolateSeries(s, { method: "bfill" }));
    expect(result).toEqual([2, 2, 5, 5, 5]);
  });

  test("backfill is alias for bfill", () => {
    const s = mkSeries([null, 2, null]);
    const bfillResult = vals(interpolateSeries(s, { method: "bfill" }));
    const backfillResult = vals(interpolateSeries(s, { method: "backfill" }));
    expect(backfillResult).toEqual(bfillResult);
  });

  test("bfill trailing NaN stays null (no right anchor)", () => {
    const s = mkSeries([1, null, null]);
    const result = vals(interpolateSeries(s, { method: "bfill" }));
    expect(result[0]).toBe(1);
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull();
  });

  test("bfill with limit=1", () => {
    const s = mkSeries([null, null, null, 4]);
    const result = vals(interpolateSeries(s, { method: "bfill", limit: 1 }));
    expect(result[3]).toBe(4);
    expect(result[2]).toBe(4); // filled
    expect(result[1]).toBeNull(); // limit reached
    expect(result[0]).toBeNull(); // limit reached
  });
});

// ─── nearest ──────────────────────────────────────────────────────────────────

describe("interpolateSeries — nearest", () => {
  test("nearest basic — closer to left", () => {
    const s = mkSeries([1, null, null, 4]);
    const result = vals(interpolateSeries(s, { method: "nearest" }));
    // position 1: dist-left=1, dist-right=2 → use left (1)
    expect(result[1]).toBe(1);
    // position 2: dist-left=2, dist-right=1 → use right (4)
    expect(result[2]).toBe(4);
  });

  test("nearest tie goes to right", () => {
    const s = mkSeries([1, null, 3]);
    const result = vals(interpolateSeries(s, { method: "nearest" }));
    // position 1: dist-left=1, dist-right=1 → tie → right wins
    expect(result[1]).toBe(3);
  });

  test("nearest leading NaN uses right anchor", () => {
    const s = mkSeries([null, null, 5]);
    const result = vals(interpolateSeries(s, { method: "nearest" }));
    expect(result[0]).toBe(5);
    expect(result[1]).toBe(5);
  });

  test("nearest trailing NaN uses left anchor", () => {
    const s = mkSeries([3, null, null]);
    const result = vals(interpolateSeries(s, { method: "nearest" }));
    expect(result[1]).toBe(3);
    expect(result[2]).toBe(3);
  });
});

// ─── DataFrame ────────────────────────────────────────────────────────────────

describe("dataFrameInterpolate", () => {
  test("column-wise (axis=0, default) — linear", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3], b: [10, null, 30] });
    const out = dataFrameInterpolate(df);
    expect(out.col("a").values[1]).toBeCloseTo(2);
    expect(out.col("b").values[1]).toBeCloseTo(20);
  });

  test("column-wise with ffill", () => {
    const df = DataFrame.fromColumns({ x: [5, null, null], y: [null, 2, null] });
    const out = dataFrameInterpolate(df, { method: "ffill" });
    expect(out.col("x").values).toEqual([5, 5, 5]);
    expect(out.col("y").values[0]).toBeNull();
    expect(out.col("y").values[1]).toBe(2);
    expect(out.col("y").values[2]).toBe(2);
  });

  test("row-wise (axis=1) — linear", () => {
    const df = DataFrame.fromColumns({ a: [1, 4], b: [null, null], c: [3, 8] });
    const out = dataFrameInterpolate(df, { axis: 1 });
    expect(out.col("b").values[0]).toBeCloseTo(2); // row 0: 1, _, 3 → 2
    expect(out.col("b").values[1]).toBeCloseTo(6); // row 1: 4, _, 8 → 6
  });

  test("axis='columns' alias for axis=1", () => {
    const df = DataFrame.fromColumns({ a: [0], b: [null], c: [4] });
    const out1 = dataFrameInterpolate(df, { axis: 1 });
    const out2 = dataFrameInterpolate(df, { axis: "columns" });
    expect(out1.col("b").values).toEqual(out2.col("b").values);
  });

  test("with limit", () => {
    const df = DataFrame.fromColumns({ a: [1, null, null, null, 5] });
    const out = dataFrameInterpolate(df, { limit: 1 });
    expect(out.col("a").values[1]).toBeCloseTo(2); // filled
    expect(out.col("a").values[2]).toBeNull(); // not filled
    expect(out.col("a").values[3]).toBeNull(); // not filled
  });

  test("bfill axis=1", () => {
    const df = DataFrame.fromColumns({ a: [null, null], b: [2, null], c: [4, 6] });
    const out = dataFrameInterpolate(df, { method: "bfill", axis: 1 });
    expect(out.col("a").values[0]).toBe(2); // row 0: null,2,4 → bfill → 2
    expect(out.col("a").values[1]).toBe(6); // row 1: null,null,6 → bfill → 6
  });
});

// ─── helpers for property tests ───────────────────────────────────────────────

/** Find the range [first, last] of known (non-null) positions. Returns [-1,-1] if none. */
function knownRange(data: (number | null)[]): { first: number; last: number } {
  let first = -1;
  let last = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== null) {
      if (first === -1) {
        first = i;
      }
      last = i;
    }
  }
  return { first, last };
}

/** Assert that no value in the range [from, to] is NaN or null. */
function assertNoMissingInRange(rv: readonly Scalar[], from: number, to: number): void {
  for (let i = from; i <= to; i++) {
    const v = rv[i];
    if (typeof v === "number") {
      expect(Number.isNaN(v)).toBe(false);
    } else {
      expect(v).not.toBeNull();
    }
  }
}

// ─── property tests ───────────────────────────────────────────────────────────

describe("interpolateSeries — property tests", () => {
  test("linear: known values are never changed", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.float({ noNaN: true, noDefaultInfinity: true }), { nil: null }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data });
          const result = interpolateSeries(s);
          for (let i = 0; i < data.length; i++) {
            const orig = data[i];
            if (orig !== null) {
              expect(result.values[i]).toBeCloseTo(orig as number, 10);
            }
          }
        },
      ),
    );
  });

  test("linear: no NaN introduced between two known values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.float({ noNaN: true, noDefaultInfinity: true }), { nil: null }), {
          minLength: 2,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data });
          const result = interpolateSeries(s);
          const { first, last } = knownRange(data);
          if (first === -1 || first === last) {
            return;
          }
          assertNoMissingInRange(result.values, first, last);
        },
      ),
    );
  });

  test("ffill: length is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer(), { nil: null }), { minLength: 0, maxLength: 30 }),
        (data) => {
          const s = new Series({ data });
          const result = interpolateSeries(s, { method: "ffill" });
          expect(result.values.length).toBe(data.length);
        },
      ),
    );
  });

  test("bfill: length is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer(), { nil: null }), { minLength: 0, maxLength: 30 }),
        (data) => {
          const s = new Series({ data });
          const result = interpolateSeries(s, { method: "bfill" });
          expect(result.values.length).toBe(data.length);
        },
      ),
    );
  });

  test("ffill then bfill: no missing values remain", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -100, max: 100 }), fc.constant(null as null)), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          // At least one known value must exist
          if (!data.some((v) => v !== null)) {
            return;
          }
          const s = new Series({ data });
          const step1 = interpolateSeries(s, { method: "ffill" });
          const step2 = interpolateSeries(step1, { method: "bfill" });
          for (const v of step2.values) {
            expect(v).not.toBeNull();
          }
        },
      ),
    );
  });

  test("nearest: result length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer(), { nil: null }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const s = new Series({ data });
          const result = interpolateSeries(s, { method: "nearest" });
          expect(result.values.length).toBe(data.length);
        },
      ),
    );
  });

  test("linear: output length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer(), { nil: null }), { minLength: 0, maxLength: 30 }),
        (data) => {
          const s = new Series({ data });
          const result = interpolateSeries(s);
          expect(result.values.length).toBe(data.length);
        },
      ),
    );
  });
});
