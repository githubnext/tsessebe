/**
 * Tests for window indexers (BaseIndexer, FixedForwardWindowIndexer,
 * VariableOffsetWindowIndexer, applyIndexer).
 *
 * Mirrors pandas.api.indexers test suite.
 */

import { describe, expect, test } from "bun:test";
import {
  BaseIndexer,
  FixedForwardWindowIndexer,
  VariableOffsetWindowIndexer,
  applyIndexer,
} from "../../src/window/index.ts";
import type { WindowBounds } from "../../src/window/index.ts";

// ─── FixedForwardWindowIndexer ────────────────────────────────────────────────

describe("FixedForwardWindowIndexer", () => {
  test("basic bounds for n=5 window=3", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
    const [start, end] = idx.getWindowBounds(5);
    expect(Array.from(start)).toEqual([0, 1, 2, 3, 4]);
    expect(Array.from(end)).toEqual([3, 4, 5, 5, 5]);
  });

  test("window=1 — each row covers only itself", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 1 });
    const [start, end] = idx.getWindowBounds(4);
    expect(Array.from(start)).toEqual([0, 1, 2, 3]);
    expect(Array.from(end)).toEqual([1, 2, 3, 4]);
  });

  test("window larger than n — all rows start at i, end clamped to n", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 10 });
    const [start, end] = idx.getWindowBounds(3);
    expect(Array.from(start)).toEqual([0, 1, 2]);
    expect(Array.from(end)).toEqual([3, 3, 3]);
  });

  test("n=0 — empty output", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
    const [start, end] = idx.getWindowBounds(0);
    expect(start.length).toBe(0);
    expect(end.length).toBe(0);
  });

  test("windowSize property exposed", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 5 });
    expect(idx.windowSize).toBe(5);
  });

  test("throws for non-positive windowSize", () => {
    expect(() => new FixedForwardWindowIndexer({ windowSize: 0 })).toThrow(RangeError);
    expect(() => new FixedForwardWindowIndexer({ windowSize: -1 })).toThrow(RangeError);
  });

  test("throws for non-integer windowSize", () => {
    expect(() => new FixedForwardWindowIndexer({ windowSize: 1.5 })).toThrow(RangeError);
  });

  test("window=n — last row window is exactly the last element", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 5 });
    const [start, end] = idx.getWindowBounds(5);
    expect(Array.from(start)).toEqual([0, 1, 2, 3, 4]);
    expect(Array.from(end)).toEqual([5, 5, 5, 5, 5]);
  });
});

// ─── VariableOffsetWindowIndexer ──────────────────────────────────────────────

describe("VariableOffsetWindowIndexer — trailing (default)", () => {
  test("basic trailing offsets", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [0, 1, 2, 1, 0] });
    const [start, end] = idx.getWindowBounds(5);
    expect(Array.from(start)).toEqual([0, 0, 0, 2, 4]);
    expect(Array.from(end)).toEqual([1, 2, 3, 4, 5]);
  });

  test("zero offsets — each row covers only itself", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [0, 0, 0] });
    const [start, end] = idx.getWindowBounds(3);
    expect(Array.from(start)).toEqual([0, 1, 2]);
    expect(Array.from(end)).toEqual([1, 2, 3]);
  });

  test("large offsets clamp to 0", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [100, 100, 100] });
    const [start, end] = idx.getWindowBounds(3);
    expect(Array.from(start)).toEqual([0, 0, 0]);
    expect(Array.from(end)).toEqual([1, 2, 3]);
  });

  test("throws when offsets length != numValues", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [0, 1, 2] });
    expect(() => idx.getWindowBounds(5)).toThrow(RangeError);
  });

  test("throws on negative offset", () => {
    expect(() => new VariableOffsetWindowIndexer({ offsets: [-1, 0] })).toThrow(RangeError);
  });

  test("windowSize is null for variable indexer", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [1, 2] });
    expect(idx.windowSize).toBeNull();
  });
});

describe("VariableOffsetWindowIndexer — forward", () => {
  test("basic forward offsets", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [2, 1, 0, 1, 0], forward: true });
    const [start, end] = idx.getWindowBounds(5);
    expect(Array.from(start)).toEqual([0, 1, 2, 3, 4]);
    expect(Array.from(end)).toEqual([3, 3, 3, 5, 5]);
  });

  test("forward large offsets clamp to numValues", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [100, 100, 100], forward: true });
    const [start, end] = idx.getWindowBounds(3);
    expect(Array.from(start)).toEqual([0, 1, 2]);
    expect(Array.from(end)).toEqual([3, 3, 3]);
  });

  test("forward zero offsets — each row covers only itself", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [0, 0, 0], forward: true });
    const [start, end] = idx.getWindowBounds(3);
    expect(Array.from(start)).toEqual([0, 1, 2]);
    expect(Array.from(end)).toEqual([1, 2, 3]);
  });
});

// ─── applyIndexer ─────────────────────────────────────────────────────────────

describe("applyIndexer", () => {
  const sum = (nums: readonly number[]): number => nums.reduce((a, b) => a + b, 0);
  const mean = (nums: readonly number[]): number => nums.reduce((a, b) => a + b, 0) / nums.length;

  test("FixedForward sum window=2 over [1,2,3,4,5]", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 2 });
    const result = applyIndexer(idx, [1, 2, 3, 4, 5], sum);
    expect(result).toEqual([3, 5, 7, 9, 5]);
  });

  test("FixedForward mean window=3 over [1,2,3,4,5]", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
    const result = applyIndexer(idx, [1, 2, 3, 4, 5], mean);
    expect(result[0]).toBeCloseTo(2);
    expect(result[1]).toBeCloseTo(3);
    expect(result[2]).toBeCloseTo(4);
    // last two windows have < minPeriods default(1) so still computed
    expect(result[3]).toBeCloseTo(4.5);
    expect(result[4]).toBeCloseTo(5);
  });

  test("null values are skipped", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 2 });
    const result = applyIndexer(idx, [1, null, 3, null, 5], sum);
    expect(result[0]).toBe(1); // only 1 valid
    expect(result[1]).toBe(3); // only 3 valid
    expect(result[2]).toBe(3); // only 3 valid (null skipped)
    expect(result[3]).toBe(5); // only 5 valid
    expect(result[4]).toBe(5); // only 5 valid
  });

  test("minPeriods respected — null when too few valid values", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
    const result = applyIndexer(idx, [1, null, null, 4, 5], sum, 2);
    // i=0: window [0,3) → [1, null, null] → 1 valid, < 2 → null
    expect(result[0]).toBeNull();
    // i=1: window [1,4) → [null, null, 4] → 1 valid → null
    expect(result[1]).toBeNull();
    // i=2: window [2,5) → [null, 4, 5] → 2 valid → 9
    expect(result[2]).toBe(9);
    // i=3: window [3,5) → [4, 5] → 2 valid → 9
    expect(result[3]).toBe(9);
    // i=4: window [4,5) → [5] → 1 valid < 2 → null
    expect(result[4]).toBeNull();
  });

  test("VariableOffset trailing sum", () => {
    const idx = new VariableOffsetWindowIndexer({ offsets: [0, 1, 2, 1, 0] });
    const result = applyIndexer(idx, [10, 20, 30, 40, 50], sum);
    // i=0: [10] → 10
    // i=1: [10,20] → 30
    // i=2: [10,20,30] → 60
    // i=3: [30,40] → 70
    // i=4: [50] → 50
    expect(result).toEqual([10, 30, 60, 70, 50]);
  });

  test("empty array returns empty result", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 3 });
    const result = applyIndexer(idx, [], sum);
    expect(result).toEqual([]);
  });

  test("all NaN values with minPeriods=1 → all null", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 2 });
    const result = applyIndexer(idx, [Number.NaN, Number.NaN, Number.NaN], sum, 1);
    expect(result).toEqual([null, null, null]);
  });

  test("undefined values treated as missing", () => {
    const idx = new FixedForwardWindowIndexer({ windowSize: 2 });
    const result = applyIndexer(idx, [1, undefined, 3], sum);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(3);
    expect(result[2]).toBe(3);
  });
});

// ─── integration: custom subclass ─────────────────────────────────────────────

describe("Custom BaseIndexer subclass", () => {
  // Expanding trailing window (like Expanding but as an indexer)
  class ExpandingIndexer extends BaseIndexer {
    getWindowBounds(numValues: number): WindowBounds {
      const start = new Int32Array(numValues);
      const end = new Int32Array(numValues);
      for (let i = 0; i < numValues; i++) {
        start[i] = 0;
        end[i] = i + 1;
      }
      return [start, end];
    }
  }

  test("custom expanding indexer sums correctly", () => {
    const idx = new ExpandingIndexer();
    const result = applyIndexer(idx, [1, 2, 3, 4, 5], (nums) => nums.reduce((a, b) => a + b, 0));
    expect(result).toEqual([1, 3, 6, 10, 15]);
  });
});
