/**
 * Tests for MultiIndex — hierarchical multi-level index.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Index, MultiIndex } from "../../src/index.ts";
import type { Label } from "../../src/index.ts";

// ─── fromTuples ──────────────────────────────────────────────────────────────

describe("MultiIndex.fromTuples", () => {
  it("creates a 2-level index from tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.nlevels).toBe(2);
    expect(mi.size).toBe(3);
  });

  it("stores unique level values", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.levels[0]?.toArray()).toEqual(["a", "b"]);
    expect(mi.levels[1]?.toArray()).toEqual([1, 2]);
  });

  it("accepts optional names", () => {
    const mi = MultiIndex.fromTuples([["x", 10]], { names: ["letter", "num"] });
    expect(mi.names).toEqual(["letter", "num"]);
  });

  it("handles empty array", () => {
    const mi = MultiIndex.fromTuples([]);
    expect(mi.size).toBe(0);
    expect(mi.nlevels).toBe(0);
    expect(mi.empty).toBe(true);
  });

  it("handles null values", () => {
    const mi = MultiIndex.fromTuples([
      [null, 1],
      ["a", null],
    ]);
    expect(mi.size).toBe(2);
  });
});

// ─── fromArrays ──────────────────────────────────────────────────────────────

describe("MultiIndex.fromArrays", () => {
  it("creates index from per-level arrays", () => {
    const mi = MultiIndex.fromArrays([
      ["a", "a", "b"],
      [1, 2, 1],
    ]);
    expect(mi.size).toBe(3);
    expect(mi.nlevels).toBe(2);
  });

  it("matches fromTuples for same data", () => {
    const tuples: [string, number][] = [
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ];
    const mi1 = MultiIndex.fromTuples(tuples);
    const mi2 = MultiIndex.fromArrays([
      ["a", "a", "b"],
      [1, 2, 1],
    ]);
    expect(mi1.equals(mi2)).toBe(true);
  });
});

// ─── fromProduct ──────────────────────────────────────────────────────────────

describe("MultiIndex.fromProduct", () => {
  it("generates Cartesian product", () => {
    const mi = MultiIndex.fromProduct([
      ["a", "b"],
      [1, 2],
    ]);
    expect(mi.size).toBe(4);
    expect(mi.at(0)).toEqual(["a", 1]);
    expect(mi.at(1)).toEqual(["a", 2]);
    expect(mi.at(2)).toEqual(["b", 1]);
    expect(mi.at(3)).toEqual(["b", 2]);
  });

  it("generates 3-level product", () => {
    const mi = MultiIndex.fromProduct([["x", "y"], ["a"], [1, 2]]);
    expect(mi.size).toBe(4);
    expect(mi.nlevels).toBe(3);
  });

  it("returns empty for empty iterables", () => {
    const mi = MultiIndex.fromProduct([]);
    expect(mi.size).toBe(0);
  });
});

// ─── at / toArray ────────────────────────────────────────────────────────────

describe("MultiIndex.at", () => {
  it("returns tuple at position", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi.at(0)).toEqual(["a", 1]);
    expect(mi.at(1)).toEqual(["b", 2]);
  });

  it("supports negative indexing", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(mi.at(-1)).toEqual(["c", 3]);
    expect(mi.at(-2)).toEqual(["b", 2]);
  });

  it("throws for out-of-range", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.at(5)).toThrow();
    expect(() => mi.at(-5)).toThrow();
  });

  it("toArray returns all tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi.toArray()).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("toList is alias of toArray", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(mi.toList()).toEqual(mi.toArray());
  });
});

// ─── getLoc / contains / isin ────────────────────────────────────────────────

describe("MultiIndex.getLoc", () => {
  it("returns single position for unique tuple", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.getLoc(["a", 1])).toBe(0);
    expect(mi.getLoc(["b", 1])).toBe(2);
  });

  it("returns multiple positions for duplicate tuple", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    const locs = mi.getLoc(["a", 1]);
    expect(locs).toEqual([0, 2]);
  });

  it("throws for missing tuple", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.getLoc(["z", 9])).toThrow();
  });
});

describe("MultiIndex.contains", () => {
  it("returns true for existing tuple", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi.contains(["a", 1])).toBe(true);
  });

  it("returns false for missing tuple", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(mi.contains(["z", 9])).toBe(false);
  });
});

describe("MultiIndex.isin", () => {
  it("returns boolean mask", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(
      mi.isin([
        ["a", 1],
        ["c", 3],
      ]),
    ).toEqual([true, false, true]);
  });
});

// ─── isUnique / hasDuplicates ────────────────────────────────────────────────

describe("MultiIndex.isUnique", () => {
  it("true when all tuples distinct", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi.isUnique).toBe(true);
    expect(mi.hasDuplicates).toBe(false);
  });

  it("false when duplicates present", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 1],
    ]);
    expect(mi.isUnique).toBe(false);
    expect(mi.hasDuplicates).toBe(true);
  });
});

// ─── droplevel ───────────────────────────────────────────────────────────────

describe("MultiIndex.droplevel", () => {
  it("drops a level, returning MultiIndex when 2+ remain", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1, "x"],
      ["b", 2, "y"],
    ]);
    const dropped = mi.droplevel(0);
    expect(dropped).toBeInstanceOf(MultiIndex);
    const mDropped = dropped as MultiIndex;
    expect(mDropped.nlevels).toBe(2);
    expect(mDropped.at(0)).toEqual([1, "x"]);
  });

  it("drops a level, returning plain Index when 1 remains", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const result = mi.droplevel(0);
    expect(result).toBeInstanceOf(Index);
    const idx = result as Index<Label>;
    expect(idx.toArray()).toEqual([1, 2]);
  });

  it("drops multiple levels at once", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1, "x"],
      ["b", 2, "y"],
    ]);
    const result = mi.droplevel([0, 1]);
    expect(result).toBeInstanceOf(Index);
  });

  it("throws when dropping all levels", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.droplevel([0, 1])).toThrow();
  });
});

// ─── swaplevel ───────────────────────────────────────────────────────────────

describe("MultiIndex.swaplevel", () => {
  it("swaps last two levels by default", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const swapped = mi.swaplevel();
    expect(swapped.at(0)).toEqual([1, "a"]);
    expect(swapped.at(1)).toEqual([2, "b"]);
  });

  it("swaps specific levels by index", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1, "x"],
      ["b", 2, "y"],
    ]);
    const swapped = mi.swaplevel(0, 2);
    expect(swapped.at(0)).toEqual(["x", 1, "a"]);
  });
});

// ─── reorderLevels ───────────────────────────────────────────────────────────

describe("MultiIndex.reorderLevels", () => {
  it("reorders levels according to permutation", () => {
    const mi = MultiIndex.fromTuples([["a", 1, "x"]]);
    const reordered = mi.reorderLevels([2, 0, 1]);
    expect(reordered.at(0)).toEqual(["x", "a", 1]);
  });

  it("throws for wrong-length order", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.reorderLevels([0])).toThrow();
  });
});

// ─── setNames ────────────────────────────────────────────────────────────────

describe("MultiIndex.setNames", () => {
  it("sets level names", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    const named = mi.setNames(["letter", "num"]);
    expect(named.names).toEqual(["letter", "num"]);
  });

  it("throws for wrong-length names", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.setNames(["only-one"])).toThrow();
  });
});

// ─── isna / dropna ───────────────────────────────────────────────────────────

describe("MultiIndex.isna", () => {
  it("marks rows with null values", () => {
    const mi = MultiIndex.fromTuples([
      [null, 1],
      ["a", null],
      ["b", 2],
    ]);
    expect(mi.isna()).toEqual([true, true, false]);
    expect(mi.notna()).toEqual([false, false, true]);
  });
});

describe("MultiIndex.dropna", () => {
  it("removes rows with null values", () => {
    const mi = MultiIndex.fromTuples([
      [null, 1],
      ["a", 2],
      ["b", null],
    ]);
    const clean = mi.dropna();
    expect(clean.size).toBe(1);
    expect(clean.at(0)).toEqual(["a", 2]);
  });
});

// ─── duplicated / dropDuplicates ─────────────────────────────────────────────

describe("MultiIndex.duplicated", () => {
  it("marks duplicates keeping first", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    expect(mi.duplicated("first")).toEqual([false, false, true]);
  });

  it("marks duplicates keeping last", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    expect(mi.duplicated("last")).toEqual([true, false, false]);
  });

  it("marks all duplicates when keep=false", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    expect(mi.duplicated(false)).toEqual([true, false, true]);
  });
});

describe("MultiIndex.dropDuplicates", () => {
  it("removes duplicate tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    const deduped = mi.dropDuplicates();
    expect(deduped.size).toBe(2);
    expect(deduped.at(0)).toEqual(["a", 1]);
    expect(deduped.at(1)).toEqual(["b", 2]);
  });
});

// ─── set operations ──────────────────────────────────────────────────────────

describe("MultiIndex.union", () => {
  it("combines unique tuples from both indices", () => {
    const mi1 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const mi2 = MultiIndex.fromTuples([
      ["b", 2],
      ["c", 3],
    ]);
    const u = mi1.union(mi2);
    expect(u.size).toBe(3);
    expect(u.contains(["a", 1])).toBe(true);
    expect(u.contains(["c", 3])).toBe(true);
  });
});

describe("MultiIndex.intersection", () => {
  it("keeps only common tuples", () => {
    const mi1 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const mi2 = MultiIndex.fromTuples([
      ["b", 2],
      ["c", 3],
    ]);
    const inter = mi1.intersection(mi2);
    expect(inter.size).toBe(1);
    expect(inter.at(0)).toEqual(["b", 2]);
  });
});

describe("MultiIndex.difference", () => {
  it("removes tuples present in other", () => {
    const mi1 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const mi2 = MultiIndex.fromTuples([
      ["b", 2],
      ["c", 3],
    ]);
    const diff = mi1.difference(mi2);
    expect(diff.size).toBe(1);
    expect(diff.at(0)).toEqual(["a", 1]);
  });
});

// ─── sortValues ──────────────────────────────────────────────────────────────

describe("MultiIndex.sortValues", () => {
  it("sorts tuples lexicographically ascending", () => {
    const mi = MultiIndex.fromTuples([
      ["b", 1],
      ["a", 2],
      ["a", 1],
    ]);
    const sorted = mi.sortValues();
    expect(sorted.at(0)).toEqual(["a", 1]);
    expect(sorted.at(1)).toEqual(["a", 2]);
    expect(sorted.at(2)).toEqual(["b", 1]);
  });

  it("sorts descending", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 2],
    ]);
    const sorted = mi.sortValues(false);
    expect(sorted.at(0)).toEqual(["b", 2]);
  });
});

// ─── equals ──────────────────────────────────────────────────────────────────

describe("MultiIndex.equals", () => {
  it("returns true for identical indices", () => {
    const mi1 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const mi2 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi1.equals(mi2)).toBe(true);
  });

  it("returns false for different tuples", () => {
    const mi1 = MultiIndex.fromTuples([["a", 1]]);
    const mi2 = MultiIndex.fromTuples([["b", 2]]);
    expect(mi1.equals(mi2)).toBe(false);
  });

  it("returns false for different sizes", () => {
    const mi1 = MultiIndex.fromTuples([["a", 1]]);
    const mi2 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi1.equals(mi2)).toBe(false);
  });
});

// ─── iteration ───────────────────────────────────────────────────────────────

describe("MultiIndex iteration", () => {
  it("supports for-of iteration", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const result: (readonly (string | number)[])[] = [];
    for (const t of mi) {
      result.push(t as readonly (string | number)[]);
    }
    expect(result).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
});

// ─── toString ────────────────────────────────────────────────────────────────

describe("MultiIndex.toString", () => {
  it("returns a readable string", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    const s = mi.toString();
    expect(s).toContain("MultiIndex");
    expect(s).toContain("a");
  });

  it("includes names when set", () => {
    const mi = MultiIndex.fromTuples([["a", 1]], { names: ["letter", "num"] });
    expect(mi.toString()).toContain("letter");
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

const labelArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 3 }),
  fc.integer({ min: 0, max: 5 }),
);
const tupleArb = fc.tuple(labelArb, labelArb);
const tuplesArb = fc.array(tupleArb, { minLength: 1, maxLength: 20 });

describe("MultiIndex property tests", () => {
  it("size equals number of input tuples", () => {
    fc.assert(
      fc.property(tuplesArb, (tuples) => {
        const mi = MultiIndex.fromTuples(tuples);
        expect(mi.size).toBe(tuples.length);
      }),
    );
  });

  it("at(i) matches original tuple", () => {
    fc.assert(
      fc.property(tuplesArb, (tuples) => {
        const mi = MultiIndex.fromTuples(tuples);
        for (let i = 0; i < tuples.length; i++) {
          const t = mi.at(i);
          expect(t[0]).toBe(tuples[i]?.[0]);
          expect(t[1]).toBe(tuples[i]?.[1]);
        }
      }),
    );
  });

  it("fromArrays and fromTuples agree", () => {
    fc.assert(
      fc.property(tuplesArb, (tuples) => {
        const mi1 = MultiIndex.fromTuples(tuples);
        const arr0 = tuples.map((t) => t[0]);
        const arr1 = tuples.map((t) => t[1]);
        const mi2 = MultiIndex.fromArrays([arr0, arr1]);
        expect(mi1.equals(mi2)).toBe(true);
      }),
    );
  });

  it("union contains all tuples from both indices", () => {
    fc.assert(
      fc.property(tuplesArb, tuplesArb, (t1, t2) => {
        const mi1 = MultiIndex.fromTuples(t1);
        const mi2 = MultiIndex.fromTuples(t2);
        const u = mi1.union(mi2);
        for (const t of t1) {
          expect(u.contains([t[0], t[1]])).toBe(true);
        }
        for (const t of t2) {
          expect(u.contains([t[0], t[1]])).toBe(true);
        }
      }),
    );
  });

  it("intersection is subset of both", () => {
    fc.assert(
      fc.property(tuplesArb, tuplesArb, (t1, t2) => {
        const mi1 = MultiIndex.fromTuples(t1);
        const mi2 = MultiIndex.fromTuples(t2);
        const inter = mi1.intersection(mi2);
        for (let i = 0; i < inter.size; i++) {
          const t = inter.at(i);
          expect(mi1.contains(t)).toBe(true);
          expect(mi2.contains(t)).toBe(true);
        }
      }),
    );
  });

  it("dropDuplicates produces unique index", () => {
    fc.assert(
      fc.property(tuplesArb, (tuples) => {
        const mi = MultiIndex.fromTuples(tuples);
        expect(mi.dropDuplicates().isUnique).toBe(true);
      }),
    );
  });

  it("sortValues preserves size", () => {
    fc.assert(
      fc.property(tuplesArb, (tuples) => {
        const mi = MultiIndex.fromTuples(tuples);
        expect(mi.sortValues().size).toBe(mi.size);
      }),
    );
  });
});
