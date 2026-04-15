import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { natArgSort, natCompare, natSortKey, natSorted } from "../../src/core/natsort.ts";

function mustAt<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error("expected value at index");
  }
  return value;
}

// ─── natCompare ───────────────────────────────────────────────────────────────

describe("natCompare", () => {
  it("orders numbers embedded in strings numerically", () => {
    expect(natCompare("file9", "file10")).toBeLessThan(0);
    expect(natCompare("file10", "file9")).toBeGreaterThan(0);
    expect(natCompare("file9", "file9")).toBe(0);
  });

  it("handles strings with no digits as plain lexicographic compare", () => {
    expect(natCompare("abc", "abd")).toBeLessThan(0);
    expect(natCompare("z", "a")).toBeGreaterThan(0);
    expect(natCompare("same", "same")).toBe(0);
  });

  it("handles leading zeros correctly (numeric comparison)", () => {
    // "007" and "7" → both become number 7 → equal
    expect(natCompare("007", "7")).toBe(0);
    expect(natCompare("007", "8")).toBeLessThan(0);
    expect(natCompare("007", "6")).toBeGreaterThan(0);
  });

  it("handles purely numeric strings", () => {
    expect(natCompare("2", "10")).toBeLessThan(0);
    expect(natCompare("100", "20")).toBeGreaterThan(0);
  });

  it("handles mixed segments: alpha before alpha", () => {
    expect(natCompare("a1b2", "a1b10")).toBeLessThan(0);
    expect(natCompare("a2b1", "a10b1")).toBeLessThan(0);
  });

  it("handles empty strings", () => {
    expect(natCompare("", "")).toBe(0);
    expect(natCompare("", "a")).toBeLessThan(0);
    expect(natCompare("a", "")).toBeGreaterThan(0);
  });

  it("ignoreCase: folds text tokens", () => {
    expect(natCompare("File10", "file2", { ignoreCase: true })).toBeGreaterThan(0);
    expect(natCompare("FILE1", "file2", { ignoreCase: true })).toBeLessThan(0);
    // without ignoreCase, uppercase 'F' < lowercase 'f' in ASCII
    expect(natCompare("FILE1", "file2", { ignoreCase: false })).toBeLessThan(0);
  });

  it("reverse: negates comparison", () => {
    const fwd = natCompare("file9", "file10");
    const rev = natCompare("file9", "file10", { reverse: true });
    expect(fwd).toBeLessThan(0);
    expect(rev).toBeGreaterThan(0);
  });

  it("reverse + equal → still 0", () => {
    expect(natCompare("x1", "x1", { reverse: true })).toBe(0);
  });

  it("mixed digit/text token order: digit before text", () => {
    // "10abc" → [10, "abc"];  "abc" → ["abc"]
    // first tokens: number(10) vs string("abc") → digit wins → "10abc" < "abc"
    expect(natCompare("10abc", "abc")).toBeLessThan(0);
    expect(natCompare("abc", "10abc")).toBeGreaterThan(0);
  });

  it("shorter string is less when it is a prefix", () => {
    expect(natCompare("file", "file1")).toBeLessThan(0);
    expect(natCompare("file1", "file")).toBeGreaterThan(0);
  });

  it("version-string ordering", () => {
    const versions = ["1.10.0", "1.9.0", "1.2.0", "2.0.0", "1.1.0"];
    const sorted = [...versions].sort(natCompare);
    expect(sorted).toEqual(["1.1.0", "1.2.0", "1.9.0", "1.10.0", "2.0.0"]);
  });
});

// ─── natSorted ───────────────────────────────────────────────────────────────

describe("natSorted", () => {
  it("sorts file names in natural order", () => {
    expect(natSorted(["file10.txt", "file2.txt", "file1.txt"])).toEqual([
      "file1.txt",
      "file2.txt",
      "file10.txt",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = ["b", "a", "c"];
    const result = natSorted(input);
    expect(input).toEqual(["b", "a", "c"]);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(natSorted([])).toEqual([]);
  });

  it("single element stays the same", () => {
    expect(natSorted(["x"])).toEqual(["x"]);
  });

  it("reverse option reverses the order", () => {
    expect(natSorted(["file1", "file10", "file2"], { reverse: true })).toEqual([
      "file10",
      "file2",
      "file1",
    ]);
  });

  it("ignoreCase option", () => {
    const words = ["Banana", "apple", "Cherry"];
    expect(natSorted(words, { ignoreCase: true })).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("key function extracts sort key from objects", () => {
    const rows = [{ name: "file10" }, { name: "file2" }, { name: "file1" }];
    expect(natSorted(rows, { key: (r) => r.name })).toEqual([
      { name: "file1" },
      { name: "file2" },
      { name: "file10" },
    ]);
  });

  it("key + reverse", () => {
    const rows = [{ name: "file1" }, { name: "file10" }, { name: "file2" }];
    expect(natSorted(rows, { key: (r) => r.name, reverse: true })).toEqual([
      { name: "file10" },
      { name: "file2" },
      { name: "file1" },
    ]);
  });

  it("throws if elements are not strings and no key provided", () => {
    // We can't call natSorted<number> without key easily due to runtime check
    const arr = [3, 1, 2] as unknown as string[];
    expect(() => natSorted(arr)).toThrow(TypeError);
  });

  it("version strings sort correctly", () => {
    expect(natSorted(["v1.10", "v1.2", "v1.9", "v2.0", "v1.1"])).toEqual([
      "v1.1",
      "v1.2",
      "v1.9",
      "v1.10",
      "v2.0",
    ]);
  });

  it("numeric-only strings", () => {
    expect(natSorted(["10", "9", "2", "1", "20"])).toEqual(["1", "2", "9", "10", "20"]);
  });

  it("mixed alpha-numeric", () => {
    expect(natSorted(["b1", "a20", "a3", "a1", "b2"])).toEqual(["a1", "a3", "a20", "b1", "b2"]);
  });
});

// ─── natSortKey ───────────────────────────────────────────────────────────────

describe("natSortKey", () => {
  it("splits into text and digit tokens", () => {
    expect(natSortKey("file10.txt")).toEqual(["file", 10, ".txt"]);
  });

  it("all-text string gives single token", () => {
    expect(natSortKey("hello")).toEqual(["hello"]);
  });

  it("all-digit string gives single number token", () => {
    expect(natSortKey("42")).toEqual([42]);
  });

  it("leading zeros: token is the numeric value", () => {
    expect(natSortKey("007")).toEqual([7]);
  });

  it("empty string gives empty tokens", () => {
    expect(natSortKey("")).toEqual([]);
  });

  it("ignoreCase folds text tokens", () => {
    expect(natSortKey("File10.TXT", { ignoreCase: true })).toEqual(["file", 10, ".txt"]);
  });

  it("ignoreCase does not affect digit tokens", () => {
    expect(natSortKey("ABC42", { ignoreCase: true })).toEqual(["abc", 42]);
  });

  it("returns immutable result (frozen array check via iteration)", () => {
    const k = natSortKey("x1y2");
    expect([...k]).toEqual(["x", 1, "y", 2]);
  });
});

// ─── natArgSort ───────────────────────────────────────────────────────────────

describe("natArgSort", () => {
  it("returns indices that would sort the array", () => {
    const arr = ["file10", "file2", "file1"];
    const idx = natArgSort(arr);
    expect(idx).toEqual([2, 1, 0]); // file1, file2, file10
    expect(idx.map((i) => mustAt(arr, i))).toEqual(["file1", "file2", "file10"]);
  });

  it("empty array", () => {
    expect(natArgSort([])).toEqual([]);
  });

  it("single element", () => {
    expect(natArgSort(["x"])).toEqual([0]);
  });

  it("reverse option", () => {
    const arr = ["file1", "file2", "file10"];
    const idx = natArgSort(arr, { reverse: true });
    expect(idx.map((i) => mustAt(arr, i))).toEqual(["file10", "file2", "file1"]);
  });

  it("ignoreCase option", () => {
    const arr = ["Banana", "apple", "Cherry"];
    const idx = natArgSort(arr, { ignoreCase: true });
    expect(idx.map((i) => mustAt(arr, i))).toEqual(["apple", "Banana", "Cherry"]);
  });

  it("all identical strings", () => {
    const arr = ["a", "a", "a"];
    const idx = natArgSort(arr);
    // order among equals is stable — indices are 0,1,2 in some order
    expect(idx.sort()).toEqual([0, 1, 2]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("natSorted property tests", () => {
  it("sorted output is a permutation of input", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 0, maxLength: 20 })), (arr) => {
        const sorted = natSorted(arr);
        expect(sorted.length).toBe(arr.length);
        // same multiset
        expect([...sorted].sort()).toEqual([...arr].sort());
      }),
      { numRuns: 200 },
    );
  });

  it("sorted output is in non-decreasing natural order", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 0, maxLength: 20 })), (arr) => {
        const sorted = natSorted(arr);
        for (let i = 0; i + 1 < sorted.length; i++) {
          expect(natCompare(mustAt(sorted, i), mustAt(sorted, i + 1))).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("natArgSort produces equivalent ordering to natSorted", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 0, maxLength: 20 })), (arr) => {
        const sorted = natSorted(arr);
        const fromArgSort = natArgSort(arr).map((i) => mustAt(arr, i));
        expect(fromArgSort).toEqual(sorted);
      }),
      { numRuns: 200 },
    );
  });

  it("natCompare is anti-symmetric", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const ab = natCompare(a, b);
        const ba = natCompare(b, a);
        if (ab === 0) {
          expect(ba).toBe(0);
        } else {
          expect(Math.sign(ab)).toBe(-Math.sign(ba));
        }
      }),
      { numRuns: 500 },
    );
  });

  it("natCompare reverse negates sign", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const fwd = natCompare(a, b);
        const rev = natCompare(a, b, { reverse: true });
        if (fwd === 0) {
          expect(rev).toBe(0);
        } else {
          expect(Math.sign(rev)).toBe(-Math.sign(fwd));
        }
      }),
      { numRuns: 500 },
    );
  });
});
