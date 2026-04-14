import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { argsortScalars, searchsorted, searchsortedMany } from "../../src/core/searchsorted.ts";

// ─── searchsorted (scalar queries) ────────────────────────────────────────────

describe("searchsorted — basic numeric array", () => {
  const a = [1, 3, 5, 7, 9] as const;

  it("side=left: value before first element → 0", () => {
    expect(searchsorted(a, 0)).toBe(0);
  });

  it("side=left: value after last element → length", () => {
    expect(searchsorted(a, 10)).toBe(5);
  });

  it("side=left: value equal to element → that element's index", () => {
    expect(searchsorted(a, 1)).toBe(0);
    expect(searchsorted(a, 3)).toBe(1);
    expect(searchsorted(a, 5)).toBe(2);
    expect(searchsorted(a, 7)).toBe(3);
    expect(searchsorted(a, 9)).toBe(4);
  });

  it("side=left: value between elements → index of upper neighbour", () => {
    expect(searchsorted(a, 2)).toBe(1);
    expect(searchsorted(a, 4)).toBe(2);
    expect(searchsorted(a, 6)).toBe(3);
    expect(searchsorted(a, 8)).toBe(4);
  });

  it("side=right: value equal to element → one past that element", () => {
    expect(searchsorted(a, 1, { side: "right" })).toBe(1);
    expect(searchsorted(a, 3, { side: "right" })).toBe(2);
    expect(searchsorted(a, 5, { side: "right" })).toBe(3);
    expect(searchsorted(a, 7, { side: "right" })).toBe(4);
    expect(searchsorted(a, 9, { side: "right" })).toBe(5);
  });

  it("side=right: value between elements → same as side=left", () => {
    expect(searchsorted(a, 2, { side: "right" })).toBe(1);
    expect(searchsorted(a, 6, { side: "right" })).toBe(3);
  });
});

describe("searchsorted — duplicate elements", () => {
  const a = [1, 3, 3, 3, 7] as const;

  it("side=left: finds leftmost 3 → index 1", () => {
    expect(searchsorted(a, 3)).toBe(1);
  });

  it("side=right: finds position after rightmost 3 → index 4", () => {
    expect(searchsorted(a, 3, { side: "right" })).toBe(4);
  });

  it("invariant: left ≤ right for all values", () => {
    for (const v of [0, 1, 2, 3, 4, 7, 8]) {
      const l = searchsorted(a, v, { side: "left" });
      const r = searchsorted(a, v, { side: "right" });
      expect(l).toBeLessThanOrEqual(r);
    }
  });
});

describe("searchsorted — empty array", () => {
  it("returns 0 for any value", () => {
    expect(searchsorted([], 42)).toBe(0);
    expect(searchsorted([], null)).toBe(0);
    expect(searchsorted([], "z")).toBe(0);
  });
});

describe("searchsorted — single element array", () => {
  it("value less than element → 0", () => {
    expect(searchsorted([5], 3)).toBe(0);
  });
  it("value equal to element (left) → 0", () => {
    expect(searchsorted([5], 5)).toBe(0);
  });
  it("value equal to element (right) → 1", () => {
    expect(searchsorted([5], 5, { side: "right" })).toBe(1);
  });
  it("value greater than element → 1", () => {
    expect(searchsorted([5], 7)).toBe(1);
  });
});

describe("searchsorted — string array", () => {
  const a = ["apple", "banana", "cherry", "date", "elderberry"] as const;

  it("side=left: finds correct insertion point", () => {
    expect(searchsorted(a, "banana")).toBe(1);
    expect(searchsorted(a, "blueberry")).toBe(2); // between banana and cherry
    expect(searchsorted(a, "aardvark")).toBe(0);
    expect(searchsorted(a, "fig")).toBe(5);
  });

  it("side=right: positions after equal element", () => {
    expect(searchsorted(a, "cherry", { side: "right" })).toBe(3);
  });
});

describe("searchsorted — null/undefined handling", () => {
  it("null is treated as less than numbers", () => {
    const a = [null, null, 1, 3, 5] as const;
    expect(searchsorted(a, null)).toBe(0);
    expect(searchsorted(a, null, { side: "right" })).toBe(2);
    expect(searchsorted(a, 2)).toBe(3); // between 1 and 3
  });

  it("NaN is treated as greater than all numbers", () => {
    const a = [1, 3, 5, Number.NaN] as const;
    expect(searchsorted(a, Number.NaN)).toBe(3);
    expect(searchsorted(a, Number.NaN, { side: "right" })).toBe(4);
  });
});

describe("searchsorted — sorter parameter", () => {
  it("unsorted array with sorter works like sorted", () => {
    const a = [5, 1, 3]; // unsorted
    const sorter = argsortScalars(a); // [1, 2, 0] → sorted view: 1, 3, 5
    expect(searchsorted(a, 2, { sorter })).toBe(1); // between 1 and 3
    expect(searchsorted(a, 3, { sorter })).toBe(1); // before the 3 (left)
    expect(searchsorted(a, 3, { side: "right", sorter })).toBe(2); // after the 3
  });

  it("result equals searchsorted on sorted copy", () => {
    const a = [9, 2, 7, 4, 1];
    const sorted = [...a].sort((x, y) => (x as number) - (y as number));
    const sorter = argsortScalars(a);
    for (const v of [0, 1, 3, 5, 8, 10]) {
      expect(searchsorted(a, v, { sorter })).toBe(searchsorted(sorted, v));
    }
  });
});

describe("searchsorted — custom compareFn", () => {
  it("case-insensitive string search", () => {
    const a = ["apple", "Banana", "cherry"];
    const cmp = (x: unknown, y: unknown): number => {
      const sx = String(x).toLowerCase();
      const sy = String(y).toLowerCase();
      return sx < sy ? -1 : sx > sy ? 1 : 0;
    };
    // array is sorted case-insensitively: apple < Banana < cherry
    expect(searchsorted(a, "banana", { compareFn: cmp })).toBe(1);
    expect(searchsorted(a, "CHERRY", { compareFn: cmp })).toBe(2);
    expect(searchsorted(a, "CHERRY", { side: "right", compareFn: cmp })).toBe(3);
  });
});

// ─── searchsortedMany ─────────────────────────────────────────────────────────

describe("searchsortedMany", () => {
  const a = [10, 20, 30, 40, 50] as const;

  it("maps multiple values to insertion indices", () => {
    expect(searchsortedMany(a, [15, 25, 35])).toEqual([1, 2, 3]);
    expect(searchsortedMany(a, [10, 30, 50])).toEqual([0, 2, 4]);
    expect(searchsortedMany(a, [10, 30, 50], { side: "right" })).toEqual([1, 3, 5]);
  });

  it("empty query array returns empty result", () => {
    expect(searchsortedMany(a, [])).toEqual([]);
  });

  it("handles out-of-range values", () => {
    expect(searchsortedMany(a, [0, 5, 55, 100])).toEqual([0, 0, 5, 5]);
  });

  it("with sorter: matches sorted-copy result", () => {
    const unsorted = [50, 10, 30, 20, 40];
    const sorted = [10, 20, 30, 40, 50];
    const sorter = argsortScalars(unsorted);
    const vs = [15, 25, 35, 45];
    expect(searchsortedMany(unsorted, vs, { sorter })).toEqual(searchsortedMany(sorted, vs));
  });
});

// ─── argsortScalars ───────────────────────────────────────────────────────────

describe("argsortScalars", () => {
  it("returns identity permutation on sorted array", () => {
    expect(argsortScalars([1, 2, 3, 4])).toEqual([0, 1, 2, 3]);
  });

  it("correctly sorts reversed array", () => {
    const a = [4, 3, 2, 1];
    const sorter = argsortScalars(a);
    expect(sorter.map((i) => a[i])).toEqual([1, 2, 3, 4]);
  });

  it("stable: equal elements preserve original order", () => {
    const a = [2, 1, 2, 1];
    const sorter = argsortScalars(a);
    const sorted = sorter.map((i) => a[i]);
    expect(sorted).toEqual([1, 1, 2, 2]);
  });

  it("handles strings", () => {
    const a = ["cherry", "apple", "banana"];
    const sorter = argsortScalars(a);
    expect(sorter.map((i) => a[i])).toEqual(["apple", "banana", "cherry"]);
  });

  it("empty array → empty permutation", () => {
    expect(argsortScalars([])).toEqual([]);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("searchsorted — property: insertion maintains sorted order", () => {
  it("inserting at returned index keeps array sorted (numbers)", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.double({ noNaN: true }), { minLength: 0, maxLength: 20 })
          .map((arr) => [...arr].sort((a, b) => a - b)),
        fc.double({ noNaN: true }),
        fc.constantFrom("left" as const, "right" as const),
        (sorted, v, side) => {
          const idx = searchsorted(sorted, v, { side });
          const inserted = [...sorted.slice(0, idx), v, ...sorted.slice(idx)];
          // After insertion, array must still be sorted
          for (let i = 1; i < inserted.length; i++) {
            if ((inserted[i - 1] as number) > (inserted[i] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("left ≤ right for the same value (numbers)", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: -100, max: 100 }), {
            minLength: 0,
            maxLength: 30,
          })
          .map((arr) => [...arr].sort((a, b) => a - b)),
        fc.integer({ min: -110, max: 110 }),
        (sorted, v) => {
          const l = searchsorted(sorted, v, { side: "left" });
          const r = searchsorted(sorted, v, { side: "right" });
          return l <= r;
        },
      ),
    );
  });

  it("result is within [0, n]", () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.integer({ min: 0, max: 50 }), { minLength: 0, maxLength: 25 })
          .map((arr) => [...arr].sort((a, b) => a - b)),
        fc.integer({ min: -5, max: 55 }),
        (sorted, v) => {
          const idx = searchsorted(sorted, v);
          return idx >= 0 && idx <= sorted.length;
        },
      ),
    );
  });

  it("sorter result matches pre-sorted result", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: -60, max: 60 }),
        fc.constantFrom("left" as const, "right" as const),
        (arr, v, side) => {
          const sorted = [...arr].sort((a, b) => a - b);
          const sorter = argsortScalars(arr);
          return searchsorted(arr, v, { side, sorter }) === searchsorted(sorted, v, { side });
        },
      ),
    );
  });
});
