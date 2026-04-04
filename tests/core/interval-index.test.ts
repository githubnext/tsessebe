/**
 * Tests for Interval, IntervalIndex, and intervalRange.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { Interval, IntervalIndex, intervalRange } from "../../src/index.ts";
import type { IntervalClosed } from "../../src/index.ts";

// ─── Interval construction ────────────────────────────────────────────────────

describe("Interval construction", () => {
  test("default closed is right", () => {
    const iv = new Interval(0, 1);
    expect(iv.closed).toBe("right");
  });

  test("stores left and right", () => {
    const iv = new Interval(2, 5, "left");
    expect(iv.left).toBe(2);
    expect(iv.right).toBe(5);
  });

  test("closed=both", () => {
    const iv = new Interval(0, 10, "both");
    expect(iv.closed).toBe("both");
  });

  test("closed=neither", () => {
    const iv = new Interval(0, 10, "neither");
    expect(iv.closed).toBe("neither");
  });

  test("left === right is allowed (degenerate interval)", () => {
    const iv = new Interval(5, 5, "both");
    expect(iv.length).toBe(0);
  });

  test("throws when left > right", () => {
    expect(() => new Interval(3, 1)).toThrow(RangeError);
  });
});

// ─── Interval properties ──────────────────────────────────────────────────────

describe("Interval properties", () => {
  test("mid is average of left and right", () => {
    expect(new Interval(0, 4).mid).toBe(2);
    expect(new Interval(1, 3).mid).toBe(2);
    expect(new Interval(-1, 1).mid).toBe(0);
  });

  test("length is right - left", () => {
    expect(new Interval(0, 5).length).toBe(5);
    expect(new Interval(-2, 3).length).toBe(5);
  });

  test("isOpen is true only for neither", () => {
    expect(new Interval(0, 1, "neither").isOpen).toBe(true);
    expect(new Interval(0, 1, "left").isOpen).toBe(false);
    expect(new Interval(0, 1, "right").isOpen).toBe(false);
    expect(new Interval(0, 1, "both").isOpen).toBe(false);
  });

  test("isClosed is true only for both", () => {
    expect(new Interval(0, 1, "both").isClosed).toBe(true);
    expect(new Interval(0, 1, "left").isClosed).toBe(false);
    expect(new Interval(0, 1, "right").isClosed).toBe(false);
    expect(new Interval(0, 1, "neither").isClosed).toBe(false);
  });
});

// ─── Interval.contains ────────────────────────────────────────────────────────

describe("Interval.contains", () => {
  test("right-closed: interior point", () => {
    expect(new Interval(0, 1, "right").contains(0.5)).toBe(true);
  });

  test("right-closed: left endpoint excluded", () => {
    expect(new Interval(0, 1, "right").contains(0)).toBe(false);
  });

  test("right-closed: right endpoint included", () => {
    expect(new Interval(0, 1, "right").contains(1)).toBe(true);
  });

  test("left-closed: left endpoint included", () => {
    expect(new Interval(0, 1, "left").contains(0)).toBe(true);
  });

  test("left-closed: right endpoint excluded", () => {
    expect(new Interval(0, 1, "left").contains(1)).toBe(false);
  });

  test("both: both endpoints included", () => {
    const iv = new Interval(0, 1, "both");
    expect(iv.contains(0)).toBe(true);
    expect(iv.contains(1)).toBe(true);
  });

  test("neither: both endpoints excluded", () => {
    const iv = new Interval(0, 1, "neither");
    expect(iv.contains(0)).toBe(false);
    expect(iv.contains(1)).toBe(false);
    expect(iv.contains(0.5)).toBe(true);
  });

  test("outside range returns false", () => {
    expect(new Interval(0, 1).contains(-1)).toBe(false);
    expect(new Interval(0, 1).contains(2)).toBe(false);
  });
});

// ─── Interval.overlaps ────────────────────────────────────────────────────────

describe("Interval.overlaps", () => {
  test("clearly overlapping intervals", () => {
    const a = new Interval(0, 2);
    const b = new Interval(1, 3);
    expect(a.overlaps(b)).toBe(true);
    expect(b.overlaps(a)).toBe(true);
  });

  test("non-overlapping intervals", () => {
    const a = new Interval(0, 1);
    const b = new Interval(2, 3);
    expect(a.overlaps(b)).toBe(false);
  });

  test("touching at endpoint, right+left closed — overlap", () => {
    const a = new Interval(0, 1, "right"); // (0, 1]
    const b = new Interval(1, 2, "left"); // [1, 2)
    expect(a.overlaps(b)).toBe(true);
  });

  test("touching at endpoint, both open — no overlap", () => {
    const a = new Interval(0, 1, "left"); // [0, 1)
    const b = new Interval(1, 2, "right"); // (1, 2]
    expect(a.overlaps(b)).toBe(false);
  });

  test("same interval always overlaps itself", () => {
    const iv = new Interval(1, 3, "both");
    expect(iv.overlaps(iv)).toBe(true);
  });

  test("nested interval", () => {
    const outer = new Interval(0, 10);
    const inner = new Interval(3, 7);
    expect(outer.overlaps(inner)).toBe(true);
  });
});

// ─── Interval.toString ────────────────────────────────────────────────────────

describe("Interval.toString", () => {
  test("right-closed → (left, right]", () => {
    expect(new Interval(0, 1, "right").toString()).toBe("(0, 1]");
  });

  test("left-closed → [left, right)", () => {
    expect(new Interval(0, 1, "left").toString()).toBe("[0, 1)");
  });

  test("both → [left, right]", () => {
    expect(new Interval(0, 1, "both").toString()).toBe("[0, 1]");
  });

  test("neither → (left, right)", () => {
    expect(new Interval(0, 1, "neither").toString()).toBe("(0, 1)");
  });

  test("decimal values", () => {
    expect(new Interval(0.5, 1.5, "right").toString()).toBe("(0.5, 1.5]");
  });

  test("negative values", () => {
    expect(new Interval(-3, -1, "right").toString()).toBe("(-3, -1]");
  });
});

// ─── Interval.equals ─────────────────────────────────────────────────────────

describe("Interval.equals", () => {
  test("same interval is equal", () => {
    const a = new Interval(0, 1, "right");
    const b = new Interval(0, 1, "right");
    expect(a.equals(b)).toBe(true);
  });

  test("different closed not equal", () => {
    expect(new Interval(0, 1, "left").equals(new Interval(0, 1, "right"))).toBe(false);
  });

  test("different endpoints not equal", () => {
    expect(new Interval(0, 2).equals(new Interval(0, 1))).toBe(false);
  });
});

// ─── IntervalIndex.fromBreaks ─────────────────────────────────────────────────

describe("IntervalIndex.fromBreaks", () => {
  test("creates n-1 intervals from n breaks", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
    expect(idx.size).toBe(3);
  });

  test("correct left/right endpoints", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    expect(idx.left).toEqual([0, 1]);
    expect(idx.right).toEqual([1, 2]);
  });

  test("default closed is right", () => {
    expect(IntervalIndex.fromBreaks([0, 1]).closed).toBe("right");
  });

  test("respects closed parameter", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2], "left");
    expect(idx.closed).toBe("left");
  });

  test("empty result from single break", () => {
    expect(IntervalIndex.fromBreaks([0]).size).toBe(0);
  });

  test("empty result from empty array", () => {
    expect(IntervalIndex.fromBreaks([]).size).toBe(0);
  });
});

// ─── IntervalIndex.fromArrays ─────────────────────────────────────────────────

describe("IntervalIndex.fromArrays", () => {
  test("builds from lefts and rights", () => {
    const idx = IntervalIndex.fromArrays([0, 1, 2], [1, 2, 3]);
    expect(idx.size).toBe(3);
    expect(idx.left).toEqual([0, 1, 2]);
    expect(idx.right).toEqual([1, 2, 3]);
  });

  test("throws on mismatched lengths", () => {
    expect(() => IntervalIndex.fromArrays([0, 1], [1])).toThrow(RangeError);
  });
});

// ─── IntervalIndex.fromIntervals ──────────────────────────────────────────────

describe("IntervalIndex.fromIntervals", () => {
  test("builds from Interval array", () => {
    const ivs = [new Interval(0, 1), new Interval(1, 2), new Interval(2, 3)];
    const idx = IntervalIndex.fromIntervals(ivs);
    expect(idx.size).toBe(3);
  });

  test("inherits closed from first interval", () => {
    const ivs = [new Interval(0, 1, "both"), new Interval(1, 2, "both")];
    expect(IntervalIndex.fromIntervals(ivs).closed).toBe("both");
  });

  test("empty array", () => {
    expect(IntervalIndex.fromIntervals([]).size).toBe(0);
  });
});

// ─── IntervalIndex properties ─────────────────────────────────────────────────

describe("IntervalIndex properties", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

  test("mid values", () => {
    expect(idx.mid).toEqual([0.5, 1.5, 2.5]);
  });

  test("length values", () => {
    expect(idx.length).toEqual([1, 1, 1]);
  });

  test("isEmpty false for non-empty", () => {
    expect(idx.isEmpty).toBe(false);
  });

  test("isEmpty true for empty", () => {
    expect(IntervalIndex.fromBreaks([]).isEmpty).toBe(true);
  });
});

// ─── IntervalIndex.get ────────────────────────────────────────────────────────

describe("IntervalIndex.get", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2]);

  test("returns correct interval", () => {
    expect(idx.get(0).left).toBe(0);
    expect(idx.get(0).right).toBe(1);
    expect(idx.get(1).left).toBe(1);
  });

  test("throws on out-of-range", () => {
    expect(() => idx.get(5)).toThrow(RangeError);
    expect(() => idx.get(-1)).toThrow(RangeError);
  });
});

// ─── IntervalIndex.contains ───────────────────────────────────────────────────

describe("IntervalIndex.contains", () => {
  test("interior of one interval", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
    expect(idx.contains(1.5)).toEqual([false, true, false]);
  });

  test("right boundary (right-closed)", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    expect(idx.contains(1)).toEqual([true, false]);
  });

  test("left boundary (left-closed)", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2], "left");
    expect(idx.contains(1)).toEqual([false, true]);
  });

  test("outside all intervals", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    expect(idx.contains(5)).toEqual([false, false]);
  });

  test("negative values", () => {
    const idx = IntervalIndex.fromBreaks([-2, -1, 0]);
    expect(idx.contains(-1.5)).toEqual([true, false]);
  });
});

// ─── IntervalIndex.overlaps ───────────────────────────────────────────────────

describe("IntervalIndex.overlaps", () => {
  test("overlapping query interval", () => {
    const idx = IntervalIndex.fromBreaks([0, 2, 4, 6]);
    const query = new Interval(1, 3);
    expect(idx.overlaps(query)).toEqual([true, true, false]);
  });

  test("non-overlapping query", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    const query = new Interval(5, 6);
    expect(idx.overlaps(query)).toEqual([false, false]);
  });
});

// ─── IntervalIndex.setClosed ──────────────────────────────────────────────────

describe("IntervalIndex.setClosed", () => {
  test("changes closed of all intervals", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2], "right");
    const newIdx = idx.setClosed("both");
    expect(newIdx.closed).toBe("both");
    expect(newIdx.get(0).closed).toBe("both");
  });

  test("original is not mutated", () => {
    const idx = IntervalIndex.fromBreaks([0, 1], "right");
    idx.setClosed("left");
    expect(idx.closed).toBe("right");
  });
});

// ─── IntervalIndex.toString ───────────────────────────────────────────────────

describe("IntervalIndex.toString", () => {
  test("contains interval strings and closed", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2], "right");
    const s = idx.toString();
    expect(s).toContain("(0, 1]");
    expect(s).toContain("(1, 2]");
    expect(s).toContain('closed="right"');
  });
});

// ─── IntervalIndex.equals ─────────────────────────────────────────────────────

describe("IntervalIndex.equals", () => {
  test("equal indices", () => {
    const a = IntervalIndex.fromBreaks([0, 1, 2]);
    const b = IntervalIndex.fromBreaks([0, 1, 2]);
    expect(a.equals(b)).toBe(true);
  });

  test("different sizes not equal", () => {
    const a = IntervalIndex.fromBreaks([0, 1, 2]);
    const b = IntervalIndex.fromBreaks([0, 1]);
    expect(a.equals(b)).toBe(false);
  });

  test("same size but different intervals not equal", () => {
    const a = IntervalIndex.fromBreaks([0, 1]);
    const b = IntervalIndex.fromBreaks([0, 2]);
    expect(a.equals(b)).toBe(false);
  });
});

// ─── IntervalIndex iteration ──────────────────────────────────────────────────

describe("IntervalIndex iteration", () => {
  test("Symbol.iterator yields all intervals", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
    const collected: Interval[] = [];
    for (const iv of idx) {
      collected.push(iv);
    }
    expect(collected).toHaveLength(3);
    expect(collected[0]?.left).toBe(0);
    expect(collected[2]?.right).toBe(3);
  });
});

// ─── IntervalIndex.toArray ────────────────────────────────────────────────────

describe("IntervalIndex.toArray", () => {
  test("returns a copy of intervals", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    const arr = idx.toArray();
    expect(arr).toHaveLength(2);
    expect(arr[0]).toBeInstanceOf(Interval);
  });
});

// ─── intervalRange ────────────────────────────────────────────────────────────

describe("intervalRange — periods", () => {
  test("4 equal intervals", () => {
    const idx = intervalRange(0, 4, { periods: 4 });
    expect(idx.size).toBe(4);
    expect(idx.left).toEqual([0, 1, 2, 3]);
    expect(idx.right).toEqual([1, 2, 3, 4]);
  });

  test("default closed is right", () => {
    expect(intervalRange(0, 4, { periods: 4 }).closed).toBe("right");
  });

  test("closed override", () => {
    expect(intervalRange(0, 4, { periods: 4, closed: "left" }).closed).toBe("left");
  });

  test("right endpoint of last interval equals end", () => {
    const idx = intervalRange(0, 10, { periods: 5 });
    expect(idx.right[idx.size - 1]).toBe(10);
  });

  test("single period", () => {
    const idx = intervalRange(2, 5, { periods: 1 });
    expect(idx.size).toBe(1);
    expect(idx.get(0).left).toBe(2);
    expect(idx.get(0).right).toBe(5);
  });
});

describe("intervalRange — freq", () => {
  test("step of 2 over range 0-6", () => {
    const idx = intervalRange(0, 6, { freq: 2 });
    expect(idx.size).toBe(3);
    expect(idx.left).toEqual([0, 2, 4]);
    expect(idx.right).toEqual([2, 4, 6]);
  });

  test("decimal freq", () => {
    const idx = intervalRange(0, 1, { freq: 0.25 });
    expect(idx.size).toBe(4);
  });
});

describe("intervalRange — errors", () => {
  test("throws when neither periods nor freq given", () => {
    expect(() => intervalRange(0, 4, {})).toThrow(TypeError);
  });

  test("throws when both periods and freq given", () => {
    expect(() => intervalRange(0, 4, { periods: 4, freq: 1 })).toThrow(TypeError);
  });

  test("throws on non-positive freq", () => {
    expect(() => intervalRange(0, 4, { freq: -1 })).toThrow(RangeError);
    expect(() => intervalRange(0, 4, { freq: 0 })).toThrow(RangeError);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("Interval property-based tests", () => {
  test("mid is always in [left, right]", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 999, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (left, delta) => {
          const right = left + delta;
          const iv = new Interval(left, right, "both");
          return iv.mid >= iv.left && iv.mid <= iv.right;
        },
      ),
    );
  });

  test("length is non-negative", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 999, noNaN: true }),
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (left, delta) => {
          const iv = new Interval(left, left + delta);
          return iv.length >= 0;
        },
      ),
    );
  });

  test("contains is consistent with closed for boundaries", () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 999, noNaN: true }),
        fc.float({ min: 0.001, max: 1000, noNaN: true }),
        fc.constantFrom<IntervalClosed>("left", "right", "both", "neither"),
        (left, delta, closed) => {
          const right = left + delta;
          const iv = new Interval(left, right, closed);
          const leftOk = iv.contains(left) === (closed === "left" || closed === "both");
          const rightOk = iv.contains(right) === (closed === "right" || closed === "both");
          return leftOk && rightOk;
        },
      ),
    );
  });
});
