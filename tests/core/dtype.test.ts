/**
 * Tests for the Dtype system.
 */
import { describe, expect, it } from "bun:test";
import { Dtype } from "../../src/core/index.ts";

describe("Dtype", () => {
  describe("singletons", () => {
    it("returns the same instance for identical names", () => {
      expect(Dtype.from("float64")).toBe(Dtype.float64);
      expect(Dtype.from("int32")).toBe(Dtype.int32);
      expect(Dtype.from("bool")).toBe(Dtype.bool);
    });

    it("all 16 named dtypes are accessible", () => {
      const names = [
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
      ] as const;
      for (const n of names) {
        const dt = Dtype.from(n);
        expect(dt.name).toBe(n);
      }
    });
  });

  describe("kind classification", () => {
    it("integer kinds", () => {
      expect(Dtype.int32.kind).toBe("int");
      expect(Dtype.int32.isInteger).toBe(true);
      expect(Dtype.int32.isSignedInteger).toBe(true);
      expect(Dtype.uint16.isUnsignedInteger).toBe(true);
    });

    it("float kind", () => {
      expect(Dtype.float64.isFloat).toBe(true);
      expect(Dtype.float64.isNumeric).toBe(true);
    });

    it("bool kind", () => {
      expect(Dtype.bool.isBool).toBe(true);
    });

    it("string kind", () => {
      expect(Dtype.string.isString).toBe(true);
    });

    it("datetime kind", () => {
      expect(Dtype.datetime.isDatetime).toBe(true);
    });
  });

  describe("itemsize", () => {
    it("int8 is 1 byte", () => expect(Dtype.int8.itemsize).toBe(1));
    it("int64 is 8 bytes", () => expect(Dtype.int64.itemsize).toBe(8));
    it("float32 is 4 bytes", () => expect(Dtype.float32.itemsize).toBe(4));
    it("string itemsize is 0 (variable)", () => expect(Dtype.string.itemsize).toBe(0));
  });

  describe("canCastTo", () => {
    it("can cast int8 → int32", () => {
      expect(Dtype.int8.canCastTo(Dtype.int32)).toBe(true);
    });

    it("cannot cast int32 → int8", () => {
      expect(Dtype.int32.canCastTo(Dtype.int8)).toBe(false);
    });

    it("can cast int64 → float64", () => {
      expect(Dtype.int64.canCastTo(Dtype.float64)).toBe(true);
    });

    it("can cast bool → float64", () => {
      expect(Dtype.bool.canCastTo(Dtype.float64)).toBe(true);
    });

    it("same type always castable", () => {
      expect(Dtype.float64.canCastTo(Dtype.float64)).toBe(true);
    });
  });

  describe("commonType", () => {
    it("same dtype returns itself", () => {
      expect(Dtype.commonType(Dtype.int32, Dtype.int32)).toBe(Dtype.int32);
    });

    it("int32 + int64 → int64", () => {
      expect(Dtype.commonType(Dtype.int32, Dtype.int64)).toBe(Dtype.int64);
    });

    it("int + float → float64", () => {
      expect(Dtype.commonType(Dtype.int32, Dtype.float64)).toBe(Dtype.float64);
    });

    it("bool + int → int (numeric)", () => {
      const result = Dtype.commonType(Dtype.bool, Dtype.int32);
      expect(result.isNumeric).toBe(true);
    });

    it("int + string → object", () => {
      expect(Dtype.commonType(Dtype.int32, Dtype.string)).toBe(Dtype.object);
    });
  });

  describe("inferFrom", () => {
    it("empty array → float64", () => {
      expect(Dtype.inferFrom([])).toBe(Dtype.float64);
    });

    it("all booleans → bool", () => {
      expect(Dtype.inferFrom([true, false, true])).toBe(Dtype.bool);
    });

    it("all integers → int64", () => {
      expect(Dtype.inferFrom([1, 2, 3])).toBe(Dtype.int64);
    });

    it("mixed int/float → float64", () => {
      expect(Dtype.inferFrom([1, 2.5, 3])).toBe(Dtype.float64);
    });

    it("all strings → string", () => {
      expect(Dtype.inferFrom(["a", "b", "c"])).toBe(Dtype.string);
    });

    it("all Dates → datetime", () => {
      expect(Dtype.inferFrom([new Date(), new Date()])).toBe(Dtype.datetime);
    });

    it("mixed types → object", () => {
      expect(Dtype.inferFrom([1, "a", true])).toBe(Dtype.object);
    });

    it("nulls are treated as compatible with any type", () => {
      expect(Dtype.inferFrom([1, null, 2])).toBe(Dtype.int64);
    });
  });

  describe("toString", () => {
    it("returns the dtype name", () => {
      expect(Dtype.float64.toString()).toBe("float64");
    });
  });
});
