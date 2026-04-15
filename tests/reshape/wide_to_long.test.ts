/**
 * Tests for src/reshape/wide_to_long.ts — wideToLong.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Scalar } from "../../src/index.ts";
import { wideToLong } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function col(df: DataFrame, name: string): Scalar[] {
  return [...df.col(name).values];
}

function makeWideDF() {
  return DataFrame.fromColumns({
    id: ["x", "y"],
    A1: [1, 2],
    A2: [3, 4],
    B1: [5, 6],
    B2: [7, 8],
  });
}

// ─── basic reshaping ──────────────────────────────────────────────────────────

describe("wideToLong", () => {
  describe("basic usage", () => {
    it("reshapes a simple wide DataFrame to long", () => {
      const df = makeWideDF();
      const result = wideToLong(df, ["A", "B"], "id", "year");

      expect(result.shape[0]).toBe(4); // 2 rows × 2 suffixes
      expect(result.columns.values).toEqual(["id", "year", "A", "B"]);
    });

    it("preserves id column values", () => {
      const df = makeWideDF();
      const result = wideToLong(df, ["A", "B"], "id", "year");

      expect(col(result, "id")).toEqual(["x", "y", "x", "y"]);
    });

    it("extracts numeric suffix into j column", () => {
      const df = makeWideDF();
      const result = wideToLong(df, ["A", "B"], "id", "year");

      expect(col(result, "year")).toEqual([1, 1, 2, 2]);
    });

    it("places correct stub values in each stub column", () => {
      const df = makeWideDF();
      const result = wideToLong(df, ["A", "B"], "id", "year");

      expect(col(result, "A")).toEqual([1, 2, 3, 4]);
      expect(col(result, "B")).toEqual([5, 6, 7, 8]);
    });

    it("works with a single stub", () => {
      const df = DataFrame.fromColumns({
        id: ["a", "b"],
        val1: [10, 20],
        val2: [30, 40],
      });
      const result = wideToLong(df, "val", "id", "num");

      expect(result.shape[0]).toBe(4);
      expect(col(result, "num")).toEqual([1, 1, 2, 2]);
      expect(col(result, "val")).toEqual([10, 20, 30, 40]);
    });

    it("works with a single id column passed as string", () => {
      const df = makeWideDF();
      const result = wideToLong(df, ["A", "B"], "id", "year");
      expect(result.has("id")).toBe(true);
      expect(result.has("year")).toBe(true);
    });

    it("works with multiple id columns", () => {
      const df = DataFrame.fromColumns({
        group: ["g1", "g1", "g2"],
        subgroup: ["s1", "s2", "s1"],
        X0: [1, 2, 3],
        X1: [4, 5, 6],
      });
      const result = wideToLong(df, "X", ["group", "subgroup"], "t");

      expect(result.shape[0]).toBe(6); // 3 rows × 2 suffixes
      expect(result.columns.values).toEqual(["group", "subgroup", "t", "X"]);
      expect(col(result, "group")).toEqual(["g1", "g1", "g2", "g1", "g1", "g2"]);
    });
  });

  // ─── separator option ───────────────────────────────────────────────────────

  describe("sep option", () => {
    it("handles underscore separator", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2],
        A_1: [10, 20],
        A_2: [30, 40],
        B_1: [50, 60],
        B_2: [70, 80],
      });
      const result = wideToLong(df, ["A", "B"], "id", "t", { sep: "_" });

      expect(result.shape[0]).toBe(4);
      expect(col(result, "t")).toEqual([1, 1, 2, 2]);
      expect(col(result, "A")).toEqual([10, 20, 30, 40]);
      expect(col(result, "B")).toEqual([50, 60, 70, 80]);
    });

    it("does not match columns missing the separator", () => {
      // "A1" should NOT match stub="A", sep="_"
      const df = DataFrame.fromColumns({
        id: [1, 2],
        A1: [1, 2],
        A_1: [10, 20],
      });
      const result = wideToLong(df, "A", "id", "t", { sep: "_" });
      expect(result.shape[0]).toBe(2); // only A_1 matched
      expect(col(result, "A")).toEqual([10, 20]);
    });

    it("handles dash separator", () => {
      const df = DataFrame.fromColumns({
        id: ["p", "q"],
        "metric-pre": [1, 2],
        "metric-post": [3, 4],
      });
      const result = wideToLong(df, "metric", "id", "phase", {
        sep: "-",
        suffix: /[a-z]+/,
      });
      expect(result.shape[0]).toBe(4);
      expect(col(result, "phase")).toEqual(["pre", "pre", "post", "post"]);
    });
  });

  // ─── custom suffix ──────────────────────────────────────────────────────────

  describe("suffix option", () => {
    it("handles alphabetic suffix via RegExp", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2],
        Apre: [10, 20],
        Apost: [30, 40],
      });
      const result = wideToLong(df, "A", "id", "phase", { suffix: /[a-z]+/ });

      expect(result.shape[0]).toBe(4);
      expect(col(result, "phase")).toEqual(["pre", "pre", "post", "post"]);
    });

    it("handles alphanumeric suffix via string pattern", () => {
      const df = DataFrame.fromColumns({
        id: ["a"],
        val_q1: [100],
        val_q2: [200],
      });
      const result = wideToLong(df, "val", "id", "quarter", {
        sep: "_",
        suffix: "q\\d+",
      });
      expect(result.shape[0]).toBe(2);
      // Suffix is non-numeric string "q1"/"q2" — kept as string
      expect(col(result, "quarter")).toEqual(["q1", "q2"]);
    });

    it("parses purely numeric suffixes as numbers", () => {
      const df = DataFrame.fromColumns({
        id: ["x"],
        A10: [1],
        A20: [2],
      });
      const result = wideToLong(df, "A", "id", "n");
      expect(col(result, "n")).toEqual([10, 20]);
      expect(typeof col(result, "n")[0]).toBe("number");
    });

    it("preserves non-numeric suffixes as strings", () => {
      const df = DataFrame.fromColumns({
        id: ["x"],
        Afoo: [1],
        Abar: [2],
      });
      const result = wideToLong(df, "A", "id", "label", { suffix: /[a-z]+/ });
      expect(col(result, "label")).toEqual(["foo", "bar"]);
      expect(typeof col(result, "label")[0]).toBe("string");
    });
  });

  // ─── suffix ordering ────────────────────────────────────────────────────────

  describe("suffix ordering", () => {
    it("uses first-seen suffix order from left-to-right columns", () => {
      const df = DataFrame.fromColumns({
        id: ["r"],
        A3: [30],
        A1: [10],
        A2: [20],
      });
      const result = wideToLong(df, "A", "id", "n");
      // Columns scanned left-to-right: A3 first, then A1, A2
      expect(col(result, "n")).toEqual([3, 1, 2]);
    });
  });

  // ─── missing stub columns ───────────────────────────────────────────────────

  describe("missing columns", () => {
    it("fills null when a stub column is absent for some suffixes", () => {
      // Only A1 and B2 exist — mixed stubs
      const df = DataFrame.fromColumns({
        id: ["x", "y"],
        A1: [1, 2],
        B2: [7, 8],
      });
      const result = wideToLong(df, ["A", "B"], "id", "t");

      expect(result.shape[0]).toBe(4); // 2 rows × 2 suffixes (1, 2)
      // A1 → suffix 1; B2 → suffix 2; A2 and B1 are missing → null
      const aVals = col(result, "A");
      const bVals = col(result, "B");
      // For suffix 1: A1=[1,2], B1=missing=null
      expect(aVals[0]).toBe(1);
      expect(aVals[1]).toBe(2);
      expect(bVals[0]).toBeNull();
      expect(bVals[1]).toBeNull();
      // For suffix 2: A2=missing=null, B2=[7,8]
      expect(aVals[2]).toBeNull();
      expect(aVals[3]).toBeNull();
      expect(bVals[2]).toBe(7);
      expect(bVals[3]).toBe(8);
    });
  });

  // ─── output shape ───────────────────────────────────────────────────────────

  describe("output shape", () => {
    it("has correct number of rows: nRows × nSuffixes", () => {
      const df = DataFrame.fromColumns({
        id: ["a", "b", "c"],
        X1: [1, 2, 3],
        X2: [4, 5, 6],
        X3: [7, 8, 9],
      });
      const result = wideToLong(df, "X", "id", "t");
      expect(result.shape[0]).toBe(9); // 3 × 3
      expect(result.shape[1]).toBe(3); // id, t, X
    });

    it("drops unrelated non-stub non-id columns", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2],
        extra: ["a", "b"],
        A1: [10, 20],
        A2: [30, 40],
      });
      const result = wideToLong(df, "A", "id", "t");
      // "extra" is neither id nor stub — dropped
      expect(result.columns.values).toEqual(["id", "t", "A"]);
    });

    it("returns RangeIndex", () => {
      const df = makeWideDF();
      const result = wideToLong(df, ["A", "B"], "id", "year");
      // Default index should be 0,1,2,3
      expect([...result.index.values]).toEqual([0, 1, 2, 3]);
    });
  });

  // ─── error handling ─────────────────────────────────────────────────────────

  describe("error handling", () => {
    it("throws RangeError when an id column does not exist", () => {
      const df = DataFrame.fromColumns({ A1: [1], A2: [2] });
      expect(() => wideToLong(df, "A", "missing_id", "t")).toThrow(RangeError);
    });

    it("throws RangeError when no stub columns match", () => {
      const df = DataFrame.fromColumns({ id: [1], foo: [2] });
      expect(() => wideToLong(df, "Z", "id", "t")).toThrow(RangeError);
    });

    it("throws RangeError when j conflicts with an existing non-stub column", () => {
      const df = DataFrame.fromColumns({ id: [1], extra: [2], A1: [3] });
      expect(() => wideToLong(df, "A", "id", "extra")).toThrow(RangeError);
    });

    it("does not throw when j matches a stub name (stub is overwritten)", () => {
      const df = DataFrame.fromColumns({ id: [1], A1: [10], A2: [20] });
      // j = "A" (same as stub) — allowed
      expect(() => wideToLong(df, "A", "id", "A")).not.toThrow();
    });
  });

  // ─── edge cases ─────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles single-row DataFrame", () => {
      const df = DataFrame.fromColumns({ id: ["x"], A1: [1], A2: [2] });
      const result = wideToLong(df, "A", "id", "t");
      expect(result.shape[0]).toBe(2);
      expect(col(result, "A")).toEqual([1, 2]);
    });

    it("handles DataFrame with one suffix", () => {
      const df = DataFrame.fromColumns({ id: [1, 2], A5: [10, 20] });
      const result = wideToLong(df, "A", "id", "t");
      expect(result.shape[0]).toBe(2);
      expect(col(result, "t")).toEqual([5, 5]);
    });

    it("handles special regex chars in sep safely", () => {
      const df = DataFrame.fromColumns({ id: [1], "A.1": [99] });
      const result = wideToLong(df, "A", "id", "t", { sep: "." });
      expect(result.shape[0]).toBe(1);
      expect(col(result, "A")).toEqual([99]);
    });

    it("handles special regex chars in stub name safely", () => {
      const df = DataFrame.fromColumns({ id: [1], "A+1": [42] });
      const result = wideToLong(df, "A+", "id", "t");
      expect(result.shape[0]).toBe(1);
      expect(col(result, "A+")).toEqual([42]);
    });
  });

  // ─── property-based tests ────────────────────────────────────────────────────

  describe("properties", () => {
    it("output row count = input rows × unique suffixes", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 1, max: 3 }),
          (nRows, nSuffixes, nStubs) => {
            const data: Record<string, readonly Scalar[]> = {
              id: Array.from({ length: nRows }, (_, i) => i),
            };
            const stubs = Array.from({ length: nStubs }, (_, s) => `S${s}`);
            for (const stub of stubs) {
              for (let sfx = 1; sfx <= nSuffixes; sfx++) {
                data[`${stub}${sfx}`] = Array.from({ length: nRows }, (_, r) => r * sfx);
              }
            }
            const df = DataFrame.fromColumns(data);
            const result = wideToLong(df, stubs, "id", "t");
            return result.shape[0] === nRows * nSuffixes;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("id column values repeat exactly nSuffixes times each original row", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 4 }),
          (ids, nSuffixes) => {
            const data: Record<string, readonly Scalar[]> = { id: ids };
            for (let sfx = 1; sfx <= nSuffixes; sfx++) {
              data[`A${sfx}`] = Array.from({ length: ids.length }, () => sfx);
            }
            const df = DataFrame.fromColumns(data);
            const result = wideToLong(df, "A", "id", "t");
            const outIds = col(result, "id");
            // Each original id should appear exactly nSuffixes times
            const counts = new Map<Scalar, number>();
            for (const id of ids) {
              counts.set(id, (counts.get(id) ?? 0) + 1);
            }
            for (const [id, originalCount] of counts) {
              const count = outIds.filter((v) => v === id).length;
              if (count !== originalCount * nSuffixes) {
                return false;
              }
            }
            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it("stub values round-trip through wide_to_long", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 4 }),
          fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 1, maxLength: 4 }),
          (ids, sfx1vals) => {
            if (ids.length !== sfx1vals.length) {
              return true; // skip mismatched
            }
            const data: Record<string, readonly Scalar[]> = {
              id: ids,
              A1: sfx1vals,
            };
            const df = DataFrame.fromColumns(data);
            const result = wideToLong(df, "A", "id", "t");
            const aVals = col(result, "A");
            // Only suffix 1 → values match sfx1vals
            return aVals.every((v, idx) => v === (sfx1vals[idx] ?? null));
          },
        ),
        { numRuns: 50 },
      );
    });

    it("j column contains exactly the detected suffix values, each repeated nRows times", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 1, maxLength: 4 }).map(
            (arr) => [...new Set(arr)], // unique suffixes
          ),
          (nRows, suffixes) => {
            const data: Record<string, readonly Scalar[]> = {
              id: Array.from({ length: nRows }, (_, i) => i),
            };
            for (const sfx of suffixes) {
              data[`A${sfx}`] = Array.from({ length: nRows }, () => sfx);
            }
            const df = DataFrame.fromColumns(data);
            const result = wideToLong(df, "A", "id", "t");
            const jVals = col(result, "t");
            return jVals.length === nRows * suffixes.length;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
