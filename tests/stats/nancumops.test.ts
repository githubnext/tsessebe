/**
 * Tests for stats/nancumops — nan-ignoring aggregate functions.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  nancount,
  nanmax,
  nanmean,
  nanmedian,
  nanmin,
  nanprod,
  nanstd,
  nansum,
  nanvar,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function series(data: Scalar[]): Series<Scalar> {
  return new Series({ data });
}

// ─── nancount ─────────────────────────────────────────────────────────────────

describe("nancount", () => {
  it("counts only numeric non-NaN values", () => {
    expect(nancount([1, 2, 3])).toBe(3);
    expect(nancount([1, Number.NaN, null, undefined, 2])).toBe(2);
    expect(nancount([])).toBe(0);
    expect(nancount([null, undefined, Number.NaN])).toBe(0);
  });

  it("ignores string and boolean scalars", () => {
    expect(nancount([1, "a", true, 2])).toBe(2);
  });

  it("works with a Series", () => {
    expect(nancount(series([1, 2, null, Number.NaN]))).toBe(2);
  });
});

// ─── nansum ───────────────────────────────────────────────────────────────────

describe("nansum", () => {
  it("sums numeric values, ignoring NaN/null", () => {
    expect(nansum([1, 2, 3])).toBe(6);
    expect(nansum([1, Number.NaN, null, undefined, 2])).toBe(3);
    expect(nansum([Number.NaN, null])).toBe(0);
    expect(nansum([])).toBe(0);
  });

  it("returns 0 for all-missing input", () => {
    expect(nansum([null, undefined, Number.NaN])).toBe(0);
  });

  it("works with a Series", () => {
    expect(nansum(series([1, 2, null, 3]))).toBe(6);
  });

  it("works with negative values", () => {
    expect(nansum([-1, -2, Number.NaN, 3])).toBe(0);
  });
});

// ─── nanmean ──────────────────────────────────────────────────────────────────

describe("nanmean", () => {
  it("computes mean over non-NaN values", () => {
    expect(nanmean([1, 2, 3])).toBe(2);
    expect(nanmean([1, Number.NaN, null, 3])).toBe(2);
    expect(nanmean([4, 4, Number.NaN, 8])).toBe(16 / 3);
  });

  it("returns NaN for empty input", () => {
    expect(Number.isNaN(nanmean([]))).toBe(true);
    expect(Number.isNaN(nanmean([null, Number.NaN]))).toBe(true);
  });

  it("works with a Series", () => {
    expect(nanmean(series([2, null, 4]))).toBe(3);
  });
});

// ─── nanmedian ────────────────────────────────────────────────────────────────

describe("nanmedian", () => {
  it("returns median of odd-count values", () => {
    expect(nanmedian([3, 1, 2])).toBe(2);
    expect(nanmedian([1, Number.NaN, 3, null, 2])).toBe(2);
  });

  it("returns average of two middle values for even count", () => {
    expect(nanmedian([1, 2, 3, 4])).toBe(2.5);
    expect(nanmedian([1, Number.NaN, 3, 4])).toBe(3); // [1,3,4] → 3
  });

  it("returns NaN for empty / all-missing", () => {
    expect(Number.isNaN(nanmedian([]))).toBe(true);
    expect(Number.isNaN(nanmedian([null, Number.NaN]))).toBe(true);
  });

  it("handles single value", () => {
    expect(nanmedian([42, null])).toBe(42);
  });

  it("works with a Series", () => {
    expect(nanmedian(series([1, null, 3]))).toBe(2);
  });
});

// ─── nanvar ───────────────────────────────────────────────────────────────────

describe("nanvar", () => {
  it("computes sample variance (ddof=1 default)", () => {
    // [2,4,4,4,5,5,7,9] — numpy var ddof=1 ≈ 4.5714...
    const v = nanvar([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(v).toBeCloseTo(4.5714, 3);
  });

  it("computes population variance (ddof=0)", () => {
    // [2,4,6] mean=4 → (4+0+4)/3 = 8/3
    expect(nanvar([2, 4, 6], { ddof: 0 })).toBeCloseTo(8 / 3, 10);
  });

  it("ignores NaN/null values", () => {
    expect(nanvar([2, Number.NaN, 4, null, 6], { ddof: 0 })).toBeCloseTo(8 / 3, 10);
  });

  it("returns NaN when n <= ddof", () => {
    expect(Number.isNaN(nanvar([]))).toBe(true);
    expect(Number.isNaN(nanvar([5]))).toBe(true); // n=1, ddof=1
    expect(Number.isNaN(nanvar([5], { ddof: 0 }))).toBe(false); // n=1, ddof=0 → 0
  });

  it("works with a Series", () => {
    const v = nanvar(series([2, 4, null, 6]), { ddof: 0 });
    expect(v).toBeCloseTo(8 / 3, 10);
  });
});

// ─── nanstd ───────────────────────────────────────────────────────────────────

describe("nanstd", () => {
  it("is the square root of nanvar", () => {
    const xs: Scalar[] = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(nanstd(xs)).toBeCloseTo(Math.sqrt(nanvar(xs)), 10);
  });

  it("ignores NaN/null", () => {
    expect(nanstd([2, Number.NaN, 4, null, 6], { ddof: 0 })).toBeCloseTo(Math.sqrt(8 / 3), 10);
  });

  it("returns NaN for insufficient data", () => {
    expect(Number.isNaN(nanstd([]))).toBe(true);
    expect(Number.isNaN(nanstd([5]))).toBe(true);
  });
});

// ─── nanmin ───────────────────────────────────────────────────────────────────

describe("nanmin", () => {
  it("returns minimum, ignoring NaN/null", () => {
    expect(nanmin([3, 1, 2])).toBe(1);
    expect(nanmin([3, Number.NaN, null, 1])).toBe(1);
    expect(nanmin([-5, -3, -10])).toBe(-10);
  });

  it("returns NaN for empty / all-missing", () => {
    expect(Number.isNaN(nanmin([]))).toBe(true);
    expect(Number.isNaN(nanmin([null, Number.NaN]))).toBe(true);
  });

  it("works with a Series", () => {
    expect(nanmin(series([3, null, 1, 2]))).toBe(1);
  });
});

// ─── nanmax ───────────────────────────────────────────────────────────────────

describe("nanmax", () => {
  it("returns maximum, ignoring NaN/null", () => {
    expect(nanmax([3, 1, 2])).toBe(3);
    expect(nanmax([3, Number.NaN, null, 1])).toBe(3);
    expect(nanmax([-5, -3, -10])).toBe(-3);
  });

  it("returns NaN for empty / all-missing", () => {
    expect(Number.isNaN(nanmax([]))).toBe(true);
    expect(Number.isNaN(nanmax([null, Number.NaN]))).toBe(true);
  });

  it("works with a Series", () => {
    expect(nanmax(series([3, null, 1, 2]))).toBe(3);
  });
});

// ─── nanprod ──────────────────────────────────────────────────────────────────

describe("nanprod", () => {
  it("returns product, ignoring NaN/null", () => {
    expect(nanprod([1, 2, 3])).toBe(6);
    expect(nanprod([1, Number.NaN, null, 2, 3])).toBe(6);
    expect(nanprod([])).toBe(1);
    expect(nanprod([null, Number.NaN])).toBe(1);
  });

  it("works with a Series", () => {
    expect(nanprod(series([2, null, 3]))).toBe(6);
  });

  it("handles zero", () => {
    expect(nanprod([2, 0, 3])).toBe(0);
    expect(nanprod([2, Number.NaN, 0])).toBe(0);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property tests", () => {
  const finiteNum = fc.float({ noDefaultInfinity: true, noNaN: true, min: -1e6, max: 1e6 });
  const posNum = fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });

  it("nansum is >= 0 for all-positive inputs", () => {
    fc.assert(
      fc.property(fc.array(posNum), (xs) => {
        return nansum(xs) >= 0;
      }),
    );
  });

  it("nanmean is between nanmin and nanmax for non-empty finite arrays", () => {
    fc.assert(
      fc.property(fc.array(finiteNum, { minLength: 1 }), (xs) => {
        const mean = nanmean(xs);
        const mn = nanmin(xs);
        const mx = nanmax(xs);
        return mean >= mn - 1e-9 && mean <= mx + 1e-9;
      }),
    );
  });

  it("nanvar >= 0 for all finite inputs", () => {
    fc.assert(
      fc.property(fc.array(finiteNum, { minLength: 2 }), (xs) => {
        return nanvar(xs) >= 0;
      }),
    );
  });

  it("nancount === xs.length for all-finite arrays", () => {
    fc.assert(
      fc.property(fc.array(finiteNum, { minLength: 0, maxLength: 50 }), (xs) => {
        return nancount(xs) === xs.length;
      }),
    );
  });
});
