/**
 * Tests for infer_objects — inferObjectsSeries/DataFrame and convertDtypesSeries/DataFrame.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Dtype,
  Series,
  convertDtypesDataFrame,
  convertDtypesSeries,
  inferObjectsDataFrame,
  inferObjectsSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── inferObjectsSeries ───────────────────────────────────────────────────────

describe("inferObjectsSeries", () => {
  it("converts object-typed int values to int64", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype.kind).toBe("int");
    expect([...result.values]).toEqual([1, 2, 3]);
  });

  it("converts object-typed float values to float64", () => {
    const s = new Series<Scalar>({ data: [1.1, 2.2, 3.3], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype.kind).toBe("float");
  });

  it("converts object-typed bool values to bool", () => {
    const s = new Series<Scalar>({ data: [true, false, true], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype.kind).toBe("bool");
  });

  it("converts object-typed string values to string dtype", () => {
    const s = new Series<Scalar>({ data: ["a", "b", "c"], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype.kind).toBe("string");
  });

  it("all-null object series: returns original (no inference)", () => {
    const s = new Series<Scalar>({ data: [null, null, null], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype).toBe(s.dtype);
  });

  it("mixed-type object series: returns original (no inference)", () => {
    const s = new Series<Scalar>({ data: [1, "a", true], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype.kind).toBe("object");
  });

  it("non-object series: returned unchanged when objectOnly=true (default)", () => {
    const s = new Series<Scalar>({ data: [1.1, 2.2], dtype: Dtype.float64 });
    const result = inferObjectsSeries(s);
    expect(result).toBe(s);
  });

  it("non-object series: inferred when objectOnly=false", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], dtype: Dtype.object });
    const result = inferObjectsSeries(s, { objectOnly: false });
    expect(result.dtype.kind).toBe("int");
  });

  it("preserves index and name", () => {
    const s = new Series<Scalar>({
      data: [1, 2, 3],
      dtype: Dtype.object,
      index: ["a", "b", "c"],
      name: "my_col",
    });
    const result = inferObjectsSeries(s);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
    expect(result.name).toBe("my_col");
  });

  it("nulls mixed with ints: infers to int64", () => {
    const s = new Series<Scalar>({ data: [1, null, 3], dtype: Dtype.object });
    const result = inferObjectsSeries(s);
    expect(result.dtype.kind).toBe("int");
  });
});

// ─── inferObjectsDataFrame ────────────────────────────────────────────────────

describe("inferObjectsDataFrame", () => {
  it("infers dtypes for all columns", () => {
    const df = DataFrame.fromColumns({
      a: [1, 2, 3],
      b: [1.1, 2.2, 3.3],
      c: ["x", "y", "z"],
    });
    const result = inferObjectsDataFrame(df);
    expect(result.shape).toEqual(df.shape);
    expect([...result.columns.values]).toEqual([...df.columns.values]);
  });

  it("preserves column values during inference", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: ["x", "y"] });
    const result = inferObjectsDataFrame(df);
    expect([...result.col("a").values]).toEqual([1, 2]);
    expect([...result.col("b").values]).toEqual(["x", "y"]);
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2] }, { index: ["r0", "r1"] });
    const result = inferObjectsDataFrame(df);
    expect([...result.index.values]).toEqual(["r0", "r1"]);
  });
});

// ─── convertDtypesSeries ──────────────────────────────────────────────────────

describe("convertDtypesSeries", () => {
  it("converts numeric string series to int64", () => {
    const s = new Series<Scalar>({ data: ["1", "2", "3"] });
    const result = convertDtypesSeries(s);
    expect(result.dtype.kind).toBe("int");
    expect([...result.values]).toEqual([1, 2, 3]);
  });

  it("converts mixed int/float string series to float64", () => {
    const s = new Series<Scalar>({ data: ["1", "2.5", "3"] });
    const result = convertDtypesSeries(s);
    expect(result.dtype.kind).toBe("float");
    expect([...result.values]).toEqual([1, 2.5, 3]);
  });

  it("non-numeric string series: unchanged", () => {
    const s = new Series<Scalar>({ data: ["apple", "banana"] });
    const result = convertDtypesSeries(s);
    expect(result).toBe(s);
  });

  it("int series: returned unchanged", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], dtype: Dtype.int64 });
    const result = convertDtypesSeries(s);
    expect(result).toBe(s);
  });

  it("float series: returned unchanged", () => {
    const s = new Series<Scalar>({ data: [1.1, 2.2], dtype: Dtype.float64 });
    const result = convertDtypesSeries(s);
    expect(result).toBe(s);
  });

  it("bool series: returned unchanged", () => {
    const s = new Series<Scalar>({ data: [true, false], dtype: Dtype.bool });
    const result = convertDtypesSeries(s);
    expect(result).toBe(s);
  });

  it("object series with numeric values: inferred to int", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], dtype: Dtype.object });
    const result = convertDtypesSeries(s);
    expect(result.dtype.kind).toBe("int");
  });

  it("object series with string numerics: converted to float", () => {
    const s = new Series<Scalar>({ data: ["1.5", "2.5"], dtype: Dtype.object });
    const result = convertDtypesSeries(s);
    expect(result.dtype.kind).toBe("float");
    expect([...result.values]).toEqual([1.5, 2.5]);
  });

  it("convertString=false: string series unchanged", () => {
    const s = new Series<Scalar>({ data: ["1", "2"] });
    const result = convertDtypesSeries(s, { convertString: false });
    expect(result).toBe(s);
  });

  it("int series with nulls, convertIntegerToFloat=true: converted to float", () => {
    const s = new Series<Scalar>({ data: [1, null, 3], dtype: Dtype.int64 });
    const result = convertDtypesSeries(s, { convertIntegerToFloat: true });
    expect(result.dtype.kind).toBe("float");
  });

  it("int series without nulls: unchanged even with convertIntegerToFloat=true", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], dtype: Dtype.int64 });
    const result = convertDtypesSeries(s, { convertIntegerToFloat: true });
    expect(result).toBe(s);
  });

  it("preserves index and name after conversion", () => {
    const s = new Series<Scalar>({
      data: ["10", "20", "30"],
      index: ["a", "b", "c"],
      name: "scores",
    });
    const result = convertDtypesSeries(s);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
    expect(result.name).toBe("scores");
  });

  it("handles null values in string series", () => {
    const s = new Series<Scalar>({ data: ["1", null, "3"] });
    const result = convertDtypesSeries(s);
    expect(result.dtype.kind).toBe("int");
    expect([...result.values]).toEqual([1, null, 3]);
  });

  it("property: values count is preserved after conversion", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series<Scalar>({ data: arr });
          const result = convertDtypesSeries(s);
          return result.values.length === arr.length;
        },
      ),
    );
  });
});

// ─── convertDtypesDataFrame ───────────────────────────────────────────────────

describe("convertDtypesDataFrame", () => {
  it("converts string-numeric columns to int/float", () => {
    const df = DataFrame.fromColumns({
      a: ["1", "2", "3"],
      b: ["1.1", "2.2", "3.3"],
      c: ["x", "y", "z"],
    });
    const result = convertDtypesDataFrame(df);
    expect(result.col("a").dtype.kind).toBe("int");
    expect(result.col("b").dtype.kind).toBe("float");
    // non-numeric string unchanged
    expect([...result.col("c").values]).toEqual(["x", "y", "z"]);
  });

  it("preserves shape and index", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] }, { index: ["r0", "r1"] });
    const result = convertDtypesDataFrame(df);
    expect(result.shape).toEqual(df.shape);
    expect([...result.index.values]).toEqual(["r0", "r1"]);
  });

  it("passes options to each column", () => {
    const df = DataFrame.fromColumns({
      a: ["1", "2"],
      b: ["hello", "world"],
    });
    const result = convertDtypesDataFrame(df, { convertString: false });
    // Both columns unchanged since convertString=false
    expect([...result.col("a").values]).toEqual(["1", "2"]);
    expect([...result.col("b").values]).toEqual(["hello", "world"]);
  });
});
