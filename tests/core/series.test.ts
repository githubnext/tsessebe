/**
 * Tests for Series.
 */
import { describe, expect, it } from "bun:test";
import { Dtype, Index, Series } from "../../src/core/index.ts";
describe("Series", () => {
  describe("construction", () => {
    it("creates from numeric array with default RangeIndex", () => {
      const s = new Series({ data: [1, 2, 3] });
      expect(s.size).toBe(3);
      expect(s.dtype).toBe(Dtype.int64);
    });

    it("creates with an explicit string index", () => {
      const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"] });
      expect(s.index.size).toBe(3);
      expect(s.at("a")).toBe(10);
    });

    it("creates with an explicit Index object", () => {
      const idx = new Index<string | number>(["x", "y"]);
      const s = new Series({ data: [1, 2], index: idx });
      expect(s.at("x")).toBe(1);
    });

    it("throws when index length mismatches data length", () => {
      expect(() => new Series({ data: [1, 2], index: ["a"] })).toThrow(RangeError);
    });

    it("infers dtype from data", () => {
      expect(new Series({ data: [true, false] }).dtype).toBe(Dtype.bool);
      expect(new Series({ data: ["a", "b"] }).dtype).toBe(Dtype.string);
    });

    it("respects an explicit dtype override", () => {
      const s = new Series({ data: [1, 2], dtype: Dtype.float64 });
      expect(s.dtype).toBe(Dtype.float64);
    });

    it("stores the name", () => {
      expect(new Series({ data: [1], name: "price" }).name).toBe("price");
    });

    it("name defaults to null", () => {
      expect(new Series({ data: [1] }).name).toBeNull();
    });
  });

  describe("fromObject", () => {
    it("creates from a plain object", () => {
      const s = Series.fromObject({ a: 1, b: 2, c: 3 });
      expect(s.at("a")).toBe(1);
      expect(s.size).toBe(3);
    });
  });

  describe("properties", () => {
    const s = new Series({ data: [1, 2, 3] });

    it("size", () => expect(s.size).toBe(3));
    it("length", () => expect(s.length).toBe(3));
    it("shape", () => expect(s.shape).toEqual([3]));
    it("ndim", () => expect(s.ndim).toBe(1));
    it("empty (false)", () => expect(s.empty).toBe(false));
    it("empty (true)", () => expect(new Series({ data: [] }).empty).toBe(true));
    it("values", () => expect(s.values).toEqual([1, 2, 3]));
  });

  describe("element access", () => {
    const s = new Series({ data: [10, 20, 30], index: ["a", "b", "c"], name: "v" });

    it("at(label)", () => expect(s.at("a")).toBe(10));
    it("iat(0)", () => expect(s.iat(0)).toBe(10));
    it("iat(-1)", () => expect(s.iat(-1)).toBe(30));
    it("loc(label)", () => expect(s.loc("b")).toBe(20));

    it("loc(labels) returns a new Series", () => {
      const sub = s.loc(["a", "c"]);
      expect(sub instanceof Series).toBe(true);
      expect(sub.size).toBe(2);
      expect(sub.iat(0)).toBe(10);
      expect(sub.iat(1)).toBe(30);
    });

    it("iloc(position) returns scalar", () => expect(s.iloc(1)).toBe(20));

    it("iloc(positions) returns a new Series", () => {
      const sub = s.iloc([0, 2]);
      expect(sub instanceof Series).toBe(true);
      expect(sub.size).toBe(2);
    });

    it("iat out of bounds throws", () => {
      expect(() => s.iat(100)).toThrow(RangeError);
    });
  });

  describe("arithmetic", () => {
    const a = new Series({ data: [1, 2, 3] });
    const b = new Series({ data: [4, 5, 6] });

    it("add scalar", () => expect(a.add(10 as never).values).toEqual([11, 12, 13]));
    it("add series", () => expect(a.add(b as never).values).toEqual([5, 7, 9]));
    it("sub series", () => expect(b.sub(a as never).values).toEqual([3, 3, 3]));
    it("mul scalar", () => expect(a.mul(2 as never).values).toEqual([2, 4, 6]));
    it("div series", () => expect(b.div(a as never).values).toEqual([4, 2.5, 2]));
    it("mod", () => expect(b.mod(a as never).values).toEqual([0, 1, 0]));
    it("pow", () => expect(a.pow(2 as never).values).toEqual([1, 4, 9]));
    it("floordiv", () => expect(b.floordiv(a as never).values).toEqual([4, 2, 2]));

    it("throws when sizes differ", () => {
      const c = new Series({ data: [1, 2] });
      expect(() => a.add(c as never)).toThrow(RangeError);
    });
  });

  describe("comparison", () => {
    const s = new Series({ data: [1, 2, 3] });

    it("eq", () => expect(s.eq(2 as never).values).toEqual([false, true, false]));
    it("ne", () => expect(s.ne(2 as never).values).toEqual([true, false, true]));
    it("lt", () => expect(s.lt(2 as never).values).toEqual([true, false, false]));
    it("le", () => expect(s.le(2 as never).values).toEqual([true, true, false]));
    it("gt", () => expect(s.gt(2 as never).values).toEqual([false, false, true]));
    it("ge", () => expect(s.ge(2 as never).values).toEqual([false, true, true]));
  });

  describe("filter", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });

    it("filters by boolean mask array", () => {
      const result = s.filter([true, false, true, false, true]);
      expect(result.values).toEqual([1, 3, 5]);
    });

    it("filters by boolean Series", () => {
      const mask = s.gt(2 as never);
      const result = s.filter(mask);
      expect(result.values).toEqual([3, 4, 5]);
    });

    it("throws on mask length mismatch", () => {
      expect(() => s.filter([true, false])).toThrow(RangeError);
    });
  });

  describe("missing values", () => {
    const s = new Series<number | null>({ data: [1, null, 3, null, 5] });

    it("isna", () => expect(s.isna().values).toEqual([false, true, false, true, false]));
    it("notna", () => expect(s.notna().values).toEqual([true, false, true, false, true]));
    it("dropna removes nulls", () => expect(s.dropna().values).toEqual([1, 3, 5]));
    it("fillna replaces nulls", () => {
      const filled = s.fillna(0);
      expect(filled.values).toEqual([1, 0, 3, 0, 5]);
    });
  });

  describe("aggregation", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5] });

    it("sum", () => expect(s.sum()).toBe(15));
    it("mean", () => expect(s.mean()).toBe(3));
    it("min", () => expect(s.min()).toBe(1));
    it("max", () => expect(s.max()).toBe(5));
    it("count", () => expect(s.count()).toBe(5));
    it("median", () => expect(s.median()).toBe(3));
    it("std (ddof=1)", () => {
      const std = s.std();
      expect(std).toBeCloseTo(Math.sqrt(2.5));
    });
    it("var (ddof=1)", () => expect(s.var()).toBeCloseTo(2.5));
    it("nunique", () => expect(s.nunique()).toBe(5));

    it("sum with nulls skips them", () => {
      const s2 = new Series({ data: [1, null, 2, null, 3] as never[] });
      expect(s2.sum()).toBe(6);
    });

    it("mean returns NaN for empty", () => {
      expect(Number.isNaN(new Series({ data: [] }).mean())).toBe(true);
    });
  });

  describe("valueCounts", () => {
    it("returns counts sorted by frequency", () => {
      const s = new Series({ data: ["a", "b", "a", "c", "a", "b"] });
      const vc = s.valueCounts();
      expect(vc.iat(0)).toBe(3); // 'a' appears 3 times
      expect(vc.iat(1)).toBe(2); // 'b' appears 2 times
      expect(vc.iat(2)).toBe(1); // 'c' appears 1 time
    });
  });

  describe("sorting", () => {
    it("sortValues ascending", () => {
      const s = new Series({ data: [3, 1, 2] });
      expect(s.sortValues().values).toEqual([1, 2, 3]);
    });

    it("sortValues descending", () => {
      const s = new Series({ data: [3, 1, 2] });
      expect(s.sortValues(false).values).toEqual([3, 2, 1]);
    });

    it("sortValues places nulls last by default", () => {
      const s = new Series<number | null>({ data: [3, null, 1] });
      expect(s.sortValues().values).toEqual([1, 3, null]);
    });

    it("sortIndex ascending", () => {
      const s = new Series({ data: [10, 20, 30], index: ["c", "a", "b"] });
      const sorted = s.sortIndex();
      expect(sorted.index.values).toEqual(["a", "b", "c"]);
      expect(sorted.values).toEqual([20, 30, 10]);
    });
  });

  describe("manipulation", () => {
    it("copy creates independent copy", () => {
      const s = new Series({ data: [1, 2, 3], name: "x" });
      const c = s.copy();
      expect(c.values).toEqual(s.values);
      expect(c).not.toBe(s);
    });

    it("rename changes name", () => {
      const s = new Series({ data: [1], name: "x" });
      expect(s.rename("y").name).toBe("y");
    });

    it("resetIndex gives RangeIndex", () => {
      const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
      const r = s.resetIndex();
      expect(r.index.values).toEqual([0, 1, 2]);
    });

    it("map transforms values", () => {
      const s = new Series({ data: [1, 2, 3] });
      const doubled = s.map((v) => (v as number) * 2);
      expect(doubled.values).toEqual([2, 4, 6]);
    });
  });

  describe("isin", () => {
    it("returns boolean mask", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      expect(s.isin([2, 4] as never[]).values).toEqual([false, true, false, true]);
    });
  });

  describe("conversion", () => {
    it("toArray", () => {
      expect(new Series({ data: [1, 2] }).toArray()).toEqual([1, 2]);
    });

    it("toObject", () => {
      const s = new Series({ data: [10, 20], index: ["a", "b"] });
      expect(s.toObject()).toEqual({ a: 10, b: 20 });
    });
  });

  describe("iteration", () => {
    it("is iterable", () => {
      const s = new Series({ data: [1, 2, 3] });
      expect([...s]).toEqual([1, 2, 3]);
    });
  });

  describe("toString", () => {
    it("includes dtype and length", () => {
      const s = new Series({ data: [1, 2], name: "val" });
      const str = s.toString();
      expect(str).toContain("val");
      expect(str).toContain("int64");
    });
  });
});
