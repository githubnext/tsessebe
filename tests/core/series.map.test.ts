/**
 * Tests for Series.map() — function, Record, Series, and Map overloads.
 *
 * Mirrors the behaviour of `pandas.Series.map`:
 * - function mapper: called element-wise, receives (value, index, pos)
 * - Record mapper: string-key lookup, missing → null
 * - Series mapper: label-based lookup in mapper Series, missing → null
 * - Map mapper: direct Scalar-key lookup, missing → null
 * - naAction "ignore": pass-through NA values unchanged
 */

import { describe, expect, it } from "bun:test";
import { Index, Series } from "../../src/index.ts";

describe("Series.map — function overload", () => {
  it("transforms each value", () => {
    const s = new Series({ data: [1, 2, 3], name: "x" });
    const result = s.map((v) => (v as number) * 10);
    expect(result.toArray()).toEqual([10, 20, 30]);
    expect(result.name).toBe("x");
  });

  it("receives (value, label, position) arguments", () => {
    const s = new Series({
      data: ["a", "b"],
      index: new Index<string | number>(["x", "y"]),
    });
    const result = s.map((v, idx, pos) => `${String(v)}-${String(idx)}-${pos}`);
    expect(result.toArray()).toEqual(["a-x-0", "b-y-1"]);
  });

  it("returns a new Series with the same index", () => {
    const idx = new Index<number>([10, 20, 30]);
    const s = new Series({ data: [1, 2, 3], index: idx });
    const result = s.map((v) => (v as number) + 100);
    expect(result.index.toArray()).toEqual([10, 20, 30]);
  });
});

describe("Series.map — Record overload", () => {
  it("maps string keys to values", () => {
    const s = new Series({ data: [1, 2, 3] });
    const result = s.map({ "1": "one", "2": "two", "3": "three" });
    expect(result.toArray()).toEqual(["one", "two", "three"]);
  });

  it("returns null for missing keys", () => {
    const s = new Series({ data: [1, 2, 99] });
    const result = s.map({ "1": "one", "2": "two" });
    expect(result.toArray()).toEqual(["one", "two", null]);
  });

  it("preserves index", () => {
    const s = new Series({ data: ["a", "b"], index: new Index<number>([5, 6]) });
    const result = s.map({ a: 1, b: 2 });
    expect(result.index.toArray()).toEqual([5, 6]);
    expect(result.toArray()).toEqual([1, 2]);
  });

  it("handles NA values with naAction ignore", () => {
    const s = new Series({ data: [1, null, 2] });
    const result = s.map({ "1": "one", "2": "two" }, { naAction: "ignore" });
    expect(result.toArray()[0]).toBe("one");
    expect(result.toArray()[1]).toBeNull();
    expect(result.toArray()[2]).toBe("two");
  });

  it("maps null without naAction (passes null to lookup)", () => {
    const s = new Series({ data: [1, null, 2] });
    const result = s.map({ "1": "one", "2": "two" });
    // null stringifies to "null", which is not in the dict → null
    expect(result.toArray()).toEqual(["one", null, "two"]);
  });

  it("empty Series returns empty result", () => {
    const s = new Series({ data: [] as number[] });
    const result = s.map({ "1": "one" });
    expect(result.toArray()).toEqual([]);
  });
});

describe("Series.map — Series overload", () => {
  it("maps values using index-label lookup", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    const mapper = new Series({
      data: [1, 2, 3],
      index: new Index<string>(["a", "b", "c"]),
    });
    const result = s.map(mapper);
    expect(result.toArray()).toEqual([1, 2, 3]);
  });

  it("returns null for values not in mapper index", () => {
    const s = new Series({ data: ["a", "b", "x"] });
    const mapper = new Series({
      data: [1, 2],
      index: new Index<string>(["a", "b"]),
    });
    const result = s.map(mapper);
    expect(result.toArray()).toEqual([1, 2, null]);
  });

  it("preserves the original Series index", () => {
    const s = new Series({
      data: ["a", "b"],
      index: new Index<number>([10, 20]),
    });
    const mapper = new Series({ data: [100, 200], index: new Index<string>(["a", "b"]) });
    const result = s.map(mapper);
    expect(result.index.toArray()).toEqual([10, 20]);
    expect(result.toArray()).toEqual([100, 200]);
  });

  it("naAction ignore skips NA values", () => {
    const s = new Series({ data: ["a", null, "b"] });
    const mapper = new Series({ data: [1, 2], index: new Index<string>(["a", "b"]) });
    const result = s.map(mapper, { naAction: "ignore" });
    expect(result.toArray()[0]).toBe(1);
    expect(result.toArray()[1]).toBeNull();
    expect(result.toArray()[2]).toBe(2);
  });
});

describe("Series.map — Map overload", () => {
  it("maps using ES6 Map by scalar key", () => {
    const s = new Series({ data: [1, 2, 3] });
    const m = new Map<number | string | null | boolean | bigint | Date | undefined, string>([
      [1, "one"],
      [2, "two"],
      [3, "three"],
    ]);
    const result = s.map(m);
    expect(result.toArray()).toEqual(["one", "two", "three"]);
  });

  it("returns null for keys not in Map", () => {
    const s = new Series({ data: [1, 2, 99] });
    const m = new Map<number | string | null | boolean | bigint | Date | undefined, string>([
      [1, "one"],
      [2, "two"],
    ]);
    const result = s.map(m);
    expect(result.toArray()).toEqual(["one", "two", null]);
  });

  it("handles null keys explicitly in Map", () => {
    const s = new Series({ data: [1, null, 2] });
    const m = new Map<number | string | null | boolean | bigint | Date | undefined, string>([
      [1, "one"],
      [null, "nullval"],
      [2, "two"],
    ]);
    const result = s.map(m);
    expect(result.toArray()).toEqual(["one", "nullval", "two"]);
  });

  it("naAction ignore leaves NA values unchanged", () => {
    const s = new Series({ data: [1, null, 2] });
    const m = new Map<number | string | null | boolean | bigint | Date | undefined, string>([
      [1, "one"],
      [2, "two"],
    ]);
    const result = s.map(m, { naAction: "ignore" });
    expect(result.toArray()[0]).toBe("one");
    expect(result.toArray()[1]).toBeNull();
    expect(result.toArray()[2]).toBe("two");
  });

  it("preserves Series name and index", () => {
    const s = new Series({ data: ["x", "y"], name: "col", index: new Index<number>([3, 4]) });
    const m = new Map<number | string | null | boolean | bigint | Date | undefined, number>([
      ["x", 10],
      ["y", 20],
    ]);
    const result = s.map(m);
    expect(result.name).toBe("col");
    expect(result.index.toArray()).toEqual([3, 4]);
  });
});
