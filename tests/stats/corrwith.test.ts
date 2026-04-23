/**
 * Tests for corrwith — autoCorr and corrWith.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series, autoCorr, corrWith, pearsonCorr } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Round to `d` decimal places. */
function round(v: number, d = 8): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ─── autoCorr ─────────────────────────────────────────────────────────────────

describe("autoCorr", () => {
  it("lag=0 returns 1 for a non-constant Series", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(autoCorr(s, 0)).toBe(1);
  });

  it("lag=1 returns 1 for a perfectly linearly increasing Series", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    expect(round(autoCorr(s, 1))).toBe(1);
  });

  it("lag=1 for alternating Series returns -1", () => {
    const s = new Series({ data: [1, -1, 1, -1, 1, -1, 1, -1] });
    expect(round(autoCorr(s, 1))).toBe(-1);
  });

  it("lag >= length returns NaN", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(Number.isNaN(autoCorr(s, 3))).toBe(true);
    expect(Number.isNaN(autoCorr(s, 10))).toBe(true);
  });

  it("lag=0 default is 1 (uses default parameter)", () => {
    const s = new Series({ data: [10, 20, 30] });
    // default lag=1 for linearly increasing → 1
    expect(round(autoCorr(s))).toBe(1);
  });

  it("returns NaN for constant Series (zero variance)", () => {
    const s = new Series({ data: [5, 5, 5, 5, 5] });
    expect(Number.isNaN(autoCorr(s, 1))).toBe(true);
  });

  it("ignores NA values in both positions", () => {
    // [1, null, 3, null, 5] shifted by 1: [null, 1, null, 3, null]
    // valid pairs (positional): (3,1), (5,3) — both positive → positive corr
    const s = new Series({ data: [1, null, 3, null, 5] });
    const r = autoCorr(s, 1);
    expect(Number.isNaN(r) || r > 0).toBe(true);
  });

  it("throws RangeError for negative lag", () => {
    expect(() => autoCorr(new Series({ data: [1, 2, 3] }), -1)).toThrow(RangeError);
  });

  it("throws RangeError for non-integer lag", () => {
    expect(() => autoCorr(new Series({ data: [1, 2, 3] }), 1.5)).toThrow(RangeError);
  });

  it("returns NaN for all-NA Series", () => {
    const s = new Series({ data: [null, null, null] });
    expect(Number.isNaN(autoCorr(s, 1))).toBe(true);
  });

  it("property: lag=0 autocorr is always 1 for non-empty numeric Series", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        (arr) => {
          const s = new Series({ data: arr });
          const r = autoCorr(s, 0);
          return r === 1;
        },
      ),
    );
  });

  it("property: autocorr result is in [-1, 1] or NaN", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 20,
        }),
        fc.integer({ min: 0, max: 5 }),
        (arr, lag) => {
          const s = new Series({ data: arr });
          const r = autoCorr(s, lag);
          return Number.isNaN(r) || (r >= -1 - 1e-9 && r <= 1 + 1e-9);
        },
      ),
    );
  });
});

// ─── corrWith (Series) ────────────────────────────────────────────────────────

describe("corrWith – with Series", () => {
  it("each column is correlated with the Series", () => {
    const df = DataFrame.fromColumns({
      A: [1, 2, 3, 4, 5],
      B: [5, 4, 3, 2, 1],
    });
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const result = corrWith(df, s);

    expect(result).toBeInstanceOf(Series);
    expect(result.index.toArray()).toEqual(["A", "B"]);
    expect(round(result.values[0] as number)).toBe(1); // A vs [1..5] → 1
    expect(round(result.values[1] as number)).toBe(-1); // B vs [1..5] → -1
  });

  it("result is indexed by df column names", () => {
    const df = DataFrame.fromColumns({ X: [1, 2], Y: [3, 4], Z: [5, 6] });
    const s = new Series({ data: [1, 2] });
    const r = corrWith(df, s);
    expect(r.index.toArray()).toEqual(["X", "Y", "Z"]);
  });

  it("uncorrelated columns return NaN", () => {
    // Column of constants vs non-constant Series → NaN (zero variance)
    const df = DataFrame.fromColumns({ A: [1, 1, 1, 1] });
    const s = new Series({ data: [1, 2, 3, 4] });
    const r = corrWith(df, s);
    expect(Number.isNaN(r.values[0] as number)).toBe(true);
  });

  it("matches pearsonCorr called individually for each column", () => {
    const df = DataFrame.fromColumns({
      A: [2, 4, 6, 8],
      B: [8, 6, 4, 2],
    });
    const s = new Series({ data: [1, 2, 3, 4] });
    const r = corrWith(df, s);
    const expectedA = pearsonCorr(df.col("A"), s);
    const expectedB = pearsonCorr(df.col("B"), s);
    expect(round(r.values[0] as number)).toBe(round(expectedA));
    expect(round(r.values[1] as number)).toBe(round(expectedB));
  });
});

// ─── corrWith (DataFrame) ─────────────────────────────────────────────────────

describe("corrWith – with DataFrame", () => {
  it("correlates common columns pairwise", () => {
    const df1 = DataFrame.fromColumns({ A: [1, 2, 3], B: [4, 5, 6] });
    const df2 = DataFrame.fromColumns({ A: [1, 2, 3], B: [6, 5, 4] });
    const r = corrWith(df1, df2);

    expect(r.index.toArray()).toEqual(["A", "B"]);
    expect(round(r.values[0] as number)).toBe(1); // A vs A → 1
    expect(round(r.values[1] as number)).toBe(-1); // B vs B (inverted) → -1
  });

  it("columns in only one DataFrame get NaN by default (drop=false)", () => {
    const df1 = DataFrame.fromColumns({ A: [1, 2, 3], B: [4, 5, 6] });
    const df2 = DataFrame.fromColumns({ A: [1, 2, 3], C: [7, 8, 9] });
    const r = corrWith(df1, df2, { drop: false });

    const idx = r.index.toArray();
    // Union should have A, B, C
    expect(idx).toContain("A");
    expect(idx).toContain("B");
    expect(idx).toContain("C");

    const bVal = r.values[idx.indexOf("B")] as number;
    const cVal = r.values[idx.indexOf("C")] as number;
    expect(Number.isNaN(bVal)).toBe(true); // B not in df2
    expect(Number.isNaN(cVal)).toBe(true); // C not in df1
  });

  it("drop=true keeps only common columns", () => {
    const df1 = DataFrame.fromColumns({ A: [1, 2, 3], B: [4, 5, 6] });
    const df2 = DataFrame.fromColumns({ A: [1, 2, 3], C: [7, 8, 9] });
    const r = corrWith(df1, df2, { drop: true });

    expect(r.index.toArray()).toEqual(["A"]);
    expect(round(r.values[0] as number)).toBe(1);
  });

  it("empty intersection with drop=true returns empty Series", () => {
    const df1 = DataFrame.fromColumns({ A: [1, 2] });
    const df2 = DataFrame.fromColumns({ B: [3, 4] });
    const r = corrWith(df1, df2, { drop: true });
    expect(r.size).toBe(0);
  });

  it("property: correlating a DataFrame with itself on all columns returns 1 or NaN", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 5 }).chain((len) =>
          fc.array(
            fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
              minLength: len,
              maxLength: len,
            }),
            { minLength: 1, maxLength: 3 },
          ),
        ),
        (cols) => {
          const data: Record<string, number[]> = {};
          for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            if (c !== undefined) {
              data[`c${i}`] = c;
            }
          }
          const df = DataFrame.fromColumns(data);
          const r = corrWith(df, df, { drop: true });
          for (const v of r.values) {
            const n = v as number;
            if (!(Number.isNaN(n) || Math.abs(n - 1) < 1e-9)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── corrWith axis=1 ─────────────────────────────────────────────────────────

describe("corrWith – axis=1", () => {
  it("correlates rows (axis=1) with a Series", () => {
    // Transpose perspective: rows become "columns" for correlation
    const df = DataFrame.fromColumns({
      A: [1, 2],
      B: [2, 4],
      C: [3, 6],
    });
    const s = new Series({ data: [1, 2, 3] });
    const r = corrWith(df, s, { axis: 1 });
    // Row 0: [1, 2, 3] vs [1, 2, 3] → 1
    // Row 1: [2, 4, 6] vs [1, 2, 3] → 1
    expect(r.size).toBe(2);
    expect(round(r.values[0] as number)).toBe(1);
    expect(round(r.values[1] as number)).toBe(1);
  });
});
