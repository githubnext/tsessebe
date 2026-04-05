/**
 * Tests for SparseArray and SparseDtype.
 */
import { describe, expect, it } from "bun:test";
import { SparseArray, SparseDtype } from "../../src/index.ts";

describe("SparseDtype", () => {
  it("toString includes subtype and fill", () => {
    const dt = new SparseDtype("float64", Number.NaN);
    expect(dt.toString()).toBe("Sparse[float64, NaN]");
  });

  it("static float64 has NaN fill by default", () => {
    const dt = SparseDtype.float64();
    expect(Number.isNaN(dt.fillValue as number)).toBe(true);
  });

  it("static int64 has 0 fill", () => {
    const dt = SparseDtype.int64();
    expect(dt.fillValue).toBe(0);
  });

  it("static bool has false fill", () => {
    const dt = SparseDtype.bool();
    expect(dt.fillValue).toBe(false);
  });
});

describe("SparseArray", () => {
  describe("fromDense", () => {
    it("stores only non-fill elements", () => {
      const sa = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4, Number.NaN]);
      expect(sa.nnz).toBe(2);
      expect(sa.length).toBe(5);
    });

    it("toDense round-trips correctly", () => {
      const dense = [1, Number.NaN, 3, Number.NaN, 5];
      const sa = SparseArray.fromDense(dense);
      const back = sa.toDense();
      expect(back[0]).toBe(1);
      expect(Number.isNaN(back[1] as number)).toBe(true);
      expect(back[2]).toBe(3);
    });

    it("density is nnz / length", () => {
      const sa = SparseArray.fromDense([1, Number.NaN, 3, Number.NaN, 5]);
      expect(sa.density).toBeCloseTo(0.6);
    });

    it("all-fill array has nnz = 0", () => {
      const sa = SparseArray.fromDense([Number.NaN, Number.NaN, Number.NaN]);
      expect(sa.nnz).toBe(0);
      expect(sa.density).toBe(0);
    });
  });

  describe("get", () => {
    it("returns stored value at non-fill position", () => {
      const sa = SparseArray.fromDense([0, 0, 42, 0, 0], 0);
      expect(sa.get(2)).toBe(42);
    });

    it("returns fill at implicit position", () => {
      const sa = SparseArray.fromDense([0, 0, 42, 0, 0], 0);
      expect(sa.get(0)).toBe(0);
    });

    it("throws on out-of-range index", () => {
      const sa = SparseArray.fromDense([1, 2, 3]);
      expect(() => sa.get(5)).toThrow(RangeError);
    });
  });

  describe("fromCOO", () => {
    it("constructs from explicit COO data", () => {
      const sa = SparseArray.fromCOO([1, 3], [10, 30], 5);
      expect(sa.get(1)).toBe(10);
      expect(sa.get(3)).toBe(30);
      expect(sa.length).toBe(5);
    });

    it("throws on mismatched lengths", () => {
      expect(() => SparseArray.fromCOO([1, 2], [10], 5)).toThrow();
    });
  });

  describe("map", () => {
    it("applies function to non-fill elements", () => {
      const sa = SparseArray.fromDense([0, 0, 4, 0, 9], 0);
      const mapped = sa.map((v) => (typeof v === "number" ? v * 2 : v));
      expect(mapped.get(2)).toBe(8);
      expect(mapped.get(4)).toBe(18);
    });
  });

  describe("slice", () => {
    it("slices correctly", () => {
      const sa = SparseArray.fromDense([Number.NaN, 2, Number.NaN, 4, Number.NaN]);
      const sl = sa.slice(1, 4);
      expect(sl.length).toBe(3);
      expect(sl.get(0)).toBe(2);
      expect(sl.get(2)).toBe(4);
    });

    it("throws on invalid range", () => {
      const sa = SparseArray.fromDense([1, 2, 3]);
      expect(() => sa.slice(2, 1)).toThrow(RangeError);
    });
  });

  describe("add", () => {
    it("shifts all values including fill", () => {
      const sa = SparseArray.fromDense([0, 5, 0, 10], 0);
      const added = sa.add(1);
      expect(added.fillValue).toBe(1);
      expect(added.get(1)).toBe(6);
      expect(added.get(3)).toBe(11);
    });
  });

  describe("toString", () => {
    it("includes length and nnz", () => {
      const sa = SparseArray.fromDense([1, Number.NaN, 3]);
      expect(sa.toString()).toContain("length=3");
      expect(sa.toString()).toContain("nnz=2");
    });
  });
});
