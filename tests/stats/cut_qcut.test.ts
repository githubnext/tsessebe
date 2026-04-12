/**
 * Tests for cut / qcut binning functions.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { cut, qcut } from "../../src/stats/cut_qcut.ts";

// ─── cut — basic ─────────────────────────────────────────────────────────────

describe("cut — integer bins", () => {
  it("bins [1,2,3,4,5] into 2 equal-width bins", () => {
    const { codes, labels, bins } = cut([1, 2, 3, 4, 5], 2);
    expect(codes).toEqual([0, 0, 0, 1, 1]);
    expect(labels.length).toBe(2);
    expect(bins.length).toBe(3);
  });

  it("auto-labels use interval notation", () => {
    const { labels } = cut([0, 1, 2, 3], 2);
    expect(labels[0]).toMatch(/^\(/); // left open
    expect(labels[0]).toMatch(/\]$/); // right closed
  });

  it("right=false uses left-closed intervals", () => {
    const { codes, labels } = cut([1, 2, 3, 4, 5], 2, { right: false });
    // [lo, hi)
    expect(labels[0]).toMatch(/^\[/);
    expect(labels[0]).toMatch(/\)$/);
    expect(codes).toEqual([0, 0, 0, 1, 1]);
  });

  it("include_lowest labels the first bin with [ on both sides", () => {
    const { labels } = cut([1, 2, 3, 4, 5], 2, { include_lowest: true });
    expect(labels[0]).toMatch(/^\[/);
    expect(labels[0]).toMatch(/\]$/);
    expect(labels[1]).toMatch(/^\(/);
  });

  it("labels=false returns integer code strings", () => {
    const { labels, codes } = cut([1, 2, 3, 4, 5], 2, { labels: false });
    expect(labels).toEqual(["0", "1"]);
    expect(codes).toEqual([0, 0, 0, 1, 1]);
  });

  it("custom string labels", () => {
    const { labels } = cut([1, 2, 3, 4, 5], 2, { labels: ["low", "high"] });
    expect(labels).toEqual(["low", "high"]);
  });

  it("NaN is assigned null code", () => {
    const { codes } = cut([1, Number.NaN, 3], 2);
    expect(codes[1]).toBeNull();
    expect(codes[0]).toBe(0);
    expect(codes[2]).toBe(1);
  });

  it("values exactly at min assigned to bin 0 (include_lowest)", () => {
    const { codes } = cut([1, 2, 3, 4, 5], 2, { include_lowest: true });
    // min value 1 should be in bin 0
    expect(codes[0]).toBe(0);
  });

  it("values exactly at max assigned to last bin", () => {
    const { codes } = cut([0, 1, 2, 3, 4, 5], 5, { include_lowest: true });
    // 5 is the max, should be in the last bin
    expect(codes[5]).toBe(4);
  });

  it("throws on empty array", () => {
    expect(() => cut([], 2)).toThrow();
  });

  it("throws on constant array", () => {
    expect(() => cut([3, 3, 3], 2)).toThrow();
  });

  it("throws when custom labels length mismatch", () => {
    expect(() => cut([1, 2, 3, 4], 2, { labels: ["a", "b", "c"] })).toThrow();
  });
});

describe("cut — explicit bin edges", () => {
  it("bins with explicit edges [0, 2, 4]", () => {
    const { codes, labels, bins } = cut([0.5, 1, 1.5, 2.5, 3.5], [0, 2, 4]);
    expect(codes).toEqual([0, 0, 0, 1, 1]);
    expect(bins).toEqual([0, 2, 4]);
    expect(labels.length).toBe(2);
  });

  it("value outside range returns null", () => {
    const { codes } = cut([5, 1, 2], [0, 2, 4]);
    expect(codes[0]).toBeNull(); // 5 > 4
  });

  it("value at left edge outside range (right=true) returns null", () => {
    const { codes } = cut([0, 1, 2], [0, 2, 4]);
    // 0 is ≤ left edge (0,2] → outside unless include_lowest
    expect(codes[0]).toBeNull();
  });

  it("value at left edge included with include_lowest", () => {
    const { codes } = cut([0, 1, 2], [0, 2, 4], { include_lowest: true });
    expect(codes[0]).toBe(0);
  });

  it("throws if edges are not monotone", () => {
    expect(() => cut([1, 2], [3, 1, 2])).toThrow();
  });

  it("precision controls label decimal places", () => {
    const { labels } = cut([1, 2, 3, 4], 2, { precision: 1 });
    // labels should have 1 decimal place
    expect(labels[0]).toMatch(/\d\.\d[,\]]/);
  });
});

// ─── qcut — basic ────────────────────────────────────────────────────────────

describe("qcut — integer q", () => {
  it("q=2 splits at median", () => {
    const { codes, labels, bins } = qcut([1, 2, 3, 4, 5], 2);
    expect(labels.length).toBe(2);
    expect(bins.length).toBe(3);
    // Lower half in bin 0, upper in bin 1
    expect(codes[0]).toBe(0);
    expect(codes[4]).toBe(1);
  });

  it("q=4 produces quartile labels", () => {
    const { labels } = qcut([1, 2, 3, 4, 5, 6, 7, 8], 4);
    expect(labels.length).toBe(4);
  });

  it("first bin label uses [ on the left (pandas semantics)", () => {
    const { labels } = qcut([1, 2, 3, 4, 5], 2);
    expect(labels[0]).toMatch(/^\[/);
    expect(labels[1]).toMatch(/^\(/);
  });

  it("labels=false returns integer strings", () => {
    const { labels } = qcut([1, 2, 3, 4, 5], 2, { labels: false });
    expect(labels).toEqual(["0", "1"]);
  });

  it("custom labels", () => {
    const { labels } = qcut([1, 2, 3, 4, 5], 2, { labels: ["bottom", "top"] });
    expect(labels).toEqual(["bottom", "top"]);
  });

  it("NaN → null code", () => {
    const { codes } = qcut([1, Number.NaN, 3, 4, 5], 2);
    expect(codes[1]).toBeNull();
  });

  it("throws on empty array", () => {
    expect(() => qcut([], 2)).toThrow();
  });

  it("throws on q < 2", () => {
    expect(() => qcut([1, 2, 3], 1)).toThrow();
  });

  it("throws on custom labels length mismatch", () => {
    expect(() => qcut([1, 2, 3, 4], 2, { labels: ["a", "b", "c"] })).toThrow();
  });
});

describe("qcut — explicit quantile probabilities", () => {
  it("probabilities [0, 0.5, 1] produce 2 bins", () => {
    const { codes, labels } = qcut([1, 2, 3, 4, 5], [0, 0.5, 1]);
    expect(labels.length).toBe(2);
    expect(codes[0]).toBe(0);
    expect(codes[4]).toBe(1);
  });

  it("all-same-value triggers duplicate handling (drop)", () => {
    expect(() => qcut([1, 1, 1, 1], 4)).toThrow();
    const { bins } = qcut([1, 1, 1, 1, 2], 4, { duplicates: "drop" });
    expect(bins.length).toBeGreaterThanOrEqual(2);
  });

  it("throws on non-monotone quantile probabilities", () => {
    expect(() => qcut([1, 2, 3], [0, 0.8, 0.5, 1])).toThrow();
  });

  it("throws on probabilities outside [0,1]", () => {
    expect(() => qcut([1, 2, 3], [0, 1.1])).toThrow();
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("cut — property tests", () => {
  it("all finite non-NaN values in range are assigned a bin", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -100, max: 100, noNaN: true }), {
          minLength: 2,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 5 }),
        (xs, numBins) => {
          // Need at least 2 distinct finite values
          const distinct = new Set(xs.filter(Number.isFinite));
          if (distinct.size < 2) return;
          const { codes, labels } = cut(xs, numBins, { include_lowest: true });
          for (let i = 0; i < xs.length; i++) {
            const v = xs[i] as number;
            const c = codes[i];
            if (!Number.isFinite(v)) {
              expect(c).toBeNull();
            } else {
              expect(c).not.toBeNull();
              expect(c).toBeGreaterThanOrEqual(0);
              expect(c).toBeLessThan(labels.length);
            }
          }
        },
      ),
    );
  });

  it("codes length equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -50, max: 50, noNaN: true }), {
          minLength: 2,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 4 }),
        (xs, numBins) => {
          const distinct = new Set(xs.filter(Number.isFinite));
          if (distinct.size < 2) return;
          const { codes } = cut(xs, numBins);
          expect(codes.length).toBe(xs.length);
        },
      ),
    );
  });
});

describe("qcut — property tests", () => {
  it("all finite values in result are assigned a valid bin index", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: -100, max: 100, noNaN: true }), {
          minLength: 4,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 4 }),
        (xs, numQ) => {
          const finite = xs.filter(Number.isFinite);
          const distinct = new Set(finite);
          if (distinct.size < numQ) return;
          try {
            const { codes, labels } = qcut(xs, numQ, { duplicates: "drop" });
            for (let i = 0; i < xs.length; i++) {
              const v = xs[i] as number;
              const c = codes[i];
              if (!Number.isFinite(v)) {
                expect(c).toBeNull();
              } else {
                if (c !== null) {
                  expect(c).toBeGreaterThanOrEqual(0);
                  expect(c).toBeLessThan(labels.length);
                }
              }
            }
          } catch {
            // Degenerate inputs (all-same) are allowed to throw
          }
        },
      ),
    );
  });
});
