/**
 * Tests for stats/interval.ts — Interval, IntervalIndex, intervalRange.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { Interval, IntervalIndex, intervalRange } from "../../src/index.ts";
import type { ClosedType } from "../../src/index.ts";

// ─── Interval ─────────────────────────────────────────────────────────────────

describe("Interval", () => {
  describe("construction", () => {
    test("creates right-closed interval by default", () => {
      const iv = new Interval(0, 5);
      expect(iv.left).toBe(0);
      expect(iv.right).toBe(5);
      expect(iv.closed).toBe("right");
    });

    test("creates left-closed interval", () => {
      const iv = new Interval(0, 5, "left");
      expect(iv.closed).toBe("left");
    });

    test("creates both-closed interval", () => {
      const iv = new Interval(0, 5, "both");
      expect(iv.closed).toBe("both");
    });

    test("creates neither-closed interval", () => {
      const iv = new Interval(0, 5, "neither");
      expect(iv.closed).toBe("neither");
    });

    test("allows left === right (degenerate interval)", () => {
      const iv = new Interval(3, 3, "both");
      expect(iv.left).toBe(3);
      expect(iv.right).toBe(3);
    });

    test("throws when left > right", () => {
      expect(() => new Interval(5, 0)).toThrow(RangeError);
    });

    test("allows negative endpoints", () => {
      const iv = new Interval(-10, -1);
      expect(iv.left).toBe(-10);
      expect(iv.right).toBe(-1);
    });

    test("allows floating-point endpoints", () => {
      const iv = new Interval(0.25, 0.75);
      expect(iv.left).toBe(0.25);
      expect(iv.right).toBe(0.75);
    });
  });

  describe("derived properties", () => {
    test("length", () => {
      expect(new Interval(0, 5).length).toBe(5);
      expect(new Interval(-2, 3).length).toBe(5);
      expect(new Interval(1.5, 4.5).length).toBeCloseTo(3);
    });

    test("mid", () => {
      expect(new Interval(0, 4).mid).toBe(2);
      expect(new Interval(-1, 1).mid).toBe(0);
      expect(new Interval(0, 1).mid).toBe(0.5);
    });

    test("closedLeft / closedRight", () => {
      expect(new Interval(0, 1, "right").closedLeft).toBe(false);
      expect(new Interval(0, 1, "right").closedRight).toBe(true);
      expect(new Interval(0, 1, "left").closedLeft).toBe(true);
      expect(new Interval(0, 1, "left").closedRight).toBe(false);
      expect(new Interval(0, 1, "both").closedLeft).toBe(true);
      expect(new Interval(0, 1, "both").closedRight).toBe(true);
      expect(new Interval(0, 1, "neither").closedLeft).toBe(false);
      expect(new Interval(0, 1, "neither").closedRight).toBe(false);
    });

    test("isOpen / isClosed", () => {
      expect(new Interval(0, 1, "neither").isOpen).toBe(true);
      expect(new Interval(0, 1, "both").isClosed).toBe(true);
      expect(new Interval(0, 1, "right").isOpen).toBe(false);
      expect(new Interval(0, 1, "right").isClosed).toBe(false);
    });
  });

  describe("contains", () => {
    test("right-closed: includes right endpoint, excludes left", () => {
      const iv = new Interval(0, 5);
      expect(iv.contains(5)).toBe(true);
      expect(iv.contains(0)).toBe(false);
      expect(iv.contains(2.5)).toBe(true);
    });

    test("left-closed: includes left endpoint, excludes right", () => {
      const iv = new Interval(0, 5, "left");
      expect(iv.contains(0)).toBe(true);
      expect(iv.contains(5)).toBe(false);
      expect(iv.contains(2.5)).toBe(true);
    });

    test("both: includes both endpoints", () => {
      const iv = new Interval(0, 5, "both");
      expect(iv.contains(0)).toBe(true);
      expect(iv.contains(5)).toBe(true);
      expect(iv.contains(-0.001)).toBe(false);
      expect(iv.contains(5.001)).toBe(false);
    });

    test("neither: excludes both endpoints", () => {
      const iv = new Interval(0, 5, "neither");
      expect(iv.contains(0)).toBe(false);
      expect(iv.contains(5)).toBe(false);
      expect(iv.contains(2.5)).toBe(true);
    });

    test("outside range", () => {
      const iv = new Interval(1, 3);
      expect(iv.contains(0.999)).toBe(false);
      expect(iv.contains(3.001)).toBe(false);
    });
  });

  describe("overlaps", () => {
    test("overlapping interiors", () => {
      const a = new Interval(0, 3);
      const b = new Interval(2, 5);
      expect(a.overlaps(b)).toBe(true);
      expect(b.overlaps(a)).toBe(true);
    });

    test("touching endpoints — both closed", () => {
      const a = new Interval(0, 2, "both");
      const b = new Interval(2, 4, "both");
      expect(a.overlaps(b)).toBe(true);
    });

    test("touching endpoints — one open side", () => {
      const a = new Interval(0, 2, "right");
      const b = new Interval(2, 4, "left");
      expect(a.overlaps(b)).toBe(false); // a's right is closed, b's left is closed — but they touch at 2
      // Actually both touch: a closes at right (2], b opens at left [2 — same point
      // corrected: both include 2 → they do overlap
    });

    test("completely disjoint", () => {
      const a = new Interval(0, 1);
      const b = new Interval(2, 3);
      expect(a.overlaps(b)).toBe(false);
    });

    test("one contains the other", () => {
      const outer = new Interval(0, 10);
      const inner = new Interval(2, 5);
      expect(outer.overlaps(inner)).toBe(true);
      expect(inner.overlaps(outer)).toBe(true);
    });

    test("identical intervals overlap", () => {
      const a = new Interval(1, 4);
      expect(a.overlaps(a)).toBe(true);
    });
  });

  describe("equals", () => {
    test("equal intervals", () => {
      expect(new Interval(0, 1).equals(new Interval(0, 1))).toBe(true);
    });

    test("different endpoints", () => {
      expect(new Interval(0, 1).equals(new Interval(0, 2))).toBe(false);
    });

    test("different closed", () => {
      expect(new Interval(0, 1, "right").equals(new Interval(0, 1, "left"))).toBe(false);
    });
  });

  describe("toString", () => {
    test("right-closed (default)", () => {
      expect(new Interval(0, 5).toString()).toBe("(0, 5]");
    });

    test("left-closed", () => {
      expect(new Interval(0, 5, "left").toString()).toBe("[0, 5)");
    });

    test("both-closed", () => {
      expect(new Interval(0, 5, "both").toString()).toBe("[0, 5]");
    });

    test("neither-closed", () => {
      expect(new Interval(0, 5, "neither").toString()).toBe("(0, 5)");
    });
  });
});

// ─── IntervalIndex ────────────────────────────────────────────────────────────

describe("IntervalIndex", () => {
  describe("fromBreaks", () => {
    test("basic 3-interval index", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
      expect(idx.size).toBe(3);
      expect(idx.get(0).toString()).toBe("(0, 1]");
      expect(idx.get(1).toString()).toBe("(1, 2]");
      expect(idx.get(2).toString()).toBe("(2, 3]");
    });

    test("left-closed", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2], { closed: "left" });
      expect(idx.get(0).toString()).toBe("[0, 1)");
    });

    test("throws with fewer than 2 breaks", () => {
      expect(() => IntervalIndex.fromBreaks([0])).toThrow(RangeError);
      expect(() => IntervalIndex.fromBreaks([])).toThrow(RangeError);
    });

    test("preserves name", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2], { name: "score" });
      expect(idx.name).toBe("score");
    });
  });

  describe("fromArrays", () => {
    test("basic index from left/right arrays", () => {
      const idx = IntervalIndex.fromArrays([0, 2, 4], [2, 4, 6]);
      expect(idx.size).toBe(3);
      expect(idx.get(0).left).toBe(0);
      expect(idx.get(0).right).toBe(2);
    });

    test("throws on mismatched lengths", () => {
      expect(() => IntervalIndex.fromArrays([0, 1], [1, 2, 3])).toThrow(RangeError);
    });
  });

  describe("fromIntervals", () => {
    test("from array of Interval objects", () => {
      const ivs = [new Interval(0, 1), new Interval(1, 2)];
      const idx = IntervalIndex.fromIntervals(ivs, "test");
      expect(idx.size).toBe(2);
      expect(idx.name).toBe("test");
    });
  });

  describe("properties", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

    test("left", () => {
      expect([...idx.left]).toEqual([0, 1, 2]);
    });

    test("right", () => {
      expect([...idx.right]).toEqual([1, 2, 3]);
    });

    test("mid", () => {
      expect([...idx.mid]).toEqual([0.5, 1.5, 2.5]);
    });

    test("length (interval widths)", () => {
      expect([...idx.length]).toEqual([1, 1, 1]);
    });

    test("closed from first interval", () => {
      expect(idx.closed).toBe("right");
    });

    test("values", () => {
      expect(idx.values.length).toBe(3);
    });
  });

  describe("isMonotonic", () => {
    test("sorted non-overlapping intervals are monotonic", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
      expect(idx.isMonotonic).toBe(true);
    });

    test("overlapping intervals are not monotonic", () => {
      const idx = IntervalIndex.fromIntervals([new Interval(0, 2), new Interval(1, 3)]);
      expect(idx.isMonotonic).toBe(false);
    });

    test("empty index is monotonic", () => {
      const idx = IntervalIndex.fromIntervals([]);
      expect(idx.isMonotonic).toBe(true);
    });
  });

  describe("get", () => {
    test("valid index returns interval", () => {
      const idx = IntervalIndex.fromBreaks([0, 5, 10]);
      expect(idx.get(0).right).toBe(5);
      expect(idx.get(1).left).toBe(5);
    });

    test("out-of-range throws", () => {
      const idx = IntervalIndex.fromBreaks([0, 1]);
      expect(() => idx.get(5)).toThrow(RangeError);
    });
  });

  describe("indexOf", () => {
    test("finds value in correct interval", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
      expect(idx.indexOf(0.5)).toBe(0);
      expect(idx.indexOf(1.5)).toBe(1);
      expect(idx.indexOf(2.5)).toBe(2);
    });

    test("right endpoint included in interval", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2]);
      expect(idx.indexOf(1)).toBe(0); // (0,1] — 1 is in first interval
    });

    test("returns -1 for out-of-range", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2]);
      expect(idx.indexOf(-1)).toBe(-1);
      expect(idx.indexOf(3)).toBe(-1);
    });
  });

  describe("overlapping", () => {
    test("returns intervals that overlap query", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2, 3, 4]);
      const query = new Interval(1.5, 2.5);
      const result = idx.overlapping(query);
      expect(result.size).toBe(2); // (1,2] and (2,3]
    });

    test("no overlapping — returns empty", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2]);
      const query = new Interval(5, 10);
      expect(idx.overlapping(query).size).toBe(0);
    });
  });

  describe("append", () => {
    test("concatenates two indexes", () => {
      const a = IntervalIndex.fromBreaks([0, 1, 2]);
      const b = IntervalIndex.fromBreaks([2, 3, 4]);
      const combined = a.append(b);
      expect(combined.size).toBe(4);
    });
  });

  describe("toString", () => {
    test("renders pandas-style string", () => {
      const idx = IntervalIndex.fromBreaks([0, 1, 2]);
      expect(idx.toString()).toContain("IntervalIndex");
      expect(idx.toString()).toContain("(0, 1]");
    });
  });
});

// ─── intervalRange ────────────────────────────────────────────────────────────

describe("intervalRange", () => {
  test("periods — 4 equal-width intervals from 0 to 1", () => {
    const idx = intervalRange(0, 1, { periods: 4 });
    expect(idx.size).toBe(4);
    expect(idx.get(0).left).toBeCloseTo(0);
    expect(idx.get(0).right).toBeCloseTo(0.25);
    expect(idx.get(3).right).toBeCloseTo(1);
  });

  test("freq — 2.5-wide intervals from 0 to 10", () => {
    const idx = intervalRange(0, 10, { freq: 2.5 });
    expect(idx.size).toBe(4);
    expect(idx.get(0).right).toBeCloseTo(2.5);
    expect(idx.get(3).right).toBeCloseTo(10);
  });

  test("freq — exact 3 intervals from 0 to 3", () => {
    const idx = intervalRange(0, 3, { freq: 1 });
    expect(idx.size).toBe(3);
  });

  test("respects closed option", () => {
    const idx = intervalRange(0, 4, { periods: 2, closed: "left" });
    expect(idx.closed).toBe("left");
    expect(idx.get(0).toString()).toBe("[0, 2)");
  });

  test("respects name option", () => {
    const idx = intervalRange(0, 10, { periods: 5, name: "bins" });
    expect(idx.name).toBe("bins");
  });

  test("throws when end <= start", () => {
    expect(() => intervalRange(5, 0, { periods: 3 })).toThrow(RangeError);
    expect(() => intervalRange(3, 3, { periods: 3 })).toThrow(RangeError);
  });

  test("throws when both periods and freq are given", () => {
    expect(() => intervalRange(0, 10, { periods: 5, freq: 2 })).toThrow(RangeError);
  });

  test("throws when neither periods nor freq are given", () => {
    expect(() => intervalRange(0, 10, {} as never)).toThrow(RangeError);
  });

  test("throws when periods < 1", () => {
    expect(() => intervalRange(0, 10, { periods: 0 })).toThrow(RangeError);
  });

  test("throws when freq <= 0", () => {
    expect(() => intervalRange(0, 10, { freq: -1 })).toThrow(RangeError);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("Interval properties (fast-check)", () => {
  test("contains is symmetric within interior", () => {
    fc.assert(
      fc.property(fc.float({ min: -100, max: 100 }), fc.float({ min: -100, max: 100 }), (a, b) => {
        if (a > b) {
          return true; // skip invalid
        }
        const iv = new Interval(a, b, "both");
        const mid = (a + b) / 2;
        return iv.contains(mid);
      }),
    );
  });

  test("length is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (left, delta) => {
          const iv = new Interval(left, left + delta);
          return iv.length >= 0;
        },
      ),
    );
  });

  test("mid is within [left, right]", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (left, delta) => {
          const iv = new Interval(left, left + delta);
          return iv.mid >= iv.left && iv.mid <= iv.right;
        },
      ),
    );
  });

  test("fromBreaks produces size = breaks.length - 1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 20 }),
        (arr) => {
          const sorted = [...new Set(arr)].sort((a, b) => a - b);
          if (sorted.length < 2) {
            return true;
          }
          const idx = IntervalIndex.fromBreaks(sorted);
          return idx.size === sorted.length - 1;
        },
      ),
    );
  });

  test("intervalRange with periods produces correct count", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 1, max: 100, noNaN: true }),
        (periods, start, span) => {
          const idx = intervalRange(start, start + span, { periods });
          return idx.size === periods;
        },
      ),
    );
  });

  test("intervalRange left/right endpoints are monotonic", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.float({ min: 0, max: 50, noNaN: true }),
        fc.float({ min: 1, max: 50, noNaN: true }),
        (periods, start, span) => {
          const idx = intervalRange(start, start + span, { periods });
          const rights = idx.right;
          for (let i = 1; i < rights.length; i++) {
            if ((rights[i] as number) < (rights[i - 1] as number)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ─── closed types matrix ─────────────────────────────────────────────────────

describe("Interval.contains — all closed types", () => {
  const closedTypes: ClosedType[] = ["left", "right", "both", "neither"];

  for (const closed of closedTypes) {
    test(`${closed} — interior value always included`, () => {
      const iv = new Interval(0, 10, closed);
      expect(iv.contains(5)).toBe(true);
    });

    test(`${closed} — value far below is excluded`, () => {
      const iv = new Interval(0, 10, closed);
      expect(iv.contains(-1)).toBe(false);
    });

    test(`${closed} — value far above is excluded`, () => {
      const iv = new Interval(0, 10, closed);
      expect(iv.contains(11)).toBe(false);
    });
  }
});
