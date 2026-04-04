/**
 * Tests for I/O utilities: readCsv, readJson, toCsv, toJson.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import { readCsv, readJson, seriesToCsv, seriesToJson, toCsv, toJson } from "../../src/index.ts";

// ─── readCsv ─────────────────────────────────────────────────────────────────

describe("readCsv", () => {
  it("parses a simple CSV with header", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6\n";
    const df = readCsv(csv);
    expect(df.shape).toEqual([2, 3]);
    expect([...df.columns.values]).toEqual(["a", "b", "c"]);
    expect(df.col("a").values).toEqual([1, 4]);
    expect(df.col("b").values).toEqual([2, 5]);
    expect(df.col("c").values).toEqual([3, 6]);
  });

  it("handles CRLF line endings", () => {
    const csv = "x,y\r\n1,2\r\n3,4\r\n";
    const df = readCsv(csv);
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("x").values).toEqual([1, 3]);
  });

  it("parses string values", () => {
    const csv = "name,age\nAlice,30\nBob,25\n";
    const df = readCsv(csv);
    expect(df.col("name").values).toEqual(["Alice", "Bob"]);
    expect(df.col("age").values).toEqual([30, 25]);
  });

  it("treats empty cells as null", () => {
    const csv = "a,b\n1,\n,3\n";
    const df = readCsv(csv);
    expect(df.col("a").values).toEqual([1, null]);
    expect(df.col("b").values).toEqual([null, 3]);
  });

  it("treats NA/NaN/null strings as null", () => {
    const csv = "a,b\nNA,1\nNaN,2\nnull,3\n";
    const df = readCsv(csv);
    expect(df.col("a").values).toEqual([null, null, null]);
  });

  it("parses quoted fields containing comma", () => {
    const csv = 'a,b\n"hello, world",2\n"foo",3\n';
    const df = readCsv(csv);
    expect(df.col("a").values).toEqual(["hello, world", "foo"]);
    expect(df.col("b").values).toEqual([2, 3]);
  });

  it("parses quoted fields containing double-quotes", () => {
    const csv = 'a\n"say ""hi"""\n';
    const df = readCsv(csv);
    expect(df.col("a").values).toEqual(['say "hi"']);
  });

  it("parses booleans", () => {
    const csv = "a,b\ntrue,False\nTRUE,false\n";
    const df = readCsv(csv);
    expect(df.col("a").values).toEqual([true, true]);
    expect(df.col("b").values).toEqual([false, false]);
  });

  it("respects custom sep", () => {
    const csv = "a;b;c\n1;2;3\n";
    const df = readCsv(csv, { sep: ";" });
    expect(df.shape).toEqual([1, 3]);
    expect(df.col("a").values).toEqual([1]);
  });

  it("respects nrows", () => {
    const csv = "a,b\n1,2\n3,4\n5,6\n";
    const df = readCsv(csv, { nrows: 2 });
    expect(df.shape).toEqual([2, 2]);
  });

  it("respects skipRows", () => {
    const csv = "# comment\na,b\n1,2\n";
    const df = readCsv(csv, { skipRows: 1 });
    expect(df.shape).toEqual([1, 2]);
    expect([...df.columns.values]).toEqual(["a", "b"]);
  });

  it("header=null generates integer column names", () => {
    const csv = "1,2,3\n4,5,6\n";
    const df = readCsv(csv, { header: null });
    expect([...df.columns.values]).toEqual(["0", "1", "2"]);
    expect(df.shape).toEqual([2, 3]);
  });

  it("respects custom names option", () => {
    const csv = "a,b\n1,2\n3,4\n";
    const df = readCsv(csv, { names: ["x", "y"] });
    expect([...df.columns.values]).toEqual(["x", "y"]);
    expect(df.shape).toEqual([1, 2]); // header row skipped
  });

  it("respects indexCol by name", () => {
    const csv = "idx,a,b\nr1,1,2\nr2,3,4\n";
    const df = readCsv(csv, { indexCol: "idx" });
    expect([...df.columns.values]).toEqual(["a", "b"]);
    expect([...df.index.values]).toEqual(["r1", "r2"]);
  });

  it("respects indexCol by integer position", () => {
    const csv = "idx,a,b\n0,1,2\n1,3,4\n";
    const df = readCsv(csv, { indexCol: 0 });
    expect([...df.columns.values]).toEqual(["a", "b"]);
  });

  it("handles empty CSV", () => {
    const df = readCsv("");
    expect(df.shape).toEqual([0, 0]);
  });

  it("handles custom naValues", () => {
    const csv = "a\nMISSING\n1\n";
    const df = readCsv(csv, { naValues: ["MISSING"] });
    expect(df.col("a").values).toEqual([null, 1]);
  });

  it("parses float values", () => {
    const csv = "a,b\n1.5,2.7\n-0.1,3.14e2\n";
    const df = readCsv(csv);
    expect(df.col("a").values).toEqual([1.5, -0.1]);
    expect(df.col("b").values).toEqual([2.7, 314]);
  });
});

// ─── readJson ────────────────────────────────────────────────────────────────

describe("readJson", () => {
  it("parses records orientation", () => {
    const json = '[{"a":1,"b":2},{"a":3,"b":4}]';
    const df = readJson(json);
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("a").values).toEqual([1, 3]);
  });

  it("parses columns orientation", () => {
    const json = '{"a":{"0":1,"1":3},"b":{"0":2,"1":4}}';
    const df = readJson(json, { orient: "columns" });
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("a").values).toEqual([1, 3]);
    expect([...df.index.values]).toEqual([0, 1]);
  });

  it("parses values orientation", () => {
    const json = "[[1,2],[3,4]]";
    const df = readJson(json, { orient: "values", columns: ["x", "y"] });
    expect(df.shape).toEqual([2, 2]);
    expect(df.col("x").values).toEqual([1, 3]);
  });

  it("parses values orientation with auto column names", () => {
    const json = "[[1,2],[3,4]]";
    const df = readJson(json, { orient: "values" });
    expect([...df.columns.values]).toEqual(["0", "1"]);
  });

  it("parses index orientation", () => {
    const json = '{"r1":{"a":1,"b":2},"r2":{"a":3,"b":4}}';
    const df = readJson(json, { orient: "index" });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.index.values]).toEqual(["r1", "r2"]);
    expect(df.col("a").values).toEqual([1, 3]);
  });

  it("parses split orientation", () => {
    const json = '{"index":["r1","r2"],"columns":["a","b"],"data":[[1,2],[3,4]]}';
    const df = readJson(json, { orient: "split" });
    expect(df.shape).toEqual([2, 2]);
    expect([...df.index.values]).toEqual(["r1", "r2"]);
    expect(df.col("a").values).toEqual([1, 3]);
  });

  it("handles null values in records", () => {
    const json = '[{"a":null,"b":1}]';
    const df = readJson(json);
    expect(df.col("a").values).toEqual([null]);
  });

  it("throws on invalid JSON", () => {
    expect(() => readJson("not json")).toThrow();
  });

  it("throws on wrong type for records orient", () => {
    expect(() => readJson('{"a":1}', { orient: "records" })).toThrow();
  });
});

// ─── toCsv ───────────────────────────────────────────────────────────────────

describe("toCsv", () => {
  it("serializes a simple DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const csv = toCsv(df);
    expect(csv).toBe(",a,b\n0,1,3\n1,2,4\n");
  });

  it("omits index when index=false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const csv = toCsv(df, { index: false });
    expect(csv).toBe("a,b\n1,3\n2,4\n");
  });

  it("omits header when header=false", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const csv = toCsv(df, { header: false });
    expect(csv).toBe("0,1\n1,2\n");
  });

  it("uses naRep for null values", () => {
    const df = DataFrame.fromColumns({ a: [1, null, 3] });
    const csv = toCsv(df, { naRep: "NaN", index: false });
    expect(csv).toBe("a\n1\nNaN\n3\n");
  });

  it("respects custom sep", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const csv = toCsv(df, { sep: ";", index: false });
    expect(csv).toBe("a;b\n1;2\n");
  });

  it("quotes fields containing the separator", () => {
    const df = DataFrame.fromColumns({ a: ["hello, world"] });
    const csv = toCsv(df, { index: false });
    expect(csv).toBe('a\n"hello, world"\n');
  });

  it("quotes all when quoting='all'", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const csv = toCsv(df, { index: false, quoting: "all" });
    expect(csv).toBe('"a"\n"1"\n');
  });

  it("respects columns option", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5, 6] });
    const csv = toCsv(df, { columns: ["a", "c"], index: false });
    expect(csv).toBe("a,c\n1,5\n2,6\n");
  });

  it("respects custom lineterminator", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const csv = toCsv(df, { index: false, lineterminator: "\r\n" });
    expect(csv).toBe("a\r\n1\r\n");
  });
});

describe("seriesToCsv", () => {
  it("serializes a named Series", () => {
    const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"], name: "vals" });
    const csv = seriesToCsv(s);
    expect(csv).toBe(",vals\na,1\nb,2\nc,3\n");
  });

  it("omits index when index=false", () => {
    const s = new Series({ data: [1, 2], name: "x" });
    const csv = seriesToCsv(s, { index: false });
    expect(csv).toBe("x\n1\n2\n");
  });
});

// ─── toJson ──────────────────────────────────────────────────────────────────

describe("toJson", () => {
  it("serializes records orientation", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const json = toJson(df, { orient: "records" });
    expect(JSON.parse(json)).toEqual([
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ]);
  });

  it("serializes columns orientation (default)", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const json = toJson(df);
    const parsed = JSON.parse(json) as Record<string, Record<string, unknown>>;
    expect(parsed["a"]).toEqual({ "0": 1, "1": 2 });
    expect(parsed["b"]).toEqual({ "0": 3, "1": 4 });
  });

  it("serializes values orientation", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const json = toJson(df, { orient: "values" });
    expect(JSON.parse(json)).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  it("serializes index orientation", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] }, { index: ["r1", "r2"] });
    const json = toJson(df, { orient: "index" });
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed["r1"]).toEqual({ a: 1 });
    expect(parsed["r2"]).toEqual({ a: 2 });
  });

  it("serializes split orientation", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const json = toJson(df, { orient: "split" });
    const parsed = JSON.parse(json) as { index: unknown[]; columns: string[]; data: unknown[][] };
    expect(parsed.columns).toEqual(["a", "b"]);
    expect(parsed.data).toEqual([
      [1, 3],
      [2, 4],
    ]);
    expect(parsed.index).toEqual([0, 1]);
  });

  it("serializes table orientation", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    const json = toJson(df, { orient: "table" });
    const parsed = JSON.parse(json) as { schema: unknown; data: unknown[] };
    expect(parsed.data).toBeDefined();
    expect(parsed.schema).toBeDefined();
  });

  it("respects indent", () => {
    const df = DataFrame.fromColumns({ a: [1] });
    const json = toJson(df, { orient: "records", indent: 2 });
    expect(json).toContain("\n");
  });

  it("serializes null as null by default", () => {
    const df = DataFrame.fromColumns({ a: [1, null] });
    const json = toJson(df, { orient: "records" });
    expect(JSON.parse(json)).toEqual([{ a: 1 }, { a: null }]);
  });

  it("serializes null as 'NaN' when naRep='nan'", () => {
    const df = DataFrame.fromColumns({ a: [1, null] });
    const json = toJson(df, { orient: "records", naRep: "nan" });
    const parsed = JSON.parse(json) as Array<{ a: unknown }>;
    expect(parsed[1]?.a).toBe("NaN");
  });
});

describe("seriesToJson", () => {
  it("serializes index orientation (default)", () => {
    const s = new Series({ data: [10, 20], index: ["a", "b"] });
    const json = seriesToJson(s);
    expect(JSON.parse(json)).toEqual({ a: 10, b: 20 });
  });

  it("serializes records orientation", () => {
    const s = new Series({ data: [1, 2, 3] });
    const json = seriesToJson(s, { orient: "records" });
    expect(JSON.parse(json)).toEqual([1, 2, 3]);
  });

  it("serializes split orientation", () => {
    const s = new Series({ data: [1, 2], index: ["a", "b"], name: "vals" });
    const json = seriesToJson(s, { orient: "split" });
    const parsed = JSON.parse(json) as { name: unknown; index: unknown[]; data: unknown[] };
    expect(parsed.name).toBe("vals");
    expect(parsed.index).toEqual(["a", "b"]);
    expect(parsed.data).toEqual([1, 2]);
  });
});

// ─── round-trip property tests ───────────────────────────────────────────────

describe("roundtrip: toCsv → readCsv", () => {
  it("roundtrips integer data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (colA, colB) => {
          const len = Math.min(colA.length, colB.length);
          const a = colA.slice(0, len);
          const b = colB.slice(0, len);
          const df = DataFrame.fromColumns({ a, b });
          const csv = toCsv(df, { index: false });
          const df2 = readCsv(csv);
          expect(df2.shape).toEqual([len, 2]);
          expect(df2.col("a").values).toEqual(a);
          expect(df2.col("b").values).toEqual(b);
        },
      ),
    );
  });
});

describe("roundtrip: toJson → readJson (records)", () => {
  it("roundtrips integer data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (colA) => {
          const df = DataFrame.fromColumns({ x: colA });
          const json = toJson(df, { orient: "records" });
          const df2 = readJson(json, { orient: "records" });
          expect(df2.shape).toEqual([colA.length, 1]);
          expect(df2.col("x").values).toEqual(colA);
        },
      ),
    );
  });
});
