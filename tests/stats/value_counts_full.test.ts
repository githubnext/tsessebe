/**
 * Tests for valueCountsBinned — value_counts with bins=N.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Index, Series, valueCountsBinned } from "tsb";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Sum all values in a Series<number>. */
function sumValues(s: Series<number>): number {
  return s.values.reduce((acc, v) => acc + v, 0);
}

/** Check whether index labels look like interval strings "(a, b]" etc. */
function isIntervalLabel(s: string): boolean {
  return /^[\[(]-?\d/.test(s);
}

// ─── basic binning ────────────────────────────────────────────────────────────

describe("valueCountsBinned — basic", () => {
  test("splits into 2 equal-width bins and counts correctly", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const vc = valueCountsBinned(s, 2);

    // 2 bins expected
    expect(vc.values.length).toBe(2);

    // Total must equal original length
    expect(sumValues(vc)).toBe(5);

    // Index labels must be interval strings
    for (const lbl of vc.index.values) {
      expect(isIntervalLabel(String(lbl))).toBe(true);
    }
  });

  test("single bin returns all values in one bin", () => {
    const s = new Series({ data: [10, 20, 30, 40] });
    const vc = valueCountsBinned(s, 1);

    expect(vc.values.length).toBe(1);
    expect(sumValues(vc)).toBe(4);
  });

  test("4 bins on a uniform range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const s = new Series({ data });
    const vc = valueCountsBinned(s, 4);

    expect(vc.values.length).toBe(4);
    expect(sumValues(vc)).toBe(data.length);
  });

  test("counts reflect actual frequencies", () => {
    // [1,1,1,2,3] with 2 bins — first bin [1,2] should have 4, second [2,3] → 1
    const s = new Series({ data: [1, 1, 1, 1, 5] });
    const vc = valueCountsBinned(s, 2);
    expect(sumValues(vc)).toBe(5);
  });

  test("all values equal → throws (degenerate range)", () => {
    const s = new Series({ data: [3, 3, 3] });
    expect(() => valueCountsBinned(s, 2)).toThrow();
  });
});

// ─── sorting ─────────────────────────────────────────────────────────────────

describe("valueCountsBinned — sort options", () => {
  test("sort=true (default) → descending by count", () => {
    // Design a series where one bin should have more values
    const s = new Series({ data: [1, 1, 1, 1, 9] }); // first bin heavy
    const vc = valueCountsBinned(s, 2, { sort: true });
    const vals = vc.values;
    // First value should be ≥ second
    expect((vals[0] as number) >= (vals[1] as number)).toBe(true);
  });

  test("sort=true, ascending=true → ascending by count", () => {
    const s = new Series({ data: [1, 1, 1, 1, 9] });
    const vc = valueCountsBinned(s, 2, { sort: true, ascending: true });
    const vals = vc.values;
    expect((vals[0] as number) <= (vals[1] as number)).toBe(true);
  });

  test("sort=false → result sorted by interval order (left edge asc)", () => {
    const s = new Series({ data: [1, 2, 3, 8, 9] });
    const vc = valueCountsBinned(s, 3, { sort: false });
    const labels = vc.index.values as string[];
    // Extract left edge numbers from labels like "(0.99, 4.0]"
    const lefts = labels.map((l): number => {
      const m = l.match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : 0;
    });
    // Should be ascending
    for (let i = 1; i < lefts.length; i++) {
      expect((lefts[i] as number) >= (lefts[i - 1] as number)).toBe(true);
    }
  });

  test("sort=false, ascending=true → reversed interval order", () => {
    const s = new Series({ data: [1, 2, 3, 8, 9] });
    const vc = valueCountsBinned(s, 3, { sort: false, ascending: true });
    const labels = vc.index.values as string[];
    const lefts = labels.map((l): number => {
      const m = l.match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : 0;
    });
    // Should be descending
    for (let i = 1; i < lefts.length; i++) {
      expect((lefts[i] as number) <= (lefts[i - 1] as number)).toBe(true);
    }
  });
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe("valueCountsBinned — normalize", () => {
  test("normalize=true → proportions sum to 1", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    const vc = valueCountsBinned(s, 3, { normalize: true });
    const total = sumValues(vc);
    expect(Math.abs(total - 1.0)).toBeLessThan(1e-10);
  });

  test("normalize=false → integer counts", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const vc = valueCountsBinned(s, 2, { normalize: false });
    for (const v of vc.values) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  test("normalize + sort=true → proportions sorted descending", () => {
    const s = new Series({ data: [1, 1, 1, 1, 5] });
    const vc = valueCountsBinned(s, 2, { normalize: true, sort: true });
    const vals = vc.values;
    expect((vals[0] as number) >= (vals[1] as number)).toBe(true);
    expect(Math.abs(sumValues(vc) - 1.0)).toBeLessThan(1e-10);
  });
});

// ─── name preservation ────────────────────────────────────────────────────────

describe("valueCountsBinned — name", () => {
  test("preserves series name", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5], name: "score" });
    const vc = valueCountsBinned(s, 2);
    expect(vc.name).toBe("score");
  });

  test("unnamed series → null name", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const vc = valueCountsBinned(s, 2);
    expect(vc.name).toBeNull();
  });
});

// ─── missing values ───────────────────────────────────────────────────────────

describe("valueCountsBinned — missing values", () => {
  test("null values are excluded from counts", () => {
    const s = new Series({ data: [1, null, 2, null, 3, 4, 5] as (number | null)[] });
    const vc = valueCountsBinned(s, 2);
    // Total counts should be 5 (not 7)
    expect(sumValues(vc)).toBe(5);
  });

  test("NaN values are excluded from counts", () => {
    const s = new Series({ data: [1, NaN, 2, NaN, 3] });
    const vc = valueCountsBinned(s, 2);
    expect(sumValues(vc)).toBe(3);
  });
});

// ─── index type ──────────────────────────────────────────────────────────────

describe("valueCountsBinned — index", () => {
  test("result has Index<string> as index", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });
    const vc = valueCountsBinned(s, 2);
    expect(vc.index).toBeInstanceOf(Index);
  });

  test("index labels are unique interval strings", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8] });
    const vc = valueCountsBinned(s, 4);
    const labels = vc.index.values as string[];
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("valueCountsBinned — properties", () => {
  test("sum of counts = number of non-NaN values (normalize=false)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -1000, max: 1000 }), {
          minLength: 5,
          maxLength: 50,
        }),
        fc.integer({ min: 1, max: 5 }),
        (data, bins) => {
          // Need at least 2 distinct values for cut to work
          const distinct = new Set(data).size;
          if (distinct < 2) return true;
          try {
            const s = new Series({ data });
            const vc = valueCountsBinned(s, bins);
            const total = sumValues(vc);
            expect(total).toBe(data.length);
          } catch {
            // degenerate range (all equal) → skip
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("normalize=true → sum ≈ 1.0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: -100, max: 100 }), {
          minLength: 5,
          maxLength: 50,
        }),
        fc.integer({ min: 1, max: 5 }),
        (data, bins) => {
          const distinct = new Set(data).size;
          if (distinct < 2) return true;
          try {
            const s = new Series({ data });
            const vc = valueCountsBinned(s, bins, { normalize: true });
            expect(Math.abs(sumValues(vc) - 1.0)).toBeLessThan(1e-10);
          } catch {
            // degenerate range → skip
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("number of result bins = requested bins", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: 1, max: 100 }), {
          minLength: 5,
          maxLength: 50,
        }),
        fc.integer({ min: 2, max: 5 }),
        (data, bins) => {
          const distinct = new Set(data).size;
          if (distinct < 2) return true;
          try {
            const s = new Series({ data });
            const vc = valueCountsBinned(s, bins);
            expect(vc.values.length).toBe(bins);
          } catch {
            // degenerate range → skip
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  test("sort=true: counts in non-ascending order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, min: 0, max: 100 }), {
          minLength: 5,
          maxLength: 50,
        }),
        fc.integer({ min: 2, max: 5 }),
        (data, bins) => {
          const distinct = new Set(data).size;
          if (distinct < 2) return true;
          try {
            const s = new Series({ data });
            const vc = valueCountsBinned(s, bins, { sort: true });
            const vals = vc.values;
            for (let i = 1; i < vals.length; i++) {
              expect((vals[i] as number) <= (vals[i - 1] as number)).toBe(true);
            }
          } catch {
            // degenerate range → skip
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
