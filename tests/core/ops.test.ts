/**
 * Tests for alignment utilities (ops.ts) and DataFrame arithmetic.
 *
 * Covers:
 * - alignSeries: outer / inner / left / right join
 * - alignedBinaryOp: with and without fillValue
 * - Series.add/sub/mul/div alignment behavior
 * - alignDataFrames: row and column union/intersection
 * - alignedDataFrameBinaryOp: element-wise on aligned DataFrames
 * - DataFrame.add/sub/mul/div with scalar and DataFrame operands
 * - Property-based: alignment is commutative on sum for symmetric inputs
 */
import { describe, expect, it } from "bun:test";
import { assert, array, float, property, tuple } from "fast-check";
import {
  DataFrame,
  Index,
  Series,
  alignDataFrames,
  alignSeries,
  alignedBinaryOp,
  alignedDataFrameBinaryOp,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── alignSeries ──────────────────────────────────────────────────────────────

describe("alignSeries", () => {
  const a = new Series<Scalar>({ data: [1, 2, 3], index: new Index(["a", "b", "c"]) });
  const b = new Series<Scalar>({ data: [10, 30], index: new Index(["a", "c"]) });

  describe("outer join (default)", () => {
    it("produces union index", () => {
      const { left, right, index } = alignSeries(a, b);
      expect(index.size).toBe(3);
      expect([...index.values]).toEqual(["a", "b", "c"]);
      expect([...left.values]).toEqual([1, 2, 3]);
      expect([...right.values]).toEqual([10, null, 30]);
    });
  });

  describe("inner join", () => {
    it("produces intersection index", () => {
      const { left, right, index } = alignSeries(a, b, "inner");
      expect([...index.values]).toEqual(["a", "c"]);
      expect([...left.values]).toEqual([1, 3]);
      expect([...right.values]).toEqual([10, 30]);
    });
  });

  describe("left join", () => {
    it("keeps left index, fills right missing with null", () => {
      const { left, right, index } = alignSeries(a, b, "left");
      expect([...index.values]).toEqual(["a", "b", "c"]);
      expect([...left.values]).toEqual([1, 2, 3]);
      expect([...right.values]).toEqual([10, null, 30]);
    });
  });

  describe("right join", () => {
    it("keeps right index, fills left missing with null", () => {
      const { left, right, index } = alignSeries(a, b, "right");
      expect([...index.values]).toEqual(["a", "c"]);
      expect([...left.values]).toEqual([1, 3]);
      expect([...right.values]).toEqual([10, 30]);
    });
  });

  it("handles identical indexes without duplication", () => {
    const x = new Series<Scalar>({ data: [1, 2], index: new Index(["p", "q"]) });
    const y = new Series<Scalar>({ data: [3, 4], index: new Index(["p", "q"]) });
    const { index } = alignSeries(x, y);
    expect(index.size).toBe(2);
  });

  it("handles disjoint indexes with outer join → all nulls on one side", () => {
    const x = new Series<Scalar>({ data: [1], index: new Index(["x"]) });
    const y = new Series<Scalar>({ data: [2], index: new Index(["y"]) });
    const { left, right } = alignSeries(x, y);
    expect(left.values[1]).toBeNull();
    expect(right.values[0]).toBeNull();
  });
});

// ─── alignedBinaryOp ──────────────────────────────────────────────────────────

describe("alignedBinaryOp", () => {
  const a = new Series<Scalar>({ data: [10, 20, 30], index: new Index(["a", "b", "c"]) });
  const b = new Series<Scalar>({ data: [1, 3], index: new Index(["a", "c"]) });

  it("adds with NaN for missing labels", () => {
    const result = alignedBinaryOp(a, b, (x, y) => x + y);
    expect(result.values[0]).toBe(11);
    expect(Number.isNaN(result.values[1] as number)).toBe(true);
    expect(result.values[2]).toBe(33);
  });

  it("uses fillValue to avoid NaN", () => {
    const result = alignedBinaryOp(a, b, (x, y) => x + y, "outer", 0);
    expect([...result.values]).toEqual([11, 20, 33]);
  });

  it("inner join only aligns common labels", () => {
    const result = alignedBinaryOp(a, b, (x, y) => x * y, "inner");
    expect(result.size).toBe(2);
    expect([...result.values]).toEqual([10, 90]);
  });

  it("subtraction", () => {
    const result = alignedBinaryOp(a, b, (x, y) => x - y, "inner");
    expect([...result.values]).toEqual([9, 27]);
  });
});

// ─── Series arithmetic with alignment ─────────────────────────────────────────

describe("Series aligned arithmetic", () => {
  it("add same-length same-index is unchanged", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3] });
    const b = new Series<Scalar>({ data: [4, 5, 6] });
    expect([...a.add(b).values]).toEqual([5, 7, 9]);
  });

  it("add produces NaN for unmatched labels", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3], index: new Index(["a", "b", "c"]) });
    const b = new Series<Scalar>({ data: [10, 30], index: new Index(["a", "c"]) });
    const result = a.add(b);
    expect(result.values[0]).toBe(11);
    expect(Number.isNaN(result.values[1] as number)).toBe(true);
    expect(result.values[2]).toBe(33);
  });

  it("add with fillValue=0 produces no NaN", () => {
    const a = new Series<Scalar>({ data: [1, 2, 3], index: new Index(["a", "b", "c"]) });
    const b = new Series<Scalar>({ data: [10, 30], index: new Index(["a", "c"]) });
    expect([...a.add(b, 0).values]).toEqual([11, 2, 33]);
  });

  it("sub with different-size Series aligns by index", () => {
    const a = new Series<Scalar>({ data: [10, 20], index: new Index([0, 1]) });
    const b = new Series<Scalar>({ data: [1, 2, 3], index: new Index([0, 1, 2]) });
    const result = a.sub(b);
    expect(result.size).toBe(3);
    expect(result.values[0]).toBe(9);
    expect(result.values[1]).toBe(18);
    expect(Number.isNaN(result.values[2] as number)).toBe(true);
  });

  it("mul scalar doesn't change index", () => {
    const s = new Series<Scalar>({ data: [2, 4, 6], index: new Index(["x", "y", "z"]) });
    const result = s.mul(3);
    expect([...result.values]).toEqual([6, 12, 18]);
    expect([...result.index.values]).toEqual(["x", "y", "z"]);
  });

  it("div Series with misaligned index", () => {
    const a = new Series<Scalar>({ data: [6, 9], index: new Index(["a", "b"]) });
    const b = new Series<Scalar>({ data: [2, 3, 4], index: new Index(["a", "b", "c"]) });
    const result = a.div(b);
    expect(result.values[0]).toBe(3);
    expect(result.values[1]).toBe(3);
    expect(Number.isNaN(result.values[2] as number)).toBe(true);
  });
});

// ─── alignDataFrames ──────────────────────────────────────────────────────────

describe("alignDataFrames", () => {
  const left = DataFrame.fromColumns({
    x: [1, 2],
    y: [3, 4],
  });
  const right = DataFrame.fromColumns({
    y: [10, 20],
    z: [30, 40],
  });

  it("outer join produces union of columns and rows", () => {
    const { left: la, right: ra } = alignDataFrames(left, right);
    expect([...la.columns.values]).toEqual(expect.arrayContaining(["x", "y", "z"]));
    expect([...ra.columns.values]).toEqual(expect.arrayContaining(["x", "y", "z"]));
  });

  it("column missing on left side is filled with null", () => {
    const { left: la } = alignDataFrames(left, right);
    const zCol = la.col("z");
    expect(zCol.values[0]).toBeNull();
    expect(zCol.values[1]).toBeNull();
  });

  it("column missing on right side is filled with null", () => {
    const { right: ra } = alignDataFrames(left, right);
    const xCol = ra.col("x");
    expect(xCol.values[0]).toBeNull();
    expect(xCol.values[1]).toBeNull();
  });

  it("inner join keeps only common columns", () => {
    const { left: la, right: ra } = alignDataFrames(left, right, "inner");
    expect(la.columns.size).toBe(1);
    expect([...la.columns.values]).toEqual(["y"]);
    expect(ra.columns.size).toBe(1);
  });

  it("left join keeps left columns", () => {
    const { left: la } = alignDataFrames(left, right, "left");
    expect([...la.columns.values].sort()).toEqual(["x", "y"]);
  });
});

// ─── alignedDataFrameBinaryOp ─────────────────────────────────────────────────

describe("alignedDataFrameBinaryOp", () => {
  const a = DataFrame.fromColumns({ x: [1, 2], y: [3, 4] });
  const b = DataFrame.fromColumns({ x: [10, 20] });

  it("adds matching columns, null for missing", () => {
    const result = alignedDataFrameBinaryOp(a, b, (p, q) => p + q);
    expect([...result.col("x").values]).toEqual([11, 22]);
    expect(result.col("y").values[0]).toBeNull();
    expect(result.col("y").values[1]).toBeNull();
  });

  it("uses fillValue for missing cells", () => {
    const result = alignedDataFrameBinaryOp(a, b, (p, q) => p + q, "outer", 0);
    expect([...result.col("x").values]).toEqual([11, 22]);
    expect([...result.col("y").values]).toEqual([3, 4]);
  });

  it("inner join only operates on shared columns", () => {
    const result = alignedDataFrameBinaryOp(a, b, (p, q) => p * q, "inner");
    expect(result.columns.size).toBe(1);
    expect([...result.col("x").values]).toEqual([10, 40]);
  });
});

// ─── DataFrame.add / sub / mul / div ─────────────────────────────────────────

describe("DataFrame arithmetic", () => {
  const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });

  describe("scalar operand", () => {
    it("add scalar", () => {
      const result = df.add(10);
      expect([...result.col("a").values]).toEqual([11, 12, 13]);
      expect([...result.col("b").values]).toEqual([14, 15, 16]);
    });

    it("sub scalar", () => {
      expect([...df.sub(1).col("a").values]).toEqual([0, 1, 2]);
    });

    it("mul scalar", () => {
      expect([...df.mul(2).col("b").values]).toEqual([8, 10, 12]);
    });

    it("div scalar", () => {
      const result = df.div(2);
      expect([...result.col("a").values]).toEqual([0.5, 1, 1.5]);
    });

    it("floordiv scalar", () => {
      expect([...df.floordiv(3).col("a").values]).toEqual([0, 0, 1]);
    });

    it("mod scalar", () => {
      expect([...df.mod(3).col("a").values]).toEqual([1, 2, 0]);
    });

    it("pow scalar", () => {
      expect([...df.pow(2).col("a").values]).toEqual([1, 4, 9]);
    });
  });

  describe("DataFrame operand", () => {
    it("add identical-shape DataFrames", () => {
      const other = DataFrame.fromColumns({ a: [10, 20, 30], b: [40, 50, 60] });
      const result = df.add(other);
      expect([...result.col("a").values]).toEqual([11, 22, 33]);
      expect([...result.col("b").values]).toEqual([44, 55, 66]);
    });

    it("add mismatched columns → null for missing", () => {
      const other = DataFrame.fromColumns({ a: [10, 20, 30] });
      const result = df.add(other);
      expect([...result.col("a").values]).toEqual([11, 22, 33]);
      expect(result.col("b").values[0]).toBeNull();
    });

    it("add with fillValue fills missing before op", () => {
      const other = DataFrame.fromColumns({ a: [10, 20, 30] });
      const result = df.add(other, 0);
      expect([...result.col("a").values]).toEqual([11, 22, 33]);
      expect([...result.col("b").values]).toEqual([4, 5, 6]);
    });

    it("sub DataFrames element-wise", () => {
      const other = DataFrame.fromColumns({ a: [1, 1, 1], b: [2, 2, 2] });
      const result = df.sub(other);
      expect([...result.col("a").values]).toEqual([0, 1, 2]);
      expect([...result.col("b").values]).toEqual([2, 3, 4]);
    });

    it("mul DataFrames element-wise", () => {
      const other = DataFrame.fromColumns({ a: [2, 2, 2], b: [3, 3, 3] });
      const result = df.mul(other);
      expect([...result.col("a").values]).toEqual([2, 4, 6]);
      expect([...result.col("b").values]).toEqual([12, 15, 18]);
    });

    it("aligns on row index as well as columns", () => {
      const left = DataFrame.fromColumns({ val: [1, 2, 3] }, { index: new Index(["a", "b", "c"]) });
      const right = DataFrame.fromColumns({ val: [10, 30] }, { index: new Index(["a", "c"]) });
      const result = left.add(right);
      expect(result.col("val").values[0]).toBe(11);
      expect(result.col("val").values[1]).toBeNull();
      expect(result.col("val").values[2]).toBe(33);
    });
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("ops property tests", () => {
  it("alignedBinaryOp add is commutative for shared labels", () => {
    assert(
      property(
        array(float({ noNaN: true, noDefaultInfinity: true }), { minLength: 2, maxLength: 6 }),
        array(float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 4 }),
        (av, bv) => {
          const a = new Series<Scalar>({ data: av });
          const b = new Series<Scalar>({ data: bv });
          const ab = alignedBinaryOp(a, b, (x, y) => x + y);
          const ba = alignedBinaryOp(b, a, (x, y) => x + y);
          if (ab.size !== ba.size) {
            return false;
          }
          return ab.values.every((v, i) => {
            const w = ba.values[i] as number;
            if (Number.isNaN(v as number) && Number.isNaN(w)) {
              return true;
            }
            return v === w;
          });
        },
      ),
    );
  });

  it("Series.add with fillValue=0 equals sum of original values for shared index", () => {
    assert(
      property(
        tuple(
          array(float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 5 }),
        ),
        ([nums]) => {
          const s = new Series<Scalar>({ data: nums });
          const zeros = new Series<Scalar>({ data: Array.from({ length: nums.length }, () => 0) });
          const result = s.add(zeros, 0);
          return result.values.every((v, i) => v === (nums[i] as number));
        },
      ),
    );
  });

  it("DataFrame.add scalar is equivalent to column-wise scalar add", () => {
    assert(
      property(
        array(float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 5 }),
        array(float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 5 }),
        (av, bv) => {
          const len = Math.min(av.length, bv.length);
          const a = av.slice(0, len);
          const b = bv.slice(0, len);
          const df = DataFrame.fromColumns({ a, b } as Record<string, readonly Scalar[]>);
          const added = df.add(1);
          return (
            added.col("a").values.every((v, i) => v === (a[i] as number) + 1) &&
            added.col("b").values.every((v, i) => v === (b[i] as number) + 1)
          );
        },
      ),
    );
  });
});
