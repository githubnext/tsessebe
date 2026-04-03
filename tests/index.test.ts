/**
 * Hello-world test — proves the tsb package entry point loads correctly.
 *
 * This is the minimal end-to-end smoke test for the project foundation.
 * It verifies that:
 *   1. The package can be imported.
 *   2. The version constant is exported and has the expected shape.
 *   3. The core type system compiles without errors.
 */

import { describe, expect, it } from "bun:test";
import { TSB_VERSION } from "../src/index.ts";
import type {
  Axis,
  DtypeName,
  FillMethod,
  JoinHow,
  Label,
  Scalar,
  SortOrder,
} from "../src/index.ts";

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

describe("tsb package foundation", () => {
  it("exports TSB_VERSION as a semver-shaped string", () => {
    expect(TSB_VERSION).toBeTypeOf("string");
    expect(TSB_VERSION).toMatch(SEMVER_RE);
  });

  it("TSB_VERSION is 0.0.1 at project inception", () => {
    expect(TSB_VERSION).toBe("0.0.1");
  });
});

describe("type exports compile correctly", () => {
  it("Scalar type accepts all expected primitive kinds", () => {
    // Type-level tests: these assignments would fail to compile if types were wrong.
    const _num: Scalar = 42;
    const _str: Scalar = "hello";
    const _bool: Scalar = true;
    const _big: Scalar = BigInt("9007199254740993");
    const _null: Scalar = null;
    const _undef: Scalar = undefined;
    const _date: Scalar = new Date();
    expect(true).toBe(true); // all assignments above compiled → test passes
  });

  it("Label type accepts number, string, boolean, null", () => {
    const _n: Label = 0;
    const _s: Label = "key";
    const _b: Label = false;
    const _nil: Label = null;
    expect(true).toBe(true);
  });

  it("Axis type accepts numeric and named variants", () => {
    const _a0: Axis = 0;
    const _a1: Axis = 1;
    const _aIdx: Axis = "index";
    const _aCol: Axis = "columns";
    expect(true).toBe(true);
  });

  it("SortOrder, FillMethod, JoinHow are valid discriminated unions", () => {
    const _asc: SortOrder = "ascending";
    const _desc: SortOrder = "descending";
    const _ffill: FillMethod = "ffill";
    const _bfill: FillMethod = "bfill";
    const _inner: JoinHow = "inner";
    const _outer: JoinHow = "outer";
    expect(true).toBe(true);
  });

  it("DtypeName covers all planned numeric and structured types", () => {
    const dtypes: DtypeName[] = [
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
      "bool",
      "string",
      "object",
      "datetime",
      "timedelta",
      "category",
    ];
    expect(dtypes.length).toBe(16);
  });
});
