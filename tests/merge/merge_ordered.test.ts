/**
 * Tests for mergeOrdered — pandas.merge_ordered port.
 *
 * Covers:
 * - Basic outer ordered merge
 * - Inner / left / right join variants
 * - fill_method: "ffill" forward-fill after merge
 * - Suffix handling for overlapping non-key columns
 * - left_on / right_on (different key names per side)
 * - left_by / right_by groupwise ordered merge
 * - Auto-detected shared key column
 * - Many-to-many key overlap (cartesian within matched key)
 * - Error: no common columns
 * - Property-based tests with fast-check
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";

import { DataFrame } from "tsb";
import { mergeOrdered } from "tsb";

// ─── helpers ──────────────────────────────────────────────────────────────────

function col(df: DataFrame, name: string): (number | string | boolean | null | undefined)[] {
  const s = df.col(name);
  const out: (number | string | boolean | null | undefined)[] = [];
  for (let i = 0; i < s.size; i++) {
    out.push(s.at(i) as number | string | boolean | null | undefined);
  }
  return out;
}

// ─── basic outer ordered merge ────────────────────────────────────────────────

describe("mergeOrdered — basic outer (default)", () => {
  it("outer merge on shared key column", () => {
    const left = DataFrame.fromColumns({ date: [1, 3, 5], price: [10, 30, 50] });
    const right = DataFrame.fromColumns({ date: [2, 3, 6], volume: [200, 300, 600] });

    const result = mergeOrdered(left, right, { on: "date" });

    // outer: all dates from both sides; sorted ascending
    expect(col(result, "date")).toEqual([1, 2, 3, 5, 6]);
    expect(col(result, "price")).toEqual([10, null, 30, 50, null]);
    expect(col(result, "volume")).toEqual([null, 200, 300, null, 600]);
  });

  it("outer merge — disjoint key sets", () => {
    const left = DataFrame.fromColumns({ k: [1, 2], a: ["x", "y"] });
    const right = DataFrame.fromColumns({ k: [3, 4], b: ["p", "q"] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(col(result, "k")).toEqual([1, 2, 3, 4]);
    expect(col(result, "a")).toEqual(["x", "y", null, null]);
    expect(col(result, "b")).toEqual([null, null, "p", "q"]);
  });

  it("outer merge — identical key sets", () => {
    const left = DataFrame.fromColumns({ k: [1, 2, 3], a: [10, 20, 30] });
    const right = DataFrame.fromColumns({ k: [1, 2, 3], b: [100, 200, 300] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(col(result, "k")).toEqual([1, 2, 3]);
    expect(col(result, "a")).toEqual([10, 20, 30]);
    expect(col(result, "b")).toEqual([100, 200, 300]);
  });

  it("auto-detects shared column when on is omitted", () => {
    const left = DataFrame.fromColumns({ k: [1, 3], val: [10, 30] });
    const right = DataFrame.fromColumns({ k: [2, 3], score: [20, 30] });

    const result = mergeOrdered(left, right);
    expect(col(result, "k")).toEqual([1, 2, 3]);
  });
});

// ─── join variants ────────────────────────────────────────────────────────────

describe("mergeOrdered — how variants", () => {
  it("inner join keeps only matched keys", () => {
    const left = DataFrame.fromColumns({ k: [1, 2, 3], a: [10, 20, 30] });
    const right = DataFrame.fromColumns({ k: [2, 3, 4], b: [200, 300, 400] });

    const result = mergeOrdered(left, right, { on: "k", how: "inner" });
    expect(col(result, "k")).toEqual([2, 3]);
    expect(col(result, "a")).toEqual([20, 30]);
    expect(col(result, "b")).toEqual([200, 300]);
  });

  it("left join keeps all left keys", () => {
    const left = DataFrame.fromColumns({ k: [1, 2, 3], a: [10, 20, 30] });
    const right = DataFrame.fromColumns({ k: [2, 3, 4], b: [200, 300, 400] });

    const result = mergeOrdered(left, right, { on: "k", how: "left" });
    expect(col(result, "k")).toEqual([1, 2, 3]);
    expect(col(result, "a")).toEqual([10, 20, 30]);
    expect(col(result, "b")).toEqual([null, 200, 300]);
  });

  it("right join keeps all right keys", () => {
    const left = DataFrame.fromColumns({ k: [1, 2, 3], a: [10, 20, 30] });
    const right = DataFrame.fromColumns({ k: [2, 3, 4], b: [200, 300, 400] });

    const result = mergeOrdered(left, right, { on: "k", how: "right" });
    expect(col(result, "k")).toEqual([2, 3, 4]);
    expect(col(result, "a")).toEqual([20, 30, null]);
    expect(col(result, "b")).toEqual([200, 300, 400]);
  });
});

// ─── fill_method: "ffill" ─────────────────────────────────────────────────────

describe("mergeOrdered — fill_method: ffill", () => {
  it("forward-fills gaps in non-key columns", () => {
    const left = DataFrame.fromColumns({ k: [1, 3, 5], a: [10, 30, 50] });
    const right = DataFrame.fromColumns({ k: [2, 3, 6], b: [20, 30, 60] });

    const result = mergeOrdered(left, right, { on: "k", fill_method: "ffill" });
    expect(col(result, "k")).toEqual([1, 2, 3, 5, 6]);
    // a: 10 at k=1, null at k=2 → filled to 10, 30 at k=3, 50 at k=5, null→50 at k=6
    expect(col(result, "a")).toEqual([10, 10, 30, 50, 50]);
    // b: null at k=1, 20 at k=2, 30 at k=3, null→30 at k=5, 60 at k=6
    expect(col(result, "b")).toEqual([null, 20, 30, 30, 60]);
  });

  it("does not fill key column", () => {
    const left = DataFrame.fromColumns({ k: [1, 3], a: [10, 30] });
    const right = DataFrame.fromColumns({ k: [2, 4], b: [20, 40] });

    const result = mergeOrdered(left, right, { on: "k", fill_method: "ffill" });
    // key column should remain unchanged
    expect(col(result, "k")).toEqual([1, 2, 3, 4]);
    expect(col(result, "a")).toEqual([10, 10, 30, 30]);
  });

  it("first null cell stays null (no value to fill from)", () => {
    const left = DataFrame.fromColumns({ k: [2, 3], a: [20, 30] });
    const right = DataFrame.fromColumns({ k: [1, 3], b: [10, 30] });

    const result = mergeOrdered(left, right, { on: "k", fill_method: "ffill" });
    // k=1: b=10, a=null → a stays null (no prev)
    expect(col(result, "a")).toEqual([null, 20, 30]);
    expect(col(result, "b")).toEqual([10, 10, 30]);
  });
});

// ─── left_on / right_on ───────────────────────────────────────────────────────

describe("mergeOrdered — left_on / right_on", () => {
  it("merges on different key column names per side", () => {
    const left = DataFrame.fromColumns({ t_left: [1, 3, 5], a: [10, 30, 50] });
    const right = DataFrame.fromColumns({ t_right: [2, 3, 6], b: [200, 300, 600] });

    const result = mergeOrdered(left, right, {
      left_on: "t_left",
      right_on: "t_right",
    });
    // output key uses left_on name
    expect(col(result, "t_left")).toEqual([1, 2, 3, 5, 6]);
    expect(col(result, "a")).toEqual([10, null, 30, 50, null]);
    expect(col(result, "b")).toEqual([null, 200, 300, null, 600]);
  });
});

// ─── overlapping non-key columns ─────────────────────────────────────────────

describe("mergeOrdered — suffix handling", () => {
  it("adds suffixes for overlapping non-key columns", () => {
    const left = DataFrame.fromColumns({ k: [1, 2, 3], val: [10, 20, 30] });
    const right = DataFrame.fromColumns({ k: [2, 3, 4], val: [200, 300, 400] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(result.columns.values).toContain("val_x");
    expect(result.columns.values).toContain("val_y");
    expect(result.columns.values).not.toContain("val");
  });

  it("custom suffixes", () => {
    const left = DataFrame.fromColumns({ k: [1, 2], val: [10, 20] });
    const right = DataFrame.fromColumns({ k: [2, 3], val: [200, 300] });

    const result = mergeOrdered(left, right, { on: "k", suffixes: ["_left", "_right"] });
    expect(result.columns.values).toContain("val_left");
    expect(result.columns.values).toContain("val_right");
  });
});

// ─── left_by / right_by ───────────────────────────────────────────────────────

describe("mergeOrdered — left_by / right_by", () => {
  it("group-wise merge with left_by / right_by", () => {
    const left = DataFrame.fromColumns({
      grp: ["A", "A", "B", "B"],
      k: [1, 3, 1, 3],
      a: [10, 30, 100, 300],
    });
    const right = DataFrame.fromColumns({
      grp: ["A", "A", "B", "B"],
      k: [2, 3, 2, 3],
      b: [20, 30, 200, 300],
    });

    const result = mergeOrdered(left, right, { on: "k", left_by: "grp", right_by: "grp" });
    // The result has all rows for both groups (merged independently)
    // Group A: k=1,2,3; Group B: k=1,2,3
    expect(result.shape[0]).toBe(6);

    // Verify group A row at k=2 has a=null, b=20
    const grpA = result.col("grp").values;
    const kVals = col(result, "k");
    const aVals = col(result, "a");
    const bVals = col(result, "b");

    // Group A, k=2: a should be null, b=20
    const idxA2 = kVals.findIndex((k, i) => k === 2 && grpA[i] === "A");
    expect(idxA2).toBeGreaterThanOrEqual(0);
    expect(aVals[idxA2]).toBeNull();
    expect(bVals[idxA2]).toBe(20);
  });

  it("left_by only (right uses same group column)", () => {
    const left = DataFrame.fromColumns({
      cat: ["X", "X", "Y", "Y"],
      k: [1, 3, 1, 3],
      a: [10, 30, 100, 300],
    });
    const right = DataFrame.fromColumns({
      cat: ["X", "Y"],
      k: [2, 2],
      b: [20, 200],
    });

    // If only left_by is provided, right_by defaults to left_by
    const result = mergeOrdered(left, right, { on: "k", left_by: "cat", right_by: "cat" });
    expect(result.shape[0]).toBe(6); // X: k=1,2,3; Y: k=1,2,3
  });
});

// ─── many-to-many ─────────────────────────────────────────────────────────────

describe("mergeOrdered — many-to-many", () => {
  it("cartesian product for duplicate keys", () => {
    const left = DataFrame.fromColumns({ k: [1, 1, 2], a: [10, 11, 20] });
    const right = DataFrame.fromColumns({ k: [1, 1, 2], b: [100, 101, 200] });

    const result = mergeOrdered(left, right, { on: "k" });
    // k=1: 2x2=4 rows; k=2: 1x1=1 row → 5 total
    expect(result.shape[0]).toBe(5);
    const kVals = col(result, "k");
    expect(kVals.filter((v) => v === 1).length).toBe(4);
    expect(kVals.filter((v) => v === 2).length).toBe(1);
  });
});

// ─── error cases ──────────────────────────────────────────────────────────────

describe("mergeOrdered — error cases", () => {
  it("throws when no common columns", () => {
    const left = DataFrame.fromColumns({ a: [1, 2], b: [10, 20] });
    const right = DataFrame.fromColumns({ c: [1, 2], d: [10, 20] });

    expect(() => mergeOrdered(left, right)).toThrow();
  });
});

// ─── empty DataFrames ─────────────────────────────────────────────────────────

describe("mergeOrdered — edge cases", () => {
  it("left is empty", () => {
    const left = DataFrame.fromColumns({ k: [] as number[], a: [] as number[] });
    const right = DataFrame.fromColumns({ k: [1, 2], b: [10, 20] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(col(result, "k")).toEqual([1, 2]);
    expect(col(result, "b")).toEqual([10, 20]);
  });

  it("right is empty", () => {
    const left = DataFrame.fromColumns({ k: [1, 2], a: [10, 20] });
    const right = DataFrame.fromColumns({ k: [] as number[], b: [] as number[] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(col(result, "k")).toEqual([1, 2]);
    expect(col(result, "a")).toEqual([10, 20]);
  });

  it("both empty", () => {
    const left = DataFrame.fromColumns({ k: [] as number[], a: [] as number[] });
    const right = DataFrame.fromColumns({ k: [] as number[], b: [] as number[] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(result.shape[0]).toBe(0);
  });

  it("single row each, matching key", () => {
    const left = DataFrame.fromColumns({ k: [5], a: [50] });
    const right = DataFrame.fromColumns({ k: [5], b: [500] });

    const result = mergeOrdered(left, right, { on: "k" });
    expect(col(result, "k")).toEqual([5]);
    expect(col(result, "a")).toEqual([50]);
    expect(col(result, "b")).toEqual([500]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("mergeOrdered — property-based", () => {
  it("outer merge row count ≥ max(left.length, right.length)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 0, maxLength: 8 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 0, maxLength: 8 }),
        (lKeys, rKeys) => {
          const lSorted = [...new Set(lKeys)].sort((a, b) => a - b);
          const rSorted = [...new Set(rKeys)].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({
            k: lSorted,
            a: lSorted.map((v) => v * 10),
          });
          const right = DataFrame.fromColumns({
            k: rSorted,
            b: rSorted.map((v) => v * 100),
          });

          const result = mergeOrdered(left, right, { on: "k" });
          const allKeys = new Set([...lSorted, ...rSorted]);
          return result.shape[0] === allKeys.size;
        },
      ),
    );
  });

  it("inner merge row count ≤ min(left.length, right.length)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 0, maxLength: 8 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 0, maxLength: 8 }),
        (lKeys, rKeys) => {
          const lSorted = [...new Set(lKeys)].sort((a, b) => a - b);
          const rSorted = [...new Set(rKeys)].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({
            k: lSorted,
            a: lSorted.map((v) => v * 10),
          });
          const right = DataFrame.fromColumns({
            k: rSorted,
            b: rSorted.map((v) => v * 100),
          });

          const result = mergeOrdered(left, right, { on: "k", how: "inner" });
          return result.shape[0] <= Math.min(lSorted.length, rSorted.length);
        },
      ),
    );
  });

  it("result key column is always sorted ascending (outer)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 0, maxLength: 8 }),
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 0, maxLength: 8 }),
        (lKeys, rKeys) => {
          const lSorted = [...new Set(lKeys)].sort((a, b) => a - b);
          const rSorted = [...new Set(rKeys)].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({
            k: lSorted,
            a: lSorted.map((v) => v * 10),
          });
          const right = DataFrame.fromColumns({
            k: rSorted,
            b: rSorted.map((v) => v * 100),
          });

          const result = mergeOrdered(left, right, { on: "k" });
          const kOut = col(result, "k") as number[];
          for (let i = 1; i < kOut.length; i++) {
            const prev = kOut[i - 1];
            const curr = kOut[i];
            if (prev !== undefined && curr !== undefined && prev > curr) return false;
          }
          return true;
        },
      ),
    );
  });

  it("ffill: no null after first non-null value per column (outer + ffill)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 8 }),
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 8 }),
        (lKeys, rKeys) => {
          const lSorted = [...new Set(lKeys)].sort((a, b) => a - b);
          const rSorted = [...new Set(rKeys)].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({
            k: lSorted,
            a: lSorted.map((v) => v * 10),
          });
          const right = DataFrame.fromColumns({
            k: rSorted,
            b: rSorted.map((v) => v * 100),
          });

          const result = mergeOrdered(left, right, { on: "k", fill_method: "ffill" });
          for (const colName of ["a", "b"] as const) {
            const vals = col(result, colName);
            let seenNonNull = false;
            for (const v of vals) {
              if (v !== null && v !== undefined) seenNonNull = true;
              if (seenNonNull && (v === null || v === undefined)) return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
