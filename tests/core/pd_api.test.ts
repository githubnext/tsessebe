import { describe, expect, test } from "bun:test";
import { api, apiTypes } from "../../src/index.ts";
import { Dtype } from "../../src/index.ts";

describe("api namespace", () => {
  describe("api.types value predicates", () => {
    test("isScalar returns true for primitives", () => {
      expect(api.types.isScalar(42)).toBe(true);
      expect(api.types.isScalar("hello")).toBe(true);
      expect(api.types.isScalar(true)).toBe(true);
      expect(api.types.isScalar(null)).toBe(true);
    });

    test("isScalar returns false for arrays", () => {
      expect(api.types.isScalar([1, 2, 3])).toBe(false);
    });

    test("isListLike returns true for arrays and strings", () => {
      expect(api.types.isListLike([1, 2])).toBe(true);
      expect(api.types.isListLike("abc")).toBe(true);
    });

    test("isListLike returns false for scalars", () => {
      expect(api.types.isListLike(42)).toBe(false);
    });

    test("isDictLike returns true for plain objects", () => {
      expect(api.types.isDictLike({ a: 1 })).toBe(true);
    });

    test("isDictLike returns false for arrays", () => {
      expect(api.types.isDictLike([1, 2])).toBe(false);
    });

    test("isNumber", () => {
      expect(api.types.isNumber(42)).toBe(true);
      expect(api.types.isNumber("42")).toBe(false);
    });

    test("isBool", () => {
      expect(api.types.isBool(true)).toBe(true);
      expect(api.types.isBool(1)).toBe(false);
    });

    test("isFloat", () => {
      expect(api.types.isFloat(3.14)).toBe(true);
      expect(api.types.isFloat(3)).toBe(false);
    });

    test("isInteger", () => {
      expect(api.types.isInteger(3)).toBe(true);
      expect(api.types.isInteger(3.14)).toBe(false);
    });

    test("isMissing returns true for null/undefined/NaN", () => {
      expect(api.types.isMissing(null)).toBe(true);
      expect(api.types.isMissing(undefined)).toBe(true);
      expect(api.types.isMissing(Number.NaN)).toBe(true);
      expect(api.types.isMissing(0)).toBe(false);
    });
  });

  describe("api.types dtype predicates", () => {
    test("isNumericDtype", () => {
      expect(api.types.isNumericDtype(Dtype.float64)).toBe(true);
      expect(api.types.isNumericDtype(Dtype.int32)).toBe(true);
      expect(api.types.isNumericDtype(Dtype.string)).toBe(false);
    });

    test("isIntegerDtype", () => {
      expect(api.types.isIntegerDtype(Dtype.int64)).toBe(true);
      expect(api.types.isIntegerDtype(Dtype.float64)).toBe(false);
    });

    test("isFloatDtype", () => {
      expect(api.types.isFloatDtype(Dtype.float64)).toBe(true);
      expect(api.types.isFloatDtype(Dtype.int32)).toBe(false);
    });

    test("isBoolDtype", () => {
      expect(api.types.isBoolDtype(Dtype.bool)).toBe(true);
      expect(api.types.isBoolDtype(Dtype.int32)).toBe(false);
    });

    test("isStringDtype", () => {
      expect(api.types.isStringDtype(Dtype.string)).toBe(true);
      expect(api.types.isStringDtype(Dtype.int32)).toBe(false);
    });

    test("isCategoricalDtype", () => {
      expect(api.types.isCategoricalDtype(Dtype.category)).toBe(true);
      expect(api.types.isCategoricalDtype(Dtype.int32)).toBe(false);
    });
  });

  describe("apiTypes alias", () => {
    test("apiTypes.isScalar works the same as api.types.isScalar", () => {
      expect(apiTypes.isScalar(1)).toBe(api.types.isScalar(1));
      expect(apiTypes.isNumericDtype(Dtype.float64)).toBe(api.types.isNumericDtype(Dtype.float64));
    });
  });
});
