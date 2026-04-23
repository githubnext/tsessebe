/**
 * Tests for str_findall — strFindall, strFindallCount, strFindFirst, strFindallExpand
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/index.ts";
import {
  strFindFirst,
  strFindall,
  strFindallCount,
  strFindallExpand,
} from "../../src/stats/str_findall.ts";

// ─── strFindall ───────────────────────────────────────────────────────────────

describe("strFindall", () => {
  test("basic word matching", () => {
    const s = new Series({ data: ["one two three", "four five"] });
    const result = strFindall(s, /\w+/);
    expect(JSON.parse(result.values[0] as string)).toEqual(["one", "two", "three"]);
    expect(JSON.parse(result.values[1] as string)).toEqual(["four", "five"]);
  });

  test("no matches returns empty array", () => {
    const s = new Series({ data: ["hello", "world"] });
    const result = strFindall(s, /\d+/);
    expect(JSON.parse(result.values[0] as string)).toEqual([]);
    expect(JSON.parse(result.values[1] as string)).toEqual([]);
  });

  test("null/NaN elements return null", () => {
    const s = new Series({ data: ["hello", null, Number.NaN, "world"] });
    const result = strFindall(s, /\w+/);
    expect(result.values[0]).not.toBeNull();
    expect(result.values[1]).toBeNull();
    expect(result.values[2]).toBeNull();
    expect(result.values[3]).not.toBeNull();
  });

  test("with capture group returns first group", () => {
    const s = new Series({ data: ["key=val", "a=1 b=2"] });
    const result = strFindall(s, /(\w+)=\w+/);
    expect(JSON.parse(result.values[0] as string)).toEqual(["key"]);
    expect(JSON.parse(result.values[1] as string)).toEqual(["a", "b"]);
  });

  test("string pattern with flags", () => {
    const s = new Series({ data: ["AAA bbb", "ccc DDD"] });
    const result = strFindall(s, "[a-z]+", "i");
    expect((JSON.parse(result.values[0] as string) as string[]).length).toBe(2);
  });

  test("preserves index", () => {
    const s = new Series({ data: ["a b", "c d"], index: ["x", "y"] });
    const result = strFindall(s, /\w/);
    expect(result.index.toArray()).toEqual(["x", "y"]);
  });

  test("array input", () => {
    const result = strFindall(["hello world", "foo bar"], /\w+/);
    expect(JSON.parse(result.values[0] as string)).toEqual(["hello", "world"]);
  });

  test("scalar input treated as single element", () => {
    const result = strFindall("hello world", /\w+/);
    expect(result.values.length).toBe(1);
    expect(JSON.parse(result.values[0] as string)).toEqual(["hello", "world"]);
  });

  test("consecutive matches", () => {
    const s = new Series({ data: ["aababc"] });
    const result = strFindall(s, /a+/);
    expect(JSON.parse(result.values[0] as string)).toEqual(["aa", "a"]);
  });

  // property: count of findall matches equals strFindallCount
  test("property: findall length matches findallCount", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (strs) => {
          const s = new Series({ data: strs });
          const all = strFindall(s, /\w+/);
          const cnt = strFindallCount(s, /\w+/);
          for (let i = 0; i < strs.length; i++) {
            const matches = JSON.parse(all.values[i] as string) as string[];
            expect(cnt.values[i]).toBe(matches.length);
          }
        },
      ),
    );
  });
});

// ─── strFindallCount ──────────────────────────────────────────────────────────

describe("strFindallCount", () => {
  test("counts matches correctly", () => {
    const s = new Series({ data: ["aaa", "bbb", "ccc"] });
    const result = strFindallCount(s, /a/);
    expect(result.values).toEqual([3, 0, 0]);
  });

  test("zero for no match", () => {
    const s = new Series({ data: ["xyz", "abc"] });
    const result = strFindallCount(s, /\d/);
    expect(result.values).toEqual([0, 0]);
  });

  test("null for null input", () => {
    const s = new Series({ data: [null, "abc"] });
    const result = strFindallCount(s, /\w/);
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe(3);
  });

  test("overlapping-looking pattern counts non-overlapping", () => {
    const s = new Series({ data: ["aaaa"] });
    // /aa/ matches at index 0 and 2 → 2 matches
    const result = strFindallCount(s, /aa/);
    expect(result.values[0]).toBe(2);
  });

  test("string pattern", () => {
    const s = new Series({ data: ["Hello World", "FOO FOO"] });
    const result = strFindallCount(s, "[A-Z]+", "g");
    // /[A-Z]+/g: "H", "W" → 2; "FOO", "FOO" → 2
    expect(result.values[0]).toBe(2);
    expect(result.values[1]).toBe(2);
  });

  // property: count is always non-negative integer for non-null inputs
  test("property: count >= 0 for non-null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
        (strs) => {
          const s = new Series({ data: strs });
          const cnt = strFindallCount(s, /\w/);
          for (const v of cnt.values) {
            expect(typeof v === "number" && v >= 0).toBe(true);
          }
        },
      ),
    );
  });
});

// ─── strFindFirst ─────────────────────────────────────────────────────────────

describe("strFindFirst", () => {
  test("returns first match", () => {
    const s = new Series({ data: ["price: $10.99", "no price", "cost: $5.00"] });
    const result = strFindFirst(s, /\$[\d.]+/);
    expect(result.values).toEqual(["$10.99", null, "$5.00"]);
  });

  test("null for null input", () => {
    const s = new Series({ data: [null, "abc123"] });
    const result = strFindFirst(s, /\d+/);
    expect(result.values[0]).toBeNull();
    expect(result.values[1]).toBe("123");
  });

  test("null for no match", () => {
    const s = new Series({ data: ["hello", "world"] });
    const result = strFindFirst(s, /\d+/);
    expect(result.values).toEqual([null, null]);
  });

  test("returns first capture group when group present", () => {
    const s = new Series({ data: ["2024-01-15", "2023-12-31"] });
    const result = strFindFirst(s, /(\d{4})-\d{2}-\d{2}/);
    expect(result.values).toEqual(["2024", "2023"]);
  });

  test("does not consume multiple matches (only first)", () => {
    const s = new Series({ data: ["aaa"] });
    const result = strFindFirst(s, /a/);
    expect(result.values).toEqual(["a"]);
  });

  test("preserves index", () => {
    const s = new Series({ data: ["foo1", "bar2"], index: ["p", "q"] });
    const result = strFindFirst(s, /\d/);
    expect(result.index.toArray()).toEqual(["p", "q"]);
    expect(result.values).toEqual(["1", "2"]);
  });

  test("array input", () => {
    const result = strFindFirst(["hello123", "world456"], /\d+/);
    expect(result.values).toEqual(["123", "456"]);
  });

  // property: strFindFirst result matches first element of strFindall
  test("property: findFirst equals first element of findall", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 0, maxLength: 15 }).filter((s) => !s.includes("\0")),
          { minLength: 1, maxLength: 6 },
        ),
        (strs) => {
          const s = new Series({ data: strs });
          const first = strFindFirst(s, /[a-z]+/);
          const all = strFindall(s, /[a-z]+/);
          for (let i = 0; i < strs.length; i++) {
            const allMatches = JSON.parse(all.values[i] as string) as string[];
            if (allMatches.length === 0) {
              expect(first.values[i]).toBeNull();
            } else {
              expect(first.values[i]).toBe(allMatches[0]);
            }
          }
        },
      ),
    );
  });
});

// ─── strFindallExpand ─────────────────────────────────────────────────────────

describe("strFindallExpand", () => {
  test("named capture groups become columns", () => {
    const s = new Series({ data: ["John 30", "Jane 25", "unknown"] });
    const df = strFindallExpand(s, /(?<name>\w+)\s+(?<age>\d+)/);
    expect(df.columns.values).toEqual(["name", "age"]);
    expect(df.col("name").values).toEqual(["John", "Jane", null]);
    expect(df.col("age").values).toEqual(["30", "25", null]);
  });

  test("unnamed groups numbered as 0, 1, ...", () => {
    const s = new Series({ data: ["abc 123", "def 456"] });
    const df = strFindallExpand(s, /(\w+)\s+(\d+)/);
    expect(df.columns).toContain("0");
    expect(df.columns).toContain("1");
    expect(df.col("0").values).toEqual(["abc", "def"]);
    expect(df.col("1").values).toEqual(["123", "456"]);
  });

  test("null input produces null row", () => {
    const s = new Series({ data: ["hello 5", null] });
    const df = strFindallExpand(s, /(?<word>\w+)\s+(?<num>\d+)/);
    expect(df.col("word").values[1]).toBeNull();
    expect(df.col("num").values[1]).toBeNull();
  });

  test("no match produces null row", () => {
    const s = new Series({ data: ["hello", "world 42"] });
    const df = strFindallExpand(s, /(?<word>\w+)\s+(?<num>\d+)/);
    expect(df.col("word").values[0]).toBeNull();
    expect(df.col("num").values[0]).toBeNull();
    expect(df.col("word").values[1]).toBe("world");
    expect(df.col("num").values[1]).toBe("42");
  });

  test("preserves row index from Series", () => {
    const s = new Series({ data: ["a 1", "b 2"], index: ["r1", "r2"] });
    const df = strFindallExpand(s, /(?<letter>\w)\s+(?<digit>\d)/);
    expect(df.index.toArray()).toEqual(["r1", "r2"]);
  });

  test("array input works", () => {
    const df = strFindallExpand(["x 10", "y 20"], /(?<c>\w)\s+(?<n>\d+)/);
    expect(df.col("c").values).toEqual(["x", "y"]);
    expect(df.col("n").values).toEqual(["10", "20"]);
  });

  // property: output has same number of rows as input
  test("property: output rows match input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        (strs) => {
          const df = strFindallExpand(strs, /(?<word>\w+)/);
          expect(df.index.size).toBe(strs.length);
        },
      ),
    );
  });
});
