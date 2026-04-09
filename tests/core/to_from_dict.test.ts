/**
 * Tests for src/core/to_from_dict.ts
 *
 * Covers:
 * - toDictOriented: orient "dict"/"columns" — nested column→rowLabel→value maps
 * - toDictOriented: orient "list" — column→value-array
 * - toDictOriented: orient "series" — column→Series
 * - toDictOriented: orient "split" — {index, columns, data}
 * - toDictOriented: orient "tight" — split + index_names/column_names
 * - toDictOriented: orient "records" — array of row objects
 * - toDictOriented: orient "index" — rowLabel→col→value
 * - fromDictOriented: orient "columns" — {col:[values]}
 * - fromDictOriented: orient "index" — {rowLabel:{col:value}}
 * - fromDictOriented: orient "split" — {index?,columns,data}
 * - fromDictOriented: orient "tight" — same as split
 * - round-trips: split round-trip, records round-trip
 * - missing values are preserved as null
 * - custom row index is preserved/reconstructed
 * - Property: split round-trip preserves shape and column order
 * - Property: records orientation column count is stable
 * - Property: index orientation row count is preserved
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Index, Series } from "../../src/index.ts";
import {
  fromDictOriented,
  toDictOriented,
} from "../../src/core/to_from_dict.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDF(): DataFrame {
  return DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
}

function makeIndexedDF(): DataFrame {
  return DataFrame.fromColumns(
    { x: [10, 20], y: [30, 40] },
    { index: new Index(["r0", "r1"]) },
  );
}

// ─── toDictOriented ───────────────────────────────────────────────────────────

describe("toDictOriented — dict/columns", () => {
  test("default range index produces string-keyed rows", () => {
    const df = makeDF();
    const result = toDictOriented(df, "dict");
    expect(result["a"]).toEqual({ "0": 1, "1": 2, "2": 3 });
    expect(result["b"]).toEqual({ "0": 4, "1": 5, "2": 6 });
  });

  test("orient 'columns' is identical to 'dict'", () => {
    const df = makeDF();
    expect(toDictOriented(df, "columns")).toEqual(toDictOriented(df, "dict"));
  });

  test("custom string index is used as row keys", () => {
    const df = makeIndexedDF();
    const result = toDictOriented(df, "dict");
    expect(result["x"]).toEqual({ r0: 10, r1: 20 });
  });

  test("empty DataFrame produces empty result", () => {
    const df = DataFrame.fromColumns({});
    const result = toDictOriented(df, "dict");
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe("toDictOriented — list", () => {
  test("returns column→array mapping", () => {
    const df = makeDF();
    const result = toDictOriented(df, "list");
    expect(result["a"]).toEqual([1, 2, 3]);
    expect(result["b"]).toEqual([4, 5, 6]);
  });

  test("preserves null values", () => {
    const df = DataFrame.fromColumns({ v: [1, null, 3] });
    expect(toDictOriented(df, "list")["v"]).toEqual([1, null, 3]);
  });
});

describe("toDictOriented — series", () => {
  test("returns column→Series mapping", () => {
    const df = makeDF();
    const result = toDictOriented(df, "series");
    expect(result["a"]).toBeInstanceOf(Series);
    expect((result["a"] as Series<number>).values).toEqual([1, 2, 3]);
  });
});

describe("toDictOriented — split", () => {
  test("basic split structure", () => {
    const df = makeDF();
    const result = toDictOriented(df, "split");
    expect(result.columns).toEqual(["a", "b"]);
    expect(result.index).toEqual([0, 1, 2]);
    expect(result.data).toEqual([[1, 4], [2, 5], [3, 6]]);
  });

  test("split with custom index", () => {
    const df = makeIndexedDF();
    const result = toDictOriented(df, "split");
    expect(result.index).toEqual(["r0", "r1"]);
    expect(result.data).toEqual([[10, 30], [20, 40]]);
  });
});

describe("toDictOriented — tight", () => {
  test("tight includes index_names and column_names", () => {
    const df = makeDF();
    const result = toDictOriented(df, "tight");
    expect(result.index_names).toEqual([null]);
    expect(result.column_names).toEqual([null]);
    expect(result.columns).toEqual(["a", "b"]);
    expect(result.data).toEqual([[1, 4], [2, 5], [3, 6]]);
  });
});

describe("toDictOriented — records", () => {
  test("returns array of row objects", () => {
    const df = makeDF();
    const result = toDictOriented(df, "records");
    expect(result).toEqual([
      { a: 1, b: 4 },
      { a: 2, b: 5 },
      { a: 3, b: 6 },
    ]);
  });

  test("preserves null values", () => {
    const df = DataFrame.fromColumns({ x: [null, 1] });
    const result = toDictOriented(df, "records");
    expect(result[0]).toEqual({ x: null });
  });
});

describe("toDictOriented — index", () => {
  test("range index keys are stringified", () => {
    const df = makeDF();
    const result = toDictOriented(df, "index");
    expect(result["0"]).toEqual({ a: 1, b: 4 });
    expect(result["2"]).toEqual({ a: 3, b: 6 });
  });

  test("custom index keys are used", () => {
    const df = makeIndexedDF();
    const result = toDictOriented(df, "index");
    expect(result["r0"]).toEqual({ x: 10, y: 30 });
  });
});

// ─── fromDictOriented ─────────────────────────────────────────────────────────

describe("fromDictOriented — columns", () => {
  test("default orient is columns", () => {
    const df = fromDictOriented({ a: [1, 2, 3], b: [4, 5, 6] });
    expect(df.columns.values).toEqual(["a", "b"]);
    expect(df.col("a").values).toEqual([1, 2, 3]);
  });
});

describe("fromDictOriented — index", () => {
  test("reconstructs from rowLabel→col→value mapping", () => {
    const df = fromDictOriented(
      { r0: { x: 10, y: 30 }, r1: { x: 20, y: 40 } },
      "index",
    );
    expect(df.index.values).toEqual(["r0", "r1"]);
    expect(df.col("x").values).toEqual([10, 20]);
    expect(df.col("y").values).toEqual([30, 40]);
  });

  test("missing fields become null", () => {
    const df = fromDictOriented({ r0: { a: 1 }, r1: { a: 2, b: 99 } }, "index");
    expect(df.col("b").values[0]).toBeNull();
    expect(df.col("b").values[1]).toBe(99);
  });

  test("insertion order of columns is preserved", () => {
    const df = fromDictOriented({ r0: { c: 1, a: 2 } }, "index");
    expect(df.columns.values[0]).toBe("c");
    expect(df.columns.values[1]).toBe("a");
  });
});

describe("fromDictOriented — split", () => {
  test("reconstructs from split structure", () => {
    const df = fromDictOriented(
      { columns: ["a", "b"], data: [[1, 4], [2, 5], [3, 6]] },
      "split",
    );
    expect(df.shape).toEqual([3, 2]);
    expect(df.col("a").values).toEqual([1, 2, 3]);
  });

  test("custom index is restored", () => {
    const df = fromDictOriented(
      { index: ["r0", "r1"], columns: ["x"], data: [[10], [20]] },
      "split",
    );
    expect(df.index.values).toEqual(["r0", "r1"]);
  });

  test("orient 'tight' behaves like 'split'", () => {
    const tightData = { index: [0, 1], columns: ["v"], data: [[7], [8]] };
    const df = fromDictOriented(tightData, "tight");
    expect(df.col("v").values).toEqual([7, 8]);
  });
});

// ─── round-trips ──────────────────────────────────────────────────────────────

describe("round-trips", () => {
  test("split round-trip preserves values", () => {
    const df = makeDF();
    const split = toDictOriented(df, "split");
    const df2 = fromDictOriented(split, "split");
    expect(df2.shape).toEqual(df.shape);
    expect(df2.col("a").values).toEqual([1, 2, 3]);
  });

  test("records round-trip preserves shape", () => {
    const df = makeDF();
    const recs = toDictOriented(df, "records");
    const df2 = DataFrame.fromRecords(recs);
    expect(df2.shape).toEqual(df.shape);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("property-based", () => {
  test("split round-trip preserves shape and column order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 4 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 4 }),
        (colA, colB) => {
          const df = DataFrame.fromColumns({ a: colA, b: colB.slice(0, colA.length) });
          const split = toDictOriented(df, "split");
          const df2 = fromDictOriented(split, "split");
          return df2.shape[0] === df.shape[0] && df2.columns.values[0] === "a";
        },
      ),
    );
  });

  test("records orient column count matches original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 5 }),
        (vals) => {
          const df = DataFrame.fromColumns({ x: vals, y: vals });
          const recs = toDictOriented(df, "records");
          return recs.every((r) => Object.keys(r).length === 2);
        },
      ),
    );
  });

  test("index orient row count matches original", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 10 }),
        (vals) => {
          const df = DataFrame.fromColumns({ v: vals });
          const idx = toDictOriented(df, "index");
          return Object.keys(idx).length === vals.length;
        },
      ),
    );
  });
});
