/**
 * Tests for astype — dtype coercion for Series and DataFrame.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Dtype, Series, astype, astypeSeries, castScalar } from "../../src/index.ts";

describe("castScalar", () => {
  describe("int64", () => {
    it("casts float to int via truncation", () => {
      expect(castScalar(3.9, Dtype.int64)).toBe(3);
      expect(castScalar(-2.1, Dtype.int64)).toBe(-2);
    });

    it("casts boolean true/false", () => {
      expect(castScalar(true, Dtype.int64)).toBe(1);
      expect(castScalar(false, Dtype.int64)).toBe(0);
    });

    it("casts numeric string", () => {
      expect(castScalar("42", Dtype.int64)).toBe(42);
    });

    it("returns null for null/undefined", () => {
      expect(castScalar(null, Dtype.int64)).toBeNull();
      expect(castScalar(undefined, Dtype.int64)).toBeNull();
    });

    it("returns null for non-numeric string", () => {
      expect(castScalar("abc", Dtype.int64)).toBeNull();
    });
  });

  describe("int8 clamping", () => {
    it("clamps to [-128, 127]", () => {
      expect(castScalar(200, Dtype.from("int8"))).toBe(127);
      expect(castScalar(-200, Dtype.from("int8"))).toBe(-128);
      expect(castScalar(100, Dtype.from("int8"))).toBe(100);
    });
  });

  describe("uint8 clamping", () => {
    it("clamps to [0, 255]", () => {
      expect(castScalar(-5, Dtype.from("uint8"))).toBe(0);
      expect(castScalar(300, Dtype.from("uint8"))).toBe(255);
      expect(castScalar(128, Dtype.from("uint8"))).toBe(128);
    });
  });

  describe("float64", () => {
    it("casts integer to float", () => {
      expect(castScalar(3, Dtype.float64)).toBe(3.0);
    });

    it("casts boolean to 0.0/1.0", () => {
      expect(castScalar(true, Dtype.float64)).toBe(1.0);
      expect(castScalar(false, Dtype.float64)).toBe(0.0);
    });

    it("returns null for null", () => {
      expect(castScalar(null, Dtype.float64)).toBeNull();
    });

    it("returns NaN for non-numeric string", () => {
      expect(castScalar("hello", Dtype.float64)).toBeNaN();
    });

    it("parses numeric string", () => {
      expect(castScalar("3.14", Dtype.float64)).toBeCloseTo(3.14);
    });
  });

  describe("bool", () => {
    it("truthy number → true", () => {
      expect(castScalar(1, Dtype.bool)).toBe(true);
      expect(castScalar(0, Dtype.bool)).toBe(false);
    });

    it("string 'hello' → true", () => {
      expect(castScalar("hello", Dtype.bool)).toBe(true);
      expect(castScalar("", Dtype.bool)).toBe(false);
    });

    it("null → null", () => {
      expect(castScalar(null, Dtype.bool)).toBeNull();
    });

    it("NaN → false", () => {
      expect(castScalar(Number.NaN, Dtype.bool)).toBe(false);
    });
  });

  describe("string", () => {
    it("converts number to string", () => {
      expect(castScalar(42, Dtype.string)).toBe("42");
    });

    it("converts boolean to string", () => {
      expect(castScalar(true, Dtype.string)).toBe("true");
    });

    it("null → null", () => {
      expect(castScalar(null, Dtype.string)).toBeNull();
    });

    it("converts Date to ISO string", () => {
      const d = new Date("2024-01-15T00:00:00.000Z");
      expect(castScalar(d, Dtype.string)).toBe("2024-01-15T00:00:00.000Z");
    });
  });

  describe("datetime", () => {
    it("converts timestamp number to Date", () => {
      const ts = 1705276800000;
      const result = castScalar(ts, Dtype.datetime);
      expect(result instanceof Date).toBe(true);
      expect((result as Date).getTime()).toBe(ts);
    });

    it("converts ISO string to Date", () => {
      const result = castScalar("2024-01-15T00:00:00.000Z", Dtype.datetime);
      expect(result instanceof Date).toBe(true);
      expect((result as Date).getFullYear()).toBe(2024);
    });

    it("returns null for invalid date string", () => {
      expect(castScalar("not-a-date", Dtype.datetime)).toBeNull();
    });

    it("passes Date through unchanged", () => {
      const d = new Date(0);
      expect(castScalar(d, Dtype.datetime)).toBe(d);
    });

    it("null → null", () => {
      expect(castScalar(null, Dtype.datetime)).toBeNull();
    });
  });

  describe("object passthrough", () => {
    it("returns value unchanged for object dtype", () => {
      const v = { x: 1 } as unknown as import("../../src/types.ts").Scalar;
      expect(castScalar(v, Dtype.object)).toBe(v);
    });
  });
});

describe("astypeSeries", () => {
  it("casts float series to int64", () => {
    const s = new Series({ data: [1.9, 2.1, 3.7], name: "x" });
    const si = astypeSeries(s, "int64");
    expect(si.dtype.name).toBe("int64");
    expect([...si.values]).toEqual([1, 2, 3]);
    expect(si.name).toBe("x");
  });

  it("casts int series to float64", () => {
    const s = new Series({ data: [1, 2, 3] });
    const sf = astypeSeries(s, "float64");
    expect(sf.dtype.name).toBe("float64");
    expect([...sf.values]).toEqual([1.0, 2.0, 3.0]);
  });

  it("casts int series to bool", () => {
    const s = new Series({ data: [0, 1, 2] });
    const sb = astypeSeries(s, "bool");
    expect([...sb.values]).toEqual([false, true, true]);
    expect(sb.dtype.name).toBe("bool");
  });

  it("casts number series to string", () => {
    const s = new Series({ data: [1, 2, 3] });
    const ss = astypeSeries(s, "string");
    expect([...ss.values]).toEqual(["1", "2", "3"]);
    expect(ss.dtype.name).toBe("string");
  });

  it("preserves index labels", () => {
    const s = new Series({ data: [1.5, 2.5], index: ["a", "b"] });
    const si = astypeSeries(s, "int64");
    expect(si.index.at(0)).toBe("a");
    expect(si.index.at(1)).toBe("b");
  });

  it("null values become null in int cast", () => {
    const s = new Series({ data: [1, null, 3] });
    const si = astypeSeries(s, "int64");
    expect(si.values[1]).toBeNull();
  });

  it("accepts a Dtype instance", () => {
    const s = new Series({ data: [1.9, 2.1] });
    const si = astypeSeries(s, Dtype.int64);
    expect(si.dtype).toBe(Dtype.int64);
    expect([...si.values]).toEqual([1, 2]);
  });

  it("property: float→int→float recovers integer part", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const si = astypeSeries(s, "int64");
          const sf = astypeSeries(si, "float64");
          for (let i = 0; i < arr.length; i++) {
            const expected = Math.trunc(arr[i] as number);
            expect(sf.values[i]).toBe(expected);
          }
        },
      ),
    );
  });

  it("property: string→int64 for integers recovers value", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 0, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr.map(String) });
          const si = astypeSeries(s, "int64");
          for (let i = 0; i < arr.length; i++) {
            expect(si.values[i]).toBe(arr[i]);
          }
        },
      ),
    );
  });
});

describe("astype (DataFrame)", () => {
  it("casts all columns with a single dtype name", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5], b: [3.9, 4.1] });
    const di = astype(df, "int64");
    expect([...di.col("a").values]).toEqual([1, 2]);
    expect([...di.col("b").values]).toEqual([3, 4]);
    expect(di.col("a").dtype.name).toBe("int64");
    expect(di.col("b").dtype.name).toBe("int64");
  });

  it("casts all columns with a Dtype instance", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
    const ds = astype(df, Dtype.string);
    expect([...ds.col("a").values]).toEqual(["1", "2"]);
  });

  it("casts individual columns using a Record mapping", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5], b: ["10", "20"] });
    const di = astype(df, { a: "int64", b: "float64" });
    expect([...di.col("a").values]).toEqual([1, 2]);
    expect([...di.col("b").values]).toEqual([10, 20]);
  });

  it("leaves unmapped columns unchanged", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5], b: [true, false] });
    const di = astype(df, { a: "int64" });
    expect([...di.col("a").values]).toEqual([1, 2]);
    // column b is bool and unchanged
    expect([...di.col("b").values]).toEqual([true, false]);
  });

  it("preserves row index", () => {
    const df = DataFrame.fromColumns({ x: [10, 20, 30] });
    const di = astype(df, "float64");
    expect(di.index.size).toBe(3);
  });

  it("preserves column order", () => {
    const df = DataFrame.fromColumns({ z: [1], a: [2], m: [3] });
    const di = astype(df, "float64");
    expect([...di.columns.values]).toEqual(["z", "a", "m"]);
  });

  it("does not mutate the original DataFrame", () => {
    const df = DataFrame.fromColumns({ a: [1.5, 2.5] });
    astype(df, "int64");
    expect(df.col("a").dtype.name).toBe("float64");
  });

  it("property: roundtrip int↔float preserves integer values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 10 }),
        (arr) => {
          const df = DataFrame.fromColumns({ v: arr });
          const df2 = astype(astype(df, "float64"), "int64");
          expect([...df2.col("v").values]).toEqual(arr);
        },
      ),
    );
  });
});
