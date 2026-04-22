/**
 * Tests for cut_bins_to_frame — cutBinsToFrame, cutBinCounts, binEdges
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/index.ts";
import { cutBinsToFrame, cutBinCounts, binEdges } from "../../src/stats/cut_bins_to_frame.ts";
import { cut, qcut } from "../../src/stats/cut_qcut.ts";

// ─── cutBinsToFrame ───────────────────────────────────────────────────────────

describe("cutBinsToFrame", () => {
  test("basic structure with 2 bins", () => {
    const result = cut([1, 2, 3, 4, 5], 2);
    const df = cutBinsToFrame(result);

    expect(df).toBeInstanceOf(DataFrame);
    expect(df.shape[0]).toBe(2); // 2 bins → 2 rows
    expect(df.columns.values).toEqual(["bin", "left", "right", "count", "frequency"]);
  });

  test("bin labels match cut labels", () => {
    const result = cut([1, 2, 3, 4, 5], 2);
    const df = cutBinsToFrame(result);
    const bins = df.get("bin")?.values;
    expect(bins).toEqual(result.labels);
  });

  test("left and right edges match bins array", () => {
    const result = cut([10, 20, 30, 40, 50], 2);
    const df = cutBinsToFrame(result);
    const left = df.get("left")?.values as number[];
    const right = df.get("right")?.values as number[];
    for (let i = 0; i < result.labels.length; i++) {
      expect(left[i]).toBe(result.bins[i]);
      expect(right[i]).toBe(result.bins[i + 1]);
    }
  });

  test("count = 0 when no data provided", () => {
    const result = cut([1, 2, 3, 4, 5], 3);
    const df = cutBinsToFrame(result);
    const counts = df.get("count")?.values as number[];
    expect(counts.every((c) => c === 0)).toBe(true);
  });

  test("frequency = 0 when no data provided", () => {
    const result = cut([1, 2, 3, 4, 5], 3);
    const df = cutBinsToFrame(result);
    const freqs = df.get("frequency")?.values as number[];
    expect(freqs.every((f) => f === 0)).toBe(true);
  });

  test("counts sum to total when data provided", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = cut(data, 5);
    const df = cutBinsToFrame(result, { data });
    const counts = df.get("count")?.values as number[];
    const total = counts.reduce((a, b) => a + b, 0);
    // Count of non-null codes
    const validCodes = result.codes.filter((c) => c !== null).length;
    expect(total).toBe(validCodes);
  });

  test("frequencies sum to ~1 when data provided", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = cut(data, 5);
    const df = cutBinsToFrame(result, { data });
    const freqs = df.get("frequency")?.values as number[];
    const sum = freqs.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-10);
  });

  test("works with qcut", () => {
    const data = [1, 2, 3, 4, 5, 6];
    const result = qcut(data, 2);
    const df = cutBinsToFrame(result, { data });
    expect(df.shape[0]).toBe(2);
    const counts = df.get("count")?.values as number[];
    expect(counts.reduce((a, b) => a + b, 0)).toBe(6);
  });

  test("single bin (all same values with drop)", () => {
    const data = [5, 5, 5];
    const result = cut(data, [0, 10]);
    const df = cutBinsToFrame(result, { data });
    expect(df.shape[0]).toBe(1);
    const counts = df.get("count")?.values as number[];
    expect(counts[0]).toBe(3);
  });

  test("4 bins returns 4 rows", () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = cut(data, 4);
    const df = cutBinsToFrame(result, { data });
    expect(df.shape[0]).toBe(4);
    const counts = df.get("count")?.values as number[];
    expect(counts.reduce((a, b) => a + b, 0)).toBe(20);
  });

  // ── property tests ───────────────────────────────────────────────────────────

  test("property: counts sum to number of non-null codes", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100 }), {
          minLength: 5,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 5 }),
        (data, nBins) => {
          const result = cut(data, nBins, { duplicates: "drop" });
          if (result.labels.length === 0) return true;
          const df = cutBinsToFrame(result, { data });
          const counts = df.get("count")?.values as number[];
          const total = counts.reduce((a, b) => a + b, 0);
          const validCodes = result.codes.filter((c) => c !== null).length;
          return total === validCodes;
        },
      ),
    );
  });

  test("property: left < right for every bin", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100 }), {
          minLength: 5,
          maxLength: 30,
        }),
        fc.integer({ min: 2, max: 5 }),
        (data, nBins) => {
          const result = cut(data, nBins, { duplicates: "drop" });
          if (result.labels.length === 0) return true;
          const df = cutBinsToFrame(result);
          const left = df.get("left")?.values as number[];
          const right = df.get("right")?.values as number[];
          return left.every((l, i) => l < (right[i] as number));
        },
      ),
    );
  });
});

// ─── cutBinCounts ─────────────────────────────────────────────────────────────

describe("cutBinCounts", () => {
  test("returns a Record with label keys", () => {
    const result = cut([1, 2, 3, 4, 5], 2);
    const counts = cutBinCounts(result);
    expect(Object.keys(counts)).toEqual([...result.labels]);
  });

  test("counts sum to number of valid observations", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = cut(data, 4);
    // Copy codes as a fake BinResult with the data's codes
    const counts = cutBinCounts({ codes: result.codes, labels: result.labels, bins: result.bins });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(data.length);
  });

  test("count is 0 for empty bins", () => {
    const result = cut([1, 2, 100], [0, 10, 20, 110]);
    const counts = cutBinCounts(result);
    // The middle bin (10, 20] should be empty
    const middleLabel = result.labels[1] as string;
    expect(counts[middleLabel]).toBe(0);
  });

  test("null codes are ignored", () => {
    const result = cut([Number.NaN, 1, 2, 3], 2);
    const counts = cutBinCounts(result);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(3); // NaN is null
  });
});

// ─── binEdges ─────────────────────────────────────────────────────────────────

describe("binEdges", () => {
  test("has left and right columns", () => {
    const result = cut([1, 2, 3, 4, 5], 2);
    const df = binEdges(result);
    expect(df.columns.values).toEqual(["left", "right"]);
  });

  test("index is the bin labels", () => {
    const result = cut([1, 2, 3, 4, 5], 2);
    const df = binEdges(result);
    expect(df.shape[0]).toBe(2);
  });

  test("left column matches first edge of each bin", () => {
    const result = cut([1, 2, 3, 4, 5], 3);
    const df = binEdges(result);
    const left = df.get("left")?.values as number[];
    for (let i = 0; i < result.labels.length; i++) {
      expect(left[i]).toBe(result.bins[i]);
    }
  });

  test("right column matches second edge of each bin", () => {
    const result = cut([1, 2, 3, 4, 5], 3);
    const df = binEdges(result);
    const right = df.get("right")?.values as number[];
    for (let i = 0; i < result.labels.length; i++) {
      expect(right[i]).toBe(result.bins[i + 1]);
    }
  });

  test("works with qcut bins", () => {
    const result = qcut([1, 2, 3, 4, 5, 6], 3);
    const df = binEdges(result);
    expect(df.shape[0]).toBe(3);
    expect(df.columns.values).toEqual(["left", "right"]);
  });
});
