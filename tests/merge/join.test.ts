/**
 * Tests for join — label-based join of two DataFrames.
 */

import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, crossJoin, join, joinAll } from "../../src/index.ts";

// ─── join (index-based) ───────────────────────────────────────────────────────

describe("join — index-based", () => {
  const left = DataFrame.fromColumns({ A: [1, 2, 3] as const }, { index: ["K0", "K1", "K2"] });
  const right = DataFrame.fromColumns({ B: [4, 5, 6] as const }, { index: ["K0", "K2", "K3"] });

  it("left join (default): keeps all left rows, null for missing right", () => {
    const result = join(left, right);
    expect(result.shape).toEqual([3, 2]);
    expect([...result.index.values]).toEqual(["K0", "K1", "K2"]);
    expect([...result.col("A").values]).toEqual([1, 2, 3]);
    expect([...result.col("B").values]).toEqual([4, null, 5]);
  });

  it("inner join: only rows with keys in both DataFrames", () => {
    const result = join(left, right, { how: "inner" });
    expect(result.shape).toEqual([2, 2]);
    expect([...result.index.values]).toEqual(["K0", "K2"]);
    expect([...result.col("A").values]).toEqual([1, 3]);
    expect([...result.col("B").values]).toEqual([4, 5]);
  });

  it("outer join: keeps all rows from both", () => {
    const result = join(left, right, { how: "outer" });
    expect(result.shape[0]).toBe(4); // K0, K1, K2, K3
    const index = [...result.index.values];
    expect(index).toContain("K0");
    expect(index).toContain("K1");
    expect(index).toContain("K2");
    expect(index).toContain("K3");
  });

  it("right join: keeps all right rows, null for missing left", () => {
    const result = join(left, right, { how: "right" });
    expect(result.shape[0]).toBe(3); // K0, K2, K3
    const index = [...result.index.values];
    expect(index).toContain("K0");
    expect(index).toContain("K2");
    expect(index).toContain("K3");
  });

  it("no column overlap: no suffix needed", () => {
    const l = DataFrame.fromColumns({ A: [1, 2] }, { index: ["a", "b"] });
    const r = DataFrame.fromColumns({ B: [3, 4] }, { index: ["a", "b"] });
    expect(() => join(l, r)).not.toThrow();
    const result = join(l, r);
    expect([...result.columns.values]).toEqual(["A", "B"]);
  });

  it("overlapping columns require suffix", () => {
    const l = DataFrame.fromColumns({ X: [1, 2] }, { index: ["a", "b"] });
    const r = DataFrame.fromColumns({ X: [3, 4] }, { index: ["a", "b"] });
    expect(() => join(l, r)).toThrow(/suffix/i);
    const result = join(l, r, { rsuffix: "_right" });
    expect([...result.columns.values]).toEqual(["X", "X_right"]);
  });

  it("with lsuffix and rsuffix for overlapping columns", () => {
    const l = DataFrame.fromColumns({ X: [1, 2] }, { index: ["a", "b"] });
    const r = DataFrame.fromColumns({ X: [3, 4] }, { index: ["a", "b"] });
    const result = join(l, r, { lsuffix: "_l", rsuffix: "_r" });
    expect([...result.columns.values]).toEqual(["X_l", "X_r"]);
    expect([...result.col("X_l").values]).toEqual([1, 2]);
    expect([...result.col("X_r").values]).toEqual([3, 4]);
  });

  it("empty DataFrames: returns empty result", () => {
    const l = DataFrame.fromColumns({ A: [] }, { index: [] });
    const r = DataFrame.fromColumns({ B: [] }, { index: [] });
    const result = join(l, r);
    expect(result.shape).toEqual([0, 2]);
  });
});

// ─── join with 'on' column ────────────────────────────────────────────────────

describe("join — on column", () => {
  it("join on a key column from left against right index", () => {
    const left = DataFrame.fromColumns({ key: ["a", "b", "c"], val: [1, 2, 3] });
    const right = DataFrame.fromColumns({ extra: [10, 20] }, { index: ["a", "b"] });
    const result = join(left, right, { on: "key" });
    expect(result.shape[0]).toBeGreaterThan(0);
    // 'val' column should be present
    expect([...result.columns.values]).toContain("val");
    expect([...result.columns.values]).toContain("extra");
  });

  it("left join preserves non-matching rows with null", () => {
    const left = DataFrame.fromColumns({ key: ["a", "b", "c"], val: [1, 2, 3] });
    const right = DataFrame.fromColumns({ extra: [10, 20] }, { index: ["a", "b"] });
    const result = join(left, right, { on: "key", how: "left" });
    expect(result.shape[0]).toBe(3);
    const extras = [...result.col("extra").values];
    expect(extras[2]).toBeNull();
  });
});

// ─── joinAll ──────────────────────────────────────────────────────────────────

describe("joinAll", () => {
  it("chains multiple joins left-to-right", () => {
    const base = DataFrame.fromColumns({ A: [1, 2, 3] }, { index: ["K0", "K1", "K2"] });
    const d1 = DataFrame.fromColumns({ B: [10, 20, 30] }, { index: ["K0", "K1", "K2"] });
    const d2 = DataFrame.fromColumns({ C: [100, 200, 300] }, { index: ["K0", "K1", "K2"] });
    const result = joinAll(base, [d1, d2]);
    expect(result.shape).toEqual([3, 3]);
    expect([...result.columns.values]).toEqual(["A", "B", "C"]);
  });

  it("empty others list returns original DataFrame", () => {
    const base = DataFrame.fromColumns({ A: [1, 2] });
    const result = joinAll(base, []);
    expect(result.shape).toEqual(base.shape);
  });

  it("inner join chains respect how option", () => {
    const base = DataFrame.fromColumns({ A: [1, 2, 3] }, { index: ["K0", "K1", "K2"] });
    const d1 = DataFrame.fromColumns({ B: [10, 30] }, { index: ["K0", "K2"] });
    const result = joinAll(base, [d1], { how: "inner" });
    expect(result.shape[0]).toBe(2);
  });
});

// ─── crossJoin ────────────────────────────────────────────────────────────────

describe("crossJoin", () => {
  it("produces Cartesian product (no overlap)", () => {
    const colors = DataFrame.fromColumns({ color: ["red", "blue"] });
    const sizes = DataFrame.fromColumns({ size: ["S", "M", "L"] });
    const result = crossJoin(colors, sizes);
    expect(result.shape).toEqual([6, 2]);
    expect([...result.columns.values]).toEqual(["color", "size"]);
    const colorVals = [...result.col("color").values];
    expect(colorVals).toEqual(["red", "red", "red", "blue", "blue", "blue"]);
    const sizeVals = [...result.col("size").values];
    expect(sizeVals).toEqual(["S", "M", "L", "S", "M", "L"]);
  });

  it("throws when columns overlap and no suffix", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] });
    const b = DataFrame.fromColumns({ x: [3, 4] });
    expect(() => crossJoin(a, b)).toThrow(/suffix/i);
  });

  it("applies rsuffix to conflicting right columns", () => {
    const a = DataFrame.fromColumns({ x: [1, 2] });
    const b = DataFrame.fromColumns({ x: [3, 4] });
    const result = crossJoin(a, b, { rsuffix: "_r" });
    expect([...result.columns.values]).toEqual(["x", "x_r"]);
    expect(result.shape).toEqual([4, 2]);
  });

  it("single-row left × multi-row right", () => {
    const a = DataFrame.fromColumns({ A: [42] });
    const b = DataFrame.fromColumns({ B: [1, 2, 3] });
    const result = crossJoin(a, b);
    expect(result.shape).toEqual([3, 2]);
    expect([...result.col("A").values]).toEqual([42, 42, 42]);
    expect([...result.col("B").values]).toEqual([1, 2, 3]);
  });

  it("empty left produces empty result", () => {
    const a = DataFrame.fromColumns({ A: [] });
    const b = DataFrame.fromColumns({ B: [1, 2, 3] });
    const result = crossJoin(a, b);
    expect(result.shape).toEqual([0, 2]);
  });

  it("empty right produces empty result", () => {
    const a = DataFrame.fromColumns({ A: [1, 2] });
    const b = DataFrame.fromColumns({ B: [] });
    const result = crossJoin(a, b);
    expect(result.shape).toEqual([0, 2]);
  });

  it("property: result size = nLeft * nRight", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (nLeft, nRight) => {
          const a = DataFrame.fromColumns({ A: Array.from({ length: nLeft }, (_, i) => i) });
          const b = DataFrame.fromColumns({ B: Array.from({ length: nRight }, (_, i) => i * 10) });
          const result = crossJoin(a, b);
          return result.shape[0] === nLeft * nRight;
        },
      ),
    );
  });
});
