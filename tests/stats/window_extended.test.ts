/**
 * Tests for src/stats/window_extended.ts
 * — rollingSem, rollingSkew, rollingKurt, rollingQuantile
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  rollingKurt,
  rollingQuantile,
  rollingSem,
  rollingSkew,
} from "../../src/stats/window_extended.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly (number | null)[]): Series<Scalar> {
  return new Series({ data: [...(data as Scalar[])] });
}

function vals(series: ReturnType<typeof rollingSem>): (number | null)[] {
  return [...series.toArray()] as (number | null)[];
}

function close(a: Scalar, b: number, tol = 1e-9): boolean {
  if (a === null || a === undefined) return false;
  if (typeof a !== "number") return false;
  return Math.abs(a - b) < tol;
}

function isNull(v: Scalar): boolean {
  return v === null || v === undefined;
}

// ─── rollingSem ───────────────────────────────────────────────────────────────

describe("rollingSem", () => {
  it("window=2 — two observations needed", () => {
    const out = vals(rollingSem(s([1, 2, 3, 4]), 2));
    expect(isNull(out[0])).toBe(true);
    // sem([1,2]) = std([1,2],ddof=1)/sqrt(2) = (√0.5)/√2 = 0.5
    expect(close(out[1], 0.5)).toBe(true);
    // sem([2,3]) = same = 0.5
    expect(close(out[2], 0.5)).toBe(true);
    expect(close(out[3], 0.5)).toBe(true);
  });

  it("window=3 — first two are null", () => {
    const out = vals(rollingSem(s([2, 4, 4, 4, 5, 5, 7, 9]), 3));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[1])).toBe(true);
    // window [2,4,4]: mean=10/3, std=~1.1547, sem=~0.6667
    expect(typeof out[2]).toBe("number");
  });

  it("constant window → sem = 0", () => {
    const out = vals(rollingSem(s([5, 5, 5, 5, 5]), 3));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[1])).toBe(true);
    expect(close(out[2] as number, 0)).toBe(true);
    expect(close(out[3] as number, 0)).toBe(true);
    expect(close(out[4] as number, 0)).toBe(true);
  });

  it("null values are skipped", () => {
    const out = vals(rollingSem(s([1, null, 3, 4]), 3));
    // window 2: [1, null, 3] → valid [1,3] → n=2 (need minPeriods=3 → null)
    expect(isNull(out[2])).toBe(true);
    // window 3: [null, 3, 4] → valid [3,4] → n=2 < minPeriods=3 → null
    expect(isNull(out[3])).toBe(true);
  });

  it("minPeriods=2 allows fewer valid values", () => {
    const out = vals(rollingSem(s([1, null, 3]), 3, { minPeriods: 2 }));
    // window 2 [1,null,3]: 2 valid nums [1,3], sem = std(ddof=1)/sqrt(2)
    // std([1,3],ddof=1) = sqrt(2), sem = sqrt(2)/sqrt(2) = 1
    expect(close(out[2] as number, 1)).toBe(true);
  });

  it("center=true shifts window", () => {
    const out = vals(rollingSem(s([1, 2, 3, 4, 5]), 3, { center: true }));
    // centered: index 0 → [0,1], index 1 → [0,2], etc.
    // index 0: window [0,1] = [1,2] → 2 obs < minPeriods=3 → null
    expect(isNull(out[0])).toBe(true);
    // index 1: window [0,2] = [1,2,3] → 3 valid
    expect(typeof out[1]).toBe("number");
    // index 4: window [3,4] = [4,5] → 2 obs < minPeriods=3 → null
    expect(isNull(out[4])).toBe(true);
  });

  it("sem = std(ddof=1)/sqrt(n) — formula verification", () => {
    // [1,2,3]: mean=2, variance=1, std=1, sem=1/sqrt(3)
    const out = vals(rollingSem(s([1, 2, 3]), 3));
    expect(close(out[2] as number, 1 / Math.sqrt(3))).toBe(true);
  });

  it("preserves Series name", () => {
    const input = new Series({ data: [1, 2, 3], name: "x" });
    const result = rollingSem(input, 2);
    expect(result.name).toBe("x");
  });
});

// ─── rollingSkew ──────────────────────────────────────────────────────────────

describe("rollingSkew", () => {
  it("requires 3 valid observations", () => {
    const out = vals(rollingSkew(s([1, 2, 3, 4, 5]), 3));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[1])).toBe(true);
    expect(typeof out[2]).toBe("number");
  });

  it("symmetric windows have zero skew", () => {
    // [1,2,3] and [2,3,4] are perfectly symmetric
    const out = vals(rollingSkew(s([1, 2, 3, 4, 5]), 3));
    expect(close(out[2] as number, 0, 1e-9)).toBe(true);
    expect(close(out[3] as number, 0, 1e-9)).toBe(true);
    expect(close(out[4] as number, 0, 1e-9)).toBe(true);
  });

  it("right-skewed data → positive skew", () => {
    // [1,2,10]: strongly right-skewed
    const out = vals(rollingSkew(s([1, 2, 10]), 3));
    const v = out[2];
    expect(typeof v).toBe("number");
    expect((v as number) > 0).toBe(true);
  });

  it("left-skewed data → negative skew", () => {
    const out = vals(rollingSkew(s([10, 2, 1]), 3));
    const v = out[2];
    expect(typeof v).toBe("number");
    expect((v as number) < 0).toBe(true);
  });

  it("constant window → skew = 0 (std=0 special case)", () => {
    const out = vals(rollingSkew(s([3, 3, 3, 3]), 3));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[1])).toBe(true);
    expect(close(out[2] as number, 0)).toBe(true);
    expect(close(out[3] as number, 0)).toBe(true);
  });

  it("null values skipped (minPeriods=3)", () => {
    const out = vals(rollingSkew(s([1, null, 3, 4, 5]), 4, { minPeriods: 3 }));
    // window 3: [null,3,4,5] → valid [3,4,5] → 3 valid ≥ 3
    expect(typeof out[3]).toBe("number");
  });

  it("known value: [1,2,3,4,5] full window skew=0", () => {
    const out = vals(rollingSkew(s([1, 2, 3, 4, 5]), 5));
    expect(isNull(out[0])).toBe(true);
    expect(close(out[4] as number, 0, 1e-9)).toBe(true);
  });
});

// ─── rollingKurt ──────────────────────────────────────────────────────────────

describe("rollingKurt", () => {
  it("requires 4 valid observations", () => {
    const out = vals(rollingKurt(s([1, 2, 3, 4, 5]), 4));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[1])).toBe(true);
    expect(isNull(out[2])).toBe(true);
    expect(typeof out[3]).toBe("number");
  });

  it("uniform distribution [1,2,3,4] — excess kurtosis = -1.2", () => {
    const out = vals(rollingKurt(s([1, 2, 3, 4]), 4));
    expect(close(out[3] as number, -1.2, 1e-9)).toBe(true);
  });

  it("window=5 sliding", () => {
    const out = vals(rollingKurt(s([1, 2, 3, 4, 5]), 5));
    // [1..5]: excess kurtosis of uniform = -1.3 (n=5)
    expect(typeof out[4]).toBe("number");
  });

  it("null values skipped", () => {
    const out = vals(rollingKurt(s([1, null, 3, 4, 5, 6]), 5, { minPeriods: 4 }));
    // window 4: [null,3,4,5,6] → valid [3,4,5,6] → 4 ≥ 4
    expect(typeof out[4]).toBe("number");
  });

  it("constant window → kurt = 0 (std=0 special case)", () => {
    const out = vals(rollingKurt(s([2, 2, 2, 2, 2]), 4));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[2])).toBe(true);
    expect(close(out[3] as number, 0)).toBe(true);
    expect(close(out[4] as number, 0)).toBe(true);
  });

  it("minPeriods honoured", () => {
    const out = vals(rollingKurt(s([1, 2, 3, 4, 5]), 5, { minPeriods: 4 }));
    // index 3: window [0..3] = [1,2,3,4] → 4 ≥ 4
    expect(typeof out[3]).toBe("number");
    expect(typeof out[4]).toBe("number");
  });
});

// ─── rollingQuantile ──────────────────────────────────────────────────────────

describe("rollingQuantile", () => {
  it("q=0.5 is rolling median", () => {
    const out = vals(rollingQuantile(s([1, 2, 3, 4, 5]), 0.5, 3));
    expect(isNull(out[0])).toBe(true);
    expect(isNull(out[1])).toBe(true);
    expect(close(out[2] as number, 2)).toBe(true);
    expect(close(out[3] as number, 3)).toBe(true);
    expect(close(out[4] as number, 4)).toBe(true);
  });

  it("q=0 is rolling minimum", () => {
    const out = vals(rollingQuantile(s([3, 1, 4, 1, 5, 9]), 0, 3));
    expect(close(out[2] as number, 1)).toBe(true);
    expect(close(out[3] as number, 1)).toBe(true);
    expect(close(out[4] as number, 1)).toBe(true);
    expect(close(out[5] as number, 5)).toBe(true);
  });

  it("q=1 is rolling maximum", () => {
    const out = vals(rollingQuantile(s([3, 1, 4, 1, 5, 9]), 1, 3));
    expect(close(out[2] as number, 4)).toBe(true);
    expect(close(out[5] as number, 9)).toBe(true);
  });

  it("linear interpolation — q=0.5 between two values", () => {
    // [1, 3]: q=0.5 → virtual=0.5 → lo=0(val=1) hi=1(val=3) → 1+0.5*(3-1)=2
    const out = vals(rollingQuantile(s([1, 3]), 0.5, 2));
    expect(close(out[1] as number, 2)).toBe(true);
  });

  it("interpolation=lower", () => {
    // [1,3] q=0.5 lower → 1
    const out = vals(
      rollingQuantile(s([1, 3]), 0.5, 2, { interpolation: "lower" }),
    );
    expect(close(out[1] as number, 1)).toBe(true);
  });

  it("interpolation=higher", () => {
    const out = vals(
      rollingQuantile(s([1, 3]), 0.5, 2, { interpolation: "higher" }),
    );
    expect(close(out[1] as number, 3)).toBe(true);
  });

  it("interpolation=midpoint", () => {
    const out = vals(
      rollingQuantile(s([1, 3]), 0.5, 2, { interpolation: "midpoint" }),
    );
    expect(close(out[1] as number, 2)).toBe(true);
  });

  it("interpolation=nearest", () => {
    // q=0.25 with [1,2,3,4]: virtual=0.75 → lo=0(1), hi=1(2), frac=0.75>0.5 → 2
    const out = vals(
      rollingQuantile(s([1, 2, 3, 4]), 0.25, 4, { interpolation: "nearest" }),
    );
    expect(close(out[3] as number, 2)).toBe(true);
  });

  it("throws on q outside [0,1]", () => {
    expect(() => rollingQuantile(s([1, 2, 3]), -0.1, 2)).toThrow(RangeError);
    expect(() => rollingQuantile(s([1, 2, 3]), 1.1, 2)).toThrow(RangeError);
  });

  it("null values skipped in window", () => {
    // [1, null, 3]: 2 valid [1,3]; minPeriods=2 → quantile(0.5)=2
    const out = vals(
      rollingQuantile(s([1, null, 3]), 0.5, 3, { minPeriods: 2 }),
    );
    expect(close(out[2] as number, 2)).toBe(true);
  });

  it("center=true", () => {
    const out = vals(rollingQuantile(s([1, 2, 3, 4, 5]), 0.5, 3, { center: true }));
    // centered: index 1 → [1,2,3] median=2
    expect(close(out[1] as number, 2)).toBe(true);
    // index 2 → [2,3,4] median=3
    expect(close(out[2] as number, 3)).toBe(true);
    // index 3 → [3,4,5] median=4
    expect(close(out[3] as number, 4)).toBe(true);
  });

  it("minPeriods=1 gives results for single-element windows", () => {
    const out = vals(
      rollingQuantile(s([5, 3, 8]), 0.5, 3, { minPeriods: 1 }),
    );
    // index 0: window=[5] → quantile=5
    expect(close(out[0] as number, 5)).toBe(true);
    // index 2: window=[5,3,8] → sorted=[3,5,8] → median=5
    expect(close(out[2] as number, 5)).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("window_extended — property tests", () => {
  it("rollingSem is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1000, max: 1000 }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 10 }),
        (data, window) => {
          const result = vals(rollingSem(s(data), window));
          for (const v of result) {
            if (v !== null && v !== undefined) {
              if (typeof v !== "number") return false;
              if (v < -1e-12) return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("rollingQuantile(q=0) ≤ rollingQuantile(q=0.5) ≤ rollingQuantile(q=1)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), {
          minLength: 3,
          maxLength: 15,
        }),
        fc.integer({ min: 2, max: 8 }),
        (data, window) => {
          const lo = vals(rollingQuantile(s(data), 0, window, { minPeriods: 1 }));
          const med = vals(rollingQuantile(s(data), 0.5, window, { minPeriods: 1 }));
          const hi = vals(rollingQuantile(s(data), 1, window, { minPeriods: 1 }));
          for (let i = 0; i < data.length; i++) {
            const l = lo[i];
            const m = med[i];
            const h = hi[i];
            if (l === null || m === null || h === null) continue;
            if ((l as number) > (m as number) + 1e-9) return false;
            if ((m as number) > (h as number) + 1e-9) return false;
          }
          return true;
        },
      ),
    );
  });

  it("rollingSem result length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 10 }),
        (data, window) => {
          const result = rollingSem(s(data), window);
          return result.values.length === data.length;
        },
      ),
    );
  });
});
