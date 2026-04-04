/**
 * Tests for CategoricalIndex.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { Categorical, CategoricalIndex, Dtype } from "../../src/index.ts";

// ─── construction ─────────────────────────────────────────────────────────────

describe("CategoricalIndex construction", () => {
  test("infers categories from data", () => {
    const ci = new CategoricalIndex(["a", "b", "a", "c"]);
    expect(ci.categories).toEqual(["a", "b", "c"]);
  });

  test("stores values accessible via values/at", () => {
    const ci = new CategoricalIndex(["x", "y", "x"]);
    expect(ci.values).toEqual(["x", "y", "x"]);
    expect(ci.at(0)).toBe("x");
    expect(ci.at(1)).toBe("y");
  });

  test("null becomes missing (code = -1)", () => {
    const ci = new CategoricalIndex(["a", null, "b"]);
    expect(ci.codes[1]).toBe(-1);
    expect(ci.at(1)).toBeNull();
  });

  test("explicit categories respected", () => {
    const ci = new CategoricalIndex(["a", "b"], { categories: ["b", "a", "c"] });
    expect(ci.categories).toEqual(["b", "a", "c"]);
    expect(ci.codes).toEqual([1, 0]);
  });

  test("ordered flag stored", () => {
    const ci = new CategoricalIndex(["low", "high"], { ordered: true });
    expect(ci.ordered).toBe(true);
  });

  test("unordered by default", () => {
    const ci = new CategoricalIndex(["a"]);
    expect(ci.ordered).toBe(false);
  });

  test("name stored", () => {
    const ci = new CategoricalIndex(["a"], { name: "col" });
    expect(ci.name).toBe("col");
  });

  test("empty index", () => {
    const ci = new CategoricalIndex([]);
    expect(ci.size).toBe(0);
    expect(ci.categories).toEqual([]);
  });
});

// ─── dtype ────────────────────────────────────────────────────────────────────

describe("CategoricalIndex dtype", () => {
  test("dtype is Dtype.category", () => {
    const ci = new CategoricalIndex(["a"]);
    expect(ci.dtype).toBe(Dtype.category);
  });
});

// ─── codes ────────────────────────────────────────────────────────────────────

describe("CategoricalIndex codes", () => {
  test("codes match category positions", () => {
    const ci = new CategoricalIndex(["a", "b", "a", "c"]);
    expect(ci.codes).toEqual([0, 1, 0, 2]);
  });

  test("unknown values get code -1", () => {
    const ci = new CategoricalIndex(["a", "x"], { categories: ["a", "b"] });
    expect(ci.codes).toEqual([0, -1]);
  });

  test("null values get code -1", () => {
    const ci = new CategoricalIndex([null, "a"]);
    expect(ci.codes[0]).toBe(-1);
    expect(ci.codes[1]).toBe(0);
  });
});

// ─── fromCategorical ──────────────────────────────────────────────────────────

describe("CategoricalIndex.fromCategorical", () => {
  test("creates index from Categorical with name", () => {
    const cat = new Categorical(["a", "b", "a"]);
    const ci = CategoricalIndex.fromCategorical(cat, "idx");
    expect(ci.values).toEqual(["a", "b", "a"]);
    expect(ci.name).toBe("idx");
  });
});

// ─── category management ──────────────────────────────────────────────────────

describe("renameCategories", () => {
  test("renames each category element-wise", () => {
    const ci = new CategoricalIndex(["a", "b", "a"]);
    const ci2 = ci.renameCategories(["x", "y"]);
    expect(ci2.categories).toEqual(["x", "y"]);
    expect(ci2.values).toEqual(["x", "y", "x"]);
  });

  test("preserves name", () => {
    const ci = new CategoricalIndex(["a"], { name: "n" });
    expect(ci.renameCategories(["z"]).name).toBe("n");
  });
});

describe("reorderCategories", () => {
  test("reorders and recodes correctly", () => {
    const ci = new CategoricalIndex(["a", "b", "c"], { categories: ["a", "b", "c"] });
    const ci2 = ci.reorderCategories(["c", "b", "a"]);
    expect(ci2.categories).toEqual(["c", "b", "a"]);
    expect(ci2.codes).toEqual([2, 1, 0]);
  });

  test("can set ordered at the same time", () => {
    const ci = new CategoricalIndex(["a", "b"], { categories: ["a", "b"] });
    const ci2 = ci.reorderCategories(["a", "b"], true);
    expect(ci2.ordered).toBe(true);
  });
});

describe("addCategories", () => {
  test("appends new categories", () => {
    const ci = new CategoricalIndex(["a", "b"]);
    const ci2 = ci.addCategories(["c", "d"]);
    expect(ci2.categories).toEqual(["a", "b", "c", "d"]);
    expect(ci2.values).toEqual(["a", "b"]);
  });

  test("throws for duplicate category", () => {
    const ci = new CategoricalIndex(["a"]);
    expect(() => ci.addCategories(["a"])).toThrow();
  });
});

describe("removeCategories", () => {
  test("removes specified categories; affected values become null", () => {
    const ci = new CategoricalIndex(["a", "b", "c"]);
    const ci2 = ci.removeCategories(["b"]);
    expect(ci2.categories).toEqual(["a", "c"]);
    expect(ci2.values).toEqual(["a", null, "c"]);
  });
});

describe("removeUnusedCategories", () => {
  test("removes categories not present in the data", () => {
    const ci = new CategoricalIndex(["a", "a"], { categories: ["a", "b", "c"] });
    const ci2 = ci.removeUnusedCategories();
    expect(ci2.categories).toEqual(["a"]);
  });

  test("keeps all when all are used", () => {
    const ci = new CategoricalIndex(["a", "b"]);
    expect(ci.removeUnusedCategories().categories).toEqual(["a", "b"]);
  });
});

describe("setCategories", () => {
  test("replaces category vocabulary; unknown values become null", () => {
    const ci = new CategoricalIndex(["a", "b", "c"]);
    const ci2 = ci.setCategories(["a", "b"]);
    expect(ci2.categories).toEqual(["a", "b"]);
    expect(ci2.values).toEqual(["a", "b", null]);
  });
});

describe("asOrdered / asUnordered", () => {
  test("asOrdered sets ordered=true", () => {
    const ci = new CategoricalIndex(["a", "b"]);
    expect(ci.asOrdered().ordered).toBe(true);
  });

  test("asUnordered sets ordered=false", () => {
    const ci = new CategoricalIndex(["a", "b"], { ordered: true });
    expect(ci.asUnordered().ordered).toBe(false);
  });

  test("values unchanged", () => {
    const ci = new CategoricalIndex(["a", "b", "a"]);
    expect(ci.asOrdered().values).toEqual(["a", "b", "a"]);
  });
});

// ─── monotonicity ─────────────────────────────────────────────────────────────

describe("isMonotonicIncreasing / isMonotonicDecreasing", () => {
  test("ordered: uses category position", () => {
    const ci = new CategoricalIndex(["a", "b", "c"], {
      categories: ["a", "b", "c"],
      ordered: true,
    });
    expect(ci.isMonotonicIncreasing).toBe(true);
    expect(ci.isMonotonicDecreasing).toBe(false);
  });

  test("ordered decreasing", () => {
    const ci = new CategoricalIndex(["c", "b", "a"], {
      categories: ["a", "b", "c"],
      ordered: true,
    });
    expect(ci.isMonotonicDecreasing).toBe(true);
    expect(ci.isMonotonicIncreasing).toBe(false);
  });

  test("unordered falls back to lexicographic", () => {
    const ci = new CategoricalIndex(["a", "b", "c"]);
    expect(ci.isMonotonicIncreasing).toBe(true);
  });

  test("single element is always monotonic", () => {
    const ci = new CategoricalIndex(["x"], { ordered: true });
    expect(ci.isMonotonicIncreasing).toBe(true);
    expect(ci.isMonotonicDecreasing).toBe(true);
  });

  test("null breaks monotonicity (ordered)", () => {
    const ci = new CategoricalIndex(["a", null, "b"], {
      categories: ["a", "b"],
      ordered: true,
    });
    expect(ci.isMonotonicIncreasing).toBe(false);
  });
});

// ─── sortValues ───────────────────────────────────────────────────────────────

describe("sortValues", () => {
  test("ordered: sorts by category position ascending", () => {
    const ci = new CategoricalIndex(["high", "low", "medium"], {
      categories: ["low", "medium", "high"],
      ordered: true,
    });
    expect(ci.sortValues().values).toEqual(["low", "medium", "high"]);
  });

  test("ordered descending", () => {
    const ci = new CategoricalIndex(["low", "high", "medium"], {
      categories: ["low", "medium", "high"],
      ordered: true,
    });
    expect(ci.sortValues(false).values).toEqual(["high", "medium", "low"]);
  });

  test("ordered: nulls go last", () => {
    const ci = new CategoricalIndex([null, "a", "b"], {
      categories: ["a", "b"],
      ordered: true,
    });
    expect(ci.sortValues().values).toEqual(["a", "b", null]);
  });

  test("unordered: falls back to lexicographic", () => {
    const ci = new CategoricalIndex(["c", "a", "b"]);
    expect(ci.sortValues().values).toEqual(["a", "b", "c"]);
  });

  test("preserves categories after sort", () => {
    const ci = new CategoricalIndex(["b", "a"], {
      categories: ["a", "b", "c"],
      ordered: true,
    });
    const sorted = ci.sortValues();
    expect(sorted.categories).toEqual(["a", "b", "c"]);
  });
});

// ─── copy / rename ────────────────────────────────────────────────────────────

describe("copy and rename", () => {
  test("copy returns same values and categories", () => {
    const ci = new CategoricalIndex(["a", "b"], { name: "n" });
    const ci2 = ci.copy();
    expect(ci2.values).toEqual(ci.values);
    expect(ci2.categories).toEqual(ci.categories);
    expect(ci2.name).toBe("n");
  });

  test("copy with new name", () => {
    const ci = new CategoricalIndex(["a"], { name: "n" });
    expect(ci.copy("m").name).toBe("m");
  });

  test("rename returns new name", () => {
    const ci = new CategoricalIndex(["a"], { name: "old" });
    expect(ci.rename("new").name).toBe("new");
  });
});

// ─── toString ─────────────────────────────────────────────────────────────────

describe("toString", () => {
  test("unordered basic", () => {
    const ci = new CategoricalIndex(["a", "b"]);
    const s = ci.toString();
    expect(s).toContain("CategoricalIndex");
    expect(s).toContain("a, b");
    expect(s).toContain("categories=[a, b]");
  });

  test("ordered flag present", () => {
    const ci = new CategoricalIndex(["a"], { ordered: true });
    expect(ci.toString()).toContain("ordered=true");
  });

  test("name present", () => {
    const ci = new CategoricalIndex(["a"], { name: "x" });
    expect(ci.toString()).toContain("name='x'");
  });

  test("null rendered as 'null'", () => {
    const ci = new CategoricalIndex([null, "a"]);
    expect(ci.toString()).toContain("null");
  });
});

// ─── inherited Index methods ──────────────────────────────────────────────────

describe("inherited Index methods work on CategoricalIndex", () => {
  test("size", () => {
    expect(new CategoricalIndex(["a", "b", "c"]).size).toBe(3);
  });

  test("contains", () => {
    const ci = new CategoricalIndex(["a", "b"]);
    expect(ci.contains("a")).toBe(true);
    expect(ci.contains("z")).toBe(false);
  });

  test("getLoc unique", () => {
    const ci = new CategoricalIndex(["a", "b", "c"]);
    expect(ci.getLoc("b")).toBe(1);
  });

  test("getLoc duplicate returns array", () => {
    const ci = new CategoricalIndex(["a", "b", "a"]);
    expect(ci.getLoc("a")).toEqual([0, 2]);
  });

  test("isUnique", () => {
    expect(new CategoricalIndex(["a", "b"]).isUnique).toBe(true);
    expect(new CategoricalIndex(["a", "a"]).isUnique).toBe(false);
  });

  test("nunique", () => {
    expect(new CategoricalIndex(["a", "b", "a"]).nunique()).toBe(2);
  });

  test("dropDuplicates", () => {
    const ci = new CategoricalIndex(["a", "b", "a"]);
    expect(ci.dropDuplicates().values).toEqual(["a", "b"]);
  });

  test("isin", () => {
    const ci = new CategoricalIndex(["a", "b", "c"]);
    expect(ci.isin(["a", "c"])).toEqual([true, false, true]);
  });

  test("isna / notna", () => {
    const ci = new CategoricalIndex(["a", null, "b"]);
    expect(ci.isna()).toEqual([false, true, false]);
    expect(ci.notna()).toEqual([true, false, true]);
  });

  test("dropna removes nulls", () => {
    const ci = new CategoricalIndex([null, "a", null]);
    expect(ci.dropna().values).toEqual(["a"]);
  });

  test("iterator yields values", () => {
    const ci = new CategoricalIndex(["a", "b"]);
    expect([...ci]).toEqual(["a", "b"]);
  });

  test("slice", () => {
    const ci = new CategoricalIndex(["a", "b", "c", "d"]);
    expect(ci.slice(1, 3).values).toEqual(["b", "c"]);
  });

  test("take", () => {
    const ci = new CategoricalIndex(["a", "b", "c"]);
    expect(ci.take([2, 0]).values).toEqual(["c", "a"]);
  });

  test("min / max (unordered, lexicographic)", () => {
    const ci = new CategoricalIndex(["b", "a", "c"]);
    expect(ci.min()).toBe("a");
    expect(ci.max()).toBe("c");
  });
});

// ─── property-based ───────────────────────────────────────────────────────────

describe("CategoricalIndex property tests", () => {
  test("codes length equals values length", () => {
    fc.assert(
      fc.property(fc.array(fc.option(fc.string({ minLength: 1, maxLength: 4 }))), (arr) => {
        const data = arr.map((v) => (v === null ? null : v));
        const ci = new CategoricalIndex(data);
        return ci.codes.length === ci.size;
      }),
    );
  });

  test("all codes in [-1, nCategories)", () => {
    fc.assert(
      fc.property(fc.array(fc.option(fc.constantFrom("a", "b", "c", "d"))), (arr) => {
        const data = arr.map((v) => (v === null ? null : v));
        const ci = new CategoricalIndex(data);
        return ci.codes.every((c) => c === -1 || (c >= 0 && c < ci.categories.length));
      }),
    );
  });

  test("roundtrip: values decoded from codes match original (non-null)", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1 }), (arr) => {
        const ci = new CategoricalIndex(arr);
        const decoded = ci.codes.map((code) => {
          if (code === -1) {
            return null;
          }
          const cat = ci.categories[code];
          return cat !== undefined ? cat : null;
        });
        return JSON.stringify(decoded) === JSON.stringify(ci.values);
      }),
    );
  });
});
