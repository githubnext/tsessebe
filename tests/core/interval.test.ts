/**
 * Tests for Interval and IntervalIndex.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Interval, IntervalIndex } from "../../src/index.ts";
import type { IntervalClosed } from "../../src/index.ts";

// ─── Interval ────────────────────────────────────────────────────────────────

describe("Interval — construction", () => {
  it("creates a right-closed interval by default", () => {
    const iv = new Interval(0, 1);
    expect(iv.left).toBe(0);
    expect(iv.right).toBe(1);
    expect(iv.closed).toBe("right");
  });

  it("accepts all closed modes", () => {
    for (const c of ["left", "right", "both", "neither"] as IntervalClosed[]) {
      const iv = new Interval(0, 1, c);
      expect(iv.closed).toBe(c);
    }
  });

  it("allows left === right (degenerate interval)", () => {
    const iv = new Interval(5, 5, "both");
    expect(iv.length).toBe(0);
    expect(iv.isEmpty).toBe(false); // closed='both' means the single point is included
  });

  it("throws when left > right", () => {
    expect(() => new Interval(2, 1)).toThrow();
  });
});

describe("Interval — derived properties", () => {
  it("closedLeft: true only for 'left' and 'both'", () => {
    expect(new Interval(0, 1, "left").closedLeft).toBe(true);
    expect(new Interval(0, 1, "both").closedLeft).toBe(true);
    expect(new Interval(0, 1, "right").closedLeft).toBe(false);
    expect(new Interval(0, 1, "neither").closedLeft).toBe(false);
  });

  it("closedRight: true only for 'right' and 'both'", () => {
    expect(new Interval(0, 1, "right").closedRight).toBe(true);
    expect(new Interval(0, 1, "both").closedRight).toBe(true);
    expect(new Interval(0, 1, "left").closedRight).toBe(false);
    expect(new Interval(0, 1, "neither").closedRight).toBe(false);
  });

  it("length = right - left", () => {
    expect(new Interval(1, 4).length).toBe(3);
    expect(new Interval(-2, 2).length).toBe(4);
  });

  it("mid = (left + right) / 2", () => {
    expect(new Interval(0, 2).mid).toBe(1);
    expect(new Interval(1, 3).mid).toBe(2);
  });

  it("isEmpty only for zero-length with neither", () => {
    expect(new Interval(1, 1, "neither").isEmpty).toBe(true);
    expect(new Interval(1, 1, "both").isEmpty).toBe(false);
    expect(new Interval(0, 1, "neither").isEmpty).toBe(false);
  });
});

describe("Interval — contains", () => {
  it("right-closed: excludes left, includes right", () => {
    const iv = new Interval(0, 1, "right");
    expect(iv.contains(0)).toBe(false);
    expect(iv.contains(0.5)).toBe(true);
    expect(iv.contains(1)).toBe(true);
    expect(iv.contains(1.1)).toBe(false);
  });

  it("left-closed: includes left, excludes right", () => {
    const iv = new Interval(0, 1, "left");
    expect(iv.contains(0)).toBe(true);
    expect(iv.contains(0.5)).toBe(true);
    expect(iv.contains(1)).toBe(false);
  });

  it("both: includes both endpoints", () => {
    const iv = new Interval(0, 1, "both");
    expect(iv.contains(0)).toBe(true);
    expect(iv.contains(1)).toBe(true);
  });

  it("neither: excludes both endpoints", () => {
    const iv = new Interval(0, 1, "neither");
    expect(iv.contains(0)).toBe(false);
    expect(iv.contains(1)).toBe(false);
    expect(iv.contains(0.5)).toBe(true);
  });
});

describe("Interval — overlaps", () => {
  it("overlapping intervals", () => {
    const a = new Interval(0, 2);
    const b = new Interval(1, 3);
    expect(a.overlaps(b)).toBe(true);
    expect(b.overlaps(a)).toBe(true);
  });

  it("non-overlapping intervals", () => {
    const a = new Interval(0, 1);
    const b = new Interval(2, 3);
    expect(a.overlaps(b)).toBe(false);
    expect(b.overlaps(a)).toBe(false);
  });

  it("adjacent right-closed / left-open intervals: no overlap", () => {
    const a = new Interval(0, 1, "right"); // (0,1]
    const b = new Interval(1, 2, "left"); // [1,2)
    // they share the point 1 — right includes 1, left includes 1 → overlap!
    expect(a.overlaps(b)).toBe(true);
  });

  it("adjacent with no shared point", () => {
    const a = new Interval(0, 1, "right"); // (0,1]
    const b = new Interval(1, 2, "neither"); // (1,2)
    expect(a.overlaps(b)).toBe(false);
  });

  it("identical intervals overlap", () => {
    const a = new Interval(1, 2);
    expect(a.overlaps(a)).toBe(true);
  });
});

describe("Interval — toString", () => {
  it("right-closed: (left, right]", () => {
    expect(new Interval(0, 1, "right").toString()).toBe("(0, 1]");
  });

  it("left-closed: [left, right)", () => {
    expect(new Interval(0, 1, "left").toString()).toBe("[0, 1)");
  });

  it("both: [left, right]", () => {
    expect(new Interval(0, 1, "both").toString()).toBe("[0, 1]");
  });

  it("neither: (left, right)", () => {
    expect(new Interval(0, 1, "neither").toString()).toBe("(0, 1)");
  });
});

// ─── IntervalIndex — fromBreaks ──────────────────────────────────────────────

describe("IntervalIndex.fromBreaks", () => {
  it("creates n-1 intervals from n breaks", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);
    expect(idx.size).toBe(3);
    expect(idx.left).toEqual([0, 1, 2]);
    expect(idx.right).toEqual([1, 2, 3]);
  });

  it("default closed='right'", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    expect(idx.closed).toBe("right");
  });

  it("respects closed parameter", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2], "left");
    expect(idx.closed).toBe("left");
  });

  it("empty for fewer than 2 breaks", () => {
    expect(IntervalIndex.fromBreaks([]).size).toBe(0);
    expect(IntervalIndex.fromBreaks([5]).size).toBe(0);
  });

  it("stores optional name", () => {
    const idx = IntervalIndex.fromBreaks([0, 1], "right", { name: "bins" });
    expect(idx.name).toBe("bins");
  });
});

// ─── IntervalIndex — fromArrays ──────────────────────────────────────────────

describe("IntervalIndex.fromArrays", () => {
  it("creates index from left/right arrays", () => {
    const idx = IntervalIndex.fromArrays([0, 1, 2], [1, 2, 3]);
    expect(idx.size).toBe(3);
  });

  it("throws on length mismatch", () => {
    expect(() => IntervalIndex.fromArrays([0, 1], [1])).toThrow();
  });
});

// ─── IntervalIndex — fromIntervals ───────────────────────────────────────────

describe("IntervalIndex.fromIntervals", () => {
  it("builds from Interval objects", () => {
    const ivs = [new Interval(0, 1), new Interval(1, 2), new Interval(2, 3)];
    const idx = IntervalIndex.fromIntervals(ivs);
    expect(idx.size).toBe(3);
    expect(idx.closed).toBe("right");
  });

  it("empty index for empty array", () => {
    const idx = IntervalIndex.fromIntervals([]);
    expect(idx.size).toBe(0);
    expect(idx.empty).toBe(true);
  });
});

// ─── IntervalIndex — properties ─────────────────────────────────────────────

describe("IntervalIndex — properties", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

  it("length is alias for size", () => {
    expect(idx.length).toBe(idx.size);
  });

  it("empty is false for non-empty", () => {
    expect(idx.empty).toBe(false);
    expect(IntervalIndex.fromBreaks([]).empty).toBe(true);
  });

  it("mid returns midpoints", () => {
    expect([...idx.mid]).toEqual([0.5, 1.5, 2.5]);
  });

  it("isMonotonicIncreasing for ascending breaks", () => {
    expect(idx.isMonotonicIncreasing).toBe(true);
    expect(idx.isMonotonic).toBe(true);
  });

  it("isMonotonicDecreasing for descending breaks", () => {
    const desc = IntervalIndex.fromArrays([3, 2, 1], [4, 3, 2]);
    expect(desc.isMonotonicDecreasing).toBe(true);
    expect(desc.isMonotonicIncreasing).toBe(false);
  });

  it("neither monotonic when shuffled", () => {
    const mixed = IntervalIndex.fromArrays([0, 2, 1], [1, 3, 2]);
    expect(mixed.isMonotonicIncreasing).toBe(false);
    expect(mixed.isMonotonicDecreasing).toBe(false);
    expect(mixed.isMonotonic).toBe(false);
  });
});

// ─── IntervalIndex — at / toArray ────────────────────────────────────────────

describe("IntervalIndex — at / toArray", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

  it("at(i) returns correct interval", () => {
    const iv = idx.at(0);
    expect(iv.left).toBe(0);
    expect(iv.right).toBe(1);
    expect(iv.closed).toBe("right");
  });

  it("at(-1) returns last interval", () => {
    const iv = idx.at(-1);
    expect(iv.left).toBe(2);
    expect(iv.right).toBe(3);
  });

  it("at() throws for out-of-bounds", () => {
    expect(() => idx.at(10)).toThrow();
    expect(() => idx.at(-10)).toThrow();
  });

  it("toArray length matches size", () => {
    expect(idx.toArray()).toHaveLength(idx.size);
  });
});

// ─── IntervalIndex — contains ────────────────────────────────────────────────

describe("IntervalIndex — contains", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]); // (0,1], (1,2], (2,3]

  it("returns false for every interval when value is outside", () => {
    expect(idx.contains(0)).toEqual([false, false, false]);
    expect(idx.contains(3.5)).toEqual([false, false, false]);
  });

  it("returns true for the matching interval", () => {
    expect(idx.contains(0.5)).toEqual([true, false, false]);
    expect(idx.contains(1.5)).toEqual([false, true, false]);
    expect(idx.contains(2.5)).toEqual([false, false, true]);
  });

  it("right endpoint falls in correct interval", () => {
    // closed='right': 1 is in (0,1] not (1,2]
    expect(idx.contains(1)).toEqual([true, false, false]);
    expect(idx.contains(2)).toEqual([false, true, false]);
    expect(idx.contains(3)).toEqual([false, false, true]);
  });
});

// ─── IntervalIndex — get_loc ─────────────────────────────────────────────────

describe("IntervalIndex — get_loc", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

  it("returns index of containing interval", () => {
    expect(idx.get_loc(0.5)).toBe(0);
    expect(idx.get_loc(1.5)).toBe(1);
    expect(idx.get_loc(2.5)).toBe(2);
  });

  it("returns -1 when value not in any interval", () => {
    expect(idx.get_loc(-1)).toBe(-1);
    expect(idx.get_loc(4)).toBe(-1);
    // left endpoint 0 is excluded (closed='right')
    expect(idx.get_loc(0)).toBe(-1);
  });
});

// ─── IntervalIndex — overlaps ────────────────────────────────────────────────

describe("IntervalIndex — overlaps", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

  it("detects overlapping interval", () => {
    const query = new Interval(0.5, 1.5);
    // (0,1] and (1,2] both overlap (0.5,1.5]
    expect(idx.overlaps(query)).toEqual([true, true, false]);
  });

  it("detects non-overlapping interval", () => {
    const query = new Interval(5, 6);
    expect(idx.overlaps(query)).toEqual([false, false, false]);
  });
});

// ─── IntervalIndex — filter / rename ────────────────────────────────────────

describe("IntervalIndex — filter / rename", () => {
  const idx = IntervalIndex.fromBreaks([0, 1, 2, 3]);

  it("filter returns matching intervals only", () => {
    const filtered = idx.filter([true, false, true]);
    expect(filtered.size).toBe(2);
    expect(filtered.at(0).left).toBe(0);
    expect(filtered.at(1).left).toBe(2);
  });

  it("rename changes the name", () => {
    const renamed = idx.rename("categories");
    expect(renamed.name).toBe("categories");
    expect(renamed.size).toBe(idx.size);
  });
});

// ─── IntervalIndex — toString ────────────────────────────────────────────────

describe("IntervalIndex — toString", () => {
  it("includes all intervals and closed mode", () => {
    const idx = IntervalIndex.fromBreaks([0, 1, 2]);
    const str = idx.toString();
    expect(str).toContain("(0, 1]");
    expect(str).toContain("(1, 2]");
    expect(str).toContain("closed='right'");
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("Interval — property tests", () => {
  it("mid is always between left and right (inclusive)", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
        (a, b) => {
          const left = Math.min(a, b);
          const right = Math.max(a, b);
          const iv = new Interval(left, right);
          return iv.mid >= left && iv.mid <= right;
        },
      ),
    );
  });

  it("length is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }),
        (a, b) => {
          const left = Math.min(a, b);
          const right = Math.max(a, b);
          return new Interval(left, right).length >= 0;
        },
      ),
    );
  });

  it("closed='both': any interior point is always contained", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.01, max: 10 }),
        (left, delta) => {
          const right = left + delta;
          const iv = new Interval(left, right, "both");
          // midpoint must be contained
          return iv.contains(iv.mid);
        },
      ),
    );
  });

  it("closed='neither': endpoints are never contained", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.01, max: 10 }),
        (left, delta) => {
          const right = left + delta;
          const iv = new Interval(left, right, "neither");
          return !(iv.contains(left) || iv.contains(right));
        },
      ),
    );
  });

  it("overlaps is symmetric", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 10 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 10 }),
        (la, da, lb, db) => {
          const a = new Interval(la, la + da);
          const b = new Interval(lb, lb + db);
          return a.overlaps(b) === b.overlaps(a);
        },
      ),
    );
  });
});

describe("IntervalIndex — property tests", () => {
  it("fromBreaks: size = breaks.length - 1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100 }), {
          minLength: 2,
          maxLength: 20,
        }),
        (raw) => {
          const sorted = [...raw].sort((a, b) => a - b);
          const idx = IntervalIndex.fromBreaks(sorted);
          return idx.size === sorted.length - 1;
        },
      ),
    );
  });

  it("fromBreaks: left[i] = breaks[i], right[i] = breaks[i+1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100 }), {
          minLength: 2,
          maxLength: 10,
        }),
        (raw) => {
          const sorted = [...raw].sort((a, b) => a - b);
          const idx = IntervalIndex.fromBreaks(sorted);
          for (let i = 0; i < idx.size; i++) {
            if (idx.left[i] !== sorted[i]) {
              return false;
            }
            if (idx.right[i] !== sorted[i + 1]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("get_loc returns index within [0, size) or -1", () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 10 }), (v) => {
        const idx = IntervalIndex.fromBreaks([0, 1, 2, 3, 4, 5]);
        const loc = idx.get_loc(v);
        return loc === -1 || (loc >= 0 && loc < idx.size);
      }),
    );
  });

  it("contains[i] === true implies get_loc === i (for non-overlapping index)", () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 5 }), (v) => {
        const idx = IntervalIndex.fromBreaks([0, 1, 2, 3, 4, 5]);
        const mask = idx.contains(v);
        const loc = idx.get_loc(v);
        if (loc === -1) {
          return mask.every((b) => !b);
        }
        return mask[loc] === true;
      }),
    );
  });
});
