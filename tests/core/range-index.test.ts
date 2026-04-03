/**
 * Tests for RangeIndex — memory-efficient integer index.
 */

import { describe, expect, it } from "bun:test";
import { Index, RangeIndex } from "../../src/index.ts";

// ─── construction ─────────────────────────────────────────────────

describe("RangeIndex construction", () => {
  it("RangeIndex(5) produces [0,1,2,3,4]", () => {
    const r = new RangeIndex(5);
    expect(r.toArray()).toEqual([0, 1, 2, 3, 4]);
    expect(r.start).toBe(0);
    expect(r.stop).toBe(5);
    expect(r.step).toBe(1);
  });

  it("RangeIndex(2, 6) produces [2,3,4,5]", () => {
    const r = new RangeIndex(2, 6);
    expect(r.toArray()).toEqual([2, 3, 4, 5]);
  });

  it("RangeIndex(0, 10, 3) produces [0,3,6,9]", () => {
    const r = new RangeIndex(0, 10, 3);
    expect(r.toArray()).toEqual([0, 3, 6, 9]);
  });

  it("negative step produces descending range", () => {
    const r = new RangeIndex(5, 0, -1);
    expect(r.toArray()).toEqual([5, 4, 3, 2, 1]);
  });

  it("empty range when start >= stop (positive step)", () => {
    const r = new RangeIndex(5, 5);
    expect(r.size).toBe(0);
    expect(r.empty).toBe(true);
  });

  it("empty range when start <= stop (negative step)", () => {
    const r = new RangeIndex(0, 5, -1);
    expect(r.size).toBe(0);
  });

  it("throws on step=0", () => {
    expect(() => new RangeIndex(0, 5, 0)).toThrow(RangeError);
  });

  it("accepts a name", () => {
    const r = new RangeIndex(3, undefined, undefined, "idx");
    expect(r.name).toBe("idx");
  });
});

// ─── properties ───────────────────────────────────────────────────

describe("RangeIndex properties", () => {
  it("size is correct", () => {
    expect(new RangeIndex(5).size).toBe(5);
    expect(new RangeIndex(0, 10, 2).size).toBe(5);
  });

  it("shape returns [size]", () => {
    expect(new RangeIndex(5).shape).toEqual([5]);
  });

  it("is always unique", () => {
    expect(new RangeIndex(5).isUnique).toBe(true);
  });

  it("never has duplicates", () => {
    expect(new RangeIndex(5).hasDuplicates).toBe(false);
  });
});

// ─── monotonicity ─────────────────────────────────────────────────

describe("RangeIndex monotonicity", () => {
  it("positive step is monotonic increasing", () => {
    const r = new RangeIndex(5);
    expect(r.isMonotonicIncreasing).toBe(true);
    expect(r.isMonotonicDecreasing).toBe(false);
  });

  it("negative step is monotonic decreasing", () => {
    const r = new RangeIndex(5, 0, -1);
    expect(r.isMonotonicDecreasing).toBe(true);
    expect(r.isMonotonicIncreasing).toBe(false);
  });

  it("single-element is both monotonic", () => {
    const r = new RangeIndex(1);
    expect(r.isMonotonicIncreasing).toBe(true);
    expect(r.isMonotonicDecreasing).toBe(true);
  });

  it("empty is both monotonic", () => {
    const r = new RangeIndex(0);
    expect(r.isMonotonicIncreasing).toBe(true);
    expect(r.isMonotonicDecreasing).toBe(true);
  });
});

// ─── element access ───────────────────────────────────────────────

describe("RangeIndex element access", () => {
  it("at() retrieves correct elements", () => {
    const r = new RangeIndex(0, 10, 2);
    expect(r.at(0)).toBe(0);
    expect(r.at(2)).toBe(4);
    expect(r.at(-1)).toBe(8);
  });

  it("slice() returns a RangeIndex", () => {
    const r = new RangeIndex(10);
    const sliced = r.slice(2, 5);
    expect(sliced).toBeInstanceOf(RangeIndex);
    expect(sliced.toArray()).toEqual([2, 3, 4]);
  });

  it("slice() on stepped range", () => {
    const r = new RangeIndex(0, 20, 5); // [0, 5, 10, 15]
    const sliced = r.slice(1, 3);
    expect(sliced.toArray()).toEqual([5, 10]);
  });

  it("empty slice returns empty RangeIndex", () => {
    const r = new RangeIndex(5);
    const sliced = r.slice(3, 3);
    expect(sliced.size).toBe(0);
    expect(sliced).toBeInstanceOf(RangeIndex);
  });
});

// ─── inherited Index methods ──────────────────────────────────────

describe("RangeIndex inherits Index methods", () => {
  it("getLoc() finds positions", () => {
    const r = new RangeIndex(0, 10, 2); // [0, 2, 4, 6, 8]
    expect(r.getLoc(4)).toBe(2);
  });

  it("contains() works", () => {
    const r = new RangeIndex(5);
    expect(r.contains(3)).toBe(true);
    expect(r.contains(5)).toBe(false);
  });

  it("isin() returns boolean mask", () => {
    const r = new RangeIndex(5); // [0,1,2,3,4]
    expect(r.isin([1, 3])).toEqual([false, true, false, true, false]);
  });

  it("union() combines ranges", () => {
    const a = new RangeIndex(3); // [0,1,2]
    const b = new Index([2, 3, 4]);
    expect(a.union(b).toArray()).toEqual([0, 1, 2, 3, 4]);
  });

  it("intersection() finds overlap", () => {
    const a = new RangeIndex(5); // [0,1,2,3,4]
    const b = new Index([3, 4, 5, 6]);
    expect(a.intersection(b).toArray()).toEqual([3, 4]);
  });

  it("difference() removes other's values", () => {
    const a = new RangeIndex(5); // [0,1,2,3,4]
    const b = new Index([1, 3]);
    expect(a.difference(b).toArray()).toEqual([0, 2, 4]);
  });

  it("sortValues() returns sorted index", () => {
    const r = new RangeIndex(5, 0, -1); // [5,4,3,2,1]
    expect(r.sortValues().toArray()).toEqual([1, 2, 3, 4, 5]);
  });

  it("argsort() returns sort permutation", () => {
    const r = new RangeIndex(3, 0, -1); // [3,2,1]
    expect(r.argsort()).toEqual([2, 1, 0]);
  });

  it("min() and max()", () => {
    const r = new RangeIndex(0, 10, 2); // [0,2,4,6,8]
    expect(r.min()).toBe(0);
    expect(r.max()).toBe(8);
  });
});

// ─── is a subtype of Index ────────────────────────────────────────

describe("RangeIndex is an Index", () => {
  it("instanceof Index is true", () => {
    const r = new RangeIndex(5);
    expect(r).toBeInstanceOf(Index);
  });

  it("can be assigned to Index<number> variable", () => {
    const idx: Index<number> = new RangeIndex(5);
    expect(idx.size).toBe(5);
  });
});

// ─── copy / rename ────────────────────────────────────────────────

describe("RangeIndex copy/rename", () => {
  it("copy() returns a RangeIndex", () => {
    const r = new RangeIndex(0, 10, 2, "orig");
    const c = r.copy();
    expect(c).toBeInstanceOf(RangeIndex);
    expect(c.start).toBe(0);
    expect(c.stop).toBe(10);
    expect(c.step).toBe(2);
    expect(c.name).toBe("orig");
  });

  it("copy(newName) changes name", () => {
    const r = new RangeIndex(3, undefined, undefined, "old");
    expect(r.copy("new").name).toBe("new");
  });

  it("rename() returns a RangeIndex with new name", () => {
    const r = new RangeIndex(3);
    const renamed = r.rename("x");
    expect(renamed).toBeInstanceOf(RangeIndex);
    expect(renamed.name).toBe("x");
    expect(renamed.toArray()).toEqual(r.toArray());
  });
});

// ─── toString ─────────────────────────────────────────────────────

describe("RangeIndex.toString()", () => {
  it("includes start, stop, step", () => {
    const r = new RangeIndex(0, 10, 2);
    expect(r.toString()).toBe("RangeIndex(start=0, stop=10, step=2)");
  });

  it("includes name when set", () => {
    const r = new RangeIndex(5, undefined, undefined, "myidx");
    expect(r.toString()).toContain("name='myidx'");
  });
});
