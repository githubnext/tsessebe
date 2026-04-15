/**
 * Tests for src/core/api_types.ts — runtime type-checking predicates.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  isArrayLike,
  isBigInt,
  isBool,
  isBoolDtype,
  isCategoricalDtype,
  isComplexDtype,
  isDate,
  isDatetimeDtype,
  isDictLike,
  isExtensionArrayDtype,
  isFloat,
  isFloatDtype,
  isHashable,
  isInteger,
  isIntegerDtype,
  isIntervalDtype,
  isIterator,
  isListLike,
  isMissing,
  isNumber,
  isNumericDtype,
  isObjectDtype,
  isPeriodDtype,
  isReCompilable,
  isRegExp,
  isScalar,
  isSignedIntegerDtype,
  isStringDtype,
  isStringValue,
  isTimedeltaDtype,
  isUnsignedIntegerDtype,
} from "../../src/core/api_types.ts";
import { Dtype } from "../../src/index.ts";

// ─── isScalar ─────────────────────────────────────────────────────────────────

describe("isScalar", () => {
  it("returns true for primitives", () => {
    expect(isScalar(42)).toBe(true);
    expect(isScalar(3.14)).toBe(true);
    expect(isScalar("hello")).toBe(true);
    expect(isScalar(true)).toBe(true);
    expect(isScalar(false)).toBe(true);
    expect(isScalar(null)).toBe(true);
    expect(isScalar(undefined)).toBe(true);
    expect(isScalar(BigInt(7))).toBe(true);
    expect(isScalar(Symbol("x"))).toBe(true);
  });

  it("returns true for Date", () => {
    expect(isScalar(new Date())).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isScalar([])).toBe(false);
    expect(isScalar([1, 2])).toBe(false);
  });

  it("returns false for plain objects", () => {
    expect(isScalar({})).toBe(false);
    expect(isScalar({ a: 1 })).toBe(false);
  });

  it("returns false for Map/Set", () => {
    expect(isScalar(new Map())).toBe(false);
    expect(isScalar(new Set())).toBe(false);
  });

  it("property: all numbers are scalars", () => {
    fc.assert(fc.property(fc.float({ noNaN: true }), (n) => isScalar(n) === true));
  });
});

// ─── isListLike ───────────────────────────────────────────────────────────────

describe("isListLike", () => {
  it("returns true for arrays", () => {
    expect(isListLike([])).toBe(true);
    expect(isListLike([1, 2, 3])).toBe(true);
  });

  it("returns true for Set/Map", () => {
    expect(isListLike(new Set([1, 2]))).toBe(true);
    expect(isListLike(new Map())).toBe(true);
  });

  it("returns false for strings (excluded)", () => {
    expect(isListLike("abc")).toBe(false);
    expect(isListLike("")).toBe(false);
  });

  it("returns false for numbers and booleans", () => {
    expect(isListLike(42)).toBe(false);
    expect(isListLike(true)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isListLike(null)).toBe(false);
    expect(isListLike(undefined)).toBe(false);
  });

  it("returns true for array-like objects with length", () => {
    expect(isListLike({ length: 3, 0: "a", 1: "b", 2: "c" })).toBe(true);
  });
});

// ─── isArrayLike ──────────────────────────────────────────────────────────────

describe("isArrayLike", () => {
  it("returns true for arrays", () => {
    expect(isArrayLike([])).toBe(true);
    expect(isArrayLike([1, 2])).toBe(true);
  });

  it("returns true for strings (have .length)", () => {
    expect(isArrayLike("hello")).toBe(true);
    expect(isArrayLike("")).toBe(true);
  });

  it("returns false for numbers", () => {
    expect(isArrayLike(42)).toBe(false);
    expect(isArrayLike(Number.NaN)).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isArrayLike(null)).toBe(false);
    expect(isArrayLike(undefined)).toBe(false);
  });

  it("returns true for typed arrays", () => {
    expect(isArrayLike(new Uint8Array(3))).toBe(true);
    expect(isArrayLike(new Float64Array(0))).toBe(true);
  });

  it("returns true for object with non-negative integer length", () => {
    expect(isArrayLike({ length: 0 })).toBe(true);
    expect(isArrayLike({ length: 5 })).toBe(true);
  });
});

// ─── isDictLike ───────────────────────────────────────────────────────────────

describe("isDictLike", () => {
  it("returns true for plain objects", () => {
    expect(isDictLike({})).toBe(true);
    expect(isDictLike({ a: 1 })).toBe(true);
  });

  it("returns true for Map", () => {
    expect(isDictLike(new Map())).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isDictLike([])).toBe(false);
    expect(isDictLike([1, 2])).toBe(false);
  });

  it("returns false for Date", () => {
    expect(isDictLike(new Date())).toBe(false);
  });

  it("returns false for null/undefined/primitives", () => {
    expect(isDictLike(null)).toBe(false);
    expect(isDictLike(undefined)).toBe(false);
    expect(isDictLike(42)).toBe(false);
    expect(isDictLike("abc")).toBe(false);
  });
});

// ─── isIterator ───────────────────────────────────────────────────────────────

describe("isIterator", () => {
  it("returns true for array iterator", () => {
    const iter = [1, 2, 3][Symbol.iterator]();
    expect(isIterator(iter)).toBe(true);
  });

  it("returns true for generator", () => {
    function* gen(): Generator<number> {
      yield 1;
    }
    expect(isIterator(gen())).toBe(true);
  });

  it("returns false for array (not iterator)", () => {
    expect(isIterator([1, 2, 3])).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isIterator(null)).toBe(false);
    expect(isIterator(undefined)).toBe(false);
  });
});

// ─── isNumber / isBool / isStringValue ───────────────────────────────────────

describe("isNumber", () => {
  it("true for numbers including NaN and Infinity", () => {
    expect(isNumber(3.14)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(true);
    expect(isNumber(Number.POSITIVE_INFINITY)).toBe(true);
    expect(isNumber(Number.NEGATIVE_INFINITY)).toBe(true);
  });

  it("false for non-numbers", () => {
    expect(isNumber("3")).toBe(false);
    expect(isNumber(true)).toBe(false);
    expect(isNumber(null)).toBe(false);
  });
});

describe("isBool", () => {
  it("true for booleans only", () => {
    expect(isBool(true)).toBe(true);
    expect(isBool(false)).toBe(true);
    expect(isBool(1)).toBe(false);
    expect(isBool(0)).toBe(false);
    expect(isBool("true")).toBe(false);
  });
});

describe("isStringValue", () => {
  it("true for strings", () => {
    expect(isStringValue("")).toBe(true);
    expect(isStringValue("hello")).toBe(true);
  });

  it("false for non-strings", () => {
    expect(isStringValue(42)).toBe(false);
    expect(isStringValue(null)).toBe(false);
  });
});

// ─── isFloat / isInteger ──────────────────────────────────────────────────────

describe("isFloat", () => {
  it("true for numbers with fractional part", () => {
    expect(isFloat(3.14)).toBe(true);
    expect(isFloat(-0.5)).toBe(true);
    expect(isFloat(0.001)).toBe(true);
  });

  it("false for integer-valued numbers", () => {
    expect(isFloat(3.0)).toBe(false);
    expect(isFloat(0)).toBe(false);
    expect(isFloat(-4)).toBe(false);
  });

  it("false for NaN and Infinity", () => {
    expect(isFloat(Number.NaN)).toBe(false);
    expect(isFloat(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFloat(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it("false for non-numbers", () => {
    expect(isFloat("3.14")).toBe(false);
  });
});

describe("isInteger", () => {
  it("true for integer-valued numbers", () => {
    expect(isInteger(0)).toBe(true);
    expect(isInteger(42)).toBe(true);
    expect(isInteger(-7)).toBe(true);
    expect(isInteger(3.0)).toBe(true);
  });

  it("false for fractional numbers", () => {
    expect(isInteger(3.14)).toBe(false);
  });

  it("false for NaN and Infinity", () => {
    expect(isInteger(Number.NaN)).toBe(false);
    expect(isInteger(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("false for non-numbers", () => {
    expect(isInteger("3")).toBe(false);
  });
});

// ─── isBigInt / isRegExp / isReCompilable ─────────────────────────────────────

describe("isBigInt", () => {
  it("true for bigint", () => {
    expect(isBigInt(BigInt(42))).toBe(true);
    expect(isBigInt(0n)).toBe(true);
  });

  it("false for regular numbers", () => {
    expect(isBigInt(42)).toBe(false);
    expect(isBigInt("42")).toBe(false);
  });
});

describe("isRegExp", () => {
  it("true for RegExp instances", () => {
    expect(isRegExp(/abc/)).toBe(true);
    expect(isRegExp(/xyz/)).toBe(true);
  });

  it("false for strings and other values", () => {
    expect(isRegExp("abc")).toBe(false);
    expect(isRegExp(null)).toBe(false);
  });
});

describe("isReCompilable", () => {
  it("true for strings and RegExp", () => {
    expect(isReCompilable("abc")).toBe(true);
    expect(isReCompilable(/abc/)).toBe(true);
  });

  it("false for numbers and objects", () => {
    expect(isReCompilable(42)).toBe(false);
    expect(isReCompilable({})).toBe(false);
  });
});

// ─── isMissing ────────────────────────────────────────────────────────────────

describe("isMissing", () => {
  it("true for null, undefined, NaN", () => {
    expect(isMissing(null)).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing(Number.NaN)).toBe(true);
  });

  it("false for valid values", () => {
    expect(isMissing(0)).toBe(false);
    expect(isMissing("")).toBe(false);
    expect(isMissing(false)).toBe(false);
    expect(isMissing(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("property: no finite number is missing", () => {
    fc.assert(
      fc.property(fc.float({ noNaN: true }), (n) => {
        if (!Number.isFinite(n)) {
          return true;
        }
        return !isMissing(n);
      }),
    );
  });
});

// ─── isHashable / isDate ──────────────────────────────────────────────────────

describe("isHashable", () => {
  it("true for primitives", () => {
    expect(isHashable("key")).toBe(true);
    expect(isHashable(42)).toBe(true);
    expect(isHashable(true)).toBe(true);
    expect(isHashable(null)).toBe(true);
    expect(isHashable(undefined)).toBe(true);
    expect(isHashable(Symbol("x"))).toBe(true);
  });

  it("false for objects and arrays", () => {
    expect(isHashable({})).toBe(false);
    expect(isHashable([])).toBe(false);
    expect(isHashable(new Date())).toBe(false);
  });
});

describe("isDate", () => {
  it("true for Date instances", () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate(new Date("2024-01-01"))).toBe(true);
  });

  it("false for strings and timestamps", () => {
    expect(isDate("2024-01-01")).toBe(false);
    expect(isDate(1704067200000)).toBe(false);
    expect(isDate(null)).toBe(false);
  });
});

// ─── Dtype-level predicates ───────────────────────────────────────────────────

describe("isNumericDtype", () => {
  it("true for all numeric dtypes", () => {
    for (const name of [
      "int8",
      "int16",
      "int32",
      "int64",
      "uint8",
      "uint16",
      "uint32",
      "uint64",
      "float32",
      "float64",
    ] as const) {
      expect(isNumericDtype(name)).toBe(true);
      expect(isNumericDtype(Dtype.from(name))).toBe(true);
    }
  });

  it("false for non-numeric dtypes", () => {
    expect(isNumericDtype("string")).toBe(false);
    expect(isNumericDtype("bool")).toBe(false);
    expect(isNumericDtype("datetime")).toBe(false);
    expect(isNumericDtype("category")).toBe(false);
  });
});

describe("isIntegerDtype", () => {
  it("true for signed and unsigned integers", () => {
    expect(isIntegerDtype("int32")).toBe(true);
    expect(isIntegerDtype("uint64")).toBe(true);
  });

  it("false for floats and others", () => {
    expect(isIntegerDtype("float64")).toBe(false);
    expect(isIntegerDtype("bool")).toBe(false);
  });
});

describe("isSignedIntegerDtype", () => {
  it("true for int8/16/32/64", () => {
    expect(isSignedIntegerDtype("int8")).toBe(true);
    expect(isSignedIntegerDtype("int64")).toBe(true);
  });

  it("false for uint", () => {
    expect(isSignedIntegerDtype("uint8")).toBe(false);
    expect(isSignedIntegerDtype("uint64")).toBe(false);
  });
});

describe("isUnsignedIntegerDtype", () => {
  it("true for uint8/16/32/64", () => {
    expect(isUnsignedIntegerDtype("uint8")).toBe(true);
    expect(isUnsignedIntegerDtype("uint64")).toBe(true);
  });

  it("false for int", () => {
    expect(isUnsignedIntegerDtype("int8")).toBe(false);
    expect(isUnsignedIntegerDtype("int64")).toBe(false);
  });
});

describe("isFloatDtype", () => {
  it("true for float32 and float64", () => {
    expect(isFloatDtype("float32")).toBe(true);
    expect(isFloatDtype("float64")).toBe(true);
    expect(isFloatDtype(Dtype.float64)).toBe(true);
  });

  it("false for integers and others", () => {
    expect(isFloatDtype("int32")).toBe(false);
    expect(isFloatDtype("string")).toBe(false);
  });
});

describe("isBoolDtype", () => {
  it("true for bool", () => {
    expect(isBoolDtype("bool")).toBe(true);
    expect(isBoolDtype(Dtype.bool)).toBe(true);
  });

  it("false for others", () => {
    expect(isBoolDtype("int8")).toBe(false);
    expect(isBoolDtype("string")).toBe(false);
  });
});

describe("isStringDtype", () => {
  it("true for string dtype", () => {
    expect(isStringDtype("string")).toBe(true);
    expect(isStringDtype(Dtype.string)).toBe(true);
  });

  it("false for object and others", () => {
    expect(isStringDtype("object")).toBe(false);
    expect(isStringDtype("int32")).toBe(false);
  });
});

describe("isDatetimeDtype", () => {
  it("true for datetime", () => {
    expect(isDatetimeDtype("datetime")).toBe(true);
    expect(isDatetimeDtype(Dtype.datetime)).toBe(true);
  });

  it("false for timedelta and others", () => {
    expect(isDatetimeDtype("timedelta")).toBe(false);
    expect(isDatetimeDtype("string")).toBe(false);
  });
});

describe("isTimedeltaDtype", () => {
  it("true for timedelta", () => {
    expect(isTimedeltaDtype("timedelta")).toBe(true);
    expect(isTimedeltaDtype(Dtype.timedelta)).toBe(true);
  });

  it("false for datetime and others", () => {
    expect(isTimedeltaDtype("datetime")).toBe(false);
    expect(isTimedeltaDtype("float64")).toBe(false);
  });
});

describe("isCategoricalDtype", () => {
  it("true for category", () => {
    expect(isCategoricalDtype("category")).toBe(true);
    expect(isCategoricalDtype(Dtype.category)).toBe(true);
  });

  it("false for others", () => {
    expect(isCategoricalDtype("string")).toBe(false);
    expect(isCategoricalDtype("int32")).toBe(false);
  });
});

describe("isObjectDtype", () => {
  it("true for object dtype", () => {
    expect(isObjectDtype("object")).toBe(true);
    expect(isObjectDtype(Dtype.object)).toBe(true);
  });

  it("false for string and others", () => {
    expect(isObjectDtype("string")).toBe(false);
    expect(isObjectDtype("int32")).toBe(false);
  });
});

describe("isComplexDtype", () => {
  it("always returns false (no complex type in tsb)", () => {
    expect(isComplexDtype("float64")).toBe(false);
    expect(isComplexDtype("int32")).toBe(false);
    expect(isComplexDtype(Dtype.float64)).toBe(false);
  });
});

describe("isExtensionArrayDtype", () => {
  it("true for string/object/datetime/timedelta/category", () => {
    expect(isExtensionArrayDtype("string")).toBe(true);
    expect(isExtensionArrayDtype("object")).toBe(true);
    expect(isExtensionArrayDtype("datetime")).toBe(true);
    expect(isExtensionArrayDtype("timedelta")).toBe(true);
    expect(isExtensionArrayDtype("category")).toBe(true);
  });

  it("false for numeric dtypes", () => {
    expect(isExtensionArrayDtype("int32")).toBe(false);
    expect(isExtensionArrayDtype("float64")).toBe(false);
    expect(isExtensionArrayDtype("bool")).toBe(false);
  });
});

describe("isPeriodDtype", () => {
  it("true for datetime (maps to period)", () => {
    expect(isPeriodDtype("datetime")).toBe(true);
  });

  it("false for others", () => {
    expect(isPeriodDtype("float64")).toBe(false);
    expect(isPeriodDtype("string")).toBe(false);
  });
});

describe("isIntervalDtype", () => {
  it("true for numeric dtypes (interval uses numeric bounds)", () => {
    expect(isIntervalDtype("float64")).toBe(true);
    expect(isIntervalDtype("int32")).toBe(true);
    expect(isIntervalDtype("uint8")).toBe(true);
  });

  it("false for string/category/bool", () => {
    expect(isIntervalDtype("string")).toBe(false);
    expect(isIntervalDtype("category")).toBe(false);
    expect(isIntervalDtype("bool")).toBe(false);
  });
});

// ─── property-based cross-checks ─────────────────────────────────────────────

describe("dtype predicate cross-checks", () => {
  const numericNames = [
    "int8",
    "int16",
    "int32",
    "int64",
    "uint8",
    "uint16",
    "uint32",
    "uint64",
    "float32",
    "float64",
  ] as const;
  const nonNumericNames = [
    "bool",
    "string",
    "object",
    "datetime",
    "timedelta",
    "category",
  ] as const;

  it("isNumericDtype and isIntegerDtype are consistent", () => {
    for (const n of numericNames) {
      if (isIntegerDtype(n)) {
        expect(isNumericDtype(n)).toBe(true);
      }
    }
  });

  it("no numeric dtype is extension array", () => {
    for (const n of numericNames) {
      if (!isBoolDtype(n)) {
        expect(isExtensionArrayDtype(n)).toBe(false);
      }
    }
  });

  it("signed and unsigned integers are disjoint", () => {
    for (const n of numericNames) {
      if (isSignedIntegerDtype(n)) {
        expect(isUnsignedIntegerDtype(n)).toBe(false);
      }
      if (isUnsignedIntegerDtype(n)) {
        expect(isSignedIntegerDtype(n)).toBe(false);
      }
    }
  });

  it("float dtypes are not integer dtypes", () => {
    for (const n of numericNames) {
      if (isFloatDtype(n)) {
        expect(isIntegerDtype(n)).toBe(false);
      }
    }
  });

  it("non-numeric dtypes fail isNumericDtype", () => {
    for (const n of nonNumericNames) {
      expect(isNumericDtype(n)).toBe(false);
    }
  });
});
