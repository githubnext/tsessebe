/**
 * Tests for src/reshape/explode.ts — explode list-valued cells into rows.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Scalar, Series } from "../../src/index.ts";
import { explodeDataFrame, explodeSeries } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function seriesValues(s: Series<Scalar>): Scalar[] {
  return [...s.values];
}

function seriesLabels(s: Series<Scalar>): unknown[] {
  return [...s.index.values];
}

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

function dfLabels(df: DataFrame): unknown[] {
  return [...df.index.values];
}

// ─── explodeSeries ─────────────────────────────────────────────────────────────

describe("explodeSeries", () => {
  describe("basic list expansion", () => {
    it("expands array-valued cells into individual rows", () => {
      const s = new Series<Scalar>({
        data: [
          [1, 2, 3],
          [4, 5],
        ] as unknown as Scalar[],
        name: "x",
      });
      expect(seriesValues(explodeSeries(s))).toEqual([1, 2, 3, 4, 5]);
    });

    it("passes scalar values through unchanged", () => {
      const s = new Series<Scalar>({ data: [1, 2, 3] as Scalar[], name: "x" });
      expect(seriesValues(explodeSeries(s))).toEqual([1, 2, 3]);
    });

    it("mixed arrays and scalars", () => {
      const s = new Series<Scalar>({
        data: [[10, 20], 30, [40]] as unknown as Scalar[],
        name: "x",
      });
      expect(seriesValues(explodeSeries(s))).toEqual([10, 20, 30, 40]);
    });

    it("null value produces single null row", () => {
      const s = new Series<Scalar>({ data: [null, 1] as Scalar[], name: "x" });
      expect(seriesValues(explodeSeries(s))).toEqual([null, 1]);
    });

    it("empty array produces single null row", () => {
      const s = new Series<Scalar>({
        data: [[], [1, 2]] as unknown as Scalar[],
        name: "x",
      });
      expect(seriesValues(explodeSeries(s))).toEqual([null, 1, 2]);
    });

    it("preserves series name", () => {
      const s = new Series<Scalar>({ data: [[1, 2]] as unknown as Scalar[], name: "myname" });
      expect(explodeSeries(s).name).toBe("myname");
    });
  });

  describe("index handling", () => {
    it("duplicates labels by default (ignoreIndex=false)", () => {
      const s = new Series<Scalar>({
        data: [[1, 2], [3]] as unknown as Scalar[],
        index: ["a", "b"],
        name: "x",
      });
      const result = explodeSeries(s);
      expect(seriesLabels(result)).toEqual(["a", "a", "b"]);
    });

    it("resets to RangeIndex when ignoreIndex=true", () => {
      const s = new Series<Scalar>({
        data: [[1, 2], [3]] as unknown as Scalar[],
        index: ["a", "b"],
        name: "x",
      });
      const result = explodeSeries(s, { ignoreIndex: true });
      expect(seriesLabels(result)).toEqual([0, 1, 2]);
    });

    it("preserves numeric labels", () => {
      const s = new Series<Scalar>({
        data: [
          [10, 20],
          [30, 40],
        ] as unknown as Scalar[],
        index: [100, 200],
        name: "x",
      });
      const result = explodeSeries(s);
      expect(seriesLabels(result)).toEqual([100, 100, 200, 200]);
    });
  });

  describe("edge cases", () => {
    it("empty series returns empty series", () => {
      const s = new Series<Scalar>({ data: [], name: "x" });
      const result = explodeSeries(s);
      expect(result.values.length).toBe(0);
    });

    it("single-element arrays expand correctly", () => {
      const s = new Series<Scalar>({
        data: [[42], [99]] as unknown as Scalar[],
        name: "x",
      });
      expect(seriesValues(explodeSeries(s))).toEqual([42, 99]);
    });

    it("all null values", () => {
      const s = new Series<Scalar>({ data: [null, null] as Scalar[], name: "x" });
      expect(seriesValues(explodeSeries(s))).toEqual([null, null]);
    });
  });
});

// ─── explodeDataFrame ──────────────────────────────────────────────────────────

describe("explodeDataFrame", () => {
  describe("single column explosion", () => {
    it("explodes one column, repeats other columns", () => {
      const df = DataFrame.fromColumns({
        a: [1, 2] as Scalar[],
        b: [[10, 20], [30]] as unknown as Scalar[],
      });
      const result = explodeDataFrame(df, "b");
      expect(result.shape[0]).toBe(3);
      expect(colValues(result, "a")).toEqual([1, 1, 2]);
      expect(colValues(result, "b")).toEqual([10, 20, 30]);
    });

    it("handles scalar values in explode column", () => {
      const df = DataFrame.fromColumns({
        a: [1, 2, 3] as Scalar[],
        b: [10, 20, 30] as Scalar[],
      });
      const result = explodeDataFrame(df, "b");
      expect(result.shape[0]).toBe(3);
      expect(colValues(result, "b")).toEqual([10, 20, 30]);
    });

    it("null in explode column → null row", () => {
      const df = DataFrame.fromColumns({
        a: [1, 2] as Scalar[],
        b: [null, [3, 4]] as unknown as Scalar[],
      });
      const result = explodeDataFrame(df, "b");
      expect(result.shape[0]).toBe(3);
      expect(colValues(result, "b")).toEqual([null, 3, 4]);
      expect(colValues(result, "a")).toEqual([1, 2, 2]);
    });

    it("empty array in explode column → null row", () => {
      const df = DataFrame.fromColumns({
        a: [1, 2] as Scalar[],
        b: [[], [5, 6]] as unknown as Scalar[],
      });
      const result = explodeDataFrame(df, "b");
      expect(colValues(result, "b")).toEqual([null, 5, 6]);
      expect(colValues(result, "a")).toEqual([1, 2, 2]);
    });

    it("preserves column order", () => {
      const df = DataFrame.fromColumns({
        x: [1] as Scalar[],
        y: [[2, 3]] as unknown as Scalar[],
        z: [4] as Scalar[],
      });
      const result = explodeDataFrame(df, "y");
      expect(result.columns.values).toEqual(["x", "y", "z"]);
    });
  });

  describe("multi-column explosion", () => {
    it("explodes two columns together (same-length arrays)", () => {
      const df = DataFrame.fromColumns({
        a: [
          [1, 2],
          [3, 4],
        ] as unknown as Scalar[],
        b: [
          ["x", "y"],
          ["p", "q"],
        ] as unknown as Scalar[],
        c: [10, 20] as Scalar[],
      });
      const result = explodeDataFrame(df, ["a", "b"]);
      expect(result.shape[0]).toBe(4);
      expect(colValues(result, "a")).toEqual([1, 2, 3, 4]);
      expect(colValues(result, "b")).toEqual(["x", "y", "p", "q"]);
      expect(colValues(result, "c")).toEqual([10, 10, 20, 20]);
    });

    it("pads shorter column with null on mismatched lengths", () => {
      const df = DataFrame.fromColumns({
        a: [[1, 2, 3]] as unknown as Scalar[],
        b: [["x", "y"]] as unknown as Scalar[],
      });
      const result = explodeDataFrame(df, ["a", "b"]);
      expect(result.shape[0]).toBe(3);
      expect(colValues(result, "a")).toEqual([1, 2, 3]);
      expect(colValues(result, "b")).toEqual(["x", "y", null]);
    });
  });

  describe("index handling", () => {
    it("duplicates row labels by default", () => {
      const df = DataFrame.fromColumns(
        { a: [[1, 2], [3]] as unknown as Scalar[] },
        { index: ["r0", "r1"] },
      );
      const result = explodeDataFrame(df, "a");
      expect(dfLabels(result)).toEqual(["r0", "r0", "r1"]);
    });

    it("resets to RangeIndex when ignoreIndex=true", () => {
      const df = DataFrame.fromColumns(
        { a: [[1, 2], [3]] as unknown as Scalar[] },
        { index: ["r0", "r1"] },
      );
      const result = explodeDataFrame(df, "a", { ignoreIndex: true });
      expect(dfLabels(result)).toEqual([0, 1, 2]);
    });
  });

  describe("error handling", () => {
    it("throws when column does not exist", () => {
      const df = DataFrame.fromColumns({ a: [1, 2] as Scalar[] });
      expect(() => explodeDataFrame(df, "missing")).toThrow("Column 'missing' not found");
    });
  });

  describe("edge cases", () => {
    it("empty DataFrame returns empty DataFrame", () => {
      const df = DataFrame.fromColumns({ a: [] as Scalar[] });
      const result = explodeDataFrame(df, "a");
      expect(result.shape[0]).toBe(0);
    });

    it("single column DataFrame", () => {
      const df = DataFrame.fromColumns({ x: [[1, 2, 3]] as unknown as Scalar[] });
      const result = explodeDataFrame(df, "x");
      expect(colValues(result, "x")).toEqual([1, 2, 3]);
    });

    it("multiple rows with varying list lengths", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2, 3] as Scalar[],
        vals: [[1], [2, 3], [4, 5, 6]] as unknown as Scalar[],
      });
      const result = explodeDataFrame(df, "vals");
      expect(result.shape[0]).toBe(6);
      expect(colValues(result, "id")).toEqual([1, 2, 2, 3, 3, 3]);
      expect(colValues(result, "vals")).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});

// ─── property-based tests ──────────────────────────────────────────────────────

describe("explodeSeries — property tests", () => {
  it("total output length equals sum of list lengths (scalars count as 1)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.array(fc.integer(), { minLength: 1, maxLength: 5 })), {
          minLength: 1,
          maxLength: 20,
        }),
        (items) => {
          const data = items as unknown as Scalar[];
          const s = new Series<Scalar>({ data, name: "test" });
          const result = explodeSeries(s);
          const expectedLen = items.reduce((sum: number, v) => {
            if (Array.isArray(v)) return sum + (v as unknown[]).length;
            return sum + 1;
          }, 0);
          return result.values.length === expectedLen;
        },
      ),
    );
  });

  it("ignore_index produces RangeIndex 0..n-1", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.array(fc.integer(), { minLength: 1, maxLength: 3 })), {
          minLength: 0,
          maxLength: 10,
        }),
        (items) => {
          const s = new Series<Scalar>({ data: items as unknown as Scalar[], name: "t" });
          const result = explodeSeries(s, { ignoreIndex: true });
          const labels = result.index.values as unknown[];
          return labels.every((v, i) => v === i);
        },
      ),
    );
  });
});

describe("explodeDataFrame — property tests", () => {
  it("non-exploded columns repeat values correctly", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 0, max: 100 }),
            vals: fc.array(fc.integer(), { minLength: 1, maxLength: 4 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (rows) => {
          const df = DataFrame.fromColumns({
            id: rows.map((r) => r.id) as Scalar[],
            vals: rows.map((r) => r.vals) as unknown as Scalar[],
          });
          const result = explodeDataFrame(df, "vals");
          // Each id value should repeat as many times as the corresponding vals array length
          const expectedIds: number[] = rows.flatMap((r) => r.vals.map(() => r.id));
          const actualIds = colValues(result, "id") as number[];
          return actualIds.every((v, i) => v === expectedIds[i]);
        },
      ),
    );
  });
});
