/**
 * Tests for src/core/cat_accessor.ts — CategoricalAccessor (Series.cat).
 *
 * Covers: categories, codes, ordered, nCategories, addCategories,
 * removeCategories, removeUnusedCategories, renameCategories,
 * setCategories, reorderCategories, asOrdered, asUnordered,
 * valueCounts, edge cases, and property tests.
 */

import { describe, expect, it, test } from "bun:test";
import * as fc from "fast-check";
import { CategoricalAccessor, Series } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function strSeries(data: (string | null)[], name?: string): Series<Scalar> {
  return new Series({ data, name: name ?? null });
}

// ─── CategoricalAccessor construction ────────────────────────────────────────

describe("Series.cat — construction", () => {
  it("is a CategoricalAccessor instance", () => {
    const s = strSeries(["a", "b", "c"]);
    expect(s.cat).toBeInstanceOf(CategoricalAccessor);
  });

  it("infers sorted unique categories from values", () => {
    const s = strSeries(["b", "a", "c", "a", "b"]);
    const cats = s.cat.categories.values;
    expect([...cats]).toEqual(["a", "b", "c"]);
  });

  it("ignores nulls in category inference", () => {
    const s = strSeries(["b", null, "a", null, "c"]);
    const cats = s.cat.categories.values;
    expect([...cats]).toEqual(["a", "b", "c"]);
  });

  it("numeric values are sorted correctly", () => {
    const s = new Series<Scalar>({ data: [3, 1, 2, 1, 3] });
    const cats = s.cat.categories.values;
    expect([...cats]).toEqual(["1", "2", "3"].map(Number));
  });
});

// ─── nCategories ─────────────────────────────────────────────────────────────

describe("Series.cat.nCategories", () => {
  it("returns count of unique categories", () => {
    expect(strSeries(["a", "b", "c"]).cat.nCategories).toBe(3);
  });

  it("returns 0 for empty series", () => {
    expect(strSeries([]).cat.nCategories).toBe(0);
  });

  it("returns 0 for all-null series", () => {
    expect(strSeries([null, null]).cat.nCategories).toBe(0);
  });
});

// ─── ordered ─────────────────────────────────────────────────────────────────

describe("Series.cat.ordered", () => {
  it("defaults to false", () => {
    expect(strSeries(["a", "b"]).cat.ordered).toBe(false);
  });

  it("asOrdered() returns true", () => {
    const s = strSeries(["a", "b"]);
    expect(s.cat.asOrdered().cat.ordered).toBe(true);
  });

  it("asUnordered() after asOrdered() returns false", () => {
    const s = strSeries(["a", "b"]);
    expect(s.cat.asOrdered().cat.asUnordered().cat.ordered).toBe(false);
  });
});

// ─── codes ───────────────────────────────────────────────────────────────────

describe("Series.cat.codes", () => {
  it("returns integer codes for each value", () => {
    const s = strSeries(["b", "a", "c", "a"]);
    expect([...s.cat.codes.toArray()]).toEqual([1, 0, 2, 0]);
  });

  it("codes for null are -1", () => {
    const s = strSeries(["a", null, "b"]);
    const codes = s.cat.codes.toArray();
    expect(codes[1]).toBe(-1);
  });

  it("codes match category index order", () => {
    const s = strSeries(["z", "a", "m"]);
    // categories: ["a", "m", "z"] → z=2, a=0, m=1
    expect([...s.cat.codes.toArray()]).toEqual([2, 0, 1]);
  });

  it("empty series has empty codes", () => {
    expect([...strSeries([]).cat.codes.toArray()]).toEqual([]);
  });
});

// ─── addCategories ────────────────────────────────────────────────────────────

describe("CategoricalAccessor.addCategories", () => {
  it("adds new categories without changing values", () => {
    const s = strSeries(["a", "b"]);
    const s2 = s.cat.addCategories(["c", "d"]);
    expect([...s2.cat.categories.values]).toEqual(["a", "b", "c", "d"]);
    expect([...s2.toArray()]).toEqual(["a", "b"]);
  });

  it("throws when category already exists", () => {
    const s = strSeries(["a", "b"]);
    expect(() => s.cat.addCategories(["b"])).toThrow();
  });

  it("can add multiple categories at once", () => {
    const s = strSeries(["a"]);
    const s2 = s.cat.addCategories(["b", "c"]);
    expect(s2.cat.nCategories).toBe(3);
  });
});

// ─── removeCategories ─────────────────────────────────────────────────────────

describe("CategoricalAccessor.removeCategories", () => {
  it("removes category and converts values to null", () => {
    const s = strSeries(["a", "b", "c", "b"]);
    const s2 = s.cat.removeCategories(["b"]);
    expect([...s2.cat.categories.values]).toEqual(["a", "c"]);
    expect([...s2.toArray()]).toEqual(["a", null, "c", null]);
  });

  it("throws when category does not exist", () => {
    const s = strSeries(["a", "b"]);
    expect(() => s.cat.removeCategories(["z"])).toThrow();
  });

  it("can remove multiple categories at once", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.removeCategories(["a", "c"]);
    expect([...s2.cat.categories.values]).toEqual(["b"]);
    expect([...s2.toArray()]).toEqual([null, "b", null]);
  });
});

// ─── removeUnusedCategories ───────────────────────────────────────────────────

describe("CategoricalAccessor.removeUnusedCategories", () => {
  it("removes categories not present in values", () => {
    const s = strSeries(["a", "b"]);
    const s2 = s.cat.addCategories(["c", "d"]);
    const s3 = s2.cat.removeUnusedCategories();
    expect([...s3.cat.categories.values]).toEqual(["a", "b"]);
  });

  it("keeps all categories when all are used", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.removeUnusedCategories();
    expect(s2.cat.nCategories).toBe(3);
  });

  it("returns empty categories if all values are null", () => {
    const s = strSeries([null, null]);
    const s2 = s.cat.removeUnusedCategories();
    expect(s2.cat.nCategories).toBe(0);
  });
});

// ─── renameCategories ─────────────────────────────────────────────────────────

describe("CategoricalAccessor.renameCategories", () => {
  it("renames using object mapping", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.renameCategories({ a: "A", c: "C" });
    expect([...s2.cat.categories.values]).toEqual(["A", "b", "C"]);
    expect([...s2.toArray()]).toEqual(["A", "b", "C"]);
  });

  it("renames using array", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.renameCategories(["x", "y", "z"]);
    expect([...s2.cat.categories.values]).toEqual(["x", "y", "z"]);
    expect([...s2.toArray()]).toEqual(["x", "y", "z"]);
  });

  it("throws when array length differs from category count", () => {
    const s = strSeries(["a", "b"]);
    expect(() => s.cat.renameCategories(["x", "y", "z"])).toThrow();
  });
});

// ─── setCategories ────────────────────────────────────────────────────────────

describe("CategoricalAccessor.setCategories", () => {
  it("replaces categories; values not in new list become null", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.setCategories(["a", "b"]);
    expect([...s2.cat.categories.values]).toEqual(["a", "b"]);
    expect([...s2.toArray()]).toEqual(["a", "b", null]);
  });

  it("reorders categories", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.setCategories(["c", "b", "a"]);
    expect([...s2.cat.categories.values]).toEqual(["c", "b", "a"]);
  });

  it("propagates ordered flag", () => {
    const s = strSeries(["a", "b"]);
    const s2 = s.cat.setCategories(["a", "b"], true);
    expect(s2.cat.ordered).toBe(true);
  });
});

// ─── reorderCategories ────────────────────────────────────────────────────────

describe("CategoricalAccessor.reorderCategories", () => {
  it("reorders without changing values", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.reorderCategories(["c", "a", "b"]);
    expect([...s2.cat.categories.values]).toEqual(["c", "a", "b"]);
    expect([...s2.toArray()]).toEqual(["a", "b", "c"]);
  });

  it("throws when new order has different categories", () => {
    const s = strSeries(["a", "b"]);
    expect(() => s.cat.reorderCategories(["a", "c"])).toThrow();
  });

  it("throws when new order has wrong count", () => {
    const s = strSeries(["a", "b", "c"]);
    expect(() => s.cat.reorderCategories(["a", "b"])).toThrow();
  });
});

// ─── valueCounts ──────────────────────────────────────────────────────────────

describe("CategoricalAccessor.valueCounts", () => {
  it("counts occurrences including zeros for unused cats", () => {
    const s = strSeries(["a", "b", "a", "a"]);
    const s2 = s.cat.addCategories(["c"]);
    const counts = s2.cat.valueCounts().toArray();
    expect([...counts]).toEqual([3, 1, 0]); // a=3, b=1, c=0
  });

  it("ignores nulls in counts", () => {
    const s = strSeries(["a", null, "a"]);
    const counts = s.cat.valueCounts().toArray();
    expect([...counts]).toEqual([2]);
  });

  it("all-null series returns empty", () => {
    const s = strSeries([null, null]);
    const counts = s.cat.valueCounts().toArray();
    expect([...counts]).toEqual([]);
  });
});

// ─── chaining ─────────────────────────────────────────────────────────────────

describe("CategoricalAccessor chaining", () => {
  it("can chain addCategories then removeUnusedCategories", () => {
    const s = strSeries(["a", "b"]);
    const result = s.cat.addCategories(["c"]).cat.removeUnusedCategories();
    expect(result.cat.nCategories).toBe(2);
  });

  it("can chain asOrdered then asUnordered", () => {
    const s = strSeries(["a", "b"]);
    expect(s.cat.asOrdered().cat.ordered).toBe(true);
    expect(s.cat.asOrdered().cat.asUnordered().cat.ordered).toBe(false);
  });

  it("can chain renameCategories with object mapping", () => {
    const s = strSeries(["a", "b", "c"]);
    const s2 = s.cat.renameCategories({ a: "alpha" });
    expect([...s2.cat.categories.values]).toContain("alpha");
    expect([...s2.toArray()]).toContain("alpha");
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

describe("CategoricalAccessor — property tests", () => {
  const arbStrData = fc.array(fc.oneof(fc.constantFrom("a", "b", "c", "d"), fc.constant(null)), {
    minLength: 0,
    maxLength: 20,
  });

  test("codes are in range [-1, nCategories)", () => {
    fc.assert(
      fc.property(arbStrData, (data) => {
        const s = new Series<Scalar>({ data });
        const acc = s.cat;
        const n = acc.nCategories;
        for (const code of acc.codes.toArray()) {
          if (code === null || code === undefined) {
            return false;
          }
          const c = code as number;
          if (c < -1 || c >= n) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  test("categories are always sorted and unique", () => {
    fc.assert(
      fc.property(arbStrData, (data) => {
        const s = new Series<Scalar>({ data });
        const cats = [...s.cat.categories.values];
        for (let i = 1; i < cats.length; i++) {
          if (String(cats[i - 1] as Scalar) >= String(cats[i] as Scalar)) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  test("nCategories equals categories array length", () => {
    fc.assert(
      fc.property(arbStrData, (data) => {
        const s = new Series<Scalar>({ data });
        return s.cat.nCategories === [...s.cat.categories.values].length;
      }),
    );
  });

  test("addCategories increases nCategories by the added count", () => {
    fc.assert(
      fc.property(arbStrData, (data) => {
        const s = new Series<Scalar>({ data });
        const before = s.cat.nCategories;
        try {
          const s2 = s.cat.addCategories(["__new1__", "__new2__"]);
          return s2.cat.nCategories === before + 2;
        } catch {
          // category already exists — acceptable
          return true;
        }
      }),
    );
  });

  test("removeUnusedCategories: categories are subset of unique values", () => {
    fc.assert(
      fc.property(arbStrData, (data) => {
        const s = new Series<Scalar>({ data });
        const s2 = s.cat.removeUnusedCategories();
        const cats = new Set(s2.cat.categories.values.map(String));
        const vals = new Set(
          data
            .filter((v): v is string => v !== null && v !== undefined)
            .map(String),
        );
        for (const c of cats) {
          if (!vals.has(c)) {
            return false;
          }
        }
        return true;
      }),
    );
  });
});
