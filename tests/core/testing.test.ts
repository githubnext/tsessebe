/**
 * Tests for tsb testing utilities (assertSeriesEqual, assertDataFrameEqual, assertIndexEqual).
 */
import { describe, expect, it } from "bun:test";
import {
  AssertionError,
  DataFrame,
  Index,
  Series,
  assertDataFrameEqual,
  assertIndexEqual,
  assertSeriesEqual,
} from "../../src/index.ts";

describe("assertIndexEqual", () => {
  it("passes for equal indexes", () => {
    const a = Index.from({ data: [1, 2, 3] });
    const b = Index.from({ data: [1, 2, 3] });
    expect(() => assertIndexEqual(a, b)).not.toThrow();
  });

  it("throws on length mismatch", () => {
    const a = Index.from({ data: [1, 2] });
    const b = Index.from({ data: [1, 2, 3] });
    expect(() => assertIndexEqual(a, b)).toThrow(AssertionError);
  });

  it("throws on value mismatch", () => {
    const a = Index.from({ data: [1, 2, 3] });
    const b = Index.from({ data: [1, 2, 4] });
    expect(() => assertIndexEqual(a, b)).toThrow(AssertionError);
  });
});

describe("assertSeriesEqual", () => {
  it("passes for identical series", () => {
    const s1 = new Series({ data: [1, 2, 3] });
    const s2 = new Series({ data: [1, 2, 3] });
    expect(() => assertSeriesEqual(s1, s2)).not.toThrow();
  });

  it("passes with float tolerance", () => {
    const s1 = new Series<number>({ data: [1.0, 2.0] });
    const s2 = new Series<number>({ data: [1.0 + 1e-10, 2.0 - 1e-10] });
    expect(() => assertSeriesEqual(s1, s2, { checkDtype: false })).not.toThrow();
  });

  it("throws on value mismatch", () => {
    const s1 = new Series({ data: [1, 2, 3] });
    const s2 = new Series({ data: [1, 2, 99] });
    expect(() => assertSeriesEqual(s1, s2)).toThrow(AssertionError);
  });

  it("throws on length mismatch", () => {
    const s1 = new Series({ data: [1, 2] });
    const s2 = new Series({ data: [1, 2, 3] });
    expect(() => assertSeriesEqual(s1, s2)).toThrow(AssertionError);
  });

  it("passes for NaN == NaN", () => {
    const s1 = new Series({ data: [1, Number.NaN, 3] });
    const s2 = new Series({ data: [1, Number.NaN, 3] });
    expect(() => assertSeriesEqual(s1, s2)).not.toThrow();
  });

  it("throws when one has NaN and other doesn't", () => {
    const s1 = new Series({ data: [1, Number.NaN, 3] });
    const s2 = new Series({ data: [1, 2, 3] });
    expect(() => assertSeriesEqual(s1, s2)).toThrow(AssertionError);
  });
});

describe("assertDataFrameEqual", () => {
  it("passes for identical dataframes", () => {
    const df1 = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const df2 = DataFrame.fromRecords([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    expect(() => assertDataFrameEqual(df1, df2)).not.toThrow();
  });

  it("throws on shape mismatch", () => {
    const df1 = DataFrame.fromRecords([{ a: 1 }]);
    const df2 = DataFrame.fromRecords([{ a: 1 }, { a: 2 }]);
    expect(() => assertDataFrameEqual(df1, df2)).toThrow(AssertionError);
  });

  it("throws on column mismatch", () => {
    const df1 = DataFrame.fromRecords([{ a: 1, b: 2 }]);
    const df2 = DataFrame.fromRecords([{ a: 1, c: 2 }]);
    expect(() => assertDataFrameEqual(df1, df2)).toThrow(AssertionError);
  });

  it("throws on value mismatch", () => {
    const df1 = DataFrame.fromRecords([{ a: 1, b: 2 }]);
    const df2 = DataFrame.fromRecords([{ a: 1, b: 99 }]);
    expect(() => assertDataFrameEqual(df1, df2)).toThrow(AssertionError);
  });
});
