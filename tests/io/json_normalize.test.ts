/**
 * Tests for src/io/json_normalize.ts — jsonNormalize().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { jsonNormalize } from "../../src/index.ts";

// ─── Basic flattening ─────────────────────────────────────────────────────────

describe("jsonNormalize — basic flattening", () => {
  it("flattens a flat list of records", () => {
    const df = jsonNormalize([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    expect(df.shape).toEqual([2, 2]);
    expect([...df.columns.values]).toEqual(["a", "b"]);
    expect([...df.col("a").values]).toEqual([1, 3]);
    expect([...df.col("b").values]).toEqual([2, 4]);
  });

  it("flattens nested dicts with default separator", () => {
    const df = jsonNormalize([{ a: 1, b: { c: 2, d: 3 } }]);
    expect([...df.columns.values]).toEqual(["a", "b.c", "b.d"]);
    expect([...df.col("b.c").values]).toEqual([2]);
    expect([...df.col("b.d").values]).toEqual([3]);
  });

  it("respects custom sep", () => {
    const df = jsonNormalize([{ a: { b: 1 } }], { sep: "_" });
    expect([...df.columns.values]).toEqual(["a_b"]);
  });

  it("accepts a single object (non-array)", () => {
    const df = jsonNormalize({ x: 1, y: 2 });
    expect(df.shape).toEqual([1, 2]);
    expect([...df.col("x").values]).toEqual([1]);
  });

  it("accepts a JSON string", () => {
    const df = jsonNormalize('[{"a":1},{"a":2}]');
    expect(df.shape).toEqual([2, 1]);
    expect([...df.col("a").values]).toEqual([1, 2]);
  });

  it("accepts a JSON string that is a single object", () => {
    const df = jsonNormalize('{"k":"v"}');
    expect(df.shape).toEqual([1, 1]);
    expect([...df.col("k").values]).toEqual(["v"]);
  });

  it("fills missing columns with null", () => {
    const df = jsonNormalize([{ a: 1 }, { a: 2, b: 3 }]);
    expect([...df.col("b").values]).toEqual([null, 3]);
  });

  it("returns empty DataFrame for empty array", () => {
    const df = jsonNormalize([]);
    expect(df.shape).toEqual([0, 0]);
  });

  it("stringifies arrays at leaf positions", () => {
    const df = jsonNormalize([{ a: [1, 2, 3] }]);
    expect([...df.col("a").values]).toEqual(["[1,2,3]"]);
  });

  it("handles null primitive values", () => {
    const df = jsonNormalize([{ a: null, b: 1 }]);
    expect([...df.col("a").values]).toEqual([null]);
  });

  it("flattens deeply nested objects", () => {
    const df = jsonNormalize([{ a: { b: { c: { d: 99 } } } }]);
    expect([...df.columns.values]).toEqual(["a.b.c.d"]);
    expect([...df.col("a.b.c.d").values]).toEqual([99]);
  });

  it("respects maxLevel=1", () => {
    const df = jsonNormalize([{ a: { b: { c: 1 } } }], { maxLevel: 1 });
    // depth=0 at top level key 'a', value is an object → flatten (depth becomes 1)
    // at depth=1, 'b' value is an object → atMax, so stringify
    expect([...df.columns.values]).toEqual(["a.b"]);
    expect([...df.col("a.b").values]).toEqual(['{"c":1}']);
  });

  it("respects maxLevel=0 — no flattening", () => {
    const df = jsonNormalize([{ a: { b: 1 } }], { maxLevel: 0 });
    expect([...df.columns.values]).toEqual(["a"]);
    expect([...df.col("a").values]).toEqual(['{"b":1}']);
  });
});

// ─── recordPath ───────────────────────────────────────────────────────────────

describe("jsonNormalize — recordPath", () => {
  it("drills into a nested array via recordPath string", () => {
    const data = [
      { id: 1, items: [{ name: "a" }, { name: "b" }] },
      { id: 2, items: [{ name: "c" }] },
    ];
    const df = jsonNormalize(data, { recordPath: "items" });
    expect(df.shape).toEqual([3, 1]);
    expect([...df.col("name").values]).toEqual(["a", "b", "c"]);
  });

  it("drills via nested path array", () => {
    const data = [{ outer: { inner: [{ val: 1 }, { val: 2 }] } }];
    const df = jsonNormalize(data, { recordPath: ["outer", "inner"] });
    expect([...df.col("val").values]).toEqual([1, 2]);
  });

  it("applies recordPrefix to record columns", () => {
    const data = [{ items: [{ x: 1 }] }];
    const df = jsonNormalize(data, { recordPath: "items", recordPrefix: "item_" });
    expect([...df.columns.values]).toEqual(["item_x"]);
  });

  it("skips records where recordPath is absent", () => {
    const data = [
      { id: 1, items: [{ v: 10 }] },
      { id: 2 }, // missing items
    ];
    const df = jsonNormalize(data, { recordPath: "items" });
    expect(df.shape).toEqual([1, 1]);
    expect([...df.col("v").values]).toEqual([10]);
  });

  it("throws when recordPath does not point to array", () => {
    expect(() => jsonNormalize([{ items: "not-an-array" }], { recordPath: "items" })).toThrow();
  });
});

// ─── meta ─────────────────────────────────────────────────────────────────────

describe("jsonNormalize — meta", () => {
  it("includes scalar meta fields alongside record columns", () => {
    const data = [
      { id: 1, name: "Alice", items: [{ v: 10 }, { v: 20 }] },
      { id: 2, name: "Bob", items: [{ v: 30 }] },
    ];
    const df = jsonNormalize(data, { recordPath: "items", meta: ["id", "name"] });
    expect(df.shape).toEqual([3, 3]);
    expect([...df.col("id").values]).toEqual([1, 1, 2]);
    expect([...df.col("name").values]).toEqual(["Alice", "Alice", "Bob"]);
    expect([...df.col("v").values]).toEqual([10, 20, 30]);
  });

  it("applies metaPrefix to meta columns", () => {
    const data = [{ id: 1, items: [{ v: 10 }] }];
    const df = jsonNormalize(data, {
      recordPath: "items",
      meta: ["id"],
      metaPrefix: "meta_",
    });
    expect([...df.columns.values]).toEqual(["v", "meta_id"]);
  });

  it("throws on missing meta key when errors=raise (default)", () => {
    const data = [{ items: [{ v: 1 }] }]; // no 'id' field
    expect(() => jsonNormalize(data, { recordPath: "items", meta: ["id"] })).toThrow(
      /meta key.*id/,
    );
  });

  it("fills null on missing meta key when errors=ignore", () => {
    const data = [{ items: [{ v: 1 }] }];
    const df = jsonNormalize(data, {
      recordPath: "items",
      meta: ["id"],
      errors: "ignore",
    });
    expect([...df.col("id").values]).toEqual([null]);
  });

  it("supports nested meta path", () => {
    const data = [{ info: { id: 42 }, items: [{ v: 1 }] }];
    const df = jsonNormalize(data, { recordPath: "items", meta: [["info", "id"]] });
    expect([...df.col("info.id").values]).toEqual([42]);
  });

  it("meta on flat records (no recordPath)", () => {
    // meta fields are just normal columns when no recordPath
    const data = [{ a: 1, b: 2 }];
    const df = jsonNormalize(data, { meta: ["a"] });
    // 'a' appears in flattened output anyway; meta just ensures it's there
    expect([...df.col("a").values]).toEqual([1]);
  });
});

// ─── dtype inference ──────────────────────────────────────────────────────────

describe("jsonNormalize — dtype inference", () => {
  it("infers int64 for all-integer columns", () => {
    const df = jsonNormalize([{ n: 1 }, { n: 2 }]);
    expect(df.col("n").dtype.name).toBe("int64");
  });

  it("infers float64 when any value is non-integer", () => {
    const df = jsonNormalize([{ n: 1.5 }, { n: 2 }]);
    expect(df.col("n").dtype.name).toBe("float64");
  });

  it("infers bool for boolean columns", () => {
    const df = jsonNormalize([{ b: true }, { b: false }]);
    expect(df.col("b").dtype.name).toBe("bool");
  });

  it("infers object for mixed / string columns", () => {
    const df = jsonNormalize([{ s: "hello" }, { s: "world" }]);
    expect(df.col("s").dtype.name).toBe("object");
  });
});

// ─── column ordering ──────────────────────────────────────────────────────────

describe("jsonNormalize — column ordering", () => {
  it("preserves first-seen column order", () => {
    const data = [
      { a: 1, b: 2 },
      { b: 3, c: 4, a: 5 },
    ];
    const df = jsonNormalize(data);
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("jsonNormalize — property tests", () => {
  it("row count matches total records in flat case", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ x: fc.integer(), y: fc.string() }), { minLength: 0, maxLength: 20 }),
        (records) => {
          const df = jsonNormalize(records as { x: number; y: string }[]);
          if (records.length === 0) {
            expect(df.shape[0]).toBe(0);
          } else {
            expect(df.shape[0]).toBe(records.length);
          }
        },
      ),
    );
  });

  it("row count equals sum of nested arrays when using recordPath", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer(),
            items: fc.array(fc.record({ v: fc.integer() }), { minLength: 0, maxLength: 5 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (records) => {
          const total = records.reduce((s, r) => s + r.items.length, 0);
          const df = jsonNormalize(records as { id: number; items: { v: number }[] }[], {
            recordPath: "items",
          });
          if (total === 0) {
            expect(df.shape[0]).toBe(0);
          } else {
            expect(df.shape[0]).toBe(total);
          }
        },
      ),
    );
  });

  it("all values in a flat integer column match input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (nums) => {
          const records = nums.map((n) => ({ n }));
          const df = jsonNormalize(records);
          expect([...df.col("n").values]).toEqual(nums);
        },
      ),
    );
  });

  it("meta values replicated per child record", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            parentId: fc.integer({ min: 1, max: 100 }),
            children: fc.array(fc.record({ childVal: fc.integer() }), {
              minLength: 1,
              maxLength: 5,
            }),
          }),
          { minLength: 1, maxLength: 8 },
        ),
        (records) => {
          const df = jsonNormalize(
            records as { parentId: number; children: { childVal: number }[] }[],
            { recordPath: "children", meta: ["parentId"] },
          );
          // For each row, parentId should be a valid parentId from input
          const validIds = new Set(records.map((r) => r.parentId));
          for (const v of df.col("parentId").values) {
            expect(validIds.has(v as number)).toBe(true);
          }
        },
      ),
    );
  });
});
