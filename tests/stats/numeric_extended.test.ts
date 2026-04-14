/**
 * Tests for src/stats/numeric_extended.ts
 * — digitize, histogram, linspace, arange, percentileOfScore,
 *   zscore, minMaxNormalize, coefficientOfVariation, seriesDigitize
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import {
  arange,
  coefficientOfVariation,
  digitize,
  histogram,
  linspace,
  minMaxNormalize,
  percentileOfScore,
  seriesDigitize,
  zscore,
} from "../../src/stats/numeric_extended.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function ns(data: (number | null)[]): Series<Scalar> {
  return new Series({ data: data as Scalar[] });
}

function vals(s: Series<Scalar>): Scalar[] {
  return [...s.toArray()] as Scalar[];
}

// ─── digitize ────────────────────────────────────────────────────────────────

describe("digitize", () => {
  it("maps values into correct bins (right=false)", () => {
    expect(digitize([0.5, 1.5, 2.5, 3.5], [1, 2, 3])).toEqual([-1, 0, 1, 2]);
  });

  it("maps values into correct bins (right=true)", () => {
    // right=true: bins[i-1] < v <= bins[i]
    expect(digitize([1, 2, 3], [1, 2, 3], true)).toEqual([0, 1, 2]);
  });

  it("value exactly at left edge (right=false) → same bin", () => {
    // 1 is at bins[0], so 1 < 1 is false; 1 < 2 is true → index 0
    expect(digitize([1], [1, 2, 3])).toEqual([0]);
  });

  it("value exactly at right boundary (right=true) → last bin", () => {
    expect(digitize([3], [1, 2, 3], true)).toEqual([2]);
  });

  it("value below first edge → -1", () => {
    expect(digitize([0], [1, 2, 3])).toEqual([-1]);
  });

  it("value above last edge → bins.length - 1", () => {
    expect(digitize([10], [1, 2, 3])).toEqual([2]);
  });

  it("null maps to NaN", () => {
    const result = digitize([null, 1.5], [1, 2]);
    expect(Number.isNaN(result[0])).toBe(true);
    expect(result[1]).toBe(0);
  });

  it("NaN maps to NaN", () => {
    const result = digitize([Number.NaN, 1.5], [1, 2]);
    expect(Number.isNaN(result[0])).toBe(true);
  });

  it("single-edge bins", () => {
    expect(digitize([0, 1, 2], [1])).toEqual([-1, 0, 0]);
  });

  it("throws on empty bins", () => {
    expect(() => digitize([1], [])).toThrow(RangeError);
  });

  it("empty values → empty result", () => {
    expect(digitize([], [1, 2])).toEqual([]);
  });
});

// ─── histogram ───────────────────────────────────────────────────────────────

describe("histogram", () => {
  it("produces correct counts with default 10 bins", () => {
    const { counts, binEdges } = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(counts.length).toBe(10);
    expect(binEdges.length).toBe(11);
    const total = counts.reduce((a, b) => a + b, 0);
    expect(total).toBe(10);
  });

  it("2-bin example", () => {
    const { counts } = histogram([1, 2, 3, 4, 5], { bins: 2 });
    expect(counts.length).toBe(2);
    expect((counts[0] ?? 0) + (counts[1] ?? 0)).toBe(5);
  });

  it("right-most value lands in last bin", () => {
    const { counts } = histogram([0, 5, 10], { bins: 2, range: [0, 10] });
    expect(counts[1]).toBe(2); // 5 and 10
  });

  it("explicit binEdges override bins", () => {
    const { counts, binEdges } = histogram([1, 2, 3, 4, 5], {
      binEdges: [1, 3, 5],
    });
    expect(binEdges).toEqual([1, 3, 5]);
    expect(counts.length).toBe(2);
    expect((counts[0] ?? 0) + (counts[1] ?? 0)).toBe(5);
  });

  it("density normalisation: integral ≈ 1", () => {
    const { counts, binEdges } = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
      density: true,
    });
    let integral = 0;
    for (let i = 0; i < counts.length; i++) {
      integral += (counts[i] as number) * ((binEdges[i + 1] as number) - (binEdges[i] as number));
    }
    expect(Math.abs(integral - 1)).toBeLessThan(1e-10);
  });

  it("values outside range are ignored", () => {
    const { counts } = histogram([0, 1, 5, 10, 99], { range: [1, 10] });
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("NaN values are ignored", () => {
    const { counts } = histogram([1, 2, Number.NaN, 3, null as unknown as number]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("degenerate range (all same value): still produces bins", () => {
    const { counts, binEdges } = histogram([5, 5, 5]);
    expect(binEdges[0]).toBe(4.5);
    expect(binEdges.at(-1)).toBe(5.5);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("empty values → zero counts", () => {
    const { counts } = histogram([], { bins: 5 });
    expect(counts.every((c) => c === 0)).toBe(true);
  });

  it("throws when bins < 1", () => {
    expect(() => histogram([1, 2], { bins: 0 })).toThrow(RangeError);
  });

  it("throws when binEdges has fewer than 2 entries", () => {
    expect(() => histogram([1, 2], { binEdges: [1] })).toThrow(RangeError);
  });
});

// ─── linspace ────────────────────────────────────────────────────────────────

describe("linspace", () => {
  it("default 50 points", () => {
    const r = linspace(0, 1);
    expect(r.length).toBe(50);
    expect(r[0]).toBe(0);
    expect(r[49]).toBe(1);
  });

  it("5 evenly-spaced points", () => {
    expect(linspace(0, 1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("num=1 returns only start", () => {
    expect(linspace(3, 7, 1)).toEqual([3]);
  });

  it("num=0 returns empty array", () => {
    expect(linspace(0, 1, 0)).toEqual([]);
  });

  it("negative range", () => {
    const r = linspace(1, -1, 3);
    expect(r).toEqual([1, 0, -1]);
  });

  it("throws on negative num", () => {
    expect(() => linspace(0, 1, -1)).toThrow(RangeError);
  });

  it("last element is exactly stop (no floating-point drift)", () => {
    const r = linspace(0, 10, 100);
    expect(r.at(-1)).toBe(10);
  });
});

// ─── arange ──────────────────────────────────────────────────────────────────

describe("arange", () => {
  it("single argument: 0..stop-1", () => {
    expect(arange(5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("two arguments: start..stop-1", () => {
    expect(arange(2, 6)).toEqual([2, 3, 4, 5]);
  });

  it("three arguments: custom step", () => {
    expect(arange(0, 1, 0.25)).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it("negative step: descending", () => {
    expect(arange(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
  });

  it("stop <= start with positive step → empty", () => {
    expect(arange(5, 3)).toEqual([]);
  });

  it("stop >= start with negative step → empty", () => {
    expect(arange(1, 5, -1)).toEqual([]);
  });

  it("stop == 0 → empty", () => {
    expect(arange(0)).toEqual([]);
  });

  it("throws on step=0", () => {
    expect(() => arange(0, 5, 0)).toThrow(RangeError);
  });

  it("large step: fewer elements", () => {
    expect(arange(0, 10, 3)).toEqual([0, 3, 6, 9]);
  });
});

// ─── percentileOfScore ───────────────────────────────────────────────────────

describe("percentileOfScore", () => {
  const arr = [1, 2, 3, 4, 5];

  it("rank (default): average of weak and strict", () => {
    expect(percentileOfScore(arr, 3)).toBe(50); // weak=60, strict=40 → 50
  });

  it("weak: proportion of values <= score", () => {
    expect(percentileOfScore(arr, 3, "weak")).toBe(60);
  });

  it("strict: proportion of values < score", () => {
    expect(percentileOfScore(arr, 3, "strict")).toBe(40);
  });

  it("mean: same as rank", () => {
    expect(percentileOfScore(arr, 3, "mean")).toBe(50);
  });

  it("score below all values → strict=0", () => {
    expect(percentileOfScore(arr, 0, "strict")).toBe(0);
  });

  it("score above all values → weak=100", () => {
    expect(percentileOfScore(arr, 10, "weak")).toBe(100);
  });

  it("empty array → NaN", () => {
    expect(Number.isNaN(percentileOfScore([], 5))).toBe(true);
  });

  it("NaN values are ignored", () => {
    const arr2 = [1, 2, Number.NaN, 3, 4, 5];
    expect(percentileOfScore(arr2, 3, "weak")).toBe(60);
  });

  it("duplicate values", () => {
    expect(percentileOfScore([1, 1, 1, 2], 1, "weak")).toBe(75);
  });
});

// ─── zscore ──────────────────────────────────────────────────────────────────

describe("zscore", () => {
  it("standardises to mean≈0 and std≈1", () => {
    const s = ns([2, 4, 4, 4, 5, 5, 7, 9]);
    const z = vals(zscore(s)).filter((v) => typeof v === "number") as number[];
    const mean = z.reduce((a, b) => a + b, 0) / z.length;
    const variance = z.reduce((a, b) => a + (b - mean) ** 2, 0) / (z.length - 1);
    expect(Math.abs(mean)).toBeLessThan(1e-10);
    expect(Math.abs(variance - 1)).toBeLessThan(1e-10);
  });

  it("propagates null unchanged", () => {
    const s = ns([1, null, 3]);
    const result = vals(zscore(s));
    expect(result[1]).toBeNull();
  });

  it("zero std → all NaN", () => {
    const s = ns([5, 5, 5]);
    const result = vals(zscore(s)).filter((v) => typeof v === "number") as number[];
    expect(result.every(Number.isNaN)).toBe(true);
  });

  it("fewer than 2 valid values → all NaN", () => {
    const s = ns([1]);
    const result = vals(zscore(s));
    expect(Number.isNaN(result[0])).toBe(true);
  });

  it("ddof=0 uses population std", () => {
    const s = ns([1, 2, 3, 4, 5]);
    const z0 = vals(zscore(s, { ddof: 0 })).filter((v): v is number => typeof v === "number");
    const z1 = vals(zscore(s, { ddof: 1 })).filter((v): v is number => typeof v === "number");
    // ddof=0 divides by n (not n-1), producing smaller std → larger z-scores
    const range0 = Math.max(...z0) - Math.min(...z0);
    const range1 = Math.max(...z1) - Math.min(...z1);
    expect(range0).toBeGreaterThan(range1);
  });

  it("preserves index labels", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[], index: ["a", "b", "c"] });
    const z = zscore(s);
    expect(z.index.at(0)).toBe("a");
    expect(z.index.at(2)).toBe("c");
  });
});

// ─── minMaxNormalize ─────────────────────────────────────────────────────────

describe("minMaxNormalize", () => {
  it("default range [0, 1]", () => {
    const s = ns([0, 5, 10]);
    const result = vals(minMaxNormalize(s));
    expect(result).toEqual([0, 0.5, 1]);
  });

  it("custom range", () => {
    const s = ns([0, 5, 10]);
    const result = vals(minMaxNormalize(s, { featureRangeMin: -1, featureRangeMax: 1 }));
    expect(result).toEqual([-1, 0, 1]);
  });

  it("propagates null", () => {
    const s = ns([0, null, 10]);
    const result = vals(minMaxNormalize(s));
    expect(result[1]).toBeNull();
    expect(result[0]).toBe(0);
    expect(result[2]).toBe(1);
  });

  it("all same values → midpoint of range", () => {
    const s = ns([5, 5, 5]);
    const result = vals(minMaxNormalize(s)) as number[];
    expect(result.every((v) => v === 0.5)).toBe(true);
  });

  it("single value → midpoint", () => {
    const s = ns([7]);
    const result = vals(minMaxNormalize(s)) as number[];
    expect(result[0]).toBe(0.5);
  });

  it("empty Series → all NaN", () => {
    const s = ns([]);
    const result = vals(minMaxNormalize(s));
    expect(result).toEqual([]);
  });

  it("throws when rangeMin >= rangeMax", () => {
    expect(() => minMaxNormalize(ns([1, 2]), { featureRangeMin: 1, featureRangeMax: 0 })).toThrow(
      RangeError,
    );
  });

  it("preserves index", () => {
    const s = new Series({ data: [0, 10] as Scalar[], index: ["x", "y"] });
    const n = minMaxNormalize(s);
    expect(n.index.at(0)).toBe("x");
    expect(n.index.at(1)).toBe("y");
  });
});

// ─── coefficientOfVariation ───────────────────────────────────────────────────

describe("coefficientOfVariation", () => {
  it("known dataset: [10, 20, 30] CV ≈ 0.5", () => {
    const s = ns([10, 20, 30]);
    const cv = coefficientOfVariation(s);
    expect(Math.abs(cv - 0.5)).toBeLessThan(1e-10);
  });

  it("mean = 0 → NaN", () => {
    const s = ns([-1, 0, 1]);
    expect(Number.isNaN(coefficientOfVariation(s))).toBe(true);
  });

  it("fewer than 2 values → NaN", () => {
    expect(Number.isNaN(coefficientOfVariation(ns([5])))).toBe(true);
    expect(Number.isNaN(coefficientOfVariation(ns([])))).toBe(true);
  });

  it("ignores null/NaN", () => {
    const s = ns([10, null, 20, 30]);
    const cv = coefficientOfVariation(s);
    expect(Math.abs(cv - 0.5)).toBeLessThan(1e-10);
  });

  it("ddof=0 uses population std", () => {
    const s = ns([2, 4, 4, 4, 5, 5, 7, 9]);
    const cv0 = coefficientOfVariation(s, { ddof: 0 });
    const cv1 = coefficientOfVariation(s, { ddof: 1 });
    expect(cv0).toBeLessThan(cv1);
  });

  it("CV > 0 for data with spread", () => {
    expect(coefficientOfVariation(ns([1, 2, 3, 4, 5]))).toBeGreaterThan(0);
  });
});

// ─── seriesDigitize ──────────────────────────────────────────────────────────

describe("seriesDigitize", () => {
  it("returns numeric Series with same index", () => {
    const s = new Series({ data: [0.5, 1.5, 2.5] as Scalar[], index: ["a", "b", "c"] });
    const result = seriesDigitize(s, [1, 2]);
    expect(result.index.at(0)).toBe("a");
    expect(result.index.at(2)).toBe("c");
    expect([...result.toArray()]).toEqual([-1, 0, 1]);
  });

  it("preserves name", () => {
    const s = new Series({ data: [1, 2] as Scalar[], name: "myCol" });
    expect(seriesDigitize(s, [1, 2]).name).toBe("myCol");
  });
});

// ─── property tests ──────────────────────────────────────────────────────────

describe("property: histogram counts match input count", () => {
  it("sum of counts equals number of in-range finite values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100 }), {
          minLength: 1,
          maxLength: 100,
        }),
        fc.integer({ min: 1, max: 20 }),
        (values, bins) => {
          const { counts } = histogram(values, { bins });
          const total = counts.reduce((a, b) => a + b, 0);
          expect(total).toBe(values.length);
        },
      ),
    );
  });
});

describe("property: linspace endpoints", () => {
  it("first element is start, last element is stop", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 0 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: 1, max: 100 }),
        fc.integer({ min: 2, max: 200 }),
        (start, stop, num) => {
          const r = linspace(start, stop, num);
          expect(r.length).toBe(num);
          // Use toEqual to handle -0 === 0 correctly
          expect(r[0]).toEqual(start);
          expect(r.at(-1)).toEqual(stop);
        },
      ),
    );
  });
});

describe("property: arange length matches formula", () => {
  it("length = ceil((stop - start) / step)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 200 }),
        fc.integer({ min: 1, max: 20 }),
        (start, stop, step) => {
          const r = arange(start, stop, step);
          const expected = Math.ceil((stop - start) / step);
          expect(r.length).toBe(expected);
        },
      ),
    );
  });
});

describe("property: zscore mean is approximately 0", () => {
  it("mean of z-scores is ≈ 0 for finite data with variance", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 3,
          maxLength: 50,
        }),
        (data) => {
          const s = new Series({ data: data as Scalar[] });
          const z = vals(zscore(s)).filter(
            (v): v is number => typeof v === "number" && !Number.isNaN(v),
          );
          if (z.length < 2) {
            return;
          }
          const mean = z.reduce((a, b) => a + b, 0) / z.length;
          expect(Math.abs(mean)).toBeLessThan(1e-8);
        },
      ),
    );
  });
});
