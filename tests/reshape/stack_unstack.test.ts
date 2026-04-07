/**
 * Tests for src/reshape/stack_unstack.ts — stack() and unstack().
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Index, Series, type Scalar } from "../../src/index.ts";
import { STACK_DEFAULT_SEP, stack, unstack } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

// ─── stack ────────────────────────────────────────────────────────────────────

describe("stack", () => {
  describe("basic usage", () => {
    it("stacks a 2-column DataFrame into a Series", () => {
      const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] }, { index: ["x", "y"] });
      const s = stack(df);
      expect([...s.index.values]).toEqual(["x|A", "x|B", "y|A", "y|B"]);
      expect([...s.values]).toEqual([1, 3, 2, 4]);
    });

    it("uses the default STACK_DEFAULT_SEP constant", () => {
      expect(STACK_DEFAULT_SEP).toBe("|");
    });

    it("produces compound labels in row-major order", () => {
      const df = DataFrame.fromColumns(
        { p: [10, 20, 30], q: [40, 50, 60] },
        { index: ["a", "b", "c"] },
      );
      const s = stack(df);
      expect([...s.index.values]).toEqual(["a|p", "a|q", "b|p", "b|q", "c|p", "c|q"]);
      expect([...s.values]).toEqual([10, 40, 20, 50, 30, 60]);
    });

    it("stacks a single-column DataFrame", () => {
      const df = DataFrame.fromColumns({ X: [7, 8] }, { index: [0, 1] });
      const s = stack(df);
      expect([...s.index.values]).toEqual(["0|X", "1|X"]);
      expect([...s.values]).toEqual([7, 8]);
    });

    it("stacks a single-row DataFrame", () => {
      const df = DataFrame.fromColumns({ A: [42], B: [99] }, { index: ["r0"] });
      const s = stack(df);
      expect([...s.index.values]).toEqual(["r0|A", "r0|B"]);
      expect([...s.values]).toEqual([42, 99]);
    });

    it("returns an empty Series for an empty DataFrame", () => {
      const df = DataFrame.fromColumns({ A: [], B: [] });
      const s = stack(df);
      expect(s.index.size).toBe(0);
      expect(s.values.length).toBe(0);
    });

    it("returns empty Series when all values are null and dropna=true", () => {
      const df = DataFrame.fromColumns({ A: [null, null], B: [null, null] });
      const s = stack(df);
      expect(s.index.size).toBe(0);
    });

    it("dropna=false keeps null values", () => {
      const df = DataFrame.fromColumns({ A: [1, null], B: [null, 4] }, { index: ["r", "s"] });
      const s = stack(df, { dropna: false });
      expect([...s.index.values]).toEqual(["r|A", "r|B", "s|A", "s|B"]);
      expect([...s.values]).toEqual([1, null, null, 4]);
    });

    it("dropna=true (default) omits null values", () => {
      const df = DataFrame.fromColumns({ A: [1, null], B: [null, 4] }, { index: ["r", "s"] });
      const s = stack(df);
      expect([...s.index.values]).toEqual(["r|A", "s|B"]);
      expect([...s.values]).toEqual([1, 4]);
    });

    it("dropna=true omits NaN values", () => {
      const df = DataFrame.fromColumns({ A: [1, Number.NaN], B: [3, 4] }, { index: ["x", "y"] });
      const s = stack(df);
      expect([...s.index.values]).toEqual(["x|A", "x|B", "y|B"]);
      expect([...s.values]).toEqual([1, 3, 4]);
    });

    it("respects a custom separator", () => {
      const df = DataFrame.fromColumns({ col: [1, 2] }, { index: ["r1", "r2"] });
      const s = stack(df, { sep: "__" });
      expect([...s.index.values]).toEqual(["r1__col", "r2__col"]);
    });

    it("uses numeric row-index labels as strings", () => {
      const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] });
      const s = stack(df, { dropna: false });
      expect([...s.index.values]).toEqual(["0|A", "0|B", "1|A", "1|B"]);
    });

    it("uses boolean row-index labels as strings", () => {
      const boolIdx = new Index<import("../../src/types.ts").Label>([true, false] as import("../../src/types.ts").Label[]);
      const df = DataFrame.fromColumns({ A: [10, 20] }, { index: boolIdx });
      const s = stack(df, { dropna: false });
      expect([...s.index.values]).toEqual(["true|A", "false|A"]);
    });

    it("stacks a DataFrame with 3 columns and 3 rows", () => {
      const df = DataFrame.fromColumns(
        { x: [1, 2, 3], y: [4, 5, 6], z: [7, 8, 9] },
        { index: ["a", "b", "c"] },
      );
      const s = stack(df, { dropna: false });
      expect(s.index.size).toBe(9);
      expect([...s.values]).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
    });
  });
});

// ─── unstack ──────────────────────────────────────────────────────────────────

describe("unstack", () => {
  describe("basic usage", () => {
    it("recovers original DataFrame from stack (no nulls)", () => {
      const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] }, { index: ["x", "y"] });
      const recovered = unstack(stack(df, { dropna: false }));
      expect([...recovered.index.values]).toEqual(["x", "y"]);
      expect([...recovered.columns.values]).toEqual(["A", "B"]);
      expect(colValues(recovered, "A")).toEqual([1, 2]);
      expect(colValues(recovered, "B")).toEqual([3, 4]);
    });

    it("returns empty DataFrame for empty Series", () => {
      const df = DataFrame.fromColumns({ A: [], B: [] });
      const s = stack(df, { dropna: false });
      const recovered = unstack(s);
      expect(recovered.index.size).toBe(0);
    });

    it("fills missing cells with null by default", () => {
      const df = DataFrame.fromColumns({ A: [1, null], B: [null, 4] }, { index: ["r", "s"] });
      // stack with dropna=true omits nulls, so unstack gets partial data
      const s = stack(df); // dropna=true by default
      const recovered = unstack(s);
      expect(colValues(recovered, "A")).toEqual([1, null]);
      expect(colValues(recovered, "B")).toEqual([null, 4]);
    });

    it("fills missing cells with a custom fill_value", () => {
      const df = DataFrame.fromColumns({ A: [1, null], B: [null, 4] }, { index: ["r", "s"] });
      const s = stack(df); // drops nulls
      const recovered = unstack(s, { fill_value: 0 });
      expect(colValues(recovered, "A")).toEqual([1, 0]);
      expect(colValues(recovered, "B")).toEqual([0, 4]);
    });

    it("preserves row order", () => {
      const df = DataFrame.fromColumns(
        { A: [1, 2, 3], B: [4, 5, 6] },
        { index: ["z", "m", "a"] },
      );
      const recovered = unstack(stack(df, { dropna: false }));
      expect([...recovered.index.values]).toEqual(["z", "m", "a"]);
    });

    it("preserves column order", () => {
      const df = DataFrame.fromColumns(
        { Z: [1, 2], M: [3, 4], A: [5, 6] },
        { index: ["r1", "r2"] },
      );
      const recovered = unstack(stack(df, { dropna: false }));
      expect([...recovered.columns.values]).toEqual(["Z", "M", "A"]);
    });

    it("uses a custom separator matching stack", () => {
      const df = DataFrame.fromColumns({ col: [7, 8] }, { index: ["r1", "r2"] });
      const s = stack(df, { sep: "__", dropna: false });
      const recovered = unstack(s, { sep: "__" });
      expect(colValues(recovered, "col")).toEqual([7, 8]);
    });

    it("throws when a label lacks the separator", () => {
      const s = new Series<Scalar>({
        data: [1, 2],
        index: new Index<import("../../src/types.ts").Label>(["no_sep_here", "also_none"]),
      });
      expect(() => unstack(s)).toThrow(RangeError);
    });
  });

  // ─── round-trip ─────────────────────────────────────────────────────────────

  describe("round-trip: unstack(stack(df, {dropna:false})) ≈ df", () => {
    it("2×2 DataFrame", () => {
      const df = DataFrame.fromColumns({ A: [1, 2], B: [3, 4] }, { index: ["x", "y"] });
      const recovered = unstack(stack(df, { dropna: false }));
      for (const col of df.columns.values) {
        expect(colValues(recovered, col)).toEqual(colValues(df, col));
      }
    });

    it("3×3 DataFrame with mixed values", () => {
      const df = DataFrame.fromColumns(
        { p: [1, 2, 3], q: [4, 5, 6], r: [7, 8, 9] },
        { index: ["a", "b", "c"] },
      );
      const recovered = unstack(stack(df, { dropna: false }));
      expect([...recovered.columns.values]).toEqual([...df.columns.values]);
      for (const col of df.columns.values) {
        expect(colValues(recovered, col)).toEqual(colValues(df, col));
      }
    });
  });
});

// ─── property tests ──────────────────────────────────────────────────────────

describe("stack / unstack property tests", () => {
  it("stack length == nRows * nCols when dropna=false", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 4 }), {
          minLength: 1,
          maxLength: 4,
        }),
        (rows) => {
          const nCols = rows[0]?.length ?? 0;
          const colNames = Array.from({ length: nCols }, (_, i) => `c${i}`);
          const colData: Record<string, readonly Scalar[]> = {};
          for (let c = 0; c < nCols; c++) {
            colData[`c${c}`] = rows.map((r) => r[c] ?? null);
          }
          const df = DataFrame.fromColumns(colData);
          const s = stack(df, { dropna: false });
          return s.index.size === rows.length * nCols;
        },
      ),
    );
  });

  it("unstack(stack(df, {dropna:false})) recovers df column values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 2, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 2, maxLength: 5 }),
        (colA, colB) => {
          // Ensure same length
          const len = Math.min(colA.length, colB.length);
          const a = colA.slice(0, len);
          const b = colB.slice(0, len);
          const rowIdx = a.map((_, i) => `row${i}`);
          const df = DataFrame.fromColumns({ A: a, B: b }, { index: rowIdx });
          const recovered = unstack(stack(df, { dropna: false }));
          const recA = colValues(recovered, "A");
          const recB = colValues(recovered, "B");
          return recA.every((v, i) => v === a[i]) && recB.every((v, i) => v === b[i]);
        },
      ),
    );
  });

  it("stack output index labels all contain the separator", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 3 }),
        (vals) => {
          const df = DataFrame.fromColumns({ col: vals });
          const s = stack(df, { dropna: false });
          return s.index.values.every((lbl) => String(lbl).includes(STACK_DEFAULT_SEP));
        },
      ),
    );
  });

  it("stack with dropna=true has size <= stack with dropna=false", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.option(fc.integer({ min: 0, max: 99 }), { nil: null }),
          { minLength: 1, maxLength: 4 },
        ),
        fc.array(
          fc.option(fc.integer({ min: 0, max: 99 }), { nil: null }),
          { minLength: 1, maxLength: 4 },
        ),
        (colA, colB) => {
          const len = Math.min(colA.length, colB.length);
          const df = DataFrame.fromColumns({
            A: colA.slice(0, len) as Scalar[],
            B: colB.slice(0, len) as Scalar[],
          });
          const sDropna = stack(df, { dropna: true });
          const sKeep = stack(df, { dropna: false });
          return sDropna.index.size <= sKeep.index.size;
        },
      ),
    );
  });
});
