/**
 * Tests for src/stats/factorize.ts — factorize and factorizeSeries.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, factorize, factorizeSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── basic factorize ──────────────────────────────────────────────────────────

describe("factorize — basic encoding", () => {
  it("assigns codes in first-seen order by default", () => {
    const { codes, uniques } = factorize(["b", "a", "b", "c"]);
    expect(codes).toEqual([0, 1, 0, 2]);
    expect(uniques).toEqual(["b", "a", "c"]);
  });

  it("assigns codes in sorted order when sort=true", () => {
    const { codes, uniques } = factorize(["b", "a", "b", "c"], { sort: true });
    expect(codes).toEqual([1, 0, 1, 2]);
    expect(uniques).toEqual(["a", "b", "c"]);
  });

  it("maps null/undefined/NaN to naValue sentinel (default -1)", () => {
    const { codes, uniques } = factorize(["a", null, "b", undefined, "a"]);
    expect(codes).toEqual([0, -1, 1, -1, 0]);
    expect(uniques).toEqual(["a", "b"]);
  });

  it("uses custom naValue sentinel", () => {
    const { codes } = factorize(["x", null, "x"], { naValue: -99 });
    expect(codes).toEqual([0, -99, 0]);
  });

  it("treats null as regular value when naValue=null", () => {
    const { codes, uniques } = factorize(["a", null, "a", "b", null], { naValue: null });
    // null gets first-seen code (position 1)
    expect(codes[1]).toBe(codes[4]); // both nulls same code
    expect(uniques.length).toBe(2); // "a" and "b" (null excluded from uniques)
  });

  it("handles NaN as missing", () => {
    const { codes } = factorize([1, Number.NaN, 2, Number.NaN, 1] as Scalar[]);
    expect(codes[1]).toBe(-1);
    expect(codes[3]).toBe(-1);
    expect(codes[0]).toBe(0);
    expect(codes[2]).toBe(1);
  });

  it("returns empty arrays for empty input", () => {
    const { codes, uniques } = factorize([]);
    expect(codes).toEqual([]);
    expect(uniques).toEqual([]);
  });

  it("handles all-missing input", () => {
    const { codes, uniques } = factorize([null, null, undefined]);
    expect(codes).toEqual([-1, -1, -1]);
    expect(uniques).toEqual([]);
  });

  it("handles numeric values", () => {
    const { codes, uniques } = factorize([3, 1, 2, 1, 3] as Scalar[]);
    expect(codes).toEqual([0, 1, 2, 1, 0]);
    expect(uniques).toEqual([3, 1, 2]);
  });

  it("handles numeric values with sort=true", () => {
    const { codes, uniques } = factorize([3, 1, 2, 1, 3] as Scalar[], { sort: true });
    expect(codes).toEqual([2, 0, 1, 0, 2]);
    expect(uniques).toEqual([1, 2, 3]);
  });

  it("handles boolean values", () => {
    const { codes, uniques } = factorize([true, false, true, false] as Scalar[]);
    expect(codes).toEqual([0, 1, 0, 1]);
    expect(uniques).toEqual([true, false]);
  });

  it("handles single unique value", () => {
    const { codes, uniques } = factorize(["x", "x", "x"]);
    expect(codes).toEqual([0, 0, 0]);
    expect(uniques).toEqual(["x"]);
  });

  it("handles all unique values", () => {
    const { codes, uniques } = factorize(["a", "b", "c", "d"]);
    expect(codes).toEqual([0, 1, 2, 3]);
    expect(uniques).toEqual(["a", "b", "c", "d"]);
  });

  it("codes length equals input length", () => {
    const input = ["a", "b", "a", null, "c"];
    const { codes } = factorize(input);
    expect(codes.length).toBe(input.length);
  });

  it("sorted uniques do not include missing values", () => {
    const { uniques } = factorize(["z", null, "a", undefined, "m"], { sort: true });
    expect(uniques).toEqual(["a", "m", "z"]);
  });
});

// ─── factorizeSeries ─────────────────────────────────────────────────────────

describe("factorizeSeries", () => {
  it("returns a codes Series and uniques Index", () => {
    const s = new Series({ data: ["cat", "dog", "cat", null] as Scalar[], name: "pet" });
    const { codes, uniques } = factorizeSeries(s);

    expect(codes.values).toEqual([0, 1, 0, -1]);
    expect([...uniques.values]).toEqual(["cat", "dog"]);
  });

  it("preserves series name on codes", () => {
    const s = new Series({ data: [1, 2, 1] as Scalar[], name: "nums" });
    const { codes } = factorizeSeries(s);
    expect(codes.name).toBe("nums");
  });

  it("preserves index from source series", () => {
    const s = new Series({
      data: ["x", "y", "x"] as Scalar[],
      index: [10, 20, 30],
      name: null,
    });
    const { codes } = factorizeSeries(s);
    expect([...codes.index.values]).toEqual([10, 20, 30]);
  });

  it("codes Series has same length as source", () => {
    const s = new Series({ data: ["a", "b", "c", "a", null] as Scalar[], name: "col" });
    const { codes } = factorizeSeries(s);
    expect(codes.values.length).toBe(s.values.length);
  });

  it("sort option works through factorizeSeries", () => {
    const s = new Series({ data: ["c", "a", "b"] as Scalar[], name: null });
    const { codes, uniques } = factorizeSeries(s, { sort: true });
    expect(codes.values).toEqual([2, 0, 1]);
    expect([...uniques.values]).toEqual(["a", "b", "c"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("factorize — property-based", () => {
  it("codes length always equals input length", () => {
    fc.assert(
      fc.property(fc.array(fc.option(fc.string(), { nil: null }), { maxLength: 30 }), (arr) => {
        const { codes } = factorize(arr as Scalar[]);
        return codes.length === arr.length;
      }),
    );
  });

  it("each code is either -1 (sentinel) or a valid index into uniques", () => {
    fc.assert(
      fc.property(fc.array(fc.option(fc.string(), { nil: null }), { maxLength: 30 }), (arr) => {
        const { codes, uniques } = factorize(arr as Scalar[]);
        return codes.every((c) => c === -1 || (c >= 0 && c < uniques.length));
      }),
    );
  });

  it("same input value always maps to the same code", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 1, maxLength: 20 }), (arr) => {
        const { codes } = factorize(arr as Scalar[]);
        const codeForValue = new Map<string, number>();
        for (const [i, v] of arr.entries()) {
          const c = codes[i];
          if (c === undefined) {
            return false;
          }
          const prev = codeForValue.get(v);
          if (prev === undefined) {
            codeForValue.set(v, c);
          } else if (prev !== c) {
            return false;
          }
        }
        return true;
      }),
    );
  });

  it("number of uniques equals max(codes)+1 when no NaN/null present", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 3 }), { minLength: 1, maxLength: 20 }),
        (arr) => {
          const { codes, uniques } = factorize(arr as Scalar[]);
          const maxCode = Math.max(...codes);
          return maxCode === uniques.length - 1;
        },
      ),
    );
  });
});
