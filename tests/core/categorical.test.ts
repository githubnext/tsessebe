/**
 * Tests for Categorical, CategoricalDtype, CategoricalAccessor, and factorize.
 *
 * Covers: construction, codes, categories, ordered, element access, value
 * counts, renaming, reordering, adding/removing categories, set_categories,
 * min/max (ordered), describe, factorize, Series.cat accessor, and property
 * tests with fast-check.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Categorical, CategoricalDtype, Dtype, Series, factorize } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function catOf(values: (string | null)[], cats?: string[], ordered = false): Categorical {
  return new Categorical(values, {
    ...(cats !== undefined ? { categories: cats } : {}),
    ...(ordered ? { ordered: true } : {}),
  });
}

// ─── Categorical construction ─────────────────────────────────────────────────

describe("Categorical", () => {
  describe("construction — inferred categories", () => {
    it("infers categories in order of first appearance", () => {
      const c = catOf(["b", "a", "b", "c"]);
      expect(c.categories).toEqual(["b", "a", "c"]);
    });

    it("codes reflect category positions", () => {
      const c = catOf(["b", "a", "b", "c"]);
      expect([...c.codes]).toEqual([0, 1, 0, 2]);
    });

    it("null values get code -1", () => {
      const c = catOf(["a", null, "b", null]);
      expect([...c.codes]).toEqual([0, -1, 1, -1]);
    });

    it("all-null produces empty categories", () => {
      const c = catOf([null, null]);
      expect(c.categories).toEqual([]);
      expect([...c.codes]).toEqual([-1, -1]);
    });
  });

  describe("construction — explicit categories", () => {
    it("uses provided category order", () => {
      const c = catOf(["a", "b", "a"], ["b", "a"]);
      expect(c.categories).toEqual(["b", "a"]);
      expect([...c.codes]).toEqual([1, 0, 1]);
    });

    it("values not in explicit categories get code -1", () => {
      const c = catOf(["a", "b", "c"], ["a", "b"]);
      expect([...c.codes]).toEqual([0, 1, -1]);
    });

    it("empty data with explicit categories", () => {
      const c = catOf([], ["x", "y", "z"]);
      expect(c.categories).toEqual(["x", "y", "z"]);
      expect([...c.codes]).toEqual([]);
    });
  });

  describe("ordered flag", () => {
    it("defaults to unordered", () => {
      expect(catOf(["a", "b"]).ordered).toBe(false);
    });

    it("respects ordered option", () => {
      const c = catOf(["low", "high"], ["low", "high"], true);
      expect(c.ordered).toBe(true);
    });
  });

  describe("length / nCategories", () => {
    it("length equals number of elements", () => {
      const c = catOf(["a", "b", "a", null]);
      expect(c.length).toBe(4);
    });

    it("nCategories counts unique non-null labels", () => {
      const c = catOf(["a", "b", "a", null]);
      expect(c.nCategories).toBe(2);
    });
  });

  describe("dtype", () => {
    it("dtype is Dtype.category", () => {
      expect(catOf(["a"]).dtype).toBe(Dtype.category);
    });
  });

  // ─── at / toArray ──────────────────────────────────────────────────────────

  describe("at / toArray", () => {
    it("at returns value at position", () => {
      const c = catOf(["x", "y", "z"]);
      expect(c.at(0)).toBe("x");
      expect(c.at(2)).toBe("z");
    });

    it("at returns null for missing", () => {
      const c = catOf([null, "a"]);
      expect(c.at(0)).toBeNull();
    });

    it("at returns null for out-of-bounds", () => {
      const c = catOf(["a"]);
      expect(c.at(99)).toBeNull();
    });

    it("toArray decodes all values", () => {
      const c = catOf(["a", null, "b", "a"]);
      expect(c.toArray()).toEqual(["a", null, "b", "a"]);
    });
  });

  // ─── toSeries ──────────────────────────────────────────────────────────────

  describe("toSeries", () => {
    it("creates a Series with category dtype", () => {
      const s = catOf(["a", "b"]).toSeries("col");
      expect(s.dtype).toBe(Dtype.category);
      expect(s.name).toBe("col");
      expect(s.values).toEqual(["a", "b"]);
    });

    it("toSeries without name produces unnamed Series", () => {
      const s = catOf(["a"]).toSeries();
      expect(s.name).toBeNull();
    });
  });

  // ─── renameCategories ─────────────────────────────────────────────────────

  describe("renameCategories", () => {
    it("renames in order", () => {
      const c = catOf(["a", "b", "a"], ["a", "b"]);
      const r = c.renameCategories(["x", "y"]);
      expect(r.categories).toEqual(["x", "y"]);
      expect(r.toArray()).toEqual(["x", "y", "x"]);
    });

    it("throws on length mismatch", () => {
      const c = catOf(["a", "b"]);
      expect(() => c.renameCategories(["x"])).toThrow();
    });
  });

  // ─── reorderCategories ────────────────────────────────────────────────────

  describe("reorderCategories", () => {
    it("reorders correctly", () => {
      const c = catOf(["a", "b", "c"], ["a", "b", "c"]);
      const r = c.reorderCategories(["c", "b", "a"]);
      expect(r.categories).toEqual(["c", "b", "a"]);
      expect(r.toArray()).toEqual(["a", "b", "c"]);
    });

    it("codes update to reflect new positions", () => {
      const c = catOf(["a", "b"], ["a", "b"]);
      const r = c.reorderCategories(["b", "a"]);
      expect([...r.codes]).toEqual([1, 0]);
    });

    it("throws on unknown category", () => {
      const c = catOf(["a", "b"]);
      expect(() => c.reorderCategories(["a", "z"])).toThrow();
    });

    it("throws on wrong length", () => {
      const c = catOf(["a", "b"]);
      expect(() => c.reorderCategories(["a"])).toThrow();
    });
  });

  // ─── addCategories ────────────────────────────────────────────────────────

  describe("addCategories", () => {
    it("appends new categories", () => {
      const c = catOf(["a"], ["a"]);
      const r = c.addCategories(["b", "c"]);
      expect(r.categories).toEqual(["a", "b", "c"]);
    });

    it("existing codes are preserved", () => {
      const c = catOf(["a", "a"], ["a"]);
      const r = c.addCategories(["b"]);
      expect([...r.codes]).toEqual([0, 0]);
    });

    it("throws if category already exists", () => {
      const c = catOf(["a"]);
      expect(() => c.addCategories(["a"])).toThrow();
    });
  });

  // ─── removeCategories ─────────────────────────────────────────────────────

  describe("removeCategories", () => {
    it("removes specified categories", () => {
      const c = catOf(["a", "b", "c"], ["a", "b", "c"]);
      const r = c.removeCategories(["b"]);
      expect(r.categories).toEqual(["a", "c"]);
    });

    it("removed values become missing", () => {
      const c = catOf(["a", "b", "a"], ["a", "b"]);
      const r = c.removeCategories(["b"]);
      expect(r.toArray()).toEqual(["a", null, "a"]);
    });

    it("removing nothing changes nothing", () => {
      const c = catOf(["a", "b"], ["a", "b"]);
      const r = c.removeCategories([]);
      expect(r.categories).toEqual(["a", "b"]);
      expect(r.toArray()).toEqual(["a", "b"]);
    });
  });

  // ─── removeUnusedCategories ───────────────────────────────────────────────

  describe("removeUnusedCategories", () => {
    it("drops zero-count categories", () => {
      const c = catOf(["a", "a"], ["a", "b", "c"]);
      const r = c.removeUnusedCategories();
      expect(r.categories).toEqual(["a"]);
    });

    it("preserves codes for remaining categories", () => {
      const c = catOf(["a", "c"], ["a", "b", "c"]);
      const r = c.removeUnusedCategories();
      expect(r.categories).toEqual(["a", "c"]);
      expect(r.toArray()).toEqual(["a", "c"]);
    });

    it("all categories used — no change", () => {
      const c = catOf(["a", "b"], ["a", "b"]);
      const r = c.removeUnusedCategories();
      expect(r.categories).toEqual(["a", "b"]);
    });
  });

  // ─── setCategories ────────────────────────────────────────────────────────

  describe("setCategories", () => {
    it("replaces categories, missing values for absent", () => {
      const c = catOf(["a", "b", "c"], ["a", "b", "c"]);
      const r = c.setCategories(["a", "b"]);
      expect(r.toArray()).toEqual(["a", "b", null]);
    });

    it("allows adding new categories", () => {
      const c = catOf(["a"], ["a"]);
      const r = c.setCategories(["a", "b", "c"]);
      expect(r.categories).toEqual(["a", "b", "c"]);
    });
  });

  // ─── asOrdered / asUnordered ──────────────────────────────────────────────

  describe("asOrdered / asUnordered", () => {
    it("asOrdered sets ordered=true", () => {
      const c = catOf(["a", "b"]).asOrdered();
      expect(c.ordered).toBe(true);
    });

    it("asUnordered sets ordered=false", () => {
      const c = catOf(["a", "b"], ["a", "b"], true).asUnordered();
      expect(c.ordered).toBe(false);
    });

    it("categories unchanged after asOrdered", () => {
      const c = catOf(["a", "b", "c"], ["a", "b", "c"]);
      const r = c.asOrdered();
      expect(r.categories).toEqual(["a", "b", "c"]);
      expect(r.toArray()).toEqual(["a", "b", "c"]);
    });
  });

  // ─── min / max ────────────────────────────────────────────────────────────

  describe("min / max (ordered)", () => {
    const c = catOf(["medium", "high", "low", "high"], ["low", "medium", "high"], true);

    it("min returns smallest category present", () => {
      expect(c.min()).toBe("low");
    });

    it("max returns largest category present", () => {
      expect(c.max()).toBe("high");
    });

    it("min on all-missing returns null", () => {
      const empty = catOf([null, null], ["low", "high"], true);
      expect(empty.min()).toBeNull();
    });

    it("max on all-missing returns null", () => {
      const empty = catOf([null, null], ["low", "high"], true);
      expect(empty.max()).toBeNull();
    });

    it("throws for unordered min", () => {
      expect(() => catOf(["a", "b"]).min()).toThrow();
    });

    it("throws for unordered max", () => {
      expect(() => catOf(["a", "b"]).max()).toThrow();
    });
  });

  // ─── valueCounts ──────────────────────────────────────────────────────────

  describe("valueCounts", () => {
    it("counts each category including zeros", () => {
      const c = catOf(["a", "a", "b"], ["a", "b", "c"]);
      const vc = c.valueCounts();
      expect(vc.at(0)).toBe(2); // a
      expect(vc.at(1)).toBe(1); // b
      expect(vc.at(2)).toBe(0); // c (unused)
    });

    it("nulls are not counted", () => {
      const c = catOf([null, "a", null], ["a"]);
      const vc = c.valueCounts();
      expect(vc.at(0)).toBe(1);
    });
  });

  // ─── describe ─────────────────────────────────────────────────────────────

  describe("describe", () => {
    it("returns count, unique, top, freq", () => {
      const c = catOf(["a", "a", "b", null]);
      const d = c.describe();
      expect(d.at(0)).toBe(3); // count (non-null)
      expect(d.at(1)).toBe(2); // unique
      expect(d.at(2)).toBe("a"); // top (most frequent)
      expect(d.at(3)).toBe(2); // freq
    });
  });

  // ─── equals ───────────────────────────────────────────────────────────────

  describe("equals", () => {
    it("element-wise comparison", () => {
      const a = catOf(["x", "y", "z"]);
      const b = catOf(["x", "z", "z"]);
      expect(a.equals(b)).toEqual([true, false, true]);
    });

    it("missing values are not equal", () => {
      const a = catOf([null, "y"]);
      const b = catOf([null, "y"]);
      expect(a.equals(b)).toEqual([false, true]);
    });

    it("throws on length mismatch", () => {
      const a = catOf(["a", "b"]);
      const b = catOf(["a"]);
      expect(() => a.equals(b)).toThrow();
    });
  });

  // ─── Symbol.iterator ──────────────────────────────────────────────────────

  describe("Symbol.iterator", () => {
    it("iterates decoded values", () => {
      const c = catOf(["a", null, "b"]);
      expect([...c]).toEqual(["a", null, "b"]);
    });
  });

  // ─── toString ─────────────────────────────────────────────────────────────

  describe("toString", () => {
    it("includes category list", () => {
      const c = catOf(["a", "b"], ["a", "b"], true);
      const s = c.toString();
      expect(s).toContain("a");
      expect(s).toContain("b");
      expect(s).toContain("ordered");
    });
  });
});

// ─── CategoricalDtype ─────────────────────────────────────────────────────────

describe("CategoricalDtype", () => {
  it("stores categories and ordered flag", () => {
    const dt = new CategoricalDtype(["a", "b", "c"], true);
    expect(dt.categories).toEqual(["a", "b", "c"]);
    expect(dt.ordered).toBe(true);
  });

  it("defaults to unordered", () => {
    const dt = new CategoricalDtype(["x"]);
    expect(dt.ordered).toBe(false);
  });

  it("defaults to empty categories", () => {
    const dt = new CategoricalDtype();
    expect(dt.categories).toEqual([]);
  });

  it("dtype is Dtype.category", () => {
    expect(new CategoricalDtype().dtype).toBe(Dtype.category);
  });

  it("equals — same categories and ordered", () => {
    const a = new CategoricalDtype(["a", "b"], true);
    const b = new CategoricalDtype(["a", "b"], true);
    expect(a.equals(b)).toBe(true);
  });

  it("equals — different ordered flag", () => {
    const a = new CategoricalDtype(["a", "b"], false);
    const b = new CategoricalDtype(["a", "b"], true);
    expect(a.equals(b)).toBe(false);
  });

  it("equals — different categories", () => {
    const a = new CategoricalDtype(["a", "b"]);
    const b = new CategoricalDtype(["a", "c"]);
    expect(a.equals(b)).toBe(false);
  });

  it("equals — different lengths", () => {
    const a = new CategoricalDtype(["a"]);
    const b = new CategoricalDtype(["a", "b"]);
    expect(a.equals(b)).toBe(false);
  });

  it("toString includes categories", () => {
    const dt = new CategoricalDtype(["x", "y"]);
    expect(dt.toString()).toContain("x");
    expect(dt.toString()).toContain("y");
  });
});

// ─── factorize ────────────────────────────────────────────────────────────────

describe("factorize", () => {
  it("basic encoding", () => {
    const { codes, uniques } = factorize(["a", "b", "a", "c"]);
    expect([...codes]).toEqual([0, 1, 0, 2]);
    expect([...uniques]).toEqual(["a", "b", "c"]);
  });

  it("null / undefined → -1", () => {
    const { codes, uniques } = factorize(["a", null, "b", undefined]);
    expect([...codes]).toEqual([0, -1, 1, -1]);
    expect([...uniques]).toEqual(["a", "b"]);
  });

  it("all missing", () => {
    const { codes, uniques } = factorize([null, null]);
    expect([...codes]).toEqual([-1, -1]);
    expect([...uniques]).toEqual([]);
  });

  it("empty array", () => {
    const { codes, uniques } = factorize([]);
    expect([...codes]).toEqual([]);
    expect([...uniques]).toEqual([]);
  });

  it("numeric values", () => {
    const { codes, uniques } = factorize([10, 20, 10, 30]);
    expect([...codes]).toEqual([0, 1, 0, 2]);
    expect([...uniques]).toEqual([10, 20, 30]);
  });

  it("works with a Series", () => {
    const s = new Series({ data: ["x", "y", "x"] });
    const { codes, uniques } = factorize(s);
    expect([...codes]).toEqual([0, 1, 0]);
    expect([...uniques]).toEqual(["x", "y"]);
  });

  it("preserves insertion order", () => {
    const { uniques } = factorize(["c", "a", "b", "a"]);
    expect([...uniques]).toEqual(["c", "a", "b"]);
  });
});

// ─── Series.cat accessor ──────────────────────────────────────────────────────

describe("Series.cat accessor", () => {
  const s = new Series({ data: ["a", "b", "a", "c", null] });

  it("categories in order of first appearance", () => {
    expect([...s.cat.categories]).toEqual(["a", "b", "c"]);
  });

  it("codes Series has correct values", () => {
    expect([...s.cat.codes.values]).toEqual([0, 1, 0, 2, -1]);
  });

  it("ordered is false by default", () => {
    expect(s.cat.ordered).toBe(false);
  });

  it("valueCounts sums correctly", () => {
    const vc = s.cat.valueCounts();
    expect(vc.at(0)).toBe(2); // a
    expect(vc.at(1)).toBe(1); // b
    expect(vc.at(2)).toBe(1); // c
  });

  it("renameCategories", () => {
    const r = s.cat.renameCategories(["x", "y", "z"]);
    expect(r.values[0]).toBe("x");
    expect(r.values[1]).toBe("y");
    expect(r.values[4]).toBeNull();
  });

  it("addCategories", () => {
    const r = s.cat.addCategories(["d"]);
    expect(r.cat.categories).toEqual(["a", "b", "c", "d"]);
  });

  it("removeCategories", () => {
    const r = s.cat.removeCategories(["b"]);
    expect([...r.cat.categories]).toEqual(["a", "c"]);
    expect(r.values[1]).toBeNull();
  });

  it("removeUnusedCategories", () => {
    const s2 = new Series({ data: ["a", "a"] });
    const r = s2.cat.addCategories(["unused"]).cat.removeUnusedCategories();
    expect([...r.cat.categories]).toEqual(["a"]);
  });

  it("asOrdered / asUnordered", () => {
    const ordered = s.cat.asOrdered();
    expect(ordered.cat.ordered).toBe(true);
    const back = ordered.cat.asUnordered();
    expect(back.cat.ordered).toBe(false);
  });

  it("preserves Series name after cat operations", () => {
    const named = new Series({ data: ["a", "b"], name: "myCol" });
    const r = named.cat.renameCategories(["x", "y"]);
    expect(r.name).toBe("myCol");
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("Categorical — property tests", () => {
  it("roundtrip: Categorical → toArray → re-encode produces same codes", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 3 })), {
          minLength: 0,
          maxLength: 20,
        }),
        (raw) => {
          const input = raw as (string | null)[];
          const c = new Categorical(input);
          const decoded = c.toArray();
          const c2 = new Categorical(decoded, { categories: c.categories });
          for (let i = 0; i < c.codes.length; i++) {
            if (c.codes[i] !== c2.codes[i]) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("factorize codes never exceed uniques.length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 5 }))),
        (values) => {
          const input = values as (number | null)[];
          const { codes, uniques } = factorize(input);
          return codes.every((c) => c === -1 || c < uniques.length);
        },
      ),
    );
  });

  it("addCategories then removeCategories restores originals", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 10 }),
        (vals) => {
          const c = new Categorical(vals, { categories: ["a", "b", "c"] });
          const added = c.addCategories(["d", "e"]);
          const removed = added.removeCategories(["d", "e"]);
          return (
            removed.categories.length === c.categories.length &&
            removed.toArray().every((v, i) => v === c.toArray()[i])
          );
        },
      ),
    );
  });
});
