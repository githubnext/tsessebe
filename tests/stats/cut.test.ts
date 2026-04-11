/**
 * Tests for stats/cut.ts — cut() and qcut() binning functions.
 */

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { Series } from "../../src/index.ts";
import { cut, cutCategories, cutCodes, qcut } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// Top-level regex constant for performance
const INTEGER_RE = /^\d+$/;

// ─── cut — integer bins ────────────────────────────────────────────────────────

describe("cut — integer bins", () => {
  test("3 equal-width bins, default options", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6] as Scalar[] });
    const result = cut(s, 3);
    const vals = result.values;
    expect(vals.every((v) => typeof v === "string" || v === null)).toBe(true);
    // first element (1) and last element (6) should land in different bins
    expect(vals[0]).not.toBe(vals[5]);
  });

  test("correct number of distinct bins", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Scalar[] });
    const result = cut(s, 4);
    const unique = new Set(result.values.filter(Boolean));
    expect(unique.size).toBe(4);
  });

  test("preserves index", () => {
    const s = new Series({ data: [10, 20, 30] as Scalar[], index: ["a", "b", "c"] });
    const result = cut(s, 3);
    expect([...result.index.values]).toEqual(["a", "b", "c"]);
  });

  test("preserves name", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[], name: "myCol" });
    const result = cut(s, 3);
    expect(result.name).toBe("myCol");
  });

  test("null values produce null in result", () => {
    const s = new Series({ data: [1, null, 3] as Scalar[] });
    const result = cut(s, 2);
    expect(result.values[1]).toBe(null);
  });

  test("NaN values produce null in result", () => {
    const s = new Series({ data: [1, Number.NaN, 3] as Scalar[] });
    const result = cut(s, 2);
    expect(result.values[1]).toBe(null);
  });

  test("retbins returns [series, edges]", () => {
    const s = new Series({ data: [1, 2, 3, 4] as Scalar[] });
    const [binned, edges] = cut(s, 2, { retbins: true }) as unknown as [
      ReturnType<typeof cut>,
      readonly number[],
    ];
    expect(Array.isArray(edges)).toBe(true);
    expect((edges as readonly number[]).length).toBe(3); // 2 bins → 3 edges
    expect(binned.size).toBe(4);
  });

  test("right=false uses left-closed intervals", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    const result = cut(s, 2, { right: false });
    const first = result.values.find((v) => v !== null);
    expect(first).toBeDefined();
    expect(String(first)[0]).toBe("[");
  });

  test("labels=false returns integer codes", () => {
    const s = new Series({ data: [10, 20, 30, 40, 50] as Scalar[] });
    const result = cut(s, 5, { labels: false });
    const vals = result.values;
    expect(vals.every((v) => v === null || INTEGER_RE.test(String(v)))).toBe(true);
  });

  test("custom labels", () => {
    const s = new Series({ data: [1, 5, 10] as Scalar[] });
    const result = cut(s, 3, { labels: ["low", "mid", "high"] });
    const unique = new Set(result.values.filter(Boolean));
    expect([...unique].every((v) => ["low", "mid", "high"].includes(v as string))).toBe(true);
  });

  test("custom labels wrong length throws", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => cut(s, 3, { labels: ["a", "b"] })).toThrow();
  });

  test("bins=0 throws", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => cut(s, 0)).toThrow();
  });

  test("single unique value still bins", () => {
    const s = new Series({ data: [5, 5, 5] as Scalar[] });
    const result = cut(s, 1);
    expect(result.values.every((v) => v !== null)).toBe(true);
  });
});

// ─── cut — explicit bin edges ─────────────────────────────────────────────────

describe("cut — explicit bin edges", () => {
  test("basic edge array", () => {
    const s = new Series({ data: [0.5, 1.5, 2.5, 3.5] as Scalar[] });
    const result = cut(s, [0, 1, 2, 3, 4]);
    expect(result.values[0]).toBe("(0, 1]");
    expect(result.values[1]).toBe("(1, 2]");
    expect(result.values[2]).toBe("(2, 3]");
    expect(result.values[3]).toBe("(3, 4]");
  });

  test("value below lower edge is null", () => {
    const s = new Series({ data: [-1, 5] as Scalar[] });
    const result = cut(s, [0, 3, 6]);
    expect(result.values[0]).toBe(null);
    expect(result.values[1]).toBe("(3, 6]");
  });

  test("value above upper edge is null", () => {
    const s = new Series({ data: [10, 2] as Scalar[] });
    const result = cut(s, [0, 5, 8]);
    expect(result.values[0]).toBe(null);
    expect(result.values[1]).toBe("(0, 5]");
  });

  test("duplicate edges throw", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => cut(s, [0, 2, 2, 4])).toThrow();
  });

  test("fewer than 2 edges throw", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => cut(s, [1])).toThrow();
  });

  test("precision option affects label format", () => {
    const s = new Series({ data: [1.23456] as Scalar[] });
    const result = cut(s, [1, 1.23456, 2], { precision: 2 });
    const lbl = result.values[0];
    expect(lbl).toBe("(1, 1.23]");
  });

  test("retbins returns original edges", () => {
    const edges = [0, 1, 2, 3];
    const s = new Series({ data: [0.5, 1.5, 2.5] as Scalar[] });
    const [, returnedEdges] = cut(s, edges, { retbins: true }) as unknown as [
      ReturnType<typeof cut>,
      readonly number[],
    ];
    expect([...(returnedEdges as readonly number[])]).toEqual([0, 1, 2, 3]);
  });
});

// ─── qcut ──────────────────────────────────────────────────────────────────────

describe("qcut — integer quantiles", () => {
  test("4 equal-frequency bins", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Scalar[] });
    const result = qcut(s, 4);
    const unique = new Set(result.values.filter(Boolean));
    expect(unique.size).toBe(4);
  });

  test("q=2 splits at median", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Scalar[] });
    const result = qcut(s, 2);
    const unique = new Set(result.values.filter(Boolean));
    expect(unique.size).toBe(2);
  });

  test("null values produce null", () => {
    const s = new Series({ data: [1, null, 3, 4, 5] as Scalar[] });
    const result = qcut(s, 2);
    expect(result.values[1]).toBe(null);
  });

  test("preserves index", () => {
    const s = new Series({ data: [1, 2, 3, 4] as Scalar[], index: [10, 11, 12, 13] });
    const result = qcut(s, 2);
    expect([...result.index.values]).toEqual([10, 11, 12, 13]);
  });

  test("retbins returns edges", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8] as Scalar[] });
    const [binned, edges] = qcut(s, 4, { retbins: true }) as unknown as [
      ReturnType<typeof qcut>,
      readonly number[],
    ];
    expect((edges as readonly number[]).length).toBe(5); // 4 bins → 5 edges
    expect(binned.size).toBe(8);
  });

  test("labels=false gives integer codes", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6] as Scalar[] });
    const result = qcut(s, 3, { labels: false });
    const vals = result.values;
    expect(vals.every((v) => v === null || INTEGER_RE.test(String(v)))).toBe(true);
  });

  test("custom labels", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6] as Scalar[] });
    const result = qcut(s, 3, { labels: ["low", "med", "high"] });
    const unique = new Set(result.values.filter(Boolean));
    expect([...unique].every((v) => ["low", "med", "high"].includes(v as string))).toBe(true);
  });

  test("q<2 throws", () => {
    const s = new Series({ data: [1, 2, 3] as Scalar[] });
    expect(() => qcut(s, 1)).toThrow();
  });
});

describe("qcut — explicit quantile levels", () => {
  test("quartiles via explicit levels", () => {
    const s = new Series({ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Scalar[] });
    const result = qcut(s, [0, 0.25, 0.5, 0.75, 1]);
    const unique = new Set(result.values.filter(Boolean));
    expect(unique.size).toBe(4);
  });

  test("duplicate edges raise by default", () => {
    // Data with many ties causes duplicate quantile edges
    const s = new Series({ data: [1, 1, 1, 1, 2, 2, 2, 2] as Scalar[] });
    expect(() => qcut(s, 4)).toThrow();
  });

  test("duplicates=drop handles ties", () => {
    const s = new Series({ data: [1, 1, 1, 1, 2, 3, 4, 5] as Scalar[] });
    const result = qcut(s, 4, { duplicates: "drop" });
    expect(result.size).toBe(8);
  });
});

// ─── cutCodes ─────────────────────────────────────────────────────────────────

describe("cutCodes", () => {
  test("returns integer codes", () => {
    const s = new Series({ data: [1, 5, 10] as Scalar[] });
    const result = cutCodes(s, [0, 4, 8, 12]);
    expect(result.values[0]).toBe(0);
    expect(result.values[1]).toBe(1);
    expect(result.values[2]).toBe(2);
  });

  test("null for missing values", () => {
    const s = new Series({ data: [1, null, 3] as Scalar[] });
    const result = cutCodes(s, 2);
    expect(result.values[1]).toBe(null);
  });
});

// ─── cutCategories ────────────────────────────────────────────────────────────

describe("cutCategories", () => {
  test("returns label array of correct length", () => {
    const labels = cutCategories(4, 0, 100);
    expect(labels.length).toBe(4);
  });

  test("labels are ordered", () => {
    const labels = cutCategories([0, 10, 20, 30], 0, 30);
    expect(labels[0]).toBe("(0, 10]");
    expect(labels[1]).toBe("(10, 20]");
    expect(labels[2]).toBe("(20, 30]");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("cut — property tests", () => {
  test("every non-null result is a string", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 5 }),
        (data, numBins) => {
          const s = new Series({ data: data as Scalar[] });
          const [binned] = cut(s, numBins, { retbins: true }) as unknown as [
            ReturnType<typeof cut>,
            readonly number[],
          ];
          return binned.values.every((v) => {
            if (v === null) {
              return true;
            }
            return typeof v === "string";
          });
        },
      ),
    );
  });

  test("cut with integer bins: result size equals input size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 30,
        }),
        fc.integer({ min: 1, max: 6 }),
        (data, numBins) => {
          const s = new Series({ data: data as Scalar[] });
          const result = cut(s, numBins);
          return result.size === s.size;
        },
      ),
    );
  });

  test("qcut: result size equals input size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1000 }), {
          minLength: 2,
          maxLength: 20,
        }),
        fc.integer({ min: 2, max: 4 }),
        (data, numQ) => {
          if (data.length === 0) {
            return true;
          }
          const s = new Series({ data: data as Scalar[] });
          try {
            const result = qcut(s, numQ, { duplicates: "drop" });
            return result.size === s.size;
          } catch {
            return true; // may throw if all edges collapse
          }
        },
      ),
    );
  });

  test("cut with explicit edges: values within [0,100] range are non-null", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: 0, max: 100, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data: data as Scalar[] });
          const result = cut(s, [0, 50, 100]);
          return result.values.every((v) => typeof v === "string");
        },
      ),
    );
  });
});
