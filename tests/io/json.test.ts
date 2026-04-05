/**
 * Tests for src/io/json.ts — readJson() and toJson().
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, readJson, toJson } from "../../src/index.ts";

// ─── readJson: records orient ─────────────────────────────────────────────────

describe("readJson — records orient", () => {
  it("parses an array of row objects", () => {
    const df = readJson('[{"a":1,"b":true},{"a":2,"b":false}]');
    expect(df.shape).toEqual([2, 2]);
    expect([...df.columns.values]).toEqual(["a", "b"]);
    expect([...df.col("a").values]).toEqual([1, 2]);
    expect([...df.col("b").values]).toEqual([true, false]);
  });

  it("auto-detects records orient for array input", () => {
    const df = readJson('[{"x":10}]');
    expect(df.shape).toEqual([1, 1]);
    expect([...df.col("x").values]).toEqual([10]);
  });

  it("handles null values in records", () => {
    const df = readJson('[{"a":1,"b":null},{"a":null,"b":2}]');
    expect([...df.col("a").values]).toEqual([1, null]);
    expect([...df.col("b").values]).toEqual([null, 2]);
  });

  it("handles empty array", () => {
    const df = readJson("[]");
    expect(df.shape).toEqual([0, 0]);
  });

  it("handles union columns across rows", () => {
    const df = readJson('[{"a":1},{"a":2,"b":3}]', { orient: "records" });
    expect([...df.columns.values]).toEqual(["a", "b"]);
    expect([...df.col("a").values]).toEqual([1, 2]);
    expect([...df.col("b").values]).toEqual([null, 3]);
  });

  it("applies dtype override", () => {
    const df = readJson('[{"x":1},{"x":2}]', { dtype: { x: "float64" } });
    expect(df.col("x").dtype.name).toBe("float64");
  });
});

// ─── readJson: split orient ───────────────────────────────────────────────────

describe("readJson — split orient", () => {
  it("parses split JSON with explicit index", () => {
    const json = '{"columns":["a","b"],"index":[10,20],"data":[[1,2],[3,4]]}';
    const df = readJson(json, { orient: "split" });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.index.values]).toEqual([10, 20]);
    expect([...df.col("a").values]).toEqual([1, 3]);
    expect([...df.col("b").values]).toEqual([2, 4]);
  });

  it("auto-detects split orient", () => {
    const json = '{"columns":["a"],"data":[[1],[2]]}';
    const df = readJson(json);
    expect(df.shape).toEqual([2, 1]);
  });

  it("uses RangeIndex when index key is absent", () => {
    const json = '{"columns":["v"],"data":[[10],[20]]}';
    const df = readJson(json, { orient: "split" });
    expect([...df.index.values]).toEqual([0, 1]);
  });

  it("throws on missing columns or data", () => {
    expect(() => readJson('{"columns":["a"]}', { orient: "split" })).toThrow();
    expect(() => readJson('{"data":[[1]]}', { orient: "split" })).toThrow();
  });
});

// ─── readJson: index orient ───────────────────────────────────────────────────

describe("readJson — index orient", () => {
  it("parses index-keyed JSON", () => {
    const json = '{"0":{"a":1,"b":2},"1":{"a":3,"b":4}}';
    const df = readJson(json, { orient: "index" });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.index.values]).toEqual([0, 1]);
    expect([...df.col("a").values]).toEqual([1, 3]);
  });

  it("uses string index for non-numeric keys", () => {
    const json = '{"r0":{"x":1},"r1":{"x":2}}';
    const df = readJson(json, { orient: "index" });
    expect([...df.index.values]).toEqual(["r0", "r1"]);
  });

  it("handles empty object", () => {
    const df = readJson("{}", { orient: "index" });
    expect(df.shape).toEqual([0, 0]);
  });
});

// ─── readJson: columns orient ─────────────────────────────────────────────────

describe("readJson — columns orient", () => {
  it("parses column-keyed JSON", () => {
    const json = '{"a":{"0":1,"1":3},"b":{"0":2,"1":4}}';
    const df = readJson(json, { orient: "columns" });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.col("a").values]).toEqual([1, 3]);
    expect([...df.col("b").values]).toEqual([2, 4]);
  });

  it("handles empty object", () => {
    const df = readJson("{}", { orient: "columns" });
    expect(df.shape).toEqual([0, 0]);
  });
});

// ─── readJson: values orient ──────────────────────────────────────────────────

describe("readJson — values orient", () => {
  it("parses 2-D array with auto-named columns", () => {
    const df = readJson("[[1,2],[3,4]]", { orient: "values" });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.columns.values]).toEqual(["0", "1"]);
    expect([...df.col("0").values]).toEqual([1, 3]);
  });

  it("auto-detects values orient for numeric array", () => {
    const df = readJson("[[1,2,3]]");
    expect(df.shape).toEqual([1, 3]);
  });

  it("handles empty 2-D array", () => {
    const df = readJson("[]", { orient: "values" });
    expect(df.shape).toEqual([0, 0]);
  });
});

// ─── toJson: records orient ───────────────────────────────────────────────────

describe("toJson — records orient", () => {
  it("serializes a DataFrame to records JSON", () => {
    const df = DataFrame.fromRecords([
      { a: 1, b: "x" },
      { a: 2, b: "y" },
    ]);
    const json = toJson(df);
    expect(JSON.parse(json)).toEqual([
      { a: 1, b: "x" },
      { a: 2, b: "y" },
    ]);
  });

  it("uses records orient by default", () => {
    const df = DataFrame.fromRecords([{ v: 42 }]);
    const result = JSON.parse(toJson(df)) as unknown[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("indents output when indent > 0", () => {
    const df = DataFrame.fromRecords([{ a: 1 }]);
    const json = toJson(df, { indent: 2 });
    expect(json).toContain("\n");
    expect(JSON.parse(json)).toEqual([{ a: 1 }]);
  });

  it("serializes null values", () => {
    const df = DataFrame.fromRecords([{ a: null, b: 1 }]);
    const parsed = JSON.parse(toJson(df)) as { a: unknown }[];
    expect(parsed[0]?.a).toBeNull();
  });
});

// ─── toJson: split orient ─────────────────────────────────────────────────────

describe("toJson — split orient", () => {
  it("serializes to split format", () => {
    const df = DataFrame.fromRecords([{ a: 1, b: 2 }]);
    const json = toJson(df, { orient: "split" });
    const parsed = JSON.parse(json) as {
      columns: string[];
      index: number[];
      data: number[][];
    };
    expect(parsed.columns).toEqual(["a", "b"]);
    expect(parsed.index).toEqual([0]);
    expect(parsed.data).toEqual([[1, 2]]);
  });
});

// ─── toJson: index orient ─────────────────────────────────────────────────────

describe("toJson — index orient", () => {
  it("serializes to index format", () => {
    const df = DataFrame.fromRecords([{ a: 10 }, { a: 20 }]);
    const json = toJson(df, { orient: "index" });
    const parsed = JSON.parse(json) as Record<string, Record<string, number>>;
    expect(parsed["0"]).toEqual({ a: 10 });
    expect(parsed["1"]).toEqual({ a: 20 });
  });
});

// ─── toJson: columns orient ───────────────────────────────────────────────────

describe("toJson — columns orient", () => {
  it("serializes to columns format", () => {
    const df = DataFrame.fromRecords([{ a: 1 }, { a: 2 }]);
    const json = toJson(df, { orient: "columns" });
    const parsed = JSON.parse(json) as { a: Record<string, number> };
    expect(parsed.a).toEqual({ "0": 1, "1": 2 });
  });
});

// ─── toJson: values orient ────────────────────────────────────────────────────

describe("toJson — values orient", () => {
  it("serializes to 2-D values array", () => {
    const df = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const json = toJson(df, { orient: "values" });
    expect(JSON.parse(json)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});

// ─── round-trip tests ─────────────────────────────────────────────────────────

describe("readJson / toJson round-trip", () => {
  it("round-trips records orient", () => {
    const original = DataFrame.fromRecords([
      { a: 1, b: "hello" },
      { a: 2, b: "world" },
    ]);
    const df2 = readJson(toJson(original, { orient: "records" }), { orient: "records" });
    expect(df2.shape).toEqual(original.shape);
    expect([...df2.col("a").values]).toEqual([...original.col("a").values]);
    expect([...df2.col("b").values]).toEqual([...original.col("b").values]);
  });

  it("round-trips split orient", () => {
    const original = DataFrame.fromRecords([{ x: 1 }, { x: 2 }]);
    const df2 = readJson(toJson(original, { orient: "split" }), { orient: "split" });
    expect(df2.shape).toEqual(original.shape);
    expect([...df2.col("x").values]).toEqual([...original.col("x").values]);
  });

  it("round-trips values orient", () => {
    const original = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const df2 = readJson(toJson(original, { orient: "values" }), { orient: "values" });
    expect(df2.shape).toEqual(original.shape);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("readJson — property-based", () => {
  it("round-trips integer records via JSON", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.integer({ min: -100, max: 100 }),
            b: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (rows) => {
          const json = JSON.stringify(rows);
          const df = readJson(json, { orient: "records" });
          expect(df.shape[0]).toBe(rows.length);
          expect([...df.columns.values]).toEqual(["a", "b"]);
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row !== undefined) {
              expect(df.col("a").values[i]).toBe(row.a);
              expect(df.col("b").values[i]).toBe(row.b);
            }
          }
        },
      ),
    );
  });

  it("toJson(readJson(json)) preserves data shape for split orient", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ v: fc.float({ min: 0, max: 100, noNaN: true }) }), {
          minLength: 1,
          maxLength: 10,
        }),
        (rows) => {
          const df = DataFrame.fromRecords(rows);
          const json = toJson(df, { orient: "split" });
          const df2 = readJson(json, { orient: "split" });
          expect(df2.shape).toEqual(df.shape);
        },
      ),
    );
  });
});
