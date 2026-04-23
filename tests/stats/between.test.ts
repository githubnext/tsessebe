/**
 * Tests for between — seriesBetween.
 *
 * Covers:
 * - inclusive="both" (default): left ≤ x ≤ right
 * - inclusive="left":  left ≤ x < right
 * - inclusive="right": left < x ≤ right
 * - inclusive="neither": left < x < right
 * - Missing values produce false
 * - String labels
 * - Property-based: results match naive range check
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series, seriesBetween } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

describe("seriesBetween", () => {
  // ─── inclusive="both" ───────────────────────────────────────────────────────
  describe('inclusive="both" (default)', () => {
    test("basic numeric range", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 2, 4).values).toEqual([false, true, true, true, false]);
    });

    test("boundary values included", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 1, 5).values).toEqual([true, true, true, true, true]);
    });

    test("single value range", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 3, 3).values).toEqual([false, false, true, false, false]);
    });

    test("all outside range", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 10, 20).values).toEqual([false, false, false, false, false]);
    });

    test("negative numbers", () => {
      const s = new Series<Scalar>({ data: [-3, -1, 0, 1, 3] });
      expect(seriesBetween(s, -1, 1).values).toEqual([false, true, true, true, false]);
    });

    test("float values", () => {
      const s = new Series<Scalar>({ data: [0.5, 1.0, 1.5, 2.0, 2.5] });
      expect(seriesBetween(s, 1.0, 2.0).values).toEqual([false, true, true, true, false]);
    });

    test("empty Series", () => {
      const s = new Series<Scalar>({ data: [] });
      expect(seriesBetween(s, 0, 10).values).toEqual([]);
    });

    test("preserves index", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3], index: ["a", "b", "c"] });
      const result = seriesBetween(s, 1, 2);
      expect(result.index.values).toEqual(["a", "b", "c"]);
      expect(result.values).toEqual([true, true, false]);
    });

    test("missing values (null/undefined/NaN) → false", () => {
      const s = new Series<Scalar>({ data: [1, null, undefined, Number.NaN, 3] });
      expect(seriesBetween(s, 0, 5).values).toEqual([true, false, false, false, true]);
    });
  });

  // ─── inclusive="left" ───────────────────────────────────────────────────────
  describe('inclusive="left"', () => {
    test("left boundary included, right excluded", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 2, 4, { inclusive: "left" }).values).toEqual([
        false,
        true,
        true,
        false,
        false,
      ]);
    });

    test("left boundary at exact match", () => {
      const s = new Series<Scalar>({ data: [2, 3, 4] });
      expect(seriesBetween(s, 2, 4, { inclusive: "left" }).values).toEqual([true, true, false]);
    });
  });

  // ─── inclusive="right" ──────────────────────────────────────────────────────
  describe('inclusive="right"', () => {
    test("right boundary included, left excluded", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 2, 4, { inclusive: "right" }).values).toEqual([
        false,
        false,
        true,
        true,
        false,
      ]);
    });

    test("right boundary at exact match", () => {
      const s = new Series<Scalar>({ data: [2, 3, 4] });
      expect(seriesBetween(s, 2, 4, { inclusive: "right" }).values).toEqual([false, true, true]);
    });
  });

  // ─── inclusive="neither" ────────────────────────────────────────────────────
  describe('inclusive="neither"', () => {
    test("both boundaries excluded", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3, 4, 5] });
      expect(seriesBetween(s, 2, 4, { inclusive: "neither" }).values).toEqual([
        false,
        false,
        true,
        false,
        false,
      ]);
    });

    test("only the exact middle value qualifies", () => {
      const s = new Series<Scalar>({ data: [2, 3, 4] });
      expect(seriesBetween(s, 2, 4, { inclusive: "neither" }).values).toEqual([false, true, false]);
    });

    test("empty interval → all false", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3] });
      // left === right → no value can be strictly between
      expect(seriesBetween(s, 2, 2, { inclusive: "neither" }).values).toEqual([
        false,
        false,
        false,
      ]);
    });
  });

  // ─── string labels ───────────────────────────────────────────────────────────
  describe("string values", () => {
    test("string range", () => {
      const s = new Series<Scalar>({ data: ["apple", "banana", "cherry", "date"] });
      // lexicographic: "banana" <= x <= "cherry"
      expect(seriesBetween(s, "banana", "cherry").values).toEqual([false, true, true, false]);
    });
  });

  // ─── property-based ───────────────────────────────────────────────────────────
  describe("property-based", () => {
    test("results match naive range check", () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 20 }),
          fc.float({ noNaN: true }),
          fc.float({ noNaN: true }),
          (arr, a, b) => {
            const left = Math.min(a, b);
            const right = Math.max(a, b);
            const s = new Series<Scalar>({ data: arr });
            const result = seriesBetween(s, left, right).values as boolean[];
            for (let i = 0; i < arr.length; i++) {
              const v = arr[i] as number;
              const expected = v >= left && v <= right;
              if (result[i] !== expected) {
                return false;
              }
            }
            return true;
          },
        ),
      );
    });

    test("seriesBetween left returns subset of both", () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
            minLength: 1,
            maxLength: 20,
          }),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          (arr, a, b) => {
            const left = Math.min(a, b);
            const right = Math.max(a, b);
            const s = new Series<Scalar>({ data: arr });
            const both = seriesBetween(s, left, right, { inclusive: "both" }).values as boolean[];
            const leftOnly = seriesBetween(s, left, right, { inclusive: "left" })
              .values as boolean[];
            // "left" must be a subset of "both"
            for (let i = 0; i < arr.length; i++) {
              if (leftOnly[i] && !both[i]) {
                return false;
              }
            }
            return true;
          },
        ),
      );
    });
  });
});
