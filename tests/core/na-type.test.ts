/**
 * Tests for NAType singleton.
 */
import { describe, expect, it } from "bun:test";
import { NA, NAType, isNA, naIf, naOr } from "../../src/index.ts";

describe("NA singleton", () => {
  it("is an instance of NAType", () => {
    expect(NA).toBeInstanceOf(NAType);
  });

  it("is identical to itself (singleton)", () => {
    expect(NA === NAType.getInstance()).toBe(true);
  });

  it("toString returns <NA>", () => {
    expect(NA.toString()).toBe("<NA>");
  });

  it("toJSON returns null", () => {
    expect(NA.toJSON()).toBeNull();
  });
});

describe("isNA", () => {
  it("returns true for NA", () => {
    expect(isNA(NA)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isNA(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isNA(undefined)).toBe(false);
  });

  it("returns false for NaN", () => {
    expect(isNA(Number.NaN)).toBe(false);
  });

  it("returns false for 0", () => {
    expect(isNA(0)).toBe(false);
  });
});

describe("NA arithmetic propagation", () => {
  it("add returns NA", () => {
    expect(NA.add(1)).toBe(NA);
  });

  it("sub returns NA", () => {
    expect(NA.sub(2)).toBe(NA);
  });

  it("mul returns NA", () => {
    expect(NA.mul(3)).toBe(NA);
  });

  it("div returns NA", () => {
    expect(NA.div(4)).toBe(NA);
  });

  it("mod returns NA", () => {
    expect(NA.mod(5)).toBe(NA);
  });

  it("pow returns NA", () => {
    expect(NA.pow(2)).toBe(NA);
  });
});

describe("NA three-valued logic", () => {
  it("NA.and(false) → false", () => {
    expect(NA.and(false)).toBe(false);
  });

  it("NA.and(true) → NA", () => {
    expect(NA.and(true)).toBe(NA);
  });

  it("NA.and(NA) → NA", () => {
    expect(NA.and(NA)).toBe(NA);
  });

  it("NA.or(true) → true", () => {
    expect(NA.or(true)).toBe(true);
  });

  it("NA.or(false) → NA", () => {
    expect(NA.or(false)).toBe(NA);
  });

  it("NA.or(NA) → NA", () => {
    expect(NA.or(NA)).toBe(NA);
  });

  it("NA.not() → NA", () => {
    expect(NA.not()).toBe(NA);
  });
});

describe("naIf", () => {
  it("converts matching value to NA", () => {
    expect(isNA(naIf(-999, (v) => v === -999))).toBe(true);
  });

  it("leaves non-matching value unchanged", () => {
    expect(naIf(42, (v) => v === -999)).toBe(42);
  });
});

describe("naOr", () => {
  it("returns fallback for NA", () => {
    expect(naOr(NA, 0)).toBe(0);
  });

  it("returns value when not NA", () => {
    expect(naOr(42, 0)).toBe(42);
  });
});
