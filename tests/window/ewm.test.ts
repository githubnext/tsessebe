/**
 * Tests for src/window/ewm.ts — Exponentially Weighted Moving aggregations.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { DataFrame, EWM, Series } from "tsb";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Round to 6 decimal places for float comparison. */
function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/** Create a numeric Series from plain data. */
function s(data: (number | null)[]): Series<import("tsb").Scalar> {
  return new Series({ data });
}

// ─── resolveAlpha ─────────────────────────────────────────────────────────────

describe("EwmOptions — alpha resolution", () => {
  test("span=3 → alpha=0.5", () => {
    const ewm = new EWM(s([1, 2, 3]), { span: 3 });
    // alpha = 2/(3+1) = 0.5; verify via mean result
    const m = ewm.mean().toArray() as number[];
    expect(round6(m[1] as number)).toBe(round6((0.5 * 2 + 1) / (0.5 + 1)));
  });

  test("com=1 → alpha=0.5", () => {
    const a = new EWM(s([1, 2]), { com: 1 }).mean().toArray();
    const b = new EWM(s([1, 2]), { span: 3 }).mean().toArray();
    expect(round6(a[1] as number)).toBe(round6(b[1] as number));
  });

  test("halflife=1 → alpha ≈ 0.5", () => {
    // alpha = 1 - exp(-ln2/1) = 1 - 0.5 = 0.5
    const ewm = new EWM(s([1, 2]), { halflife: 1 });
    const m = ewm.mean().toArray() as number[];
    expect(round6(m[1] as number)).toBe(round6((0.5 * 2 + 1) / 1.5));
  });

  test("alpha=0.5 directly", () => {
    const ewm = new EWM(s([1, 2]), { alpha: 0.5 });
    const m = ewm.mean().toArray() as number[];
    expect(round6(m[1] as number)).toBe(round6(5 / 3));
  });

  test("throws when no decay parameter", () => {
    expect(() => new EWM(s([1]), {}).mean()).toThrow();
  });

  test("throws when multiple decay parameters", () => {
    expect(() => new EWM(s([1]), { span: 3, alpha: 0.5 }).mean()).toThrow();
  });

  test("throws for span < 1", () => {
    expect(() => new EWM(s([1]), { span: 0.5 }).mean()).toThrow();
  });

  test("throws for com < 0", () => {
    expect(() => new EWM(s([1]), { com: -1 }).mean()).toThrow();
  });

  test("throws for halflife <= 0", () => {
    expect(() => new EWM(s([1]), { halflife: 0 }).mean()).toThrow();
  });

  test("throws for alpha outside (0,1]", () => {
    expect(() => new EWM(s([1]), { alpha: 1.5 }).mean()).toThrow();
    expect(() => new EWM(s([1]), { alpha: 0 }).mean()).toThrow();
  });
});

// ─── mean (adjust=true) ───────────────────────────────────────────────────────

describe("EWM.mean (adjust=true)", () => {
  test("single element → itself", () => {
    const r = new EWM(s([42]), { alpha: 0.5 }).mean().toArray();
    expect(r).toEqual([42]);
  });

  test("two elements, alpha=0.5", () => {
    // weights: [(1-0.5)^1, 1] = [0.5, 1]
    // mean = (0.5*1 + 1*2)/(0.5+1) = 2.5/1.5 = 5/3
    const r = new EWM(s([1, 2]), { alpha: 0.5 }).mean().toArray() as number[];
    expect(round6(r[0] as number)).toBe(1);
    expect(round6(r[1] as number)).toBe(round6(5 / 3));
  });

  test("span=2, [1,2,3,4,5] — matches pandas formula", () => {
    const r = new EWM(s([1, 2, 3, 4, 5]), { span: 2 }).mean().toArray() as number[];
    // alpha = 2/3, decay = 1/3
    // S_0=1, W_0=1 → 1
    // S_1 = 2 + (1/3)*1 = 7/3, W_1 = 1 + (1/3)*1 = 4/3 → 7/4
    expect(round6(r[0] as number)).toBe(1);
    expect(round6(r[1] as number)).toBe(round6(7 / 4));
    // S_2 = 3 + (1/3)*7/3 = 34/9, W_2 = 1 + (1/3)*4/3 = 13/9 → 34/13
    expect(round6(r[2] as number)).toBe(round6(34 / 13));
  });

  test("all-null → all null", () => {
    const r = new EWM(s([null, null, null]), { alpha: 0.3 }).mean().toArray();
    expect(r).toEqual([null, null, null]);
  });

  test("null at start does not poison later values", () => {
    const r = new EWM(s([null, 1, 2]), { alpha: 0.5 }).mean().toArray();
    expect(r[0]).toBeNull();
    expect(r[1]).toBe(1);
    expect(r[2]).not.toBeNull();
  });

  test("minPeriods=2 suppresses first result", () => {
    const r = new EWM(s([1, 2, 3]), { alpha: 0.5, minPeriods: 2 }).mean().toArray();
    expect(r[0]).toBeNull();
    expect(r[1]).not.toBeNull();
  });
});

// ─── mean (adjust=false) ─────────────────────────────────────────────────────

describe("EWM.mean (adjust=false)", () => {
  test("IIR formula: y_t = alpha*x_t + (1-alpha)*y_{t-1}", () => {
    const a = 0.5;
    const r = new EWM(s([1, 2, 3]), { alpha: a, adjust: false }).mean().toArray() as number[];
    expect(r[0]).toBe(1);
    expect(round6(r[1] as number)).toBe(round6(a * 2 + (1 - a) * 1)); // 1.5
    expect(round6(r[2] as number)).toBe(round6(a * 3 + (1 - a) * 1.5)); // 2.25
  });

  test("null values: IIR skips them (output null)", () => {
    const r = new EWM(s([1, null, 3]), { alpha: 0.5, adjust: false }).mean().toArray();
    expect(r[0]).toBe(1);
    expect(r[1]).toBeNull();
    expect(r[2]).toBe(0.5 * 3 + 0.5 * 1); // 2
  });
});

// ─── var / std ────────────────────────────────────────────────────────────────

describe("EWM.var", () => {
  test("single element → null (insufficient for sample var)", () => {
    const r = new EWM(s([1]), { alpha: 0.5 }).var().toArray();
    expect(r[0]).toBeNull();
  });

  test("two elements variance is positive", () => {
    const r = new EWM(s([1, 2]), { alpha: 0.5 }).var().toArray() as (number | null)[];
    expect(r[0]).toBeNull();
    expect(r[1]).toBeGreaterThan(0);
  });

  test("identical values → variance = 0", () => {
    const r = new EWM(s([5, 5, 5]), { alpha: 0.5 }).var().toArray() as (number | null)[];
    expect(r[1]).toBe(0);
    expect(r[2]).toBe(0);
  });

  test("biased var: single element is 0", () => {
    const r = new EWM(s([3]), { alpha: 0.5 }).var(true).toArray();
    expect(r[0]).toBe(0);
  });

  test("var matches std^2", () => {
    const data = [1, 2, 3, 4, 5];
    const ewm = new EWM(s(data), { span: 3 });
    const varVals = ewm.var().toArray() as (number | null)[];
    const stdVals = ewm.std().toArray() as (number | null)[];
    for (let i = 0; i < data.length; i++) {
      const v = varVals[i] ?? null;
      const st = stdVals[i] ?? null;
      if (v !== null && st !== null) {
        expect(round6(st * st)).toBe(round6(v));
      }
    }
  });

  test("all null → all null", () => {
    const r = new EWM(s([null, null]), { alpha: 0.3 }).var().toArray();
    expect(r).toEqual([null, null]);
  });
});

describe("EWM.std", () => {
  test("std is non-negative", () => {
    const r = new EWM(s([1, 3, 2, 4, 1]), { alpha: 0.4 }).std().toArray() as (number | null)[];
    for (const v of r) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("std of constant series = 0", () => {
    const r = new EWM(s([7, 7, 7, 7]), { span: 2 }).std().toArray() as (number | null)[];
    for (let i = 1; i < 4; i++) {
      expect(r[i]).toBe(0);
    }
  });
});

// ─── cov ──────────────────────────────────────────────────────────────────────

describe("EWM.cov", () => {
  test("cov(x, x) = var(x)", () => {
    const data = [1, 2, 3, 4, 5];
    const series = s(data);
    const ewm = new EWM(series, { alpha: 0.5 });
    const covSelf = ewm.cov(series).toArray() as (number | null)[];
    const varSelf = ewm.var().toArray() as (number | null)[];
    for (let i = 0; i < data.length; i++) {
      const c = covSelf[i] ?? null;
      const v = varSelf[i] ?? null;
      if (c !== null && v !== null) {
        expect(round6(c)).toBe(round6(v));
      }
    }
  });

  test("cov of identical series is positive for non-constant", () => {
    const s1 = s([1, 2, 3]);
    const r = new EWM(s1, { alpha: 0.5 }).cov(s1).toArray() as (number | null)[];
    expect(r[2]).toBeGreaterThan(0);
  });

  test("throws for mismatched lengths", () => {
    expect(() => new EWM(s([1, 2]), { alpha: 0.5 }).cov(s([1]))).toThrow();
  });

  test("biased cov at first observation is 0", () => {
    const r = new EWM(s([3, 5]), { alpha: 0.5 }).cov(s([1, 2]), true).toArray();
    expect(r[0]).toBe(0);
  });
});

// ─── corr ─────────────────────────────────────────────────────────────────────

describe("EWM.corr", () => {
  test("corr(x, x) = 1 when var > 0", () => {
    const data = [1, 2, 3, 4, 5];
    const series = s(data);
    const r = new EWM(series, { span: 2 }).corr(series).toArray() as (number | null)[];
    for (let i = 1; i < data.length; i++) {
      if (r[i] !== null) {
        expect(round6(r[i] as number)).toBe(1);
      }
    }
  });

  test("corr is in [-1, 1]", () => {
    const a = s([1, -2, 3, -4, 5]);
    const b = s([5, 4, 3, 2, 1]);
    const r = new EWM(a, { alpha: 0.4 }).corr(b).toArray() as (number | null)[];
    for (const v of r) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(-1 - 1e-9);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  test("throws for mismatched lengths", () => {
    expect(() => new EWM(s([1, 2]), { alpha: 0.5 }).corr(s([1]))).toThrow();
  });
});

// ─── apply ────────────────────────────────────────────────────────────────────

describe("EWM.apply", () => {
  test("identity sum/weight-sum matches mean", () => {
    const data = [1, 2, 3, 4, 5];
    const ewm = new EWM(s(data), { alpha: 0.5 });
    const applyMean = ewm
      .apply((vals, weights) => {
        const W = weights.reduce((a, b) => a + b, 0);
        return vals.reduce((a, v, i) => a + v * (weights[i] as number), 0) / W;
      })
      .toArray() as number[];
    const meanVals = new EWM(s(data), { alpha: 0.5 }).mean().toArray() as number[];
    for (let i = 0; i < data.length; i++) {
      expect(round6(applyMean[i] as number)).toBe(round6(meanVals[i] as number));
    }
  });

  test("minPeriods=3 suppresses first two", () => {
    const r = new EWM(s([1, 2, 3, 4]), { alpha: 0.5, minPeriods: 3 })
      .apply((v) => v.at(-1) as number)
      .toArray();
    expect(r[0]).toBeNull();
    expect(r[1]).toBeNull();
    expect(r[2]).not.toBeNull();
  });
});

// ─── ignoreNa ────────────────────────────────────────────────────────────────

describe("EWM ignoreNa", () => {
  test("ignoreNa=false: NaN causes weight decay", () => {
    // With ignore_na=false, a NaN in the middle causes decay
    const r1 = new EWM(s([1, null, 2]), { alpha: 0.5, ignoreNa: false }).mean().toArray();
    // With ignore_na=true, NaN is skipped entirely
    const r2 = new EWM(s([1, null, 2]), { alpha: 0.5, ignoreNa: true }).mean().toArray();
    // Both should be null at position 1
    expect(r1[1]).toBeNull();
    expect(r2[1]).toBeNull();
    // At position 2: results should differ
    // ignoreNa=false: weights [0.25, 1] (1 decayed twice), mean=(0.25+2)/1.25=2.2/1.25=1.76
    // ignoreNa=true: weights [0.5, 1] (1 decayed once), mean=(0.5+2)/1.5=2.5/1.5≈1.667
    expect(round6(r1[2] as number)).toBe(round6((0.25 * 1 + 1 * 2) / (0.25 + 1)));
    expect(round6(r2[2] as number)).toBe(round6((0.5 * 1 + 1 * 2) / (0.5 + 1)));
  });
});

// ─── DataFrame.ewm ───────────────────────────────────────────────────────────

describe("DataFrame.ewm", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3, 4], b: [10, 20, 30, 40] });

  test("mean() returns DataFrame with same shape", () => {
    const result = df.ewm({ span: 2 }).mean();
    expect(result.shape).toEqual([4, 2]);
  });

  test("mean() columns match per-column Series.ewm", () => {
    const dfMean = df.ewm({ alpha: 0.5 }).mean();
    const seriesA = new Series({ data: [1, 2, 3, 4] }).ewm({ alpha: 0.5 }).mean().toArray();
    const colA = dfMean.col("a").toArray();
    for (let i = 0; i < 4; i++) {
      expect(round6(colA[i] as number)).toBe(round6(seriesA[i] as number));
    }
  });

  test("std() returns non-negative values", () => {
    const result = df.ewm({ span: 2 }).std();
    const colA = result.col("a").toArray() as (number | null)[];
    for (const v of colA) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("var() columns match Series.ewm.var()", () => {
    const dfVar = df.ewm({ com: 1 }).var();
    const seriesVar = new Series({ data: [10, 20, 30, 40] }).ewm({ com: 1 }).var().toArray();
    const colB = dfVar.col("b").toArray();
    for (let i = 0; i < 4; i++) {
      const sv = seriesVar[i];
      const cv = colB[i];
      if (sv !== null && cv !== null) {
        expect(round6(cv as number)).toBe(round6(sv as number));
      }
    }
  });
});

// ─── Series.ewm method ───────────────────────────────────────────────────────

describe("Series.ewm method", () => {
  test("returns EWM instance", () => {
    const series = new Series({ data: [1, 2, 3] });
    const ewm = series.ewm({ span: 2 });
    expect(ewm).toBeInstanceOf(EWM);
  });

  test("ewm({ alpha: 1 }) mean = identity (most recent value)", () => {
    // With alpha=1, each value is just itself
    const series = new Series({ data: [3, 1, 4, 1, 5] });
    const r = series.ewm({ alpha: 1 }).mean().toArray();
    expect(r).toEqual([3, 1, 4, 1, 5]);
  });
});

// ─── property tests ──────────────────────────────────────────────────────────

describe("EWM property tests", () => {
  test("mean output length matches input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.float({ noNaN: true, min: 0.01, max: 0.99 }),
        (data, alpha) => {
          const series = new Series({ data });
          const result = series.ewm({ alpha }).mean().toArray();
          return result.length === data.length;
        },
      ),
    );
  });

  test("mean is non-null for all-numeric input (minPeriods=0)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 1, maxLength: 15 }),
        (data) => {
          const series = new Series({ data });
          const result = series.ewm({ alpha: 0.5 }).mean().toArray();
          return result.every((v) => v !== null);
        },
      ),
    );
  });

  test("std is always >= 0 or null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 2, maxLength: 15 }),
        (data) => {
          const series = new Series({ data });
          const result = series.ewm({ alpha: 0.3 }).std().toArray() as (number | null)[];
          return result.every((v) => v === null || v >= -1e-10);
        },
      ),
    );
  });

  test("ewm({ alpha: 1 }) mean equals input values (adjust=true)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 1, maxLength: 15 }),
        (data) => {
          const series = new Series({ data });
          const result = series.ewm({ alpha: 1 }).mean().toArray() as number[];
          return result.every((v, i) => Math.abs(v - (data[i] as number)) < 1e-10);
        },
      ),
    );
  });

  test("var >= 0 or null for all numeric input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), { minLength: 2, maxLength: 15 }),
        (data) => {
          const series = new Series({ data });
          const result = series.ewm({ com: 1 }).var().toArray() as (number | null)[];
          return result.every((v) => v === null || v >= -1e-10);
        },
      ),
    );
  });
});
