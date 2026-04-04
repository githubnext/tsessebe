/**
 * Tests for the GroupBy module — SeriesGroupBy and DataFrameGroupBy.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { Series, DataFrame, Index } from "../../src/index.ts";
import {
  seriesGroupBy,
  dataFrameGroupBy,
  SeriesGroupBy,
  DataFrameGroupBy,
} from "../../src/groupby/index.ts";
import type { Label, Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSeries(data: number[], name?: string): Series<number> {
  return new Series<number>({ data, ...(name !== undefined ? { name } : {}) });
}

// ─── SeriesGroupBy — construction ────────────────────────────────────────────

describe("SeriesGroupBy construction", () => {
  test("groupby array of labels", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    expect(grp).toBeInstanceOf(SeriesGroupBy);
    expect(grp.ngroups).toBe(2);
  });

  test("groupby index", () => {
    const idx = new Index<Label>(["x", "y", "x"]);
    const s = new Series<number>({ data: [1, 2, 3], index: idx });
    const grp = seriesGroupBy(s as Series<Scalar>, "index");
    expect(grp.ngroups).toBe(2);
    expect(grp.groupKeys).toEqual(["x", "y"]);
  });

  test("groupby another Series", () => {
    const s = makeSeries([1, 2, 3]);
    const keys = new Series<Scalar>({ data: ["A", "B", "A"] });
    const grp = seriesGroupBy(s as Series<Scalar>, keys);
    expect(grp.ngroups).toBe(2);
  });

  test("throws when key length mismatches Series length", () => {
    const s = makeSeries([1, 2, 3]);
    expect(() => seriesGroupBy(s as Series<Scalar>, ["A", "B"])).toThrow();
  });
});

// ─── SeriesGroupBy — aggregations ────────────────────────────────────────────

describe("SeriesGroupBy aggregations", () => {
  test("sum", () => {
    const s = makeSeries([10, 20, 30, 40], "v");
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    const result = grp.sum();
    expect(result.at("A")).toBe(40);
    expect(result.at("B")).toBe(60);
    expect(result.name).toBe("v");
  });

  test("mean", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    const result = grp.mean();
    expect(result.at("A")).toBe(20);
    expect(result.at("B")).toBe(30);
  });

  test("min and max", () => {
    const s = makeSeries([5, 3, 8, 1]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "A", "B", "B"]);
    expect(grp.min().at("A")).toBe(3);
    expect(grp.max().at("B")).toBe(8);
  });

  test("count ignores null values", () => {
    const s = new Series<Scalar>({ data: [1, null, 2, null] });
    const grp = seriesGroupBy(s, ["A", "A", "B", "B"]);
    expect(grp.count().at("A")).toBe(1);
    expect(grp.count().at("B")).toBe(1);
  });

  test("first and last", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    expect(grp.first().at("A")).toBe(10);
    expect(grp.last().at("B")).toBe(40);
  });

  test("std — sample standard deviation", () => {
    const s = makeSeries([2, 4, 6, 8]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "A", "B", "B"]);
    const result = grp.std();
    // std([2,4]) = sqrt(((2-3)^2+(4-3)^2)/1) = sqrt(2) ≈ 1.4142…
    expect(result.at("A") as number).toBeCloseTo(Math.sqrt(2), 10);
    expect(result.at("B") as number).toBeCloseTo(Math.sqrt(2), 10);
  });

  test("agg with builtin name string", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    expect(grp.agg("sum").at("A")).toBe(40);
  });

  test("agg with custom function", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["X", "X", "Y", "Y"]);
    const result = grp.agg((vals) => (vals as number[]).reduce((a, b) => a * b, 1));
    expect(result.at("X")).toBe(2);
    expect(result.at("Y")).toBe(12);
  });

  test("agg with unknown builtin name throws", () => {
    const s = makeSeries([1, 2]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B"]);
    expect(() => grp.agg("unknown" as "sum")).toThrow();
  });
});

// ─── SeriesGroupBy — transform ───────────────────────────────────────────────

describe("SeriesGroupBy transform", () => {
  test("returns a series of the same length", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "A", "B", "B"]);
    const result = grp.transform((vals) => vals.map((v) => (v as number) * 2));
    expect(result.size).toBe(4);
    expect([...result.values]).toEqual([2, 4, 6, 8]);
  });

  test("subtract group mean (demeaning)", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "A", "B", "B"]);
    const result = grp.transform((vals) => {
      const m = (vals as number[]).reduce((a, b) => a + b, 0) / vals.length;
      return vals.map((v) => (v as number) - m);
    });
    // Group A mean=15: 10-15=-5, 20-15=5
    // Group B mean=35: 30-35=-5, 40-35=5
    expect([...result.values]).toEqual([-5, 5, -5, 5]);
  });

  test("throws when returned array length differs from group size", () => {
    const s = makeSeries([1, 2, 3, 4]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "A", "B", "B"]);
    expect(() => grp.transform(() => [1])).toThrow();
  });
});

// ─── SeriesGroupBy — apply ───────────────────────────────────────────────────

describe("SeriesGroupBy apply", () => {
  test("applies a function to each group sub-series", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    const result = grp.apply((g) => g.size as Scalar);
    expect(result.at("A")).toBe(2);
    expect(result.at("B")).toBe(2);
  });
});

// ─── SeriesGroupBy — getGroup and iteration ──────────────────────────────────

describe("SeriesGroupBy getGroup and iteration", () => {
  test("getGroup returns the correct sub-series", () => {
    const s = makeSeries([10, 20, 30, 40]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A", "B"]);
    const gA = grp.getGroup("A");
    expect([...gA.values]).toEqual([10, 30]);
  });

  test("getGroup throws for an unknown key", () => {
    const s = makeSeries([1, 2]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B"]);
    expect(() => grp.getGroup("Z")).toThrow();
  });

  test("iterates over [key, subSeries] pairs in insertion order", () => {
    const s = makeSeries([10, 20, 30]);
    const grp = seriesGroupBy(s as Series<Scalar>, ["A", "B", "A"]);
    const collected: Array<[Label, number[]]> = [];
    for (const [k, g] of grp) {
      collected.push([k, [...g.values] as number[]]);
    }
    expect(collected).toEqual([
      ["A", [10, 30]],
      ["B", [20]],
    ]);
  });
});

// ─── DataFrameGroupBy — construction ─────────────────────────────────────────

describe("DataFrameGroupBy construction", () => {
  test("groupby single column", () => {
    const df = DataFrame.fromRecords([
      { team: "A", score: 10 },
      { team: "B", score: 20 },
      { team: "A", score: 30 },
    ]);
    const grp = dataFrameGroupBy(df, "team");
    expect(grp).toBeInstanceOf(DataFrameGroupBy);
    expect(grp.ngroups).toBe(2);
    expect(grp.by).toEqual(["team"]);
  });

  test("throws when groupby column does not exist", () => {
    const df = DataFrame.fromRecords([{ a: 1 }]);
    expect(() => dataFrameGroupBy(df, "z")).toThrow();
  });

  test("groupby multiple columns produces composite keys", () => {
    const df = DataFrame.fromRecords([
      { g1: "A", g2: 1, v: 10 },
      { g1: "A", g2: 2, v: 20 },
      { g1: "B", g2: 1, v: 30 },
      { g1: "A", g2: 1, v: 40 },
    ]);
    const grp = dataFrameGroupBy(df, ["g1", "g2"]);
    // Groups: "A\t1" (rows 0,3), "A\t2" (row 1), "B\t1" (row 2)
    expect(grp.ngroups).toBe(3);
  });
});

// ─── DataFrameGroupBy — aggregations ─────────────────────────────────────────

describe("DataFrameGroupBy aggregations", () => {
  test("sum aggregates non-key columns", () => {
    const df = DataFrame.fromRecords([
      { team: "A", score: 10 },
      { team: "B", score: 20 },
      { team: "A", score: 30 },
    ]);
    const result = dataFrameGroupBy(df, "team").sum();
    expect(result.shape).toEqual([2, 1]);
    expect(result.col("score").at("A")).toBe(40);
    expect(result.col("score").at("B")).toBe(20);
  });

  test("mean", () => {
    const df = DataFrame.fromRecords([
      { g: "X", v: 10 },
      { g: "X", v: 20 },
      { g: "Y", v: 5 },
    ]);
    const result = dataFrameGroupBy(df, "g").mean();
    expect(result.col("v").at("X")).toBe(15);
    expect(result.col("v").at("Y")).toBe(5);
  });

  test("count ignores null values", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 1 },
      { g: "A", v: null },
      { g: "B", v: 3 },
    ]);
    const result = dataFrameGroupBy(df, "g").count();
    expect(result.col("v").at("A")).toBe(1);
    expect(result.col("v").at("B")).toBe(1);
  });

  test("first and last values per group", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 10 },
      { g: "A", v: 20 },
      { g: "B", v: 99 },
    ]);
    const grp = dataFrameGroupBy(df, "g");
    expect(grp.first().col("v").at("A")).toBe(10);
    expect(grp.last().col("v").at("A")).toBe(20);
  });

  test("agg with builtin name", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 1 },
      { g: "B", v: 2 },
      { g: "A", v: 3 },
    ]);
    const result = dataFrameGroupBy(df, "g").agg("sum");
    expect(result.col("v").at("A")).toBe(4);
  });

  test("agg with spec (per-column aggregation)", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 10, w: 1 },
      { g: "A", v: 30, w: 3 },
      { g: "B", v: 20, w: 2 },
    ]);
    const result = dataFrameGroupBy(df, "g").agg({ v: "sum", w: "mean" });
    expect(result.col("v").at("A")).toBe(40);
    expect(result.col("w").at("A")).toBe(2);
    expect(result.col("v").at("B")).toBe(20);
  });

  test("agg spec with unknown column throws", () => {
    const df = DataFrame.fromRecords([{ g: "A", v: 1 }]);
    expect(() => dataFrameGroupBy(df, "g").agg({ z: "sum" })).toThrow();
  });
});

// ─── DataFrameGroupBy — transform ────────────────────────────────────────────

describe("DataFrameGroupBy transform", () => {
  test("returns a series of the same length as the source", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 10 },
      { g: "A", v: 20 },
      { g: "B", v: 30 },
    ]);
    const result = dataFrameGroupBy(df, "g").transform("v", (vals) =>
      vals.map((x) => (x as number) * 2),
    );
    expect(result.size).toBe(3);
    expect([...result.values]).toEqual([20, 40, 60]);
  });
});

// ─── DataFrameGroupBy — apply ─────────────────────────────────────────────────

describe("DataFrameGroupBy apply", () => {
  test("apply returns one scalar per group", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 10 },
      { g: "A", v: 20 },
      { g: "B", v: 99 },
    ]);
    const result = dataFrameGroupBy(df, "g").apply((sub) => sub.shape[0] as Scalar);
    expect(result.at("A")).toBe(2);
    expect(result.at("B")).toBe(1);
  });
});

// ─── DataFrameGroupBy — getGroup and iteration ───────────────────────────────

describe("DataFrameGroupBy getGroup and iteration", () => {
  test("getGroup returns the sub-dataframe for a key", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 10 },
      { g: "B", v: 20 },
      { g: "A", v: 30 },
    ]);
    const grp = dataFrameGroupBy(df, "g");
    const gA = grp.getGroup("A");
    expect(gA.shape[0]).toBe(2);
    expect([...gA.col("v").values]).toEqual([10, 30]);
  });

  test("getGroup throws for an unknown key", () => {
    const df = DataFrame.fromRecords([{ g: "A", v: 1 }]);
    expect(() => dataFrameGroupBy(df, "g").getGroup("Z")).toThrow();
  });

  test("iterates over [key, DataFrame] pairs in insertion order", () => {
    const df = DataFrame.fromRecords([
      { g: "A", v: 10 },
      { g: "B", v: 20 },
      { g: "A", v: 30 },
    ]);
    const grp = dataFrameGroupBy(df, "g");
    const keys: string[] = [];
    for (const [k] of grp) {
      keys.push(String(k));
    }
    expect(keys).toEqual(["A", "B"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("SeriesGroupBy property tests", () => {
  test("sum of all group sums equals the overall series sum", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.constantFrom("A", "B", "C"), { minLength: 1, maxLength: 20 }),
        (dataArr, keyArr) => {
          const len = Math.min(dataArr.length, keyArr.length);
          if (len === 0) return true;
          const data = dataArr.slice(0, len);
          const keys = keyArr.slice(0, len);
          const s = new Series<number>({ data });
          const grp = seriesGroupBy(s as Series<Scalar>, keys as Label[]);
          const groupSums = grp.sum();
          const totalFromGroups = (groupSums.values as number[]).reduce((a, b) => a + b, 0);
          const totalDirect = data.reduce((a, b) => a + b, 0);
          return Math.abs(totalFromGroups - totalDirect) < 0.0001;
        },
      ),
    );
  });

  test("total count across all groups equals the series length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.constantFrom("A", "B", "C"), { minLength: 1, maxLength: 20 }),
        (dataArr, keyArr) => {
          const len = Math.min(dataArr.length, keyArr.length);
          if (len === 0) return true;
          const data = dataArr.slice(0, len);
          const keys = keyArr.slice(0, len);
          const s = new Series<number>({ data });
          const grp = seriesGroupBy(s as Series<Scalar>, keys as Label[]);
          const totalCount = (grp.count().values as number[]).reduce((a, b) => a + b, 0);
          return totalCount === len;
        },
      ),
    );
  });

  test("ngroups is always at most the series length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.constantFrom("A", "B", "C", "D"), { minLength: 1, maxLength: 20 }),
        (dataArr, keyArr) => {
          const len = Math.min(dataArr.length, keyArr.length);
          if (len === 0) return true;
          const s = new Series<number>({ data: dataArr.slice(0, len) });
          const grp = seriesGroupBy(s as Series<Scalar>, keyArr.slice(0, len) as Label[]);
          return grp.ngroups <= len;
        },
      ),
    );
  });
});

describe("DataFrameGroupBy property tests", () => {
  test("sum of all group sums equals the overall column sum", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            g: fc.constantFrom("A", "B", "C"),
            v: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (rows) => {
          const df = DataFrame.fromRecords(rows);
          const result = dataFrameGroupBy(df, "g").sum();
          const expected = (df.col("v").values as number[]).reduce((a, b) => a + b, 0);
          const actual = (result.col("v").values as number[]).reduce((a, b) => a + b, 0);
          return Math.abs(expected - actual) < 0.0001;
        },
      ),
    );
  });
});
