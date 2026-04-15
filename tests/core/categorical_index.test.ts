/**
 * Tests for CategoricalIndex.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { CategoricalIndex } from "../../src/index.ts";
import type { CategoricalIndexOptions } from "../../src/index.ts";

// ─── construction ─────────────────────────────────────────────────────────────

describe("CategoricalIndex.fromArray — construction", () => {
  it("infers categories alphabetically", () => {
    const ci = CategoricalIndex.fromArray(["b", "a", "c", "a"]);
    expect(ci.categories.toArray()).toEqual(["a", "b", "c"]);
  });

  it("size matches data length", () => {
    const ci = CategoricalIndex.fromArray(["x", "y", "x"]);
    expect(ci.size).toBe(3);
  });

  it("shape is [size]", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(ci.shape).toEqual([2]);
  });

  it("ndim is always 1", () => {
    const ci = CategoricalIndex.fromArray(["a"]);
    expect(ci.ndim).toBe(1);
  });

  it("codes map values to category indices", () => {
    const ci = CategoricalIndex.fromArray(["b", "a", "c", "a"]);
    // categories = ["a","b","c"] → a=0,b=1,c=2
    expect([...ci.codes]).toEqual([1, 0, 2, 0]);
  });

  it("explicit categories option is respected (no sorting)", () => {
    const ci = CategoricalIndex.fromArray(["b", "a"], { categories: ["b", "a"] });
    expect(ci.categories.toArray()).toEqual(["b", "a"]);
    expect([...ci.codes]).toEqual([0, 1]);
  });

  it("ordered defaults to false", () => {
    expect(CategoricalIndex.fromArray([]).ordered).toBe(false);
  });

  it("ordered option is stored", () => {
    const ci = CategoricalIndex.fromArray(["a"], { ordered: true });
    expect(ci.ordered).toBe(true);
  });

  it("name defaults to null", () => {
    expect(CategoricalIndex.fromArray([]).name).toBeNull();
  });

  it("name option is stored", () => {
    const ci = CategoricalIndex.fromArray(["a"], { name: "colour" });
    expect(ci.name).toBe("colour");
  });

  it("values not in explicit categories become code -1 (NA)", () => {
    const ci = CategoricalIndex.fromArray(["a", "z", "a"], { categories: ["a", "b"] });
    expect([...ci.codes]).toEqual([0, -1, 0]);
  });

  it("nCategories matches category count", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "a"]);
    expect(ci.nCategories).toBe(2);
  });
});

describe("CategoricalIndex.fromCodes — construction", () => {
  it("creates from explicit codes", () => {
    const ci = CategoricalIndex.fromCodes(["a", "b", "c"], [1, 0, 2, 0]);
    expect(ci.toArray()).toEqual(["b", "a", "c", "a"]);
  });

  it("allows code -1 for NA", () => {
    const ci = CategoricalIndex.fromCodes(["a", "b"], [0, -1, 1]);
    expect(ci.toArray()).toEqual(["a", null, "b"]);
  });

  it("throws when code is out of range", () => {
    expect(() => CategoricalIndex.fromCodes(["a", "b"], [5])).toThrow(RangeError);
    expect(() => CategoricalIndex.fromCodes(["a", "b"], [-2])).toThrow(RangeError);
  });
});

// ─── element access ───────────────────────────────────────────────────────────

describe("CategoricalIndex.at", () => {
  it("returns label at valid position", () => {
    const ci = CategoricalIndex.fromArray(["b", "a", "c"]);
    expect(ci.at(0)).toBe("b");
    expect(ci.at(1)).toBe("a");
    expect(ci.at(2)).toBe("c");
  });

  it("returns null for NA entry", () => {
    const ci = CategoricalIndex.fromCodes(["a", "b"], [-1, 0]);
    expect(ci.at(0)).toBeNull();
  });

  it("throws RangeError for out-of-bounds", () => {
    const ci = CategoricalIndex.fromArray(["a"]);
    expect(() => ci.at(1)).toThrow(RangeError);
    expect(() => ci.at(-1)).toThrow(RangeError);
  });
});

describe("CategoricalIndex.getLoc", () => {
  it("returns first occurrence", () => {
    const ci = CategoricalIndex.fromArray(["b", "a", "b"]);
    expect(ci.getLoc("b")).toBe(0);
    expect(ci.getLoc("a")).toBe(1);
  });

  it("returns -1 for absent label", () => {
    const ci = CategoricalIndex.fromArray(["a"]);
    expect(ci.getLoc("z")).toBe(-1);
  });
});

describe("CategoricalIndex.getLocsAll", () => {
  it("returns all positions for a label", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "a", "c", "a"]);
    expect(ci.getLocsAll("a")).toEqual([0, 2, 4]);
  });

  it("returns empty array when label not in index", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(ci.getLocsAll("z")).toEqual([]);
  });
});

describe("CategoricalIndex.toArray", () => {
  it("decodes all positions", () => {
    const ci = CategoricalIndex.fromArray(["b", "a", "b"]);
    expect(ci.toArray()).toEqual(["b", "a", "b"]);
  });

  it("maps NA codes to null", () => {
    const ci = CategoricalIndex.fromCodes(["a"], [-1, 0, -1]);
    expect(ci.toArray()).toEqual([null, "a", null]);
  });
});

// ─── membership ───────────────────────────────────────────────────────────────

describe("CategoricalIndex.hasCategory / contains", () => {
  it("hasCategory is true for known categories", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(ci.hasCategory("a")).toBe(true);
    expect(ci.hasCategory("c")).toBe(false);
  });

  it("contains checks index (not just categories)", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"], { categories: ["a", "b", "c"] });
    expect(ci.contains("a")).toBe(true);
    expect(ci.contains("c")).toBe(false); // c is a category but not in the index data
  });
});

// ─── category mutations ───────────────────────────────────────────────────────

describe("renameCategories", () => {
  it("renames categories while preserving codes", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "a"]);
    const renamed = ci.renameCategories(["x", "y"]);
    expect(renamed.categories.toArray()).toEqual(["x", "y"]);
    expect(renamed.toArray()).toEqual(["x", "y", "x"]);
  });

  it("throws when length differs", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(() => ci.renameCategories(["x"])).toThrow(RangeError);
  });
});

describe("reorderCategories", () => {
  it("reorders categories and updates codes", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "c"]);
    // original categories = ["a","b","c"], codes = [0,1,2]
    const reordered = ci.reorderCategories(["c", "a", "b"]);
    // new: c=0, a=1, b=2
    expect(reordered.categories.toArray()).toEqual(["c", "a", "b"]);
    expect(reordered.toArray()).toEqual(["a", "b", "c"]);
  });

  it("throws when a category is missing", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(() => ci.reorderCategories(["a", "x"])).toThrow(RangeError);
  });

  it("throws when length differs", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(() => ci.reorderCategories(["a"])).toThrow(RangeError);
  });
});

describe("addCategories", () => {
  it("appends new categories without changing existing data", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    const added = ci.addCategories(["c", "d"]);
    expect(added.categories.toArray()).toEqual(["a", "b", "c", "d"]);
    expect(added.toArray()).toEqual(["a", "b"]);
  });

  it("throws when category already exists", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(() => ci.addCategories(["a"])).toThrow(RangeError);
  });
});

describe("removeCategories", () => {
  it("removes categories and makes matching entries NA", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "c", "b"]);
    const removed = ci.removeCategories(["b"]);
    expect(removed.categories.toArray()).toEqual(["a", "c"]);
    expect(removed.toArray()).toEqual(["a", null, "c", null]);
  });

  it("removing non-existent category is a no-op", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    const removed = ci.removeCategories(["z"]);
    expect(removed.toArray()).toEqual(["a", "b"]);
  });
});

describe("setCategories", () => {
  it("replaces categories entirely", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "c"]);
    const set = ci.setCategories(["a", "c"]);
    expect(set.categories.toArray()).toEqual(["a", "c"]);
    expect(set.toArray()).toEqual(["a", null, "c"]);
  });

  it("can change ordered flag via options", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    const set = ci.setCategories(["a", "b"], { ordered: true });
    expect(set.ordered).toBe(true);
  });
});

describe("removeUnusedCategories", () => {
  it("drops categories not present in the data", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"], { categories: ["a", "b", "c"] });
    const clean = ci.removeUnusedCategories();
    expect(clean.categories.toArray()).toEqual(["a", "b"]);
  });

  it("keeps all categories when all are used", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "c"]);
    expect(ci.removeUnusedCategories().nCategories).toBe(3);
  });
});

// ─── ordering helpers ─────────────────────────────────────────────────────────

describe("asOrdered / asUnordered", () => {
  it("asOrdered returns ordered=true copy", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(ci.asOrdered().ordered).toBe(true);
  });

  it("asUnordered returns ordered=false copy", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"], { ordered: true });
    expect(ci.asUnordered().ordered).toBe(false);
  });

  it("data is unchanged after ordering change", () => {
    const ci = CategoricalIndex.fromArray(["b", "a"]);
    expect(ci.asOrdered().toArray()).toEqual(["b", "a"]);
  });
});

// ─── set-like operations ──────────────────────────────────────────────────────

describe("unionCategories", () => {
  it("merges categories from both indexes (left order first)", () => {
    const a = CategoricalIndex.fromArray(["a", "b"]);
    const b = CategoricalIndex.fromArray(["b", "c"]);
    const u = a.unionCategories(b);
    expect(u.categories.toArray()).toEqual(["a", "b", "c"]);
  });

  it("data from left index is preserved", () => {
    const a = CategoricalIndex.fromArray(["a", "b"]);
    const b = CategoricalIndex.fromArray(["c", "d"]);
    const u = a.unionCategories(b);
    expect(u.toArray()).toEqual(["a", "b"]);
  });
});

describe("intersectCategories", () => {
  it("keeps only shared categories", () => {
    const a = CategoricalIndex.fromArray(["a", "b", "c"]);
    const b = CategoricalIndex.fromArray(["b", "c", "d"]);
    const inter = a.intersectCategories(b);
    expect(inter.categories.toArray()).toEqual(["b", "c"]);
    expect(inter.toArray()).toEqual([null, "b", "c"]);
  });
});

// ─── compareLabels ────────────────────────────────────────────────────────────

describe("compareLabels", () => {
  it("compares according to category position", () => {
    const ci = CategoricalIndex.fromArray(["low", "mid", "high"], {
      categories: ["low", "mid", "high"],
      ordered: true,
    });
    expect(ci.compareLabels("low", "mid")).toBeLessThan(0);
    expect(ci.compareLabels("high", "low")).toBeGreaterThan(0);
    expect(ci.compareLabels("mid", "mid")).toBe(0);
  });

  it("throws when ordered=false", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(() => ci.compareLabels("a", "b")).toThrow();
  });

  it("throws when label is not a category", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"], { ordered: true });
    expect(() => ci.compareLabels("a", "z")).toThrow(RangeError);
  });
});

// ─── rename / toString ────────────────────────────────────────────────────────

describe("rename", () => {
  it("returns a new index with the given name", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(ci.rename("x").name).toBe("x");
    expect(ci.rename(null).name).toBeNull();
  });

  it("data is unchanged", () => {
    const ci = CategoricalIndex.fromArray(["a", "b"]);
    expect(ci.rename("x").toArray()).toEqual(["a", "b"]);
  });
});

describe("toString", () => {
  it("produces a non-empty string", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "c"]);
    const s = ci.toString();
    expect(s).toContain("CategoricalIndex");
    expect(s).toContain("a");
    expect(s).toContain("ordered=false");
  });

  it("truncates long indexes", () => {
    const ci = CategoricalIndex.fromArray(["a", "b", "c", "d", "e", "f", "g"]);
    expect(ci.toString()).toContain("...");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("CategoricalIndex — property-based", () => {
  const smallLabel = fc.oneof(fc.constantFrom("a", "b", "c", "d"), fc.integer({ min: 0, max: 9 }));
  const labelArray = fc.array(smallLabel, { minLength: 1, maxLength: 20 });

  it("roundtrip: fromArray → toArray preserves values", () => {
    fc.assert(
      fc.property(labelArray, (data) => {
        const ci = CategoricalIndex.fromArray(data);
        expect(ci.toArray()).toEqual(data);
      }),
    );
  });

  it("size === data.length", () => {
    fc.assert(
      fc.property(labelArray, (data) => {
        expect(CategoricalIndex.fromArray(data).size).toBe(data.length);
      }),
    );
  });

  it("all codes are either -1 or in [0, nCategories)", () => {
    fc.assert(
      fc.property(labelArray, (data) => {
        const ci = CategoricalIndex.fromArray(data);
        const n = ci.nCategories;
        for (const c of ci.codes) {
          expect(c === -1 || (c >= 0 && c < n)).toBe(true);
        }
      }),
    );
  });

  it("hasCategory is true for every inferred category", () => {
    fc.assert(
      fc.property(labelArray, (data) => {
        const ci = CategoricalIndex.fromArray(data);
        for (const cat of ci.categories.toArray()) {
          expect(ci.hasCategory(cat as string | number)).toBe(true);
        }
      }),
    );
  });

  it("removeUnusedCategories: nCategories ≤ original nCategories", () => {
    fc.assert(
      fc.property(labelArray, (data) => {
        const ci = CategoricalIndex.fromArray(data, { categories: ["a", "b", "c", "d"] });
        const cleaned = ci.removeUnusedCategories();
        expect(cleaned.nCategories).toBeLessThanOrEqual(ci.nCategories);
      }),
    );
  });

  it("addCategories → removeCategories round-trip keeps data stable", () => {
    fc.assert(
      fc.property(labelArray, (data) => {
        const ci = CategoricalIndex.fromArray(data);
        const original = ci.toArray();
        const added = ci.addCategories(["__NEW__"]);
        const removed = added.removeCategories(["__NEW__"]);
        expect(removed.toArray()).toEqual(original);
      }),
    );
  });

  it("options type annotation accepted", () => {
    fc.assert(
      fc.property(fc.boolean(), (ordered) => {
        const opts: CategoricalIndexOptions = { ordered };
        const ci = CategoricalIndex.fromArray(["a"], opts);
        expect(ci.ordered).toBe(ordered);
      }),
    );
  });
});
