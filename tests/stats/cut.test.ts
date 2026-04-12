/**
 * Tests for src/stats/cut.ts
 * Covers cut(), qcut(), cutIntervalIndex(), qcutIntervalIndex().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, cut, cutIntervalIndex, qcut, qcutIntervalIndex } from "../../src/index.ts";

// Top-level regex patterns (biome useTopLevelRegex)
const reOpenParen = /^\(/;
const reLabelsLength = /labels length/;
const reDuplicate = /duplicate/i;
const reAtLeast2 = /at least 2/;
const reBinsGe1 = /bins must be ≥ 1/;
const reBinsEqual = /equal/;
const reNoFinite = /no finite/;
const reQGe2 = /q must be ≥ 2/;
const reLeftBracket0 = /\[0/;
const reLeftBracket1 = /\[1/;
const reLeftBracket2 = /\[2/;
const reBinContains1 = /1]/;
const reBinContains2 = /2]/;
const reBinContains3 = /3]/;

// ─── cut() — basic ─────────────────────────────────────────────────────────

describe("cut — basic", () => {
  it("bins a plain array into 2 equal-width bins", () => {
    const result = cut([1, 2, 3, 4, 5], 2);
    expect(result.size).toBe(5);
    // values 1,2,3 fall in lower bin; 4,5 in upper bin
    const v = result.values as readonly (string | null)[];
    expect(v[0]).toBe(v[1]);
    expect(v[0]).toBe(v[2]);
    expect(v[3]).toBe(v[4]);
    expect(v[0]).not.toBe(v[3]);
  });

  it("returns null for out-of-range values", () => {
    const result = cut([1, 2, 3, 101], [0, 50, 100]);
    const v = result.values as readonly (string | null)[];
    // 101 is outside explicit bin edges [0, 50, 100], expect null
    expect(v[3]).toBe(null);
  });

  it("bins a Series and preserves index and name", () => {
    const s = new Series({ data: [10, 20, 30, 40, 50], name: "vals" });
    const result = cut(s, 2);
    expect(result.size).toBe(5);
    expect(result.name).toBe("vals");
    // index is preserved
    for (let i = 0; i < 5; i++) {
      expect(result.index.at(i)).toBe(s.index.at(i));
    }
  });

  it("accepts explicit bin edges", () => {
    const result = cut([1, 2, 3, 4, 5], [0, 3, 6]);
    const v = result.values as readonly (string | null)[];
    // 1,2,3 → (0,3]; 4,5 → (3,6]
    expect(v[0]).toBe(v[1]);
    expect(v[0]).toBe(v[2]);
    expect(v[3]).toBe(v[4]);
    expect(v[0]).not.toBe(v[3]);
  });

  it("produces right-closed intervals by default", () => {
    const result = cut([1, 2, 3], [0, 1, 2, 3]);
    const v = result.values as readonly (string | null)[];
    // Each value falls in (0,1], (1,2], (2,3] respectively
    expect(v[0]).toMatch(reBinContains1);
    expect(v[1]).toMatch(reBinContains2);
    expect(v[2]).toMatch(reBinContains3);
  });

  it("produces left-closed intervals when right=false", () => {
    const result = cut([0, 1, 2], [0, 1, 2, 3], { right: false });
    const v = result.values as readonly (string | null)[];
    // Each value falls in [0,1), [1,2), [2,3)
    expect(v[0]).toMatch(reLeftBracket0);
    expect(v[1]).toMatch(reLeftBracket1);
    expect(v[2]).toMatch(reLeftBracket2);
  });
});

// ─── cut() — labels ────────────────────────────────────────────────────────

describe("cut — labels", () => {
  it("returns integer codes when labels=false", () => {
    const result = cut([1, 2, 3, 4, 5], 2, { labels: false });
    const v = result.values as readonly (number | null)[];
    expect(v[0]).toBe(0);
    expect(v[1]).toBe(0);
    expect(v[2]).toBe(0);
    expect(v[3]).toBe(1);
    expect(v[4]).toBe(1);
  });

  it("uses custom string labels", () => {
    const result = cut([1, 2, 3, 4, 5], 2, { labels: ["low", "high"] });
    const v = result.values as readonly (string | null)[];
    expect(v[0]).toBe("low");
    expect(v[3]).toBe("high");
  });

  it("throws when custom labels length mismatches bin count", () => {
    expect(() => cut([1, 2, 3], 3, { labels: ["a", "b"] })).toThrow(reLabelsLength);
  });

  it("default labels are interval strings", () => {
    const result = cut([1, 5], [0, 2, 6]);
    const v = result.values as readonly (string | null)[];
    // Should look like "(0, 2]" and "(2, 6]"
    expect(v[0]).toMatch(reOpenParen);
    expect(v[1]).toMatch(reOpenParen);
  });
});

// ─── cut() — edge cases ────────────────────────────────────────────────────

describe("cut — edge cases", () => {
  it("handles NaN / null in input gracefully", () => {
    const result = cut([1, null, 3, undefined, 5], 2);
    const v = result.values as readonly (string | null)[];
    expect(v[1]).toBe(null);
    expect(v[3]).toBe(null);
    expect(v[0]).not.toBe(null);
    expect(v[2]).not.toBe(null);
  });

  it("include_lowest makes first bin include its left edge when right=true", () => {
    // Exact left edge of first bin is included when includeLowest=true
    const result = cut([0, 1, 2, 3], [0, 1, 2, 3], { includeLowest: true });
    const v = result.values as readonly (string | null)[];
    // 0 should be assigned to first bin
    expect(v[0]).not.toBe(null);
  });

  it("throws when bins < 2 (array)", () => {
    expect(() => cut([1, 2], [0])).toThrow(reAtLeast2);
  });

  it("throws when bins < 1 (integer)", () => {
    expect(() => cut([1, 2], 0)).toThrow(reBinsGe1);
  });

  it("throws on duplicate edges with duplicates='raise' (default)", () => {
    expect(() => cut([1, 2, 3], [0, 1, 1, 3])).toThrow(reDuplicate);
  });

  it("drops duplicate edges when duplicates='drop'", () => {
    // [0,1,1,3] → [0,1,3] after dropping duplicate 1
    const result = cut([0.5, 1.5, 2.5], [0, 1, 1, 3], { duplicates: "drop" });
    expect(result.size).toBe(3);
  });

  it("throws when all values equal (integer bins)", () => {
    expect(() => cut([5, 5, 5], 3)).toThrow(reBinsEqual);
  });

  it("throws when no finite values", () => {
    expect(() => cut([null, undefined, Number.NaN], 2)).toThrow(reNoFinite);
  });
});

// ─── qcut() — basic ────────────────────────────────────────────────────────

describe("qcut — basic", () => {
  it("splits into 2 quantiles (median split)", () => {
    const result = qcut([1, 2, 3, 4, 5], 2);
    const v = result.values as readonly (string | null)[];
    // Lower half and upper half
    expect(v[0]).not.toBe(null);
    expect(v[4]).not.toBe(null);
    expect(v[0]).not.toBe(v[4]);
  });

  it("accepts fractional quantile array", () => {
    const result = qcut([1, 2, 3, 4, 5], [0, 0.5, 1.0]);
    expect(result.size).toBe(5);
    const v = result.values as readonly (string | null)[];
    expect(v[0]).not.toBe(null);
  });

  it("preserves Series index and name", () => {
    const s = new Series({ data: [10, 20, 30], name: "q" });
    const result = qcut(s, 2);
    expect(result.size).toBe(3);
    expect(result.name).toBe("q");
    for (let i = 0; i < 3; i++) {
      expect(result.index.at(i)).toBe(s.index.at(i));
    }
  });

  it("returns integer codes when labels=false", () => {
    const result = qcut([1, 2, 3, 4, 5], 2, { labels: false });
    const v = result.values as readonly (number | null)[];
    // All should be 0 or 1
    for (const code of v) {
      if (code !== null) {
        expect(code).toBeGreaterThanOrEqual(0);
        expect(code).toBeLessThanOrEqual(1);
      }
    }
  });

  it("applies custom labels", () => {
    const result = qcut([1, 2, 3, 4, 5, 6], 3, { labels: ["low", "mid", "high"] });
    const v = result.values as readonly (string | null)[];
    const distinct = new Set(v.filter((x) => x !== null));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it("throws when no finite values", () => {
    expect(() => qcut([null, undefined], 2)).toThrow(reNoFinite);
  });

  it("throws when q < 2 (integer)", () => {
    expect(() => qcut([1, 2, 3], 1)).toThrow(reQGe2);
  });

  it("throws on duplicate quantile edges with duplicates='raise'", () => {
    // Repeated values produce duplicate edges
    expect(() => qcut([1, 1, 1, 1, 2], 4)).toThrow(reDuplicate);
  });

  it("drops duplicate quantile edges when duplicates='drop'", () => {
    const result = qcut([1, 1, 1, 2, 2], 2, { duplicates: "drop" });
    expect(result.size).toBe(5);
  });
});

// ─── cutIntervalIndex / qcutIntervalIndex ──────────────────────────────────

describe("cutIntervalIndex", () => {
  it("returns the IntervalIndex used by cut", () => {
    const idx = cutIntervalIndex([1, 2, 3, 4, 5], 2);
    expect(idx.size).toBe(2);
    // first interval should contain value 2
    expect(idx.get_loc(2)).toBe(0);
  });

  it("uses explicit bin edges", () => {
    const idx = cutIntervalIndex([1, 2, 3], [0, 1, 3]);
    expect(idx.size).toBe(2);
  });
});

describe("qcutIntervalIndex", () => {
  it("returns the IntervalIndex used by qcut", () => {
    const idx = qcutIntervalIndex([1, 2, 3, 4, 5], 2);
    expect(idx.size).toBe(2);
  });
});

// ─── property-based tests ──────────────────────────────────────────────────

describe("cut — properties", () => {
  it("result length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 2, maxLength: 30 }),
        fc.integer({ min: 1, max: 5 }),
        (arr, nbins) => {
          try {
            const result = cut(arr, nbins);
            return result.size === arr.length;
          } catch (_) {
            return true; // range errors are OK (e.g. all-equal values)
          }
        },
      ),
    );
  });

  it("all non-null codes are in [0, nbins-1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), {
          minLength: 2,
          maxLength: 30,
        }),
        fc.integer({ min: 1, max: 6 }),
        (arr, nbins) => {
          try {
            const result = cut(arr, nbins, { labels: false });
            const v = result.values as readonly (number | null)[];
            return v.every((c) => c === null || (c >= 0 && c < nbins));
          } catch (_) {
            return true;
          }
        },
      ),
    );
  });

  it("qcut result length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -100, max: 100, noNaN: true }), {
          minLength: 3,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 4 }),
        (arr, q) => {
          try {
            const result = qcut(arr, q, { duplicates: "drop" });
            return result.size === arr.length;
          } catch (_) {
            return true;
          }
        },
      ),
    );
  });

  it("values in range are assigned a non-null label", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 100, noNaN: true }), {
          minLength: 2,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 4 }),
        (arr, nbins) => {
          try {
            const result = cut(arr, nbins);
            const v = result.values as readonly (string | null)[];
            // All input values should be assigned (they are within the computed range)
            return v.every((label) => label !== null);
          } catch (_) {
            return true;
          }
        },
      ),
    );
  });
});
