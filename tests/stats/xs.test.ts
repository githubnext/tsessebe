/**
 * Tests for xs — xsDataFrame and xsSeries cross-section selection.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, type Index, MultiIndex, Series } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";
import { xsDataFrame, xsSeries } from "../../src/index.ts";

// ─── xsDataFrame — flat index ─────────────────────────────────────────────────

describe("xsDataFrame (flat index, axis=0)", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] }, { index: ["x", "y", "z"] });

  test("single-row key returns Series of column values", () => {
    const result = xsDataFrame(df, "x");
    expect(result).toBeInstanceOf(Series);
    const s = result as Series<Scalar>;
    expect(s.values).toEqual([1, 4]);
    expect(s.index.values).toEqual(["a", "b"]);
  });

  test("name of returned Series is the key", () => {
    const s = xsDataFrame(df, "y") as Series<Scalar>;
    expect(s.name).toBe("y");
  });

  test("returns correct values for middle row", () => {
    const s = xsDataFrame(df, "y") as Series<Scalar>;
    expect(s.values).toEqual([2, 5]);
  });

  test("returns correct values for last row", () => {
    const s = xsDataFrame(df, "z") as Series<Scalar>;
    expect(s.values).toEqual([3, 6]);
  });

  test("throws KeyError for missing key", () => {
    expect(() => xsDataFrame(df, "w")).toThrow(/KeyError/);
  });
});

// ─── xsDataFrame — axis=1 (columns) ──────────────────────────────────────────

describe("xsDataFrame (axis=1)", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] }, { index: ["x", "y", "z"] });

  test("returns the column as a Series", () => {
    const result = xsDataFrame(df, "a", { axis: 1 });
    expect(result).toBeInstanceOf(Series);
    const s = result as Series<Scalar>;
    expect(s.values).toEqual([1, 2, 3]);
  });

  test("column Series has correct index", () => {
    const s = xsDataFrame(df, "b", { axis: 1 }) as Series<Scalar>;
    expect(s.index.values).toEqual(["x", "y", "z"]);
    expect(s.values).toEqual([4, 5, 6]);
  });

  test("throws KeyError for missing column", () => {
    expect(() => xsDataFrame(df, "c", { axis: 1 })).toThrow(/KeyError/);
  });

  test("throws TypeError for non-string column key", () => {
    expect(() => xsDataFrame(df, 42, { axis: 1 })).toThrow(TypeError);
  });
});

// ─── xsDataFrame — duplicate index labels → DataFrame result ─────────────────

describe("xsDataFrame (duplicate labels)", () => {
  const df = DataFrame.fromColumns({ val: [10, 20, 30, 40] }, { index: ["a", "b", "a", "c"] });

  test("multiple matches return DataFrame", () => {
    const result = xsDataFrame(df, "a");
    expect(result).toBeInstanceOf(DataFrame);
    const r = result as DataFrame;
    expect(r.shape[0]).toBe(2);
    expect(r.get("val")?.values).toEqual([10, 30]);
  });

  test("single match still returns Series", () => {
    const result = xsDataFrame(df, "b");
    expect(result).toBeInstanceOf(Series);
  });
});

// ─── xsDataFrame — MultiIndex ─────────────────────────────────────────────────

describe("xsDataFrame (MultiIndex)", () => {
  const mi = MultiIndex.fromTuples([
    ["A", 1],
    ["A", 2],
    ["B", 1],
    ["B", 2],
  ]);
  const df = new DataFrame(
    new Map([
      ["val", new Series({ data: [10, 20, 30, 40], index: mi as unknown as Index<string> })],
    ]),
    mi as unknown as Index<string>,
    ["val"],
  );

  test("outer level match returns DataFrame with inner labels", () => {
    const result = xsDataFrame(df, "A");
    expect(result).toBeInstanceOf(DataFrame);
    const r = result as DataFrame;
    expect(r.shape[0]).toBe(2);
    expect(r.get("val")?.values).toEqual([10, 20]);
  });

  test("inner level match (level=1) selects correctly", () => {
    const result = xsDataFrame(df, 1, { level: 1 });
    expect(result).toBeInstanceOf(DataFrame);
    const r = result as DataFrame;
    expect(r.get("val")?.values).toEqual([10, 30]);
  });

  test("outer level 'B' returns correct values", () => {
    const result = xsDataFrame(df, "B");
    expect(result).toBeInstanceOf(DataFrame);
    const r = result as DataFrame;
    expect(r.get("val")?.values).toEqual([30, 40]);
  });

  test("throws KeyError for missing key", () => {
    expect(() => xsDataFrame(df, "C")).toThrow(/KeyError/);
  });
});

// ─── xsSeries — flat index ────────────────────────────────────────────────────

describe("xsSeries (flat index)", () => {
  const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });

  test("single match returns scalar", () => {
    const result = xsSeries(s, "a");
    expect(result).toBe(10);
  });

  test("returns correct value for each label", () => {
    expect(xsSeries(s, "b")).toBe(20);
    expect(xsSeries(s, "c")).toBe(30);
  });

  test("throws KeyError for missing label", () => {
    expect(() => xsSeries(s, "d")).toThrow(/KeyError/);
  });
});

// ─── xsSeries — duplicate labels → Series ────────────────────────────────────

describe("xsSeries (duplicate labels)", () => {
  const s = new Series({ data: [1, 2, 3, 4], index: ["a", "b", "a", "c"] });

  test("multiple matches return Series", () => {
    const result = xsSeries(s, "a");
    expect(result).toBeInstanceOf(Series);
    const r = result as Series<Scalar>;
    expect(r.values).toEqual([1, 3]);
  });

  test("returned Series has correct length", () => {
    const result = xsSeries(s, "a") as Series<Scalar>;
    expect(result.length).toBe(2);
  });

  test("single match still returns scalar", () => {
    const result = xsSeries(s, "b");
    expect(typeof result).toBe("number");
    expect(result).toBe(2);
  });
});

// ─── xsSeries — MultiIndex ────────────────────────────────────────────────────

describe("xsSeries (MultiIndex)", () => {
  const mi = MultiIndex.fromTuples([
    ["X", 1],
    ["X", 2],
    ["Y", 1],
  ]);
  const s = new Series({
    data: [100, 200, 300],
    index: mi as unknown as Index<string>,
  });

  test("outer level match returns Series", () => {
    const result = xsSeries(s, "X");
    expect(result).toBeInstanceOf(Series);
    const r = result as Series<Scalar>;
    expect(r.values).toEqual([100, 200]);
  });

  test("inner level match returns correct values", () => {
    const result = xsSeries(s, 1, { level: 1 });
    expect(result).toBeInstanceOf(Series);
    const r = result as Series<Scalar>;
    expect(r.values).toEqual([100, 300]);
  });

  test("single outer match returns scalar", () => {
    const result = xsSeries(s, "Y");
    // "Y" matches once → scalar
    expect(result).toBe(300);
  });

  test("throws KeyError for missing key", () => {
    expect(() => xsSeries(s, "Z")).toThrow(/KeyError/);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

// ─── pandas-parity: named & negative level lookup ────────────────────────────
//
// pandas.DataFrame.xs / Series.xs accept `level=` as either an integer
// (positional, supports negatives) or a string (level name).  The
// implementation in src/stats/xs.ts supports both via resolveLevel(); the
// existing tests only covered positive integer levels.

describe("xsDataFrame (MultiIndex) — pandas-parity level lookup", () => {
  const mi = MultiIndex.fromTuples(
    [
      ["A", 1],
      ["A", 2],
      ["B", 1],
      ["B", 2],
    ],
    { names: ["letter", "num"] },
  );
  const df = new DataFrame(
    new Map([
      ["val", new Series({ data: [10, 20, 30, 40], index: mi as unknown as Index<string> })],
    ]),
    mi as unknown as Index<string>,
    ["val"],
  );

  test("named level lookup matches numeric level lookup (outer)", () => {
    const byName = xsDataFrame(df, "A", { level: "letter" }) as DataFrame;
    const byNum = xsDataFrame(df, "A", { level: 0 }) as DataFrame;
    expect(byName.get("val")?.values).toEqual(byNum.get("val")?.values);
    expect(byName.get("val")?.values).toEqual([10, 20]);
  });

  test("named level lookup matches numeric level lookup (inner)", () => {
    const byName = xsDataFrame(df, 1, { level: "num" }) as DataFrame;
    const byNum = xsDataFrame(df, 1, { level: 1 }) as DataFrame;
    expect(byName.get("val")?.values).toEqual(byNum.get("val")?.values);
    expect(byName.get("val")?.values).toEqual([10, 30]);
  });

  test("negative level index resolves from the end (-1 → last level)", () => {
    const r = xsDataFrame(df, 1, { level: -1 }) as DataFrame;
    expect(r.get("val")?.values).toEqual([10, 30]);
  });

  test("throws on out-of-range positive level number", () => {
    expect(() => xsDataFrame(df, "A", { level: 5 })).toThrow(/out of range/);
  });

  test("throws on out-of-range negative level number", () => {
    expect(() => xsDataFrame(df, "A", { level: -5 })).toThrow(/out of range/);
  });

  test("throws on unknown level name", () => {
    expect(() => xsDataFrame(df, "A", { level: "missing" })).toThrow(/Level name/);
  });
});

// ─── pandas-parity: dropLevel=false ──────────────────────────────────────────
//
// pandas xs has `drop_level=True` as its default.  When `drop_level=False`
// the matched level must remain in the result index (so the caller can see
// what was matched).  This was implemented but had no test coverage.

describe("xsDataFrame (MultiIndex) — dropLevel option", () => {
  const mi = MultiIndex.fromTuples(
    [
      ["A", 1],
      ["A", 2],
      ["B", 1],
      ["B", 2],
    ],
    { names: ["letter", "num"] },
  );
  const df = new DataFrame(
    new Map([
      ["val", new Series({ data: [10, 20, 30, 40], index: mi as unknown as Index<string> })],
    ]),
    mi as unknown as Index<string>,
    ["val"],
  );

  test("dropLevel=true (default) reduces a 2-level MultiIndex to a flat Index", () => {
    const r = xsDataFrame(df, "A") as DataFrame;
    expect(r.index).not.toBeInstanceOf(MultiIndex);
    expect(r.index.values).toEqual([1, 2]);
  });

  test("dropLevel=false preserves the matched level (still a MultiIndex with both names)", () => {
    const r = xsDataFrame(df, "A", { dropLevel: false }) as DataFrame;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.nlevels).toBe(2);
    expect(ri.names).toEqual(["letter", "num"]);
    expect(ri.at(0)).toEqual(["A", 1]);
    expect(ri.at(1)).toEqual(["A", 2]);
    expect(r.get("val")?.values).toEqual([10, 20]);
  });

  test("dropLevel=false on inner-level xs preserves both levels", () => {
    const r = xsDataFrame(df, 1, { level: "num", dropLevel: false }) as DataFrame;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.names).toEqual(["letter", "num"]);
    expect(ri.at(0)).toEqual(["A", 1]);
    expect(ri.at(1)).toEqual(["B", 1]);
    expect(r.get("val")?.values).toEqual([10, 30]);
  });
});

// ─── pandas-parity: 3-level MultiIndex ───────────────────────────────────────
//
// pandas tests xs against MultiIndexes deeper than 2 levels.  The reduction
// logic (droplevel of the matched level) needs to leave the remaining levels
// (and their names) in the right order — only 2-level cases were covered.

describe("xsDataFrame — 3-level MultiIndex", () => {
  const mi3 = MultiIndex.fromTuples(
    [
      ["A", "x", 1],
      ["A", "x", 2],
      ["A", "y", 1],
      ["B", "x", 1],
    ],
    { names: ["L0", "L1", "L2"] },
  );
  const df3 = new DataFrame(
    new Map([["v", new Series({ data: [1, 2, 3, 4], index: mi3 as unknown as Index<string> })]]),
    mi3 as unknown as Index<string>,
    ["v"],
  );

  test("xs at outer level drops L0, leaves a 2-level MultiIndex named [L1, L2]", () => {
    const r = xsDataFrame(df3, "A") as DataFrame;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.nlevels).toBe(2);
    expect(ri.names).toEqual(["L1", "L2"]);
    expect(r.get("v")?.values).toEqual([1, 2, 3]);
  });

  test("xs at middle level drops L1, leaves a 2-level MultiIndex named [L0, L2]", () => {
    const r = xsDataFrame(df3, "x", { level: "L1" }) as DataFrame;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.nlevels).toBe(2);
    expect(ri.names).toEqual(["L0", "L2"]);
    expect(r.get("v")?.values).toEqual([1, 2, 4]);
  });

  test("xs at innermost level drops L2, leaves a 2-level MultiIndex named [L0, L1]", () => {
    const r = xsDataFrame(df3, 1, { level: "L2" }) as DataFrame;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.names).toEqual(["L0", "L1"]);
    expect(r.get("v")?.values).toEqual([1, 3, 4]);
  });

  test("xs at outer level with dropLevel=false keeps all three levels", () => {
    const r = xsDataFrame(df3, "A", { dropLevel: false }) as DataFrame;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.nlevels).toBe(3);
    expect(ri.names).toEqual(["L0", "L1", "L2"]);
  });
});

// ─── pandas-parity: xsSeries level / dropLevel options ───────────────────────

describe("xsSeries (MultiIndex) — pandas-parity level & dropLevel", () => {
  const s = new Series({
    data: [100, 200, 300],
    index: MultiIndex.fromTuples(
      [
        ["X", 1],
        ["X", 2],
        ["Y", 1],
      ],
      { names: ["g", "n"] },
    ) as unknown as Index<string>,
  });

  test("named level lookup matches numeric level lookup", () => {
    const byName = xsSeries(s, 1, { level: "n" }) as Series<Scalar>;
    const byNum = xsSeries(s, 1, { level: 1 }) as Series<Scalar>;
    expect(byName.values).toEqual(byNum.values);
    expect(byName.values).toEqual([100, 300]);
  });

  test("negative level index resolves from the end", () => {
    const r = xsSeries(s, 1, { level: -1 }) as Series<Scalar>;
    expect(r.values).toEqual([100, 300]);
  });

  test("dropLevel=false keeps result as a MultiIndex preserving both levels", () => {
    const r = xsSeries(s, "X", { dropLevel: false }) as Series<Scalar>;
    expect(r.index).toBeInstanceOf(MultiIndex);
    const ri = r.index as unknown as MultiIndex;
    expect(ri.nlevels).toBe(2);
    expect(ri.names).toEqual(["g", "n"]);
    expect(r.values).toEqual([100, 200]);
  });

  test("throws on unknown level name", () => {
    expect(() => xsSeries(s, "X", { level: "missing" })).toThrow(/Level name/);
  });

  test("throws on out-of-range level number", () => {
    expect(() => xsSeries(s, "X", { level: 9 })).toThrow(/out of range/);
  });

  test("Series name is preserved when xs returns a Series (multi-match)", () => {
    const dup = new Series({
      data: [1, 2, 3, 4],
      index: ["a", "b", "a", "c"],
      name: "mycol",
    });
    const r = xsSeries(dup, "a") as Series<Scalar>;
    expect(r.name).toBe("mycol");
    expect(r.values).toEqual([1, 3]);
  });
});

describe("xsDataFrame property tests", () => {
  test("axis=1 returns the exact column Series", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 10 }),
        (aData, bData) => {
          const len = Math.min(aData.length, bData.length);
          const slicedA = aData.slice(0, len);
          const slicedB = bData.slice(0, len);
          const df = DataFrame.fromColumns({ a: slicedA, b: slicedB });
          const colA = xsDataFrame(df, "a", { axis: 1 }) as Series<Scalar>;
          const colB = xsDataFrame(df, "b", { axis: 1 }) as Series<Scalar>;
          return (
            JSON.stringify(colA.values) === JSON.stringify(slicedA) &&
            JSON.stringify(colB.values) === JSON.stringify(slicedB)
          );
        },
      ),
    );
  });

  test("row selection returns row data indexed by column names", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 3, maxLength: 8 }),
        (data) => {
          const len = data.length;
          const labels = data.map((_, i) => `row${i}`);
          const df = DataFrame.fromColumns({ x: data }, { index: labels });
          const rowIdx = Math.floor(len / 2);
          const key = labels[rowIdx] as string;
          const row = xsDataFrame(df, key) as Series<Scalar>;
          return row.values[0] === data[rowIdx] && row.index.values[0] === "x";
        },
      ),
    );
  });
});
