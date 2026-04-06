/**
 * Tests for to_numeric — coerce values to numbers.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { Series } from "../../src/core/index.ts";
import {
  toNumeric,
  toNumericArray,
  toNumericScalar,
  toNumericSeries,
} from "../../src/stats/to_numeric.ts";

// ─── scalar ───────────────────────────────────────────────────────────────────

describe("toNumericScalar — basic types", () => {
  test("integer string", () => expect(toNumericScalar("42")).toBe(42));
  test("float string", () => expect(toNumericScalar("3.14")).toBe(3.14));
  test("negative string", () => expect(toNumericScalar("-7")).toBe(-7));
  test("number passthrough", () => expect(toNumericScalar(99)).toBe(99));
  test("boolean true → 1", () => expect(toNumericScalar(true)).toBe(1));
  test("boolean false → 0", () => expect(toNumericScalar(false)).toBe(0));
  test("bigint", () => expect(toNumericScalar(100n)).toBe(100));
  test("null → NaN", () => expect(toNumericScalar(null)).toBeNaN());
  test("undefined → NaN", () => expect(toNumericScalar(undefined)).toBeNaN());
  test("empty string → NaN", () => expect(toNumericScalar("")).toBeNaN());
  test("whitespace string → NaN", () => expect(toNumericScalar("   ")).toBeNaN());
  test("'NaN' string → NaN", () => expect(toNumericScalar("NaN")).toBeNaN());
  test("'nan' string → NaN", () => expect(toNumericScalar("nan")).toBeNaN());
  test("Infinity string", () => expect(toNumericScalar("Infinity")).toBe(Infinity));
  test("-Infinity string", () => expect(toNumericScalar("-Infinity")).toBe(-Infinity));
  test("hex string", () => expect(toNumericScalar("0xff")).toBe(255));
  test("leading/trailing whitespace", () => expect(toNumericScalar("  3.5  ")).toBe(3.5));
});

describe("toNumericScalar — errors option", () => {
  test("errors='raise' throws on bad value", () => {
    expect(() => toNumericScalar("abc")).toThrow(TypeError);
    expect(() => toNumericScalar("abc")).toThrow(/to_numeric/);
  });

  test("errors='coerce' returns NaN for bad value", () => {
    expect(toNumericScalar("abc", { errors: "coerce" })).toBeNaN();
  });

  test("errors='ignore' returns original value", () => {
    expect(toNumericScalar("abc", { errors: "ignore" })).toBe("abc");
  });

  test("errors='ignore' still converts valid values", () => {
    expect(toNumericScalar("3", { errors: "ignore" })).toBe(3);
  });
});

describe("toNumericScalar — downcast", () => {
  test("downcast integer small positive", () => {
    const v = toNumericScalar(42, { downcast: "integer" });
    expect(v).toBe(42);
  });

  test("downcast unsigned 200", () => {
    const v = toNumericScalar(200, { downcast: "unsigned" });
    expect(v).toBe(200);
  });

  test("downcast float32 rounds", () => {
    const v = toNumericScalar(3.14159265358979, { downcast: "float" });
    // float32 representation has less precision
    expect(v).toBeCloseTo(3.14159, 4);
  });

  test("downcast NaN unchanged", () => {
    expect(toNumericScalar(NaN, { downcast: "integer" })).toBeNaN();
  });

  test("downcast Infinity unchanged", () => {
    expect(toNumericScalar(Infinity, { downcast: "integer" })).toBe(Infinity);
  });
});

// ─── array ────────────────────────────────────────────────────────────────────

describe("toNumericArray", () => {
  test("mixed numeric strings", () => {
    expect(toNumericArray(["1", "2.5", "3"])).toEqual([1, 2.5, 3]);
  });

  test("already numbers", () => {
    expect(toNumericArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  test("null/undefined become NaN", () => {
    const result = toNumericArray([null, undefined, 1]);
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
    expect(result[2]).toBe(1);
  });

  test("errors='coerce' mixed", () => {
    const result = toNumericArray(["1", "bad", "3"], { errors: "coerce" });
    expect(result[0]).toBe(1);
    expect(result[1]).toBeNaN();
    expect(result[2]).toBe(3);
  });

  test("errors='raise' throws on first bad value", () => {
    expect(() => toNumericArray(["1", "bad", "3"])).toThrow(TypeError);
  });

  test("errors='ignore' leaves bad values", () => {
    const result = toNumericArray(["1", "bad", "3"], { errors: "ignore" });
    expect(result).toEqual([1, "bad", 3]);
  });

  test("empty array", () => {
    expect(toNumericArray([])).toEqual([]);
  });

  test("booleans", () => {
    expect(toNumericArray([true, false, true])).toEqual([1, 0, 1]);
  });
});

// ─── Series ───────────────────────────────────────────────────────────────────

describe("toNumericSeries", () => {
  test("string Series → number Series", () => {
    const s = new Series({ data: ["1", "2", "3"] });
    const result = toNumericSeries(s);
    expect(result.values).toEqual([1, 2, 3]);
  });

  test("preserves index", () => {
    const s = new Series({ data: [10, 20], index: ["a", "b"] });
    const result = toNumericSeries(s);
    expect(result.index.values).toEqual(["a", "b"]);
  });

  test("preserves name", () => {
    const s = new Series({ data: ["1.5"], name: "price" });
    const result = toNumericSeries(s);
    expect(result.name).toBe("price");
  });

  test("errors='coerce' NaN for bad values", () => {
    const s = new Series({ data: ["1", "bad", "3"] });
    const result = toNumericSeries(s, { errors: "coerce" });
    expect(result.values[0]).toBe(1);
    expect(result.values[1]).toBeNaN();
    expect(result.values[2]).toBe(3);
  });
});

// ─── unified toNumeric ────────────────────────────────────────────────────────

describe("toNumeric — dispatch", () => {
  test("scalar string", () => expect(toNumeric("5")).toBe(5));
  test("number passthrough", () => expect(toNumeric(3.14)).toBe(3.14));
  test("array", () => expect(toNumeric(["1", "2"])).toEqual([1, 2]));
  test("Series", () => {
    const s = new Series({ data: ["10", "20"] });
    const result = toNumeric(s) as Series<number>;
    expect(result.values).toEqual([10, 20]);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("toNumeric — property tests", () => {
  test("finite numbers round-trip", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (n) => {
        expect(toNumericScalar(n)).toBe(n);
      }),
    );
  });

  test("integer string round-trip", () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e9, max: 1e9 }), (n) => {
        expect(toNumericScalar(String(n))).toBe(n);
      }),
    );
  });

  test("array: length preserved", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true, noDefaultInfinity: true })), (arr) => {
        expect(toNumericArray(arr).length).toBe(arr.length);
      }),
    );
  });

  test("errors=coerce never throws", () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), (arr) => {
        expect(() => toNumericArray(arr as unknown[], { errors: "coerce" })).not.toThrow();
      }),
    );
  });

  test("boolean always maps to 0 or 1", () => {
    fc.assert(
      fc.property(fc.boolean(), (b) => {
        const v = toNumericScalar(b);
        expect(v === 0 || v === 1).toBe(true);
      }),
    );
  });
});
