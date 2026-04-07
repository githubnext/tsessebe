/**
 * Tests for convert_dtypes — Series and DataFrame dtype inference/conversion.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/core/series.ts";
import { DataFrame } from "../../src/core/frame.ts";
import { convertDtypes, dataFrameConvertDtypes } from "../../src/core/convert_dtypes.ts";

// ─── Series: basic type inference ─────────────────────────────────────────────

describe("convertDtypes — Series", () => {
  test("integer floats are converted to int64", () => {
    const s = new Series({ data: [1.0, 2.0, 3.0] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("int64");
    expect(out.values).toEqual([1, 2, 3]);
  });

  test("floats with fractional parts stay float64", () => {
    const s = new Series({ data: [1.1, 2.2, 3.3] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("float64");
    expect(out.values).toEqual([1.1, 2.2, 3.3]);
  });

  test("booleans are converted to bool", () => {
    const s = new Series({ data: [true, false, true] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("bool");
    expect(out.values).toEqual([true, false, true]);
  });

  test("strings are converted to string dtype", () => {
    const s = new Series({ data: ["a", "b", "c"] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("string");
  });

  test("mixed types result in object dtype", () => {
    const s = new Series({ data: [1, "a", true] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("object");
  });

  test("all-null column is unchanged (null preserved)", () => {
    const s = new Series({ data: [null, null, null] });
    const out = convertDtypes(s);
    expect(out.values).toEqual([null, null, null]);
  });

  test("nulls are preserved during integer conversion", () => {
    const s = new Series({ data: [1.0, null, 3.0] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("int64");
    expect(out.values).toEqual([1, null, 3]);
  });

  test("nulls are preserved during string conversion", () => {
    const s = new Series({ data: ["x", null, "y"] });
    const out = convertDtypes(s);
    expect(out.dtype.name).toBe("string");
    expect(out.values).toEqual(["x", null, "y"]);
  });

  test("index is preserved after conversion", () => {
    const s = new Series({ data: [1.0, 2.0], index: ["a", "b"] });
    const out = convertDtypes(s);
    expect(out.index.values).toEqual(["a", "b"]);
  });

  test("name is preserved after conversion", () => {
    const s = new Series({ data: [1.0, 2.0], name: "my_col" });
    const out = convertDtypes(s);
    expect(out.name).toBe("my_col");
  });

  test("original series is not mutated", () => {
    const s = new Series({ data: [1.0, 2.0, 3.0] });
    convertDtypes(s);
    expect(s.values).toEqual([1.0, 2.0, 3.0]);
  });
});

// ─── Series: option flags ─────────────────────────────────────────────────────

describe("convertDtypes — options flags", () => {
  test("convertInteger: false keeps floats as float64", () => {
    const s = new Series({ data: [1.0, 2.0, 3.0] });
    const out = convertDtypes(s, { convertInteger: false });
    expect(out.dtype.name).toBe("float64");
  });

  test("convertBoolean: false treats booleans as object", () => {
    const s = new Series({ data: [true, false] });
    const out = convertDtypes(s, { convertBoolean: false });
    expect(out.dtype.name).toBe("object");
  });

  test("convertString: false treats strings as object", () => {
    const s = new Series({ data: ["a", "b"] });
    const out = convertDtypes(s, { convertString: false });
    expect(out.dtype.name).toBe("object");
  });

  test("convertFloating: false keeps floats as object", () => {
    const s = new Series({ data: [1.5, 2.5] });
    const out = convertDtypes(s, { convertFloating: false });
    expect(out.dtype.name).toBe("object");
  });

  test("all options false → object dtype for any input", () => {
    const noConvert = { convertBoolean: false, convertInteger: false, convertFloating: false, convertString: false };
    const sFloat = new Series({ data: [1.0, 2.0] });
    const sBool = new Series({ data: [true, false] });
    const sStr = new Series({ data: ["a", "b"] });
    expect(convertDtypes(sFloat, noConvert).dtype.name).toBe("object");
    expect(convertDtypes(sBool, noConvert).dtype.name).toBe("object");
    expect(convertDtypes(sStr, noConvert).dtype.name).toBe("object");
  });
});

// ─── DataFrame ────────────────────────────────────────────────────────────────

describe("dataFrameConvertDtypes", () => {
  test("converts each column independently", () => {
    const df = DataFrame.fromColumns({
      a: [1.0, 2.0, 3.0],
      b: ["x", "y", "z"],
      c: [true, false, true],
    });
    const out = dataFrameConvertDtypes(df);
    expect(out.col("a").dtype.name).toBe("int64");
    expect(out.col("b").dtype.name).toBe("string");
    expect(out.col("c").dtype.name).toBe("bool");
  });

  test("mixed-type column becomes object", () => {
    const df = DataFrame.fromColumns({ x: [1, "a", true] });
    const out = dataFrameConvertDtypes(df);
    expect(out.col("x").dtype.name).toBe("object");
  });

  test("float columns with fractional stay float64", () => {
    const df = DataFrame.fromColumns({ f: [1.1, 2.2, 3.3] });
    const out = dataFrameConvertDtypes(df);
    expect(out.col("f").dtype.name).toBe("float64");
  });

  test("column names are preserved", () => {
    const df = DataFrame.fromColumns({ a: [1], b: [2] });
    const out = dataFrameConvertDtypes(df);
    expect(out.columns.values).toEqual(["a", "b"]);
  });

  test("row index is preserved", () => {
    const df = DataFrame.fromColumns({ a: [1.0, 2.0] }, ["r0", "r1"]);
    const out = dataFrameConvertDtypes(df);
    expect(out.index.values).toEqual(["r0", "r1"]);
  });

  test("original dataframe is not mutated", () => {
    const df = DataFrame.fromColumns({ a: [1.0, 2.0] });
    dataFrameConvertDtypes(df);
    expect(df.col("a").values).toEqual([1.0, 2.0]);
  });

  test("options propagate to all columns", () => {
    const df = DataFrame.fromColumns({ a: [1.0, 2.0], b: [true, false] });
    const out = dataFrameConvertDtypes(df, { convertBoolean: false, convertInteger: false });
    // float column: convertInteger false → float64 (since the values are whole numbers)
    expect(out.col("a").dtype.name).toBe("float64");
    expect(out.col("b").dtype.name).toBe("object");
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("convertDtypes — properties", () => {
  test("integer array: after conversion, all non-null values are whole numbers", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }), (ints) => {
        const s = new Series({ data: ints });
        const out = convertDtypes(s);
        expect(out.dtype.name).toBe("int64");
        for (const v of out.values) {
          if (v !== null) {
            expect(typeof v).toBe("number");
            expect(Math.floor(v as number)).toBe(v);
          }
        }
      }),
    );
  });

  test("boolean array: after conversion, all non-null values are boolean", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }), (bools) => {
        const s = new Series({ data: bools });
        const out = convertDtypes(s);
        expect(out.dtype.name).toBe("bool");
        for (const v of out.values) {
          if (v !== null) expect(typeof v).toBe("boolean");
        }
      }),
    );
  });

  test("string array: after conversion, all non-null values are strings", () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 10 }), { minLength: 1, maxLength: 20 }), (strs) => {
        const s = new Series({ data: strs });
        const out = convertDtypes(s);
        expect(out.dtype.name).toBe("string");
        for (const v of out.values) {
          if (v !== null) expect(typeof v).toBe("string");
        }
      }),
    );
  });

  test("idempotent: converting twice gives same result as once", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true }), { minLength: 1, maxLength: 20 }), (nums) => {
        const s = new Series({ data: nums });
        const once = convertDtypes(s);
        const twice = convertDtypes(once);
        expect(twice.dtype.name).toBe(once.dtype.name);
        expect(twice.values).toEqual(once.values);
      }),
    );
  });

  test("null count is preserved after conversion", () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer(), { nil: null }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const s = new Series({ data: arr });
          const out = convertDtypes(s);
          const nullsBefore = arr.filter((v) => v === null).length;
          const nullsAfter = out.values.filter((v) => v === null).length;
          expect(nullsAfter).toBe(nullsBefore);
        },
      ),
    );
  });
});
