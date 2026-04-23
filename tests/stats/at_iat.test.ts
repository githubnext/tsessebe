/**
 * Tests for at_iat — fast scalar access for Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFrameAt,
  dataFrameIat,
  seriesAt,
  seriesIat,
} from "../../src/index.ts";

// ─── seriesAt ─────────────────────────────────────────────────────────────────

describe("seriesAt", () => {
  it("returns value by string label", () => {
    const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
    expect(seriesAt(s, "a")).toBe(10);
    expect(seriesAt(s, "b")).toBe(20);
    expect(seriesAt(s, "c")).toBe(30);
  });

  it("returns value by numeric label", () => {
    const s = new Series({ data: [100, 200] });
    expect(seriesAt(s, 0)).toBe(100);
    expect(seriesAt(s, 1)).toBe(200);
  });

  it("returns null for missing values", () => {
    const s = new Series({ data: [null, 5], index: ["x", "y"] });
    expect(seriesAt(s, "x")).toBeNull();
    expect(seriesAt(s, "y")).toBe(5);
  });

  it("throws RangeError for unknown label", () => {
    const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
    expect(() => seriesAt(s, "z")).toThrow(RangeError);
  });

  it("property: seriesAt matches direct s.at(label)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), (data) => {
        const s = new Series({ data });
        const i = Math.floor(data.length / 2);
        return seriesAt(s, i) === s.at(i);
      }),
    );
  });
});

// ─── seriesIat ────────────────────────────────────────────────────────────────

describe("seriesIat", () => {
  it("returns value at integer position", () => {
    const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
    expect(seriesIat(s, 0)).toBe(10);
    expect(seriesIat(s, 1)).toBe(20);
    expect(seriesIat(s, 2)).toBe(30);
  });

  it("supports negative indexing", () => {
    const s = new Series({ data: [10, 20, 30] });
    expect(seriesIat(s, -1)).toBe(30);
    expect(seriesIat(s, -3)).toBe(10);
  });

  it("throws RangeError for out-of-bounds position", () => {
    const s = new Series({ data: [1, 2] });
    expect(() => seriesIat(s, 5)).toThrow(RangeError);
    expect(() => seriesIat(s, -5)).toThrow(RangeError);
  });

  it("property: seriesIat matches direct s.iat(i)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data });
          const i = Math.floor(data.length / 2);
          return seriesIat(s, i) === s.iat(i);
        },
      ),
    );
  });
});

// ─── dataFrameAt ──────────────────────────────────────────────────────────────

describe("dataFrameAt", () => {
  it("returns scalar by row label and column name", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 5, 6] }, { index: ["r0", "r1", "r2"] });
    expect(dataFrameAt(df, "r0", "x")).toBe(1);
    expect(dataFrameAt(df, "r1", "y")).toBe(5);
    expect(dataFrameAt(df, "r2", "x")).toBe(3);
  });

  it("returns null for null values", () => {
    const df = DataFrame.fromColumns({ a: [null, 2] }, { index: ["r0", "r1"] });
    expect(dataFrameAt(df, "r0", "a")).toBeNull();
  });

  it("works with numeric row index", () => {
    const df = DataFrame.fromColumns({ v: [10, 20, 30] });
    expect(dataFrameAt(df, 0, "v")).toBe(10);
    expect(dataFrameAt(df, 2, "v")).toBe(30);
  });

  it("throws for unknown column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] }, { index: ["r0", "r1"] });
    expect(() => dataFrameAt(df, "r0", "z")).toThrow();
  });

  it("throws for unknown row label", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] }, { index: ["r0", "r1"] });
    expect(() => dataFrameAt(df, "no-such-row", "a")).toThrow(RangeError);
  });

  it("property: matches df.col(c).at(r) for all cells", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 10 })
          .chain((len) =>
            fc.tuple(
              fc.array(fc.integer({ min: -100, max: 100 }), { minLength: len, maxLength: len }),
              fc.array(fc.integer({ min: -100, max: 100 }), { minLength: len, maxLength: len }),
            ),
          ),
        ([col1, col2]) => {
          const df = DataFrame.fromColumns({ a: col1, b: col2 });
          const ri = Math.floor(Math.min(col1.length, col2.length) / 2);
          return (
            dataFrameAt(df, ri, "a") === df.col("a").at(ri) &&
            dataFrameAt(df, ri, "b") === df.col("b").at(ri)
          );
        },
      ),
    );
  });
});

// ─── dataFrameIat ─────────────────────────────────────────────────────────────

describe("dataFrameIat", () => {
  it("returns scalar by integer row and column position", () => {
    const df = DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 5, 6] }, { index: ["r0", "r1", "r2"] });
    expect(dataFrameIat(df, 0, 0)).toBe(1); // row 0, col 0 = "x"
    expect(dataFrameIat(df, 1, 1)).toBe(5); // row 1, col 1 = "y"
    expect(dataFrameIat(df, 2, 0)).toBe(3);
  });

  it("supports negative column index", () => {
    const df = DataFrame.fromColumns({ a: [10, 20], b: [30, 40] });
    expect(dataFrameIat(df, 0, -1)).toBe(30); // last col = "b", row 0
    expect(dataFrameIat(df, 1, -2)).toBe(20); // first col = "a", row 1
  });

  it("supports negative row index", () => {
    const df = DataFrame.fromColumns({ v: [5, 6, 7] });
    expect(dataFrameIat(df, -1, 0)).toBe(7);
    expect(dataFrameIat(df, -3, 0)).toBe(5);
  });

  it("throws RangeError for out-of-bounds column position", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    expect(() => dataFrameIat(df, 0, 5)).toThrow(RangeError);
    expect(() => dataFrameIat(df, 0, -5)).toThrow(RangeError);
  });

  it("throws RangeError for out-of-bounds row position", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] });
    expect(() => dataFrameIat(df, 10, 0)).toThrow(RangeError);
    expect(() => dataFrameIat(df, -10, 0)).toThrow(RangeError);
  });

  it("property: matches df.col(columns[ci]).iat(ri) for all cells", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 2, maxLength: 8 }),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 2, maxLength: 8 }),
        (col1, col2) => {
          const nRows = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({ a: col1.slice(0, nRows), b: col2.slice(0, nRows) });
          const ri = Math.floor(nRows / 2);
          return (
            dataFrameIat(df, ri, 0) === df.col("a").iat(ri) &&
            dataFrameIat(df, ri, 1) === df.col("b").iat(ri)
          );
        },
      ),
    );
  });
});
