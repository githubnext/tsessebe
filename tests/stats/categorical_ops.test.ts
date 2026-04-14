/**
 * Tests for src/stats/categorical_ops.ts
 *
 * Tests cover:
 * - catFromCodes — construction from integer codes
 * - catUnionCategories — union of category sets
 * - catIntersectCategories — intersection of category sets
 * - catDiffCategories — set difference of categories
 * - catEqualCategories — equality check of category sets
 * - catSortByFreq — reorder categories by frequency
 * - catToOrdinal — create ordered categorical
 * - catFreqTable — frequency table as plain object
 * - catCrossTab — cross-tabulation DataFrame
 * - catRecode — rename categories via map or function
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/core/index.ts";
import {
  catCrossTab,
  catDiffCategories,
  catEqualCategories,
  catFreqTable,
  catFromCodes,
  catIntersectCategories,
  catRecode,
  catSortByFreq,
  catToOrdinal,
  catUnionCategories,
} from "../../src/stats/categorical_ops.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a categorical Series from values with explicit categories. */
function makeCat(values: (string | null)[], cats: string[]) {
  return new Series({ data: values }).cat.setCategories(cats);
}

// ─── catFromCodes ─────────────────────────────────────────────────────────────

describe("catFromCodes", () => {
  it("maps codes to category labels", () => {
    const s = catFromCodes([0, 2, 1], ["a", "b", "c"]);
    expect(s.toArray()).toEqual(["a", "c", "b"]);
    expect(s.cat.categories.values).toEqual(["a", "b", "c"]);
  });

  it("maps -1 to null (missing)", () => {
    const s = catFromCodes([0, -1, 2], ["x", "y", "z"]);
    expect(s.toArray()).toEqual(["x", null, "z"]);
  });

  it("preserves all categories even when some are unused", () => {
    const s = catFromCodes([0], ["a", "b", "c"]);
    expect(s.cat.nCategories).toBe(3);
  });

  it("propagates ordered option", () => {
    const s = catFromCodes([0, 1], ["lo", "hi"], { ordered: true });
    expect(s.cat.ordered).toBe(true);
  });

  it("propagates name option", () => {
    const s = catFromCodes([0], ["a"], { name: "myCol" });
    expect(s.name).toBe("myCol");
  });

  it("throws on out-of-range codes", () => {
    expect(() => catFromCodes([5], ["a", "b"])).toThrow(RangeError);
  });

  it("throws on large negative codes (< -1)", () => {
    expect(() => catFromCodes([-2], ["a"])).toThrow(RangeError);
  });

  it("handles empty codes array", () => {
    const s = catFromCodes([], ["a", "b"]);
    expect(s.toArray()).toEqual([]);
    expect(s.cat.nCategories).toBe(2);
  });

  it("handles duplicate categories by deduplicating", () => {
    const s = catFromCodes([0, 1], ["a", "a", "b"]);
    // deduped → ["a","b"], code 1 → "b"
    expect(s.cat.nCategories).toBe(2);
    expect(s.toArray()).toEqual(["a", "b"]);
  });
});

// ─── catUnionCategories ────────────────────────────────────────────────────────

describe("catUnionCategories", () => {
  it("extends a's categories with b's extras", () => {
    const a = makeCat(["x", "y"], ["x", "y"]);
    const b = makeCat(["y", "z"], ["y", "z"]);
    const r = catUnionCategories(a, b);
    expect(r.cat.categories.values).toEqual(["x", "y", "z"]);
  });

  it("preserves a's values", () => {
    const a = makeCat(["x", "y"], ["x", "y"]);
    const b = makeCat(["z"], ["z"]);
    expect(catUnionCategories(a, b).toArray()).toEqual(["x", "y"]);
  });

  it("is idempotent when same categories", () => {
    const a = makeCat(["x"], ["x", "y"]);
    const b = makeCat(["y"], ["x", "y"]);
    const r = catUnionCategories(a, b);
    expect(r.cat.nCategories).toBe(2);
  });

  it("appends b-only categories in b-order", () => {
    const a = makeCat(["a"], ["a"]);
    const b = makeCat(["c", "b"], ["c", "b"]);
    const r = catUnionCategories(a, b);
    expect(r.cat.categories.values).toEqual(["a", "c", "b"]);
  });

  it("preserves ordered flag from a", () => {
    const a = new Series({ data: ["x"] }).cat.setCategories(["x"], true);
    const b = makeCat(["y"], ["y"]);
    expect(catUnionCategories(a, b).cat.ordered).toBe(true);
  });
});

// ─── catIntersectCategories ───────────────────────────────────────────────────

describe("catIntersectCategories", () => {
  it("keeps only categories in both", () => {
    const a = makeCat(["x", "y", "z"], ["x", "y", "z"]);
    const b = makeCat(["y", "z"], ["y", "z"]);
    const r = catIntersectCategories(a, b);
    expect(r.cat.categories.values).toEqual(["y", "z"]);
  });

  it("sets values to null when category removed", () => {
    const a = makeCat(["x", "y", "z"], ["x", "y", "z"]);
    const b = makeCat(["y", "z"], ["y", "z"]);
    const r = catIntersectCategories(a, b);
    expect(r.toArray()).toEqual([null, "y", "z"]);
  });

  it("empty intersection → all values null", () => {
    const a = makeCat(["x"], ["x"]);
    const b = makeCat(["y"], ["y"]);
    const r = catIntersectCategories(a, b);
    expect(r.cat.nCategories).toBe(0);
    expect(r.toArray()).toEqual([null]);
  });

  it("full intersection → no change to values", () => {
    const a = makeCat(["x", "y"], ["x", "y"]);
    const b = makeCat(["x", "y"], ["x", "y"]);
    const r = catIntersectCategories(a, b);
    expect(r.toArray()).toEqual(["x", "y"]);
  });
});

// ─── catDiffCategories ────────────────────────────────────────────────────────

describe("catDiffCategories", () => {
  it("removes b's categories from a", () => {
    const a = makeCat(["x", "y", "z"], ["x", "y", "z"]);
    const b = makeCat(["z"], ["z"]);
    const r = catDiffCategories(a, b);
    expect(r.cat.categories.values).toEqual(["x", "y"]);
    expect(r.toArray()).toEqual(["x", "y", null]);
  });

  it("no overlap → unchanged", () => {
    const a = makeCat(["x", "y"], ["x", "y"]);
    const b = makeCat(["z"], ["z"]);
    const r = catDiffCategories(a, b);
    expect(r.cat.categories.values).toEqual(["x", "y"]);
    expect(r.toArray()).toEqual(["x", "y"]);
  });

  it("all removed → empty categories and all null", () => {
    const a = makeCat(["x"], ["x"]);
    const b = makeCat(["x"], ["x"]);
    const r = catDiffCategories(a, b);
    expect(r.cat.nCategories).toBe(0);
    expect(r.toArray()).toEqual([null]);
  });
});

// ─── catEqualCategories ───────────────────────────────────────────────────────

describe("catEqualCategories", () => {
  it("returns true for same categories in different order", () => {
    const a = makeCat(["x"], ["x", "y"]);
    const b = makeCat(["y"], ["y", "x"]);
    expect(catEqualCategories(a, b)).toBe(true);
  });

  it("returns false when different categories", () => {
    const a = makeCat(["x"], ["x", "y"]);
    const b = makeCat(["z"], ["x", "z"]);
    expect(catEqualCategories(a, b)).toBe(false);
  });

  it("returns false when different sizes", () => {
    const a = makeCat(["x"], ["x", "y"]);
    const b = makeCat(["x"], ["x"]);
    expect(catEqualCategories(a, b)).toBe(false);
  });

  it("empty vs empty is equal", () => {
    const a = makeCat([], []);
    const b = makeCat([], []);
    expect(catEqualCategories(a, b)).toBe(true);
  });
});

// ─── catSortByFreq ────────────────────────────────────────────────────────────

describe("catSortByFreq", () => {
  it("reorders categories most-frequent first", () => {
    const s = makeCat(["b", "a", "b", "c", "b", "a"], ["a", "b", "c"]);
    const r = catSortByFreq(s);
    expect(r.cat.categories.values).toEqual(["b", "a", "c"]);
  });

  it("ascending=true puts rarest first", () => {
    const s = makeCat(["b", "a", "b", "c", "b", "a"], ["a", "b", "c"]);
    const r = catSortByFreq(s, { ascending: true });
    expect(r.cat.categories.values).toEqual(["c", "a", "b"]);
  });

  it("preserves values", () => {
    const s = makeCat(["a", "b"], ["a", "b"]);
    const r = catSortByFreq(s);
    expect(r.toArray()).toEqual(["a", "b"]);
  });

  it("zero-freq categories end up last (descending)", () => {
    const s = makeCat(["x", "x"], ["x", "y"]);
    const r = catSortByFreq(s);
    expect(r.cat.categories.values[0]).toBe("x");
    expect(r.cat.categories.values[1]).toBe("y");
  });

  it("handles missing values — they are not counted", () => {
    const s = makeCat(["a", null, "a", null], ["a", "b"]);
    const r = catSortByFreq(s);
    expect(r.cat.categories.values[0]).toBe("a");
  });
});

// ─── catToOrdinal ─────────────────────────────────────────────────────────────

describe("catToOrdinal", () => {
  it("sets ordered flag to true", () => {
    const s = makeCat(["med", "low", "high", "med"], ["low", "med", "high"]);
    const r = catToOrdinal(s, ["low", "med", "high"]);
    expect(r.cat.ordered).toBe(true);
  });

  it("uses provided order as categories", () => {
    const s = makeCat(["b", "a"], ["a", "b"]);
    const r = catToOrdinal(s, ["a", "b"]);
    expect(r.cat.categories.values).toEqual(["a", "b"]);
  });

  it("values outside order become null", () => {
    const s = new Series({ data: ["low", "med", "high", "extreme"] });
    const r = catToOrdinal(s, ["low", "med", "high"]);
    expect(r.toArray()).toEqual(["low", "med", "high", null]);
  });

  it("preserves values within order", () => {
    const s = makeCat(["low", "high"], ["low", "med", "high"]);
    const r = catToOrdinal(s, ["low", "med", "high"]);
    expect(r.toArray()).toEqual(["low", "high"]);
  });
});

// ─── catFreqTable ─────────────────────────────────────────────────────────────

describe("catFreqTable", () => {
  it("counts occurrences of each category", () => {
    const s = makeCat(["b", "a", "b", null], ["a", "b", "c"]);
    expect(catFreqTable(s)).toEqual({ a: 1, b: 2, c: 0 });
  });

  it("includes zero for unused categories", () => {
    const s = makeCat(["a"], ["a", "b", "c"]);
    const t = catFreqTable(s);
    expect(t["b"]).toBe(0);
    expect(t["c"]).toBe(0);
  });

  it("returns empty object for no categories", () => {
    const s = makeCat([], []);
    expect(catFreqTable(s)).toEqual({});
  });

  it("ignores null/missing values", () => {
    const s = makeCat([null, null, "a"], ["a", "b"]);
    const t = catFreqTable(s);
    expect(t["a"]).toBe(1);
    expect(t["b"]).toBe(0);
  });

  it("all values present → correct counts", () => {
    const s = makeCat(["x", "y", "x", "z", "z", "z"], ["x", "y", "z"]);
    expect(catFreqTable(s)).toEqual({ x: 2, y: 1, z: 3 });
  });
});

// ─── catCrossTab ──────────────────────────────────────────────────────────────

describe("catCrossTab", () => {
  it("returns a DataFrame with correct shape", () => {
    const a = makeCat(["x", "x", "y", "y"], ["x", "y"]);
    const b = makeCat(["p", "q", "p", "q"], ["p", "q"]);
    const ct = catCrossTab(a, b);
    expect(ct.columns.values).toEqual(["p", "q"]);
    expect([...ct.index.values]).toEqual(["x", "y"]);
  });

  it("counts co-occurrences correctly", () => {
    const a = makeCat(["x", "x", "y", "y"], ["x", "y"]);
    const b = makeCat(["p", "q", "p", "q"], ["p", "q"]);
    const ct = catCrossTab(a, b);
    expect(ct.get("p")?.toArray()).toEqual([1, 1]);
    expect(ct.get("q")?.toArray()).toEqual([1, 1]);
  });

  it("skips missing values in either series", () => {
    const a = makeCat(["x", null, "y"], ["x", "y"]);
    const b = makeCat(["p", "q", "p"], ["p", "q"]);
    const ct = catCrossTab(a, b);
    // null in a is skipped → row x: p=1, row y: p=1
    expect(ct.get("p")?.toArray()).toEqual([1, 1]);
    expect(ct.get("q")?.toArray()).toEqual([0, 0]);
  });

  it("margins option adds totals row and column", () => {
    const a = makeCat(["x", "y"], ["x", "y"]);
    const b = makeCat(["p", "q"], ["p", "q"]);
    const ct = catCrossTab(a, b, { margins: true });
    expect(ct.columns.values).toContain("All");
    expect([...ct.index.values]).toContain("All");
  });

  it("normalize divides by grand total", () => {
    const a = makeCat(["x", "x", "y", "y"], ["x", "y"]);
    const b = makeCat(["p", "q", "p", "q"], ["p", "q"]);
    const ct = catCrossTab(a, b, { normalize: true });
    // Each cell = 1/4
    const col = ct.get("p")?.toArray() ?? [];
    expect(typeof col[0]).toBe("number");
    expect((col[0] as number) + (col[1] as number)).toBeCloseTo(0.5, 10);
  });

  it("custom marginsName appears in columns and index", () => {
    const a = makeCat(["x"], ["x"]);
    const b = makeCat(["p"], ["p"]);
    const ct = catCrossTab(a, b, { margins: true, marginsName: "Total" });
    expect(ct.columns.values).toContain("Total");
    expect([...ct.index.values]).toContain("Total");
  });

  it("zero cells are included for unused category pairs", () => {
    const a = makeCat(["x", "x"], ["x", "y"]);
    const b = makeCat(["p", "p"], ["p", "q"]);
    const ct = catCrossTab(a, b);
    // y never appears → row y should be zeros
    const yRow = ct.get("p")?.toArray() ?? [];
    expect(yRow[1]).toBe(0);
  });
});

// ─── catRecode ────────────────────────────────────────────────────────────────

describe("catRecode", () => {
  it("renames categories via object map", () => {
    const s = makeCat(["a", "b"], ["a", "b", "c"]);
    const r = catRecode(s, { a: "A", b: "B" });
    expect(r.cat.categories.values).toEqual(["A", "B", "c"]);
    expect(r.toArray()).toEqual(["A", "B"]);
  });

  it("renames all categories via function", () => {
    const s = makeCat(["a", "b"], ["a", "b", "c"]);
    const r = catRecode(s, (x) => x.toUpperCase());
    expect(r.cat.categories.values).toEqual(["A", "B", "C"]);
    expect(r.toArray()).toEqual(["A", "B"]);
  });

  it("partial map leaves unmapped categories unchanged", () => {
    const s = makeCat(["a", "b", "c"], ["a", "b", "c"]);
    const r = catRecode(s, { a: "alpha" });
    expect(r.cat.categories.values).toEqual(["alpha", "b", "c"]);
  });

  it("identity function returns same categories", () => {
    const s = makeCat(["x", "y"], ["x", "y"]);
    const r = catRecode(s, (x) => x);
    expect(r.cat.categories.values).toEqual(["x", "y"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("catFromCodes — property tests", () => {
  it("round-trips: codes from a series match its values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 0, maxLength: 10 }),
        (items) => {
          const cats = ["a", "b", "c"];
          const s = makeCat(items, cats);
          const codes = s.cat.codes.toArray() as number[];
          const rebuilt = catFromCodes(codes, cats);
          const orig = s.toArray();
          const back = rebuilt.toArray();
          if (orig.length !== back.length) return false;
          return orig.every((v, i) => v === back[i]);
        },
      ),
    );
  });

  it("catFreqTable totals match non-null count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("x", "y", "z", null), { minLength: 0, maxLength: 20 }),
        (items) => {
          const s = makeCat(items as (string | null)[], ["x", "y", "z"]);
          const table = catFreqTable(s);
          const total = Object.values(table).reduce((acc, n) => acc + n, 0);
          const nonNull = items.filter((v) => v !== null).length;
          return total === nonNull;
        },
      ),
    );
  });

  it("catUnionCategories has at least as many cats as each input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 5 }),
        fc.array(fc.constantFrom("b", "c", "d"), { minLength: 1, maxLength: 5 }),
        (va, vb) => {
          const a = makeCat(va, [...new Set(va)]);
          const b = makeCat(vb, [...new Set(vb)]);
          const r = catUnionCategories(a, b);
          return r.cat.nCategories >= a.cat.nCategories && r.cat.nCategories >= b.cat.nCategories;
        },
      ),
    );
  });

  it("catEqualCategories is symmetric", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("p", "q", "r"), { minLength: 0, maxLength: 3 }),
        fc.array(fc.constantFrom("p", "q", "r"), { minLength: 0, maxLength: 3 }),
        (va, vb) => {
          const uniqueA = [...new Set(va)];
          const uniqueB = [...new Set(vb)];
          const a = makeCat([], uniqueA);
          const b = makeCat([], uniqueB);
          return catEqualCategories(a, b) === catEqualCategories(b, a);
        },
      ),
    );
  });
});
