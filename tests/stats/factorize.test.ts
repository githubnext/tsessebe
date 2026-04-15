/**
 * Tests for factorize — integer encoding of scalar values.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/core/index.ts";
import { factorize, seriesFactorize } from "../../src/stats/factorize.ts";

// ─── factorize (array) ────────────────────────────────────────────────────────

describe("factorize — strings, first-seen order", () => {
  test("basic string array", () => {
    const { codes, uniques } = factorize(["b", "a", "b", "c", "a"]);
    expect(codes).toEqual([0, 1, 0, 2, 1]);
    expect(uniques).toEqual(["b", "a", "c"]);
  });

  test("single element", () => {
    const { codes, uniques } = factorize(["x"]);
    expect(codes).toEqual([0]);
    expect(uniques).toEqual(["x"]);
  });

  test("all identical", () => {
    const { codes, uniques } = factorize(["z", "z", "z"]);
    expect(codes).toEqual([0, 0, 0]);
    expect(uniques).toEqual(["z"]);
  });

  test("empty array", () => {
    const { codes, uniques } = factorize([]);
    expect(codes).toEqual([]);
    expect(uniques).toEqual([]);
  });
});

describe("factorize — numbers", () => {
  test("numeric array, first-seen order", () => {
    const { codes, uniques } = factorize([3, 1, 2, 1, 3]);
    expect(codes).toEqual([0, 1, 2, 1, 0]);
    expect(uniques).toEqual([3, 1, 2]);
  });

  test("numeric array, sorted order", () => {
    const { codes, uniques } = factorize([3, 1, 2, 1, 3], { sort: true });
    expect(codes).toEqual([2, 0, 1, 0, 2]);
    expect(uniques).toEqual([1, 2, 3]);
  });

  test("negative numbers sorted", () => {
    const { codes, uniques } = factorize([-2, 0, -2, 1], { sort: true });
    expect(codes).toEqual([0, 1, 0, 2]);
    expect(uniques).toEqual([-2, 0, 1]);
  });

  test("floats", () => {
    const { codes, uniques } = factorize([1.5, 0.5, 1.5]);
    expect(codes).toEqual([0, 1, 0]);
    expect(uniques).toEqual([1.5, 0.5]);
  });
});

describe("factorize — missing values with useNaSentinel=true (default)", () => {
  test("null values get code -1", () => {
    const { codes, uniques } = factorize(["a", null, "b", null, "a"]);
    expect(codes).toEqual([0, -1, 1, -1, 0]);
    expect(uniques).toEqual(["a", "b"]);
  });

  test("undefined values get code -1", () => {
    const { codes, uniques } = factorize(["x", undefined, "x"]);
    expect(codes).toEqual([0, -1, 0]);
    expect(uniques).toEqual(["x"]);
  });

  test("NaN values get code -1", () => {
    const { codes, uniques } = factorize([1, Number.NaN, 2, Number.NaN, 1]);
    expect(codes).toEqual([0, -1, 1, -1, 0]);
    expect(uniques).toEqual([1, 2]);
  });

  test("all missing → all -1, empty uniques", () => {
    const { codes, uniques } = factorize([null, null, undefined]);
    expect(codes).toEqual([-1, -1, -1]);
    expect(uniques).toEqual([]);
  });

  test("missing not included in uniques", () => {
    const { codes, uniques } = factorize([1, null, 2], { sort: true });
    expect(codes).toEqual([0, -1, 1]);
    expect(uniques).toEqual([1, 2]);
  });
});

describe("factorize — useNaSentinel=false", () => {
  test("null treated as a regular value", () => {
    const { codes, uniques } = factorize(["a", null, "a", null], {
      useNaSentinel: false,
    });
    expect(codes).toEqual([0, 1, 0, 1]);
    expect(uniques).toEqual(["a", null]);
  });

  test("NaN treated as a regular value", () => {
    const { codes, uniques } = factorize([1, Number.NaN, 1, Number.NaN], {
      useNaSentinel: false,
    });
    expect(codes).toEqual([0, 1, 0, 1]);
    expect(uniques.length).toBe(2);
    expect(uniques[0]).toBe(1);
    expect(Number.isNaN(uniques[1] as number)).toBe(true);
  });
});

describe("factorize — sort option", () => {
  test("string sort is lexicographic", () => {
    const { codes, uniques } = factorize(["banana", "apple", "cherry"], {
      sort: true,
    });
    expect(uniques).toEqual(["apple", "banana", "cherry"]);
    expect(codes[0]).toBe(1); // banana
    expect(codes[1]).toBe(0); // apple
    expect(codes[2]).toBe(2); // cherry
  });

  test("sort with missing: -1 codes unchanged, uniques sorted", () => {
    const { codes, uniques } = factorize([3, null, 1, null, 2], { sort: true });
    expect(codes).toEqual([2, -1, 0, -1, 1]);
    expect(uniques).toEqual([1, 2, 3]);
  });

  test("mixed number/sort returns numbers before strings", () => {
    const { codes, uniques } = factorize([2, 1, 3], { sort: true });
    expect(uniques).toEqual([1, 2, 3]);
    expect(codes).toEqual([1, 0, 2]);
  });
});

describe("factorize — booleans", () => {
  test("boolean values", () => {
    const { codes, uniques } = factorize([true, false, true, false]);
    expect(codes).toEqual([0, 1, 0, 1]);
    expect(uniques).toEqual([true, false]);
  });
});

describe("factorize — codes are valid indices", () => {
  test("every non-(-1) code is a valid index into uniques", () => {
    const values = ["c", "a", null, "b", "a", null, "c"];
    const { codes, uniques } = factorize(values);
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i] as number;
      if (code === -1) {
        expect(values[i]).toBeNull();
      } else {
        expect(uniques[code]).toBe(values[i]);
      }
    }
  });

  test("round-trip: reconstruct values from codes+uniques", () => {
    const values = [10, 20, 30, 20, 10];
    const { codes, uniques } = factorize(values);
    const reconstructed = codes.map((c) => uniques[c]);
    expect(reconstructed).toEqual(values);
  });
});

// ─── seriesFactorize ──────────────────────────────────────────────────────────

describe("seriesFactorize", () => {
  test("returns Series with correct codes and uniques", () => {
    const s = new Series({ data: ["b", "a", "b", "c"], name: "letters" });
    const { codes, uniques } = seriesFactorize(s);

    expect(codes.values).toEqual([0, 1, 0, 2]);
    expect(uniques.values).toEqual(["b", "a", "c"]);
  });

  test("codes Series has same length as input", () => {
    const s = new Series({ data: [1, 2, 3, 1, 2] });
    const { codes } = seriesFactorize(s);
    expect(codes.length).toBe(5);
  });

  test("uniques Series has no duplicates", () => {
    const s = new Series({ data: ["x", "y", "x", "z", "y"] });
    const { uniques } = seriesFactorize(s);
    expect(uniques.length).toBe(3);
    expect(new Set(uniques.values as string[]).size).toBe(3);
  });

  test("preserves name on codes Series", () => {
    const s = new Series({ data: [1, 2, 1], name: "myCol" });
    const { codes } = seriesFactorize(s);
    expect(codes.name).toBe("myCol");
  });

  test("sort option works on Series", () => {
    const s = new Series({ data: [30, 10, 20] });
    const { codes, uniques } = seriesFactorize(s, { sort: true });
    expect(uniques.values).toEqual([10, 20, 30]);
    expect(codes.values).toEqual([2, 0, 1]);
  });

  test("missing values in Series → code -1", () => {
    const s = new Series({ data: ["a", null, "b", null] });
    const { codes, uniques } = seriesFactorize(s);
    expect(codes.values).toEqual([0, -1, 1, -1]);
    expect(uniques.values).toEqual(["a", "b"]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("factorize — property tests", () => {
  test("codes are always valid uniques indices or -1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string({ maxLength: 5 }), fc.constant(null)), {
          minLength: 0,
          maxLength: 20,
        }),
        (arr) => {
          const { codes, uniques } = factorize(arr as (string | null)[]);
          for (const code of codes) {
            expect(code === -1 || (code >= 0 && code < uniques.length)).toBe(true);
          }
        },
      ),
    );
  });

  test("uniques has no duplicates (string keys)", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 4 }), { maxLength: 30 }), (arr) => {
        const { uniques } = factorize(arr);
        expect(new Set(uniques).size).toBe(uniques.length);
      }),
    );
  });

  test("round-trip: decode codes+uniques reproduces original (no NAs)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 30 }),
        (arr) => {
          const { codes, uniques } = factorize(arr);
          const reconstructed = codes.map((c) => uniques[c]);
          expect(reconstructed).toEqual(arr);
        },
      ),
    );
  });

  test("sorted uniques are in non-decreasing order (numbers)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 20 }), (arr) => {
        const { uniques } = factorize(arr, { sort: true });
        for (let i = 1; i < uniques.length; i++) {
          expect((uniques[i] as number) >= (uniques[i - 1] as number)).toBe(true);
        }
      }),
    );
  });

  test("sorted and first-seen produce same set of uniques", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 4 }), { maxLength: 25 }), (arr) => {
        const { uniques: fs } = factorize(arr, { sort: false });
        const { uniques: sorted } = factorize(arr, { sort: true });
        expect(new Set(fs).size).toBe(new Set(sorted).size);
        for (const v of fs) {
          expect(sorted).toContain(v);
        }
      }),
    );
  });

  test("uniques count ≤ input length (NA sentinel)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.string({ maxLength: 4 }), fc.constant(null)), {
          maxLength: 25,
        }),
        (arr) => {
          const { uniques } = factorize(arr as (string | null)[]);
          expect(uniques.length).toBeLessThanOrEqual(arr.length);
        },
      ),
    );
  });
});
