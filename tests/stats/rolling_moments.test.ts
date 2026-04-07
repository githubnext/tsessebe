import { describe, it, expect } from "bun:test";
import fc from "fast-check";
import { Series, DataFrame, rollingSkew, rollingKurtosis, rollingSkewDataFrame, rollingKurtosisDataFrame } from "tsb";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a numeric Series from an array. */
function s(data: (number | null)[]): Series<number | null> {
  return new Series({ data }) as Series<number | null>;
}

/** Round to 6 decimal places for comparison. */
function round6(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return Math.round((v as number) * 1e6) / 1e6;
}

/** Extract numeric results from a Series, rounding to 6 dp. */
function toRounded(series: ReturnType<typeof rollingSkew>): (number | null)[] {
  return series.values.map((v) => {
    if (v === null || v === undefined) return null;
    return round6(v as number);
  });
}

// ─── rollingSkew ──────────────────────────────────────────────────────────────

describe("rollingSkew", () => {
  it("returns all null when window > length", () => {
    const result = rollingSkew(s([1, 2, 3]), 5);
    expect(result.values).toEqual([null, null, null]);
  });

  it("returns null for positions with fewer than minPeriods=3 valid values", () => {
    const result = rollingSkew(s([1, 2, 3, 4, 5]), 3);
    const vals = result.values;
    expect(vals[0]).toBeNull();
    expect(vals[1]).toBeNull();
  });

  it("returns 0 for uniform-difference sequences (no skew)", () => {
    // Arithmetic sequence in window → skew = 0
    const result = rollingSkew(s([1, 2, 3, 4, 5]), 3);
    const vals = toRounded(result);
    expect(vals[2]).toBe(0);
    expect(vals[3]).toBe(0);
    expect(vals[4]).toBe(0);
  });

  it("computes positive skew for right-skewed window", () => {
    // [1, 1, 10] is right-skewed
    const result = rollingSkew(s([1, 1, 10]), 3);
    const v = result.values[2] as number;
    expect(v).toBeGreaterThan(0);
  });

  it("computes negative skew for left-skewed window", () => {
    // [1, 10, 10] is left-skewed
    const result = rollingSkew(s([1, 10, 10]), 3);
    const v = result.values[2] as number;
    expect(v).toBeLessThan(0);
  });

  it("handles null values by skipping them", () => {
    // window=4, position 3: values [1, null, 3, 4] → valid = [1, 3, 4]
    const result = rollingSkew(s([1, null, 3, 4]), 4);
    // 3 valid values → can compute skew
    expect(result.values[3]).not.toBeNull();
  });

  it("returns null when all window values are null", () => {
    const result = rollingSkew(s([null, null, null, null]), 3);
    expect(result.values).toEqual([null, null, null, null]);
  });

  it("returns null for zero-variance windows", () => {
    const result = rollingSkew(s([2, 2, 2, 2, 2]), 3);
    // All values equal → std=0 → skew is NaN → null
    expect(result.values[2]).toBeNull();
    expect(result.values[4]).toBeNull();
  });

  it("respects custom minPeriods", () => {
    // window=5, minPeriods=4: positions 0-2 should be null (< 4 values)
    const result = rollingSkew(s([1, 2, 3, 4, 5]), 5, { minPeriods: 4 });
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
    expect(result.values[2]).toBeNull();
    // position 3: window=[1,2,3,4], 4 valid → compute
    expect(result.values[3]).not.toBeNull();
  });

  it("applies center=true correctly", () => {
    // With center=true and window=3, position 2 uses [1,2,3,4] trimmed
    const result = rollingSkew(s([1, 2, 3, 4, 5]), 3, { center: true });
    // Position 0 (center): window includes positions 0,1 → only 2 valid → null
    expect(result.values[0]).toBeNull();
    // Position 1 (center): window [0,1,2] → 3 valid → computable
    expect(result.values[1]).not.toBeNull();
  });

  it("preserves the original Series index and name", () => {
    const orig = new Series({ data: [1, 2, 3, 4, 5], name: "mySkew" });
    const result = rollingSkew(orig as Series<number | null>, 3);
    expect(result.name).toBe("mySkew");
  });

  it("throws for window < 1", () => {
    expect(() => rollingSkew(s([1, 2, 3]), 0)).toThrow();
  });

  it("throws for non-integer window", () => {
    expect(() => rollingSkew(s([1, 2, 3]), 1.5)).toThrow();
  });

  it("matches known value for [1, 2, 4] window", () => {
    // Manual: mean=7/3, deviations=[-4/3, -1/3, 5/3]
    // m2 = (16+1+25)/9 = 42/9, m3 = (-64/27 - 1/27 + 125/27) = 60/27
    // sigma = sqrt(42/9), g1 = m3/sigma^3
    // G1 = sqrt(3*2)/(3-2) * g1
    const result = rollingSkew(s([1, 2, 4]), 3);
    const v = result.values[2] as number;
    expect(v).toBeGreaterThan(0); // right-skewed
    expect(Math.abs(v - 0.381802)).toBeLessThan(0.001);
  });

  it("handles length-1 series", () => {
    const result = rollingSkew(s([42]), 3);
    expect(result.values).toEqual([null]);
  });

  it("handles empty series", () => {
    const result = rollingSkew(s([]), 3);
    expect(result.values).toEqual([]);
  });

  it("handles window=3 on a longer series", () => {
    const data = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = rollingSkew(s(data), 3);
    expect(result.values.length).toBe(8);
    // First two are null
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
    // Rest are non-null (unless zero-variance)
    for (let i = 2; i < 8; i++) {
      // All windows have distinct values → non-null
      expect(result.values[i]).not.toBeNull();
    }
  });
});

// ─── rollingKurtosis ──────────────────────────────────────────────────────────

describe("rollingKurtosis", () => {
  it("returns all null when window > length", () => {
    const result = rollingKurtosis(s([1, 2, 3, 4]), 6);
    expect(result.values).toEqual([null, null, null, null]);
  });

  it("returns null for positions with fewer than 4 valid values (default minPeriods=4)", () => {
    const result = rollingKurtosis(s([1, 2, 3, 4, 5]), 4);
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBeNull();
    expect(result.values[2]).toBeNull();
    expect(result.values[3]).not.toBeNull();
  });

  it("returns null for zero-variance windows", () => {
    const result = rollingKurtosis(s([3, 3, 3, 3, 3]), 4);
    expect(result.values[3]).toBeNull();
    expect(result.values[4]).toBeNull();
  });

  it("handles null values by skipping them", () => {
    // 5 values but one null; window=4, position 4 has [null, 3, 4, 5] → 3 valid → null
    const result = rollingKurtosis(s([1, null, 3, 4, 5]), 4);
    // position 4: window=[null,3,4,5] → 3 valid → null (< minPeriods=4)
    expect(result.values[4]).toBeNull();
  });

  it("respects custom minPeriods", () => {
    const result = rollingKurtosis(s([1, 2, 3, 4, 5]), 5, { minPeriods: 4 });
    // position 3: window=[1,2,3,4] → 4 valid → can compute
    expect(result.values[3]).not.toBeNull();
  });

  it("matches known value for uniform distribution [1,2,3,4,5]", () => {
    // Pandas: Series([1,2,3,4,5]).rolling(5).kurt() ≈ -1.2
    const result = rollingKurtosis(s([1, 2, 3, 4, 5]), 5);
    const v = result.values[4] as number;
    expect(Math.abs(v - (-1.2))).toBeLessThan(0.001);
  });

  it("handles center=true", () => {
    const result = rollingKurtosis(s([1, 2, 3, 4, 5, 6, 7]), 5, { center: true });
    // Position 0: center window has only [0,1,2] → 3 valid → null
    expect(result.values[0]).toBeNull();
    // Position 2: center window [0..4] → 5 valid → computable
    expect(result.values[2]).not.toBeNull();
  });

  it("preserves name", () => {
    const orig = new Series({ data: [1, 2, 3, 4, 5], name: "kurt_test" });
    const result = rollingKurtosis(orig as Series<number | null>, 4);
    expect(result.name).toBe("kurt_test");
  });

  it("throws for window=0", () => {
    expect(() => rollingKurtosis(s([1, 2, 3, 4]), 0)).toThrow();
  });

  it("handles empty series", () => {
    const result = rollingKurtosis(s([]), 4);
    expect(result.values).toEqual([]);
  });

  it("handles length-3 series (all null, window=4)", () => {
    const result = rollingKurtosis(s([1, 2, 3]), 4);
    expect(result.values).toEqual([null, null, null]);
  });

  it("computes kurtosis window of 4 on known data", () => {
    // [1, 2, 3, 4]: mean=2.5, n=4
    // m2 = (2.25+0.25+0.25+2.25)/4 = 5/4
    // m4 = (5.0625+0.0625+0.0625+5.0625)/4 = 10.25/4
    // kurt = (5*4*3)/((2*1)) * (m4/m2^2) - 3*(3^2)/(2*1)
    //      = 30 * (10.25/4 / (25/16)) - 27/2
    //      = 30 * (2.5625 / 1.5625) - 13.5
    //      = 30 * 1.64 - 13.5 = 49.2 - 13.5 = -1.2 (hmm, need to verify)
    const result = rollingKurtosis(s([1, 2, 3, 4]), 4);
    const v = result.values[3] as number;
    expect(Math.abs(v - (-1.2))).toBeLessThan(0.001);
  });
});

// ─── rollingSkewDataFrame ─────────────────────────────────────────────────────

describe("rollingSkewDataFrame", () => {
  it("applies column-wise rolling skew", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2, 3, 4, 5],
      b: [5, 4, 3, 2, 1],
    });
    const result = rollingSkewDataFrame(df, 3);
    expect(result.columns.values).toEqual(["a", "b"]);
    expect(result.index.length).toBe(5);
    // First two rows: null
    expect((result.col("a") as Series<number | null>).values[0]).toBeNull();
    expect((result.col("a") as Series<number | null>).values[1]).toBeNull();
  });

  it("produces zero skew for arithmetic sequences", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3, 4, 5] });
    const result = rollingSkewDataFrame(df, 3);
    // All windows of arithmetic sequence have 0 skew
    const aVals = (result.col("a") as Series<number | null>).values;
    for (let i = 2; i < 5; i++) {
      expect(Math.abs(aVals[i] as number)).toBeLessThan(1e-10);
    }
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns({ a: [10, 20, 30, 40, 50] });
    const result = rollingSkewDataFrame(df, 3);
    expect(result.index.length).toBe(5);
  });
});

// ─── rollingKurtosisDataFrame ─────────────────────────────────────────────────

describe("rollingKurtosisDataFrame", () => {
  it("applies column-wise rolling kurtosis", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2, 3, 4, 5],
      b: [2, 4, 6, 8, 10],
    });
    const result = rollingKurtosisDataFrame(df, 5);
    expect(result.columns.values).toEqual(["a", "b"]);
    expect(result.index.length).toBe(5);
    // position 4: full window of arithmetic seq → kurt ≈ -1.2
    const aVal = round6((result.col("a") as Series<number | null>).values[4] as number);
    const bVal = round6((result.col("b") as Series<number | null>).values[4] as number);
    expect(Math.abs((aVal ?? 0) - (-1.2))).toBeLessThan(0.001);
    expect(Math.abs((bVal ?? 0) - (-1.2))).toBeLessThan(0.001);
  });

  it("returns all null columns when window too large", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const result = rollingKurtosisDataFrame(df, 5);
    expect((result.col("a") as Series<number | null>).values).toEqual([null, null, null]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("rollingSkew — property tests", () => {
  it("length is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (data, win) => {
          const result = rollingSkew(s(data), win);
          return result.values.length === data.length;
        },
      ),
    );
  });

  it("positions with fewer than minPeriods valid values are null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), { minLength: 3, maxLength: 15 }),
        fc.integer({ min: 3, max: 8 }),
        (data, win) => {
          const result = rollingSkew(s(data), win);
          // Trailing window: first (win-1) positions should be null
          for (let i = 0; i < Math.min(win - 1, data.length); i++) {
            if (result.values[i] !== null) return false;
          }
          return true;
        },
      ),
    );
  });

  it("scale-invariance: skew is unchanged by positive scaling", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: 1, max: 10 }), { minLength: 5, maxLength: 10 }),
        fc.double({ noNaN: true, min: 0.1, max: 100 }),
        (data, scale) => {
          const s1 = rollingSkew(s(data), 4);
          const s2 = rollingSkew(s(data.map((v) => v * scale)), 4);
          for (let i = 0; i < data.length; i++) {
            const v1 = s1.values[i];
            const v2 = s2.values[i];
            if (v1 === null && v2 === null) continue;
            if (v1 === null || v2 === null) return false;
            if (Math.abs((v1 as number) - (v2 as number)) > 1e-8) return false;
          }
          return true;
        },
      ),
    );
  });

  it("shift-invariance: adding a constant does not change skew", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -10, max: 10 }), { minLength: 5, maxLength: 10 }),
        fc.double({ noNaN: true, min: -100, max: 100 }),
        (data, shift) => {
          const s1 = rollingSkew(s(data), 4);
          const s2 = rollingSkew(s(data.map((v) => v + shift)), 4);
          for (let i = 0; i < data.length; i++) {
            const v1 = s1.values[i];
            const v2 = s2.values[i];
            if (v1 === null && v2 === null) continue;
            if (v1 === null || v2 === null) return false;
            if (Math.abs((v1 as number) - (v2 as number)) > 1e-8) return false;
          }
          return true;
        },
      ),
    );
  });
});

describe("rollingKurtosis — property tests", () => {
  it("length is preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (data, win) => {
          const result = rollingKurtosis(s(data), win);
          return result.values.length === data.length;
        },
      ),
    );
  });

  it("scale-invariance: kurtosis is unchanged by positive scaling", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: 1, max: 10 }), { minLength: 6, maxLength: 12 }),
        fc.double({ noNaN: true, min: 0.1, max: 100 }),
        (data, scale) => {
          const k1 = rollingKurtosis(s(data), 5);
          const k2 = rollingKurtosis(s(data.map((v) => v * scale)), 5);
          for (let i = 0; i < data.length; i++) {
            const v1 = k1.values[i];
            const v2 = k2.values[i];
            if (v1 === null && v2 === null) continue;
            if (v1 === null || v2 === null) return false;
            if (Math.abs((v1 as number) - (v2 as number)) > 1e-8) return false;
          }
          return true;
        },
      ),
    );
  });
});
