import { describe, expect, test } from "bun:test";
import { DataFrame, Series } from "../../src/index.ts";

describe("Series.items() and Series.iteritems()", () => {
  test("items() yields (label, value) pairs", () => {
    const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
    const pairs = [...s.items()];
    expect(pairs).toEqual([
      ["a", 10],
      ["b", 20],
      ["c", 30],
    ]);
  });

  test("iteritems() is an alias for items()", () => {
    const s = new Series({ data: [1, 2], index: [10, 20] });
    expect([...s.iteritems()]).toEqual([...s.items()]);
  });

  test("items() on empty series", () => {
    const s = new Series({ data: [], index: [] });
    expect([...s.items()]).toEqual([]);
  });

  test("items() with default numeric index", () => {
    const s = new Series({ data: ["x", "y"] });
    const pairs = [...s.items()];
    expect(pairs[0]).toEqual([0, "x"]);
    expect(pairs[1]).toEqual([1, "y"]);
  });
});

describe("DataFrame.itertuples()", () => {
  test("yields row objects with Index field", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const rows = [...df.itertuples()];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ Index: 0, a: 1, b: "x" });
    expect(rows[1]).toEqual({ Index: 1, a: 2, b: "y" });
  });

  test("index=false omits Index field", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const rows = [...df.itertuples(false)];
    expect(rows[0]).toEqual({ a: 1, b: "x" });
    expect("Index" in (rows[0] ?? {})).toBe(false);
  });

  test("custom index labels appear in Index field", () => {
    const df = DataFrame.fromColumns({ v: [100] }, { index: ["r0"] });
    const rows = [...df.itertuples()];
    expect(rows[0]?.["Index"]).toBe("r0");
  });

  test("empty dataframe yields no rows", () => {
    const df = DataFrame.fromColumns({ a: [] as number[] });
    expect([...df.itertuples()]).toEqual([]);
  });
});
