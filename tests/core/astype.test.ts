/**
 * Tests for src/core/astype.ts
 * — castScalar, astypeSeries, astypeDataFrame
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Dtype,
  Series,
  astypeDataFrame,
  astypeSeries,
  castScalar,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function s(data: readonly Scalar[]): Series<Scalar> {
  return new Series({ data: [...data] });
}

// ─── castScalar ───────────────────────────────────────────────────────────────

describe("castScalar", () => {
  it("null → null for any dtype", () => {
    for (const name of ["int64", "float64", "bool", "string", "object"] as const) {
      expect(castScalar(null, Dtype.from(name))).toBeNull();
    }
  });

  it("number → int64 (truncates float)", () => {
    expect(castScalar(3.9, Dtype.from("int64"))).toBe(3);
    expect(castScalar(-2.1, Dtype.from("int64"))).toBe(-2);
    expect(castScalar(0, Dtype.from("int64"))).toBe(0);
  });

  it("boolean → int (1/0)", () => {
    expect(castScalar(true, Dtype.from("int64"))).toBe(1);
    expect(castScalar(false, Dtype.from("int64"))).toBe(0);
  });

  it("numeric string → int64", () => {
    expect(castScalar("42", Dtype.from("int64"))).toBe(42);
    expect(castScalar(" -7 ", Dtype.from("int64"))).toBe(-7);
  });

  it("non-numeric string → TypeError with errors=raise", () => {
    expect(() => castScalar("hello", Dtype.from("int64"), "raise")).toThrow(TypeError);
  });

  it("non-numeric string → original value with errors=ignore", () => {
    expect(castScalar("hello", Dtype.from("int64"), "ignore")).toBe("hello");
  });

  it("number → float64 (identity for finite)", () => {
    expect(castScalar(3.14, Dtype.from("float64"))).toBe(3.14);
    expect(castScalar(Number.POSITIVE_INFINITY, Dtype.from("float64"))).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it("bool → float (1.0 / 0.0)", () => {
    expect(castScalar(true, Dtype.from("float64"))).toBe(1);
    expect(castScalar(false, Dtype.from("float64"))).toBe(0);
  });

  it("number → float32 (applies fround)", () => {
    const pi = Math.PI;
    const result = castScalar(pi, Dtype.from("float32"));
    expect(result).toBeCloseTo(Math.fround(pi), 5);
  });

  it("number → bool", () => {
    expect(castScalar(1, Dtype.from("bool"))).toBe(true);
    expect(castScalar(0, Dtype.from("bool"))).toBe(false);
    expect(castScalar(-5, Dtype.from("bool"))).toBe(true);
    expect(castScalar(Number.NaN, Dtype.from("bool"))).toBe(false);
  });

  it("bool → bool (identity)", () => {
    expect(castScalar(true, Dtype.from("bool"))).toBe(true);
    expect(castScalar(false, Dtype.from("bool"))).toBe(false);
  });

  it("string → bool (truthy rules)", () => {
    expect(castScalar("true", Dtype.from("bool"))).toBe(true);
    expect(castScalar("false", Dtype.from("bool"))).toBe(false);
    expect(castScalar("1", Dtype.from("bool"))).toBe(true);
    expect(castScalar("0", Dtype.from("bool"))).toBe(false);
    expect(castScalar("", Dtype.from("bool"))).toBe(false);
    expect(castScalar("hello", Dtype.from("bool"))).toBe(true);
  });

  it("number → string", () => {
    expect(castScalar(42, Dtype.from("string"))).toBe("42");
    expect(castScalar(3.14, Dtype.from("string"))).toBe("3.14");
  });

  it("bool → string", () => {
    expect(castScalar(true, Dtype.from("string"))).toBe("true");
    expect(castScalar(false, Dtype.from("string"))).toBe("false");
  });

  it("string → string (identity)", () => {
    expect(castScalar("hello", Dtype.from("string"))).toBe("hello");
  });

  it("Date → string gives ISO string", () => {
    const d = new Date("2024-01-15T00:00:00.000Z");
    expect(castScalar(d, Dtype.from("string"))).toBe(d.toISOString());
  });

  it("number → datetime creates a Date", () => {
    const ts = 1705276800000;
    const result = castScalar(ts, Dtype.from("datetime"));
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getTime()).toBe(ts);
  });

  it("string → datetime parses ISO string", () => {
    const result = castScalar("2024-01-15", Dtype.from("datetime"));
    expect(result).toBeInstanceOf(Date);
  });

  it("unparseable string → TypeError with errors=raise for datetime", () => {
    expect(() => castScalar("not-a-date", Dtype.from("datetime"), "raise")).toThrow(TypeError);
  });

  it("unparseable string → original value with errors=ignore for datetime", () => {
    expect(castScalar("not-a-date", Dtype.from("datetime"), "ignore")).toBe("not-a-date");
  });

  it("Date → datetime is identity", () => {
    const d = new Date();
    expect(castScalar(d, Dtype.from("datetime"))).toBe(d);
  });

  it("any → object is identity", () => {
    const d = new Date();
    expect(castScalar(42, Dtype.from("object"))).toBe(42);
    expect(castScalar("hi", Dtype.from("object"))).toBe("hi");
    expect(castScalar(d, Dtype.from("object"))).toBe(d);
  });

  it("int8 clamping wraps correctly", () => {
    expect(castScalar(127, Dtype.from("int8"))).toBe(127);
    expect(castScalar(128, Dtype.from("int8"))).toBe(-128);
    expect(castScalar(-128, Dtype.from("int8"))).toBe(-128);
    expect(castScalar(-129, Dtype.from("int8"))).toBe(127);
  });

  it("uint8 clamping wraps correctly", () => {
    expect(castScalar(0, Dtype.from("uint8"))).toBe(0);
    expect(castScalar(255, Dtype.from("uint8"))).toBe(255);
    expect(castScalar(256, Dtype.from("uint8"))).toBe(0);
    expect(castScalar(-1, Dtype.from("uint8"))).toBe(255);
  });

  it("int16 clamping wraps correctly", () => {
    expect(castScalar(32767, Dtype.from("int16"))).toBe(32767);
    expect(castScalar(32768, Dtype.from("int16"))).toBe(-32768);
  });

  it("uint16 clamping wraps correctly", () => {
    expect(castScalar(65535, Dtype.from("uint16"))).toBe(65535);
    expect(castScalar(65536, Dtype.from("uint16"))).toBe(0);
  });

  it("uint32 clamping wraps correctly", () => {
    expect(castScalar(4294967295, Dtype.from("uint32"))).toBe(4294967295);
    expect(castScalar(4294967296, Dtype.from("uint32"))).toBe(0);
  });

  it("uint64 negative → 0", () => {
    expect(castScalar(-5, Dtype.from("uint64"))).toBe(0);
  });

  it("NaN → TypeError with errors=raise for int", () => {
    expect(() => castScalar(Number.NaN, Dtype.from("int64"), "raise")).toThrow(TypeError);
  });

  it("NaN → original value with errors=ignore for int", () => {
    expect(castScalar(Number.NaN, Dtype.from("int64"), "ignore")).toBe(Number.NaN);
  });
});

// ─── astypeSeries ─────────────────────────────────────────────────────────────

describe("astypeSeries", () => {
  it("casts float series to int64", () => {
    const series = s([1.5, 2.7, 3.9]);
    const result = astypeSeries(series, "int64");
    expect(result.values).toEqual([1, 2, 3]);
    expect(result.dtype.name).toBe("int64");
  });

  it("casts int series to string", () => {
    const series = s([1, 2, 3]);
    const result = astypeSeries(series, "string");
    expect(result.values).toEqual(["1", "2", "3"]);
    expect(result.dtype.name).toBe("string");
  });

  it("casts string series to float64", () => {
    const series = s(["1.1", "2.2", "3.3"]);
    const result = astypeSeries(series, "float64");
    expect(result.values[0]).toBeCloseTo(1.1);
    expect(result.values[1]).toBeCloseTo(2.2);
    expect(result.dtype.name).toBe("float64");
  });

  it("preserves null values", () => {
    const series = s([1.5, null, 3.9]);
    const result = astypeSeries(series, "int64");
    expect(result.values).toEqual([1, null, 3]);
  });

  it("preserves index and name", () => {
    const series = new Series({ data: [1, 2, 3], index: ["a", "b", "c"], name: "my_series" });
    const result = astypeSeries(series, "float64");
    expect(result.name).toBe("my_series");
    expect(result.index.values).toEqual(["a", "b", "c"]);
  });

  it("accepts a Dtype instance", () => {
    const series = s([1.5, 2.7]);
    const result = astypeSeries(series, Dtype.float64);
    expect(result.dtype).toBe(Dtype.float64);
  });

  it("errors=raise throws on cast failure", () => {
    const series = s(["hello", "world"]);
    expect(() => astypeSeries(series, "int64", { errors: "raise" })).toThrow(TypeError);
  });

  it("errors=ignore returns original value on failure", () => {
    const series = s(["1", "hello", "3"]);
    const result = astypeSeries(series, "int64", { errors: "ignore" });
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBe("hello");
    expect(result.values[2]).toBe(3);
  });

  it("casts bool series to int64", () => {
    const series = s([true, false, true]);
    const result = astypeSeries(series, "int64");
    expect(result.values).toEqual([1, 0, 1]);
  });

  it("casts int series to bool", () => {
    const series = s([0, 1, -1, 2]);
    const result = astypeSeries(series, "bool");
    expect(result.values).toEqual([false, true, true, true]);
  });

  it("round-trip: int → string → int64", () => {
    const original = s([10, 20, 30]);
    const asStr = astypeSeries(original, "string");
    const backToInt = astypeSeries(asStr, "int64");
    expect(backToInt.values).toEqual([10, 20, 30]);
  });
});

// ─── astypeDataFrame ──────────────────────────────────────────────────────────

describe("astypeDataFrame", () => {
  it("casts all columns with a single dtype", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.7], b: [3.1, 4.9] });
    const result = astypeDataFrame(df, "int64");
    expect(result.col("a").values).toEqual([1, 2]);
    expect(result.col("b").values).toEqual([3, 4]);
    expect(result.col("a").dtype.name).toBe("int64");
    expect(result.col("b").dtype.name).toBe("int64");
  });

  it("casts only specified columns with Record dtype", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.7], b: ["x", "y"] });
    const result = astypeDataFrame(df, { a: "int64" });
    expect(result.col("a").values).toEqual([1, 2]);
    expect(result.col("a").dtype.name).toBe("int64");
    // b is unchanged
    expect(result.col("b").values).toEqual(["x", "y"]);
  });

  it("preserves columns not listed in Record dtype", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4], c: [5.5, 6.6] });
    const result = astypeDataFrame(df, { c: "int64" });
    expect(result.col("a").values).toEqual([1, 2]);
    expect(result.col("b").values).toEqual([3, 4]);
    expect(result.col("c").values).toEqual([5, 6]);
  });

  it("preserves index", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5] }, { index: ["x", "y"] });
    const result = astypeDataFrame(df, "int64");
    expect(result.index.values).toEqual(["x", "y"]);
  });

  it("accepts Dtype instances in Record", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5], b: [3.5, 4.5] });
    const result = astypeDataFrame(df, { a: Dtype.from("int64"), b: Dtype.from("string") });
    expect(result.col("a").dtype.name).toBe("int64");
    expect(result.col("b").dtype.name).toBe("string");
  });

  it("errors=raise throws on cast failure", () => {
    const df = DataFrame.fromColumns({ a: ["hello", "world"] });
    expect(() => astypeDataFrame(df, "int64", { errors: "raise" })).toThrow(TypeError);
  });

  it("errors=ignore keeps original value on failure", () => {
    const df = DataFrame.fromColumns({ a: ["1", "hello", "3"] });
    const result = astypeDataFrame(df, "int64", { errors: "ignore" });
    expect(result.col("a").values[0]).toBe(1);
    expect(result.col("a").values[1]).toBe("hello");
    expect(result.col("a").values[2]).toBe(3);
  });

  it("handles empty DataFrame gracefully", () => {
    const df = DataFrame.fromColumns({});
    const result = astypeDataFrame(df, "int64");
    expect(result.columns.size).toBe(0);
  });
});

// ─── property-based tests ────────────────────────────────────────────────────

describe("castScalar property tests", () => {
  it("float → int64: result is always integer or null", () => {
    fc.assert(
      fc.property(fc.oneof(fc.float({ noNaN: true }), fc.constant(null as Scalar)), (v) => {
        const result = castScalar(v, Dtype.from("int64"), "ignore");
        if (v === null) {
          return result === null;
        }
        if (Number.isNaN(v as number) || !Number.isFinite(v as number)) {
          return true; // errors=ignore returns original
        }
        return typeof result === "number" && Number.isInteger(result);
      }),
    );
  });

  it("any scalar → string: result is always a string or null", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float({ noNaN: true }),
          fc.boolean(),
          fc.string(),
          fc.constant(null as Scalar),
        ),
        (v) => {
          const result = castScalar(v, Dtype.from("string"), "ignore");
          if (v === null) {
            return result === null;
          }
          return typeof result === "string";
        },
      ),
    );
  });

  it("any numeric → bool: result is always boolean or null", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.float({ noNaN: true }), fc.constant(null as Scalar)),
        (v) => {
          const result = castScalar(v, Dtype.from("bool"), "ignore");
          if (v === null) {
            return result === null;
          }
          return typeof result === "boolean";
        },
      ),
    );
  });

  it("astypeSeries float→int: output length equals input length", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 0, maxLength: 50 }), (arr) => {
        const series = new Series({ data: arr });
        const result = astypeSeries(series, "int64");
        return result.size === series.size;
      }),
    );
  });

  it("astypeDataFrame with single dtype: all column dtypes match", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 20 }),
        (colA, colB) => {
          const len = Math.min(colA.length, colB.length);
          const df = DataFrame.fromColumns({ a: colA.slice(0, len), b: colB.slice(0, len) });
          const result = astypeDataFrame(df, "float64");
          return (
            result.col("a").dtype.name === "float64" && result.col("b").dtype.name === "float64"
          );
        },
      ),
    );
  });
});
