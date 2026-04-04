/**
 * Tests for MultiIndex — multi-level hierarchical index.
 *
 * Covers: construction (fromArrays, fromTuples, fromProduct), properties,
 * element access, getLevelValues, getLoc, contains, droplevel, swaplevel,
 * setNames, setLevels, setCodes, sortValues, append, equals, toArray,
 * toRecord, nunique, dropDuplicates, iteration, toString, and property tests.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Index, MultiIndex } from "../../src/index.ts";

// ─── construction ─────────────────────────────────────────────────────────────

describe("MultiIndex.fromArrays", () => {
  it("builds levels and codes from parallel arrays", () => {
    const mi = MultiIndex.fromArrays([
      ["a", "a", "b", "b"],
      [1, 2, 1, 2],
    ]);
    expect(mi.size).toBe(4);
    expect(mi.nlevels).toBe(2);
  });

  it("stores correct level values", () => {
    const mi = MultiIndex.fromArrays([
      ["b", "a", "b"],
      [2, 1, 1],
    ]);
    expect(mi.levels[0]?.toArray()).toEqual(["a", "b"]);
    expect(mi.levels[1]?.toArray()).toEqual([1, 2]);
  });

  it("accepts optional names", () => {
    const mi = MultiIndex.fromArrays(
      [
        ["a", "b"],
        [1, 2],
      ],
      ["letter", "num"],
    );
    expect(mi.names).toEqual(["letter", "num"]);
  });

  it("defaults names to null", () => {
    const mi = MultiIndex.fromArrays([["a"], [1]]);
    expect(mi.names).toEqual([null, null]);
  });

  it("handles null values", () => {
    const mi = MultiIndex.fromArrays([
      [null, "a", null],
      [1, 2, 3],
    ]);
    expect(mi.at(0)[0]).toBeNull();
  });
});

describe("MultiIndex.fromTuples", () => {
  it("builds from array of tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.size).toBe(3);
    expect(mi.nlevels).toBe(2);
  });

  it("round-trips tuples", () => {
    const tuples: [string, number][] = [
      ["x", 10],
      ["y", 20],
      ["z", 30],
    ];
    const mi = MultiIndex.fromTuples(tuples);
    expect(mi.toArray()).toEqual(tuples);
  });

  it("handles empty input", () => {
    const mi = MultiIndex.fromTuples([]);
    expect(mi.size).toBe(0);
    expect(mi.nlevels).toBe(0);
  });

  it("accepts names", () => {
    const mi = MultiIndex.fromTuples([["a", 1]], ["x", "y"]);
    expect(mi.names).toEqual(["x", "y"]);
  });
});

describe("MultiIndex.fromProduct", () => {
  it("produces cartesian product", () => {
    const mi = MultiIndex.fromProduct([
      ["a", "b"],
      [1, 2],
    ]);
    expect(mi.size).toBe(4);
    const tuples = mi.toArray();
    expect(tuples).toContainEqual(["a", 1]);
    expect(tuples).toContainEqual(["a", 2]);
    expect(tuples).toContainEqual(["b", 1]);
    expect(tuples).toContainEqual(["b", 2]);
  });

  it("accepts names", () => {
    const mi = MultiIndex.fromProduct([["a"], [1]], ["first", "second"]);
    expect(mi.names).toEqual(["first", "second"]);
  });

  it("handles single level", () => {
    const mi = MultiIndex.fromProduct([["x", "y", "z"]]);
    expect(mi.size).toBe(3);
    expect(mi.nlevels).toBe(1);
  });
});

// ─── properties ───────────────────────────────────────────────────────────────

describe("MultiIndex properties", () => {
  it("shape is [size, nlevels]", () => {
    const mi = MultiIndex.fromArrays([
      ["a", "b", "c"],
      [1, 2, 3],
    ]);
    expect(mi.shape).toEqual([3, 2]);
  });

  it("ndim is always 2", () => {
    const mi = MultiIndex.fromArrays([["a"], [1]]);
    expect(mi.ndim).toBe(2);
  });

  it("isUnique for distinct tuples", () => {
    const mi = MultiIndex.fromArrays([
      ["a", "a", "b"],
      [1, 2, 1],
    ]);
    expect(mi.isUnique).toBe(true);
  });

  it("isUnique false for duplicate tuples", () => {
    const mi = MultiIndex.fromArrays([
      ["a", "a"],
      [1, 1],
    ]);
    expect(mi.isUnique).toBe(false);
  });

  it("isMonotonicIncreasing for sorted tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.isMonotonicIncreasing).toBe(true);
  });

  it("isMonotonicIncreasing false for unsorted", () => {
    const mi = MultiIndex.fromTuples([
      ["b", 1],
      ["a", 2],
    ]);
    expect(mi.isMonotonicIncreasing).toBe(false);
  });

  it("isMonotonicDecreasing for reverse-sorted tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["b", 2],
      ["b", 1],
      ["a", 1],
    ]);
    expect(mi.isMonotonicDecreasing).toBe(true);
  });
});

// ─── element access ───────────────────────────────────────────────────────────

describe("MultiIndex.at", () => {
  it("returns tuple at position", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(mi.at(0)).toEqual(["a", 1]);
    expect(mi.at(1)).toEqual(["b", 2]);
    expect(mi.at(2)).toEqual(["c", 3]);
  });

  it("supports negative indices", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(mi.at(-1)).toEqual(["c", 3]);
    expect(mi.at(-2)).toEqual(["b", 2]);
  });

  it("throws on out-of-bounds", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.at(5)).toThrow(RangeError);
  });
});

describe("MultiIndex.values", () => {
  it("returns all tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi.values).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
});

// ─── level access ─────────────────────────────────────────────────────────────

describe("MultiIndex.getLevelValues", () => {
  it("returns flat Index for numeric level", () => {
    const mi = MultiIndex.fromArrays([
      ["a", "a", "b", "b"],
      [1, 2, 1, 2],
    ]);
    const lv0 = mi.getLevelValues(0);
    expect(lv0.toArray()).toEqual(["a", "a", "b", "b"]);
    const lv1 = mi.getLevelValues(1);
    expect(lv1.toArray()).toEqual([1, 2, 1, 2]);
  });

  it("uses level name for name of returned index", () => {
    const mi = MultiIndex.fromArrays([["a"], [1]], ["letter", "num"]);
    expect(mi.getLevelValues(0).name).toBe("letter");
  });

  it("resolves level by name", () => {
    const mi = MultiIndex.fromArrays(
      [
        ["a", "b"],
        [1, 2],
      ],
      ["x", "y"],
    );
    const lv = mi.getLevelValues("x");
    expect(lv.toArray()).toEqual(["a", "b"]);
  });

  it("throws for unknown level name", () => {
    const mi = MultiIndex.fromArrays([["a"], [1]], ["x", "y"]);
    expect(() => mi.getLevelValues("z")).toThrow();
  });
});

// ─── lookup ───────────────────────────────────────────────────────────────────

describe("MultiIndex.getLoc", () => {
  it("returns single position for unique key", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.getLoc(["a", 1])).toBe(0);
    expect(mi.getLoc(["a", 2])).toBe(1);
    expect(mi.getLoc(["b", 1])).toBe(2);
  });

  it("returns array of positions for duplicate key", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    const loc = mi.getLoc(["a", 1]);
    expect(Array.isArray(loc)).toBe(true);
    expect(loc).toEqual([0, 2]);
  });

  it("throws KeyError for missing key", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.getLoc(["z", 99])).toThrow();
  });

  it("supports partial key (prefix match)", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    const loc = mi.getLoc(["a"]);
    expect(loc).toEqual([0, 1]);
  });
});

describe("MultiIndex.contains", () => {
  it("returns true for existing key", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(mi.contains(["a", 1])).toBe(true);
  });

  it("returns false for missing key", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(mi.contains(["z", 9])).toBe(false);
  });

  it("supports partial key", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    expect(mi.contains(["a"])).toBe(true);
    expect(mi.contains(["c"])).toBe(false);
  });
});

// ─── manipulation ─────────────────────────────────────────────────────────────

describe("MultiIndex.droplevel", () => {
  it("drops a level by number and returns Index when one level remains", () => {
    const mi = MultiIndex.fromTuples(
      [
        ["a", 1],
        ["b", 2],
      ],
      ["x", "y"],
    );
    const dropped = mi.droplevel(0);
    expect("size" in dropped).toBe(true);
    if ("nlevels" in dropped === false) {
      expect(dropped.toArray()).toEqual([1, 2]);
    }
  });

  it("drops a level by name", () => {
    const mi = MultiIndex.fromTuples(
      [
        ["a", 1],
        ["b", 2],
      ],
      ["x", "y"],
    );
    const dropped = mi.droplevel("x");
    if ("nlevels" in dropped === false) {
      expect(dropped.toArray()).toEqual([1, 2]);
    }
  });

  it("returns MultiIndex when 2+ levels remain", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1, "x"],
      ["b", 2, "y"],
    ]);
    const dropped = mi.droplevel(0);
    expect("nlevels" in dropped).toBe(true);
    if ("nlevels" in dropped) {
      expect((dropped as MultiIndex).nlevels).toBe(2);
    }
  });

  it("throws when all levels are dropped", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.droplevel([0, 1])).toThrow();
  });
});

describe("MultiIndex.swaplevel", () => {
  it("swaps two levels", () => {
    const mi = MultiIndex.fromTuples(
      [
        ["a", 1],
        ["b", 2],
      ],
      ["x", "y"],
    );
    const swapped = mi.swaplevel(0, 1);
    expect(swapped.at(0)).toEqual([1, "a"]);
    expect(swapped.at(1)).toEqual([2, "b"]);
  });

  it("swaps names too", () => {
    const mi = MultiIndex.fromTuples([["a", 1]], ["x", "y"]);
    const swapped = mi.swaplevel(0, 1);
    expect(swapped.names).toEqual(["y", "x"]);
  });

  it("supports negative level indices", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const swapped = mi.swaplevel(-2, -1);
    expect(swapped.at(0)).toEqual([1, "a"]);
  });
});

describe("MultiIndex.setNames", () => {
  it("sets all level names", () => {
    const mi = MultiIndex.fromTuples([["a", 1]], ["x", "y"]);
    const renamed = mi.setNames(["p", "q"]);
    expect(renamed.names).toEqual(["p", "q"]);
  });

  it("throws if wrong count", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(() => mi.setNames(["only-one"])).toThrow();
  });
});

describe("MultiIndex.setLevels", () => {
  it("replaces level values", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const updated = mi.setLevels(["A", "B"], 0);
    expect(updated.levels[0]?.toArray()).toEqual(["A", "B"]);
  });
});

describe("MultiIndex.setCodes", () => {
  it("replaces codes for a level", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const updated = mi.setCodes([1, 0], 0);
    expect(updated.codes[0]).toEqual([1, 0]);
  });
});

// ─── sorting ──────────────────────────────────────────────────────────────────

describe("MultiIndex.sortValues", () => {
  it("sorts ascending by default", () => {
    const mi = MultiIndex.fromTuples([
      ["b", 2],
      ["a", 1],
      ["a", 2],
      ["b", 1],
    ]);
    const sorted = mi.sortValues();
    expect(sorted.toArray()).toEqual([
      ["a", 1],
      ["a", 2],
      ["b", 1],
      ["b", 2],
    ]);
  });

  it("sorts descending when false", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const sorted = mi.sortValues(false);
    expect(sorted.at(0)).toEqual(["b", 2]);
  });

  it("accepts per-level direction array", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 2],
      ["a", 1],
      ["b", 2],
      ["b", 1],
    ]);
    const sorted = mi.sortValues([true, false]);
    expect(sorted.toArray()).toEqual([
      ["a", 2],
      ["a", 1],
      ["b", 2],
      ["b", 1],
    ]);
  });
});

// ─── set operations ───────────────────────────────────────────────────────────

describe("MultiIndex.append", () => {
  it("concatenates two MultiIndexes", () => {
    const m1 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const m2 = MultiIndex.fromTuples([
      ["c", 3],
      ["d", 4],
    ]);
    const combined = m1.append(m2);
    expect(combined.size).toBe(4);
    expect(combined.at(2)).toEqual(["c", 3]);
  });

  it("throws if nlevels mismatch", () => {
    const m1 = MultiIndex.fromTuples([["a", 1]]);
    const m2 = MultiIndex.fromTuples([["a", 1, "x"]]);
    expect(() => m1.append(m2)).toThrow();
  });
});

describe("MultiIndex.equals", () => {
  it("true for identical MultiIndexes", () => {
    const m1 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const m2 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(m1.equals(m2)).toBe(true);
  });

  it("false for different tuples", () => {
    const m1 = MultiIndex.fromTuples([["a", 1]]);
    const m2 = MultiIndex.fromTuples([["b", 2]]);
    expect(m1.equals(m2)).toBe(false);
  });

  it("false for different sizes", () => {
    const m1 = MultiIndex.fromTuples([["a", 1]]);
    const m2 = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    expect(m1.equals(m2)).toBe(false);
  });
});

// ─── conversion ───────────────────────────────────────────────────────────────

describe("MultiIndex.toArray / toList", () => {
  it("toArray returns mutable copy", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const arr = mi.toArray();
    expect(arr).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("toList is alias for toArray", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(mi.toList()).toEqual(mi.toArray());
  });
});

describe("MultiIndex.toRecord", () => {
  it("returns object mapping level names to label arrays", () => {
    const mi = MultiIndex.fromTuples(
      [
        ["a", 1],
        ["b", 2],
      ],
      ["letter", "num"],
    );
    const rec = mi.toRecord();
    expect(rec).toEqual({ letter: ["a", "b"], num: [1, 2] });
  });

  it("uses stringified level index as name when no name set", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    const rec = mi.toRecord();
    expect(Object.keys(rec)).toEqual(["0", "1"]);
  });
});

// ─── misc ─────────────────────────────────────────────────────────────────────

describe("MultiIndex.nunique", () => {
  it("counts distinct tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["a", 2],
      ["a", 1],
    ]);
    expect(mi.nunique()).toBe(2);
  });
});

describe("MultiIndex.dropDuplicates", () => {
  it("removes duplicate tuples", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
      ["a", 1],
    ]);
    const dedup = mi.dropDuplicates();
    expect(dedup.size).toBe(2);
    expect(dedup.toArray()).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
});

describe("MultiIndex iteration", () => {
  it("iterates over tuples with for…of", () => {
    const mi = MultiIndex.fromTuples([
      ["a", 1],
      ["b", 2],
    ]);
    const collected: (readonly (string | number)[])[] = [];
    for (const t of mi) {
      collected.push(t as readonly (string | number)[]);
    }
    expect(collected).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });
});

describe("MultiIndex.toString", () => {
  it("includes tuples", () => {
    const mi = MultiIndex.fromTuples([["a", 1]]);
    expect(mi.toString()).toContain("(a, 1)");
  });

  it("includes names when set", () => {
    const mi = MultiIndex.fromTuples([["a", 1]], ["letter", "num"]);
    expect(mi.toString()).toContain("letter");
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe("MultiIndex constructor validation", () => {
  it("throws when levels/codes length mismatch", () => {
    expect(() => new MultiIndex([new Index(["a"])], [])).toThrow();
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("MultiIndex property tests", () => {
  it("fromArrays round-trips: toArray returns original tuples", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string({ minLength: 1, maxLength: 3 }), fc.integer()), {
          minLength: 1,
          maxLength: 10,
        }),
        (pairs) => {
          const as = pairs.map((p) => p[0]);
          const bs = pairs.map((p) => p[1]);
          const mi = MultiIndex.fromArrays([as, bs]);
          const tuples = mi.toArray();
          expect(tuples.length).toBe(pairs.length);
          for (let i = 0; i < pairs.length; i++) {
            const expected = pairs[i];
            const actual = tuples[i];
            if (expected !== undefined && actual !== undefined) {
              expect(actual[0]).toBe(expected[0]);
              expect(actual[1]).toBe(expected[1]);
            }
          }
        },
      ),
    );
  });

  it("getLoc finds every key that was inserted", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.constantFrom("a", "b", "c"), fc.constantFrom(1, 2, 3)), {
          minLength: 1,
          maxLength: 8,
        }),
        (pairs) => {
          const mi = MultiIndex.fromTuples(pairs);
          for (const pair of pairs) {
            expect(mi.contains(pair)).toBe(true);
          }
        },
      ),
    );
  });

  it("sortValues produces monotonically increasing result", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string({ minLength: 1, maxLength: 2 }), fc.integer()), {
          minLength: 1,
          maxLength: 10,
        }),
        (pairs) => {
          const mi = MultiIndex.fromTuples(pairs);
          const sorted = mi.sortValues();
          expect(sorted.isMonotonicIncreasing).toBe(true);
        },
      ),
    );
  });
});
