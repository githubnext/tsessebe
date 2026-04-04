/**
 * Tests for Index<T> — the generic labeled axis.
 */

import { describe, expect, it } from "bun:test";
import { Index } from "../../src/index.ts";
import type { IndexOptions } from "../../src/index.ts";

// ─── construction ─────────────────────────────────────────────────

describe("Index construction", () => {
  it("creates an empty Index", () => {
    const idx = new Index<number>([]);
    expect(idx.size).toBe(0);
    expect(idx.empty).toBe(true);
  });

  it("creates a numeric Index", () => {
    const idx = new Index([10, 20, 30]);
    expect(idx.size).toBe(3);
    expect(idx.toArray()).toEqual([10, 20, 30]);
  });

  it("creates a string Index", () => {
    const idx = new Index(["a", "b", "c"]);
    expect(idx.toArray()).toEqual(["a", "b", "c"]);
  });

  it("creates an Index with a name", () => {
    const idx = new Index([1, 2], "myname");
    expect(idx.name).toBe("myname");
  });

  it("defaults name to null when omitted", () => {
    const idx = new Index([1, 2]);
    expect(idx.name).toBeNull();
  });

  it("creates via Index.from() factory", () => {
    const opts: IndexOptions<number> = { data: [1, 2, 3], name: "x" };
    const idx = Index.from(opts);
    expect(idx.size).toBe(3);
    expect(idx.name).toBe("x");
  });

  it("freezes internal values (immutable)", () => {
    const data = [1, 2, 3];
    const idx = new Index(data);
    data.push(4); // mutating original array doesn't affect Index
    expect(idx.size).toBe(3);
  });
});

// ─── properties ───────────────────────────────────────────────────

describe("Index properties", () => {
  it("shape returns a 1-element tuple", () => {
    const idx = new Index([1, 2, 3]);
    expect(idx.shape).toEqual([3]);
  });

  it("ndim is always 1", () => {
    expect(new Index([]).ndim).toBe(1);
    expect(new Index([1, 2, 3]).ndim).toBe(1);
  });

  it("empty is true for zero-length", () => {
    expect(new Index([]).empty).toBe(true);
    expect(new Index([1]).empty).toBe(false);
  });

  it("values returns the labels", () => {
    const idx = new Index(["x", "y"]);
    expect([...idx.values]).toEqual(["x", "y"]);
  });
});

// ─── uniqueness ───────────────────────────────────────────────────

describe("Index uniqueness", () => {
  it("isUnique is true when all labels are distinct", () => {
    expect(new Index([1, 2, 3]).isUnique).toBe(true);
  });

  it("isUnique is false with duplicates", () => {
    expect(new Index([1, 2, 1]).isUnique).toBe(false);
  });

  it("hasDuplicates is the inverse of isUnique", () => {
    expect(new Index([1, 2, 3]).hasDuplicates).toBe(false);
    expect(new Index([1, 2, 1]).hasDuplicates).toBe(true);
  });
});

// ─── monotonicity ─────────────────────────────────────────────────

describe("Index monotonicity", () => {
  it("detects monotonic increasing", () => {
    expect(new Index([1, 2, 3]).isMonotonicIncreasing).toBe(true);
    expect(new Index([1, 1, 2]).isMonotonicIncreasing).toBe(true); // weakly
    expect(new Index([3, 2, 1]).isMonotonicIncreasing).toBe(false);
  });

  it("detects monotonic decreasing", () => {
    expect(new Index([3, 2, 1]).isMonotonicDecreasing).toBe(true);
    expect(new Index([3, 3, 1]).isMonotonicDecreasing).toBe(true); // weakly
    expect(new Index([1, 2, 3]).isMonotonicDecreasing).toBe(false);
  });

  it("empty and single-element are both monotonic", () => {
    expect(new Index<number>([]).isMonotonicIncreasing).toBe(true);
    expect(new Index([42]).isMonotonicIncreasing).toBe(true);
    expect(new Index<number>([]).isMonotonicDecreasing).toBe(true);
    expect(new Index([42]).isMonotonicDecreasing).toBe(true);
  });

  it("null values break monotonicity", () => {
    expect(new Index([1, null, 3]).isMonotonicIncreasing).toBe(false);
    expect(new Index([3, null, 1]).isMonotonicDecreasing).toBe(false);
  });
});

// ─── element access ───────────────────────────────────────────────

describe("Index.at()", () => {
  it("returns the element at a positive index", () => {
    const idx = new Index(["a", "b", "c"]);
    expect(idx.at(0)).toBe("a");
    expect(idx.at(2)).toBe("c");
  });

  it("supports negative indexing", () => {
    const idx = new Index(["a", "b", "c"]);
    expect(idx.at(-1)).toBe("c");
    expect(idx.at(-3)).toBe("a");
  });

  it("throws RangeError for out-of-bounds", () => {
    const idx = new Index([1, 2]);
    expect(() => idx.at(5)).toThrow(RangeError);
    expect(() => idx.at(-3)).toThrow(RangeError);
  });
});

describe("Index.slice()", () => {
  it("returns a sub-index", () => {
    const idx = new Index([10, 20, 30, 40, 50]);
    expect(idx.slice(1, 3).toArray()).toEqual([20, 30]);
  });

  it("preserves name", () => {
    const idx = new Index([1, 2, 3], "x");
    expect(idx.slice(0, 2).name).toBe("x");
  });
});

describe("Index.take()", () => {
  it("picks specific positions", () => {
    const idx = new Index(["a", "b", "c", "d"]);
    expect(idx.take([3, 1]).toArray()).toEqual(["d", "b"]);
  });
});

// ─── look-up ──────────────────────────────────────────────────────

describe("Index.getLoc()", () => {
  it("returns a single position for unique key", () => {
    const idx = new Index(["a", "b", "c"]);
    expect(idx.getLoc("b")).toBe(1);
  });

  it("returns array for duplicate key", () => {
    const idx = new Index(["a", "b", "a"]);
    expect(idx.getLoc("a")).toEqual([0, 2]);
  });

  it("throws for missing key", () => {
    const idx = new Index([1, 2, 3]);
    expect(() => idx.getLoc(99)).toThrow("KeyError");
  });
});

describe("Index.getIndexer()", () => {
  it("maps target labels to positions", () => {
    const idx = new Index(["a", "b", "c"]);
    const target = new Index(["c", "a", "z"]);
    expect(idx.getIndexer(target)).toEqual([2, 0, -1]);
  });
});

describe("Index.contains()", () => {
  it("returns true for present labels", () => {
    const idx = new Index([1, 2, 3]);
    expect(idx.contains(2)).toBe(true);
  });

  it("returns false for absent labels", () => {
    const idx = new Index([1, 2, 3]);
    expect(idx.contains(99)).toBe(false);
  });
});

describe("Index.isin()", () => {
  it("returns boolean mask", () => {
    const idx = new Index([1, 2, 3, 4]);
    expect(idx.isin([2, 4])).toEqual([false, true, false, true]);
  });
});

// ─── set operations ───────────────────────────────────────────────

describe("Index set operations", () => {
  it("union combines unique labels", () => {
    const a = new Index([1, 2, 3]);
    const b = new Index([3, 4, 5]);
    expect(a.union(b).toArray()).toEqual([1, 2, 3, 4, 5]);
  });

  it("intersection returns common labels", () => {
    const a = new Index([1, 2, 3]);
    const b = new Index([2, 3, 4]);
    expect(a.intersection(b).toArray()).toEqual([2, 3]);
  });

  it("difference removes other's labels", () => {
    const a = new Index([1, 2, 3]);
    const b = new Index([2, 4]);
    expect(a.difference(b).toArray()).toEqual([1, 3]);
  });

  it("symmetricDifference returns exclusive labels", () => {
    const a = new Index([1, 2, 3]);
    const b = new Index([2, 3, 4]);
    expect(a.symmetricDifference(b).toArray()).toEqual([1, 4]);
  });

  it("set operations preserve name from self", () => {
    const a = new Index([1, 2], "x");
    const b = new Index([2, 3], "y");
    expect(a.union(b).name).toBe("x");
  });
});

// ─── duplicate handling ───────────────────────────────────────────

describe("Index.duplicated()", () => {
  const idx = new Index(["a", "b", "a", "c", "b"]);

  it("keep='first' marks later occurrences", () => {
    expect(idx.duplicated("first")).toEqual([false, false, true, false, true]);
  });

  it("keep='last' marks earlier occurrences", () => {
    expect(idx.duplicated("last")).toEqual([true, true, false, false, false]);
  });

  it("keep=false marks all duplicates", () => {
    expect(idx.duplicated(false)).toEqual([true, true, true, false, true]);
  });
});

describe("Index.dropDuplicates()", () => {
  it("removes duplicates keeping first", () => {
    const idx = new Index(["a", "b", "a"]);
    expect(idx.dropDuplicates("first").toArray()).toEqual(["a", "b"]);
  });

  it("removes duplicates keeping last", () => {
    const idx = new Index(["a", "b", "a"]);
    expect(idx.dropDuplicates("last").toArray()).toEqual(["b", "a"]);
  });
});

describe("Index.nunique()", () => {
  it("counts distinct labels", () => {
    expect(new Index([1, 2, 2, 3]).nunique()).toBe(3);
  });
});

// ─── manipulation ─────────────────────────────────────────────────

describe("Index.append()", () => {
  it("concatenates two indices", () => {
    const a = new Index([1, 2]);
    const b = new Index([3, 4]);
    expect(a.append(b).toArray()).toEqual([1, 2, 3, 4]);
  });

  it("concatenates multiple indices", () => {
    const a = new Index([1]);
    expect(a.append([new Index([2]), new Index([3])]).toArray()).toEqual([1, 2, 3]);
  });
});

describe("Index.insert()", () => {
  it("inserts at position", () => {
    const idx = new Index(["a", "c"]);
    expect(idx.insert(1, "b").toArray()).toEqual(["a", "b", "c"]);
  });
});

describe("Index.delete()", () => {
  it("removes a single position", () => {
    const idx = new Index([10, 20, 30]);
    expect(idx.delete(1).toArray()).toEqual([10, 30]);
  });

  it("removes multiple positions", () => {
    const idx = new Index([10, 20, 30, 40]);
    expect(idx.delete([0, 2]).toArray()).toEqual([20, 40]);
  });
});

describe("Index.drop()", () => {
  it("drops by label value", () => {
    const idx = new Index(["a", "b", "c", "a"]);
    expect(idx.drop(["a"]).toArray()).toEqual(["b", "c"]);
  });
});

describe("Index.copy()", () => {
  it("produces an equal but independent copy", () => {
    const idx = new Index([1, 2], "orig");
    const c = idx.copy();
    expect(c.equals(idx)).toBe(true);
    expect(c.name).toBe("orig");
  });

  it("can change name via copy()", () => {
    const idx = new Index([1, 2], "orig");
    expect(idx.copy("new").name).toBe("new");
  });
});

describe("Index.rename()", () => {
  it("returns a new Index with a different name", () => {
    const idx = new Index([1, 2], "old");
    const renamed = idx.rename("new");
    expect(renamed.name).toBe("new");
    expect(renamed.equals(idx)).toBe(true);
  });
});

// ─── comparison ───────────────────────────────────────────────────

describe("Index.equals()", () => {
  it("is true for identical values", () => {
    expect(new Index([1, 2]).equals(new Index([1, 2]))).toBe(true);
  });

  it("is false for different values", () => {
    expect(new Index([1, 2]).equals(new Index([1, 3]))).toBe(false);
  });

  it("is false for different lengths", () => {
    expect(new Index([1, 2]).equals(new Index([1, 2, 3]))).toBe(false);
  });

  it("ignores name", () => {
    expect(new Index([1, 2], "a").equals(new Index([1, 2], "b"))).toBe(true);
  });
});

describe("Index.identical()", () => {
  it("requires same values AND name", () => {
    expect(new Index([1], "x").identical(new Index([1], "x"))).toBe(true);
    expect(new Index([1], "x").identical(new Index([1], "y"))).toBe(false);
  });
});

// ─── conversion ───────────────────────────────────────────────────

describe("Index.toArray() / toList()", () => {
  it("returns a plain array", () => {
    const idx = new Index([1, 2, 3]);
    const arr = idx.toArray();
    expect(arr).toEqual([1, 2, 3]);
    expect(idx.toList()).toEqual(arr);
  });
});

// ─── aggregation ──────────────────────────────────────────────────

describe("Index aggregation", () => {
  it("min() returns the smallest", () => {
    expect(new Index([3, 1, 2]).min()).toBe(1);
  });

  it("max() returns the largest", () => {
    expect(new Index([3, 1, 2]).max()).toBe(3);
  });

  it("min()/max() return undefined for empty Index", () => {
    expect(new Index<number>([]).min()).toBeUndefined();
    expect(new Index<number>([]).max()).toBeUndefined();
  });

  it("argmin() returns position of minimum", () => {
    expect(new Index([30, 10, 20]).argmin()).toBe(1);
  });

  it("argmax() returns position of maximum", () => {
    expect(new Index([30, 10, 20]).argmax()).toBe(0);
  });

  it("argmin()/argmax() throw on empty Index", () => {
    expect(() => new Index<number>([]).argmin()).toThrow();
    expect(() => new Index<number>([]).argmax()).toThrow();
  });
});

describe("Index.argsort()", () => {
  it("returns the sort permutation", () => {
    const idx = new Index([30, 10, 20]);
    expect(idx.argsort()).toEqual([1, 2, 0]);
  });
});

describe("Index.sortValues()", () => {
  it("sorts ascending by default", () => {
    expect(new Index([3, 1, 2]).sortValues().toArray()).toEqual([1, 2, 3]);
  });

  it("sorts descending when requested", () => {
    expect(new Index([3, 1, 2]).sortValues(false).toArray()).toEqual([3, 2, 1]);
  });
});

// ─── missing-value helpers ────────────────────────────────────────

describe("Index missing-value helpers", () => {
  it("isna() marks nulls", () => {
    expect(new Index([1, null, 3]).isna()).toEqual([false, true, false]);
  });

  it("notna() is the inverse of isna()", () => {
    expect(new Index([1, null, 3]).notna()).toEqual([true, false, true]);
  });

  it("dropna() removes nulls", () => {
    expect(new Index([1, null, 3]).dropna().toArray()).toEqual([1, 3]);
  });

  it("fillna() replaces nulls", () => {
    expect(new Index([1, null, 3]).fillna(0).toArray()).toEqual([1, 0, 3]);
  });
});

// ─── iteration / misc ────────────────────────────────────────────

describe("Index iteration", () => {
  it("supports for…of", () => {
    const idx = new Index([10, 20, 30]);
    const collected: number[] = [];
    for (const v of idx) {
      collected.push(v);
    }
    expect(collected).toEqual([10, 20, 30]);
  });

  it("toString() produces a readable representation", () => {
    const idx = new Index([1, 2], "x");
    expect(idx.toString()).toBe("Index([1, 2], name='x')");
  });

  it("toString() omits name when null", () => {
    expect(new Index([1]).toString()).toBe("Index([1])");
  });
});

describe("Index.map()", () => {
  it("transforms each label", () => {
    const idx = new Index([1, 2, 3]);
    const doubled = idx.map((v) => (v !== null ? v * 2 : null));
    expect(doubled.toArray()).toEqual([2, 4, 6]);
  });
});
