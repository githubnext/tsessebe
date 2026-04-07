import { describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { DataFrame } from "../../src/core/frame.ts";
import { Index } from "../../src/core/base-index.ts";
import { Series } from "../../src/core/series.ts";
import { alignSeries, alignDataFrame } from "../../src/core/align.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function ns(data: number[], labels: string[], name?: string): Series<number> {
  return new Series<number>({
    data,
    index: new Index<string>(labels),
    name: name ?? null,
  });
}

function makeDF(
  cols: Record<string, number[]>,
  rowLabels: string[],
): DataFrame {
  return DataFrame.fromColumns(
    Object.fromEntries(
      Object.entries(cols).map(([k, v]) => [k, v]),
    ) as Record<string, number[]>,
    { index: new Index<string>(rowLabels) },
  );
}

// ─── alignSeries — outer (default) ───────────────────────────────────────────

describe("alignSeries — outer (default)", () => {
  it("disjoint labels → null-filled gaps", () => {
    const a = ns([1, 2], ["a", "b"]);
    const b = ns([10, 20], ["c", "d"]);
    const [la, ra] = alignSeries(a, b);
    expect(la.index.toArray()).toEqual(["a", "b", "c", "d"]);
    expect(ra.index.toArray()).toEqual(["a", "b", "c", "d"]);
    expect(la.toArray()).toEqual([1, 2, null, null]);
    expect(ra.toArray()).toEqual([null, null, 10, 20]);
  });

  it("overlapping labels → correct values", () => {
    const a = ns([1, 2, 3], ["a", "b", "c"]);
    const b = ns([10, 20], ["b", "c"]);
    const [la, ra] = alignSeries(a, b);
    expect(la.index.toArray()).toEqual(["a", "b", "c"]);
    expect(la.toArray()).toEqual([1, 2, 3]);
    expect(ra.toArray()).toEqual([null, 10, 20]);
  });

  it("identical indices → no change", () => {
    const a = ns([1, 2, 3], ["x", "y", "z"]);
    const b = ns([4, 5, 6], ["x", "y", "z"]);
    const [la, ra] = alignSeries(a, b);
    expect(la.toArray()).toEqual([1, 2, 3]);
    expect(ra.toArray()).toEqual([4, 5, 6]);
    expect(la.index.toArray()).toEqual(["x", "y", "z"]);
  });

  it("uses fillValue option", () => {
    const a = ns([1], ["a"]);
    const b = ns([99], ["b"]);
    const [la, ra] = alignSeries(a, b, { fillValue: 0 });
    expect(la.toArray()).toEqual([1, 0]);
    expect(ra.toArray()).toEqual([0, 99]);
  });

  it("preserves series names", () => {
    const a = new Series<number>({ data: [1], index: new Index(["a"]), name: "left" });
    const b = new Series<number>({ data: [2], index: new Index(["b"]), name: "right" });
    const [la, ra] = alignSeries(a, b);
    expect(la.name).toBe("left");
    expect(ra.name).toBe("right");
  });
});

// ─── alignSeries — inner ─────────────────────────────────────────────────────

describe("alignSeries — inner", () => {
  it("keeps only shared labels", () => {
    const a = ns([1, 2, 3], ["a", "b", "c"]);
    const b = ns([10, 20], ["b", "c"]);
    const [la, ra] = alignSeries(a, b, { join: "inner" });
    expect(la.index.toArray()).toEqual(["b", "c"]);
    expect(la.toArray()).toEqual([2, 3]);
    expect(ra.toArray()).toEqual([10, 20]);
  });

  it("empty intersection → empty series", () => {
    const a = ns([1, 2], ["a", "b"]);
    const b = ns([10, 20], ["c", "d"]);
    const [la, ra] = alignSeries(a, b, { join: "inner" });
    expect(la.size).toBe(0);
    expect(ra.size).toBe(0);
  });
});

// ─── alignSeries — left ───────────────────────────────────────────────────────

describe("alignSeries — left", () => {
  it("result index equals left index", () => {
    const a = ns([1, 2, 3], ["a", "b", "c"]);
    const b = ns([10, 30], ["b", "d"]);
    const [la, ra] = alignSeries(a, b, { join: "left" });
    expect(la.index.toArray()).toEqual(["a", "b", "c"]);
    expect(la.toArray()).toEqual([1, 2, 3]);
    expect(ra.toArray()).toEqual([null, 10, null]);
  });
});

// ─── alignSeries — right ──────────────────────────────────────────────────────

describe("alignSeries — right", () => {
  it("result index equals right index", () => {
    const a = ns([1, 2, 3], ["a", "b", "c"]);
    const b = ns([10, 30], ["b", "d"]);
    const [la, ra] = alignSeries(a, b, { join: "right" });
    expect(la.index.toArray()).toEqual(["b", "d"]);
    expect(la.toArray()).toEqual([2, null]);
    expect(ra.toArray()).toEqual([10, 30]);
  });
});

// ─── alignDataFrame — outer (default) — both axes ────────────────────────────

describe("alignDataFrame — outer, both axes", () => {
  it("expands rows and columns", () => {
    const a = makeDF({ x: [1, 2], y: [3, 4] }, ["r0", "r1"]);
    const b = makeDF({ y: [10], z: [20] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b);

    expect(la.columns.toArray().sort()).toEqual(["x", "y", "z"]);
    expect(ra.columns.toArray().sort()).toEqual(["x", "y", "z"]);
    expect(la.index.toArray()).toEqual(["r0", "r1"]);
    expect(ra.index.toArray()).toEqual(["r0", "r1"]);

    // "z" is new for left — should be null
    expect(la.col("z").toArray()).toEqual([null, null]);
    // "x" is new for right — should be null
    expect(ra.col("x").toArray()).toEqual([null, null]);
    // shared cell
    expect(la.col("y").toArray()).toEqual([3, 4]);
    expect(ra.col("y").toArray()).toEqual([null, 10]);
  });

  it("identical DataFrames — no change", () => {
    const a = makeDF({ a: [1, 2], b: [3, 4] }, ["r0", "r1"]);
    const b = makeDF({ a: [5, 6], b: [7, 8] }, ["r0", "r1"]);
    const [la, ra] = alignDataFrame(a, b);
    expect(la.shape).toEqual([2, 2]);
    expect(ra.shape).toEqual([2, 2]);
    expect(la.col("a").toArray()).toEqual([1, 2]);
    expect(ra.col("b").toArray()).toEqual([7, 8]);
  });

  it("uses fillValue", () => {
    const a = makeDF({ x: [1] }, ["r0"]);
    const b = makeDF({ y: [2] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b, { fillValue: -1 });
    expect(la.col("y").toArray()).toEqual([-1, -1]);
    expect(ra.col("x").toArray()).toEqual([-1, -1]);
  });
});

// ─── alignDataFrame — inner ───────────────────────────────────────────────────

describe("alignDataFrame — inner, both axes", () => {
  it("keeps only shared rows and columns", () => {
    const a = makeDF({ x: [1, 2], y: [3, 4] }, ["r0", "r1"]);
    const b = makeDF({ y: [10, 20], z: [30, 40] }, ["r1", "r2"]);
    const [la, ra] = alignDataFrame(a, b, { join: "inner" });
    expect(la.columns.toArray()).toEqual(["y"]);
    expect(ra.columns.toArray()).toEqual(["y"]);
    expect(la.index.toArray()).toEqual(["r1"]);
    expect(ra.index.toArray()).toEqual(["r1"]);
    expect(la.col("y").toArray()).toEqual([4]);
    expect(ra.col("y").toArray()).toEqual([10]);
  });
});

// ─── alignDataFrame — left / right ───────────────────────────────────────────

describe("alignDataFrame — left", () => {
  it("uses left rows and left columns", () => {
    const a = makeDF({ x: [1, 2] }, ["r0", "r1"]);
    const b = makeDF({ y: [10] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b, { join: "left" });
    expect(la.index.toArray()).toEqual(["r0", "r1"]);
    expect(ra.index.toArray()).toEqual(["r0", "r1"]);
    expect(la.columns.toArray()).toEqual(["x"]);
    expect(ra.columns.toArray()).toEqual(["x"]);
    expect(ra.col("x").toArray()).toEqual([null, null]);
  });
});

describe("alignDataFrame — right", () => {
  it("uses right rows and right columns", () => {
    const a = makeDF({ x: [1, 2] }, ["r0", "r1"]);
    const b = makeDF({ y: [10] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b, { join: "right" });
    expect(la.index.toArray()).toEqual(["r1"]);
    expect(ra.index.toArray()).toEqual(["r1"]);
    expect(la.columns.toArray()).toEqual(["y"]);
    expect(la.col("y").toArray()).toEqual([null]);
    expect(ra.col("y").toArray()).toEqual([10]);
  });
});

// ─── alignDataFrame — axis=0 (rows only) ─────────────────────────────────────

describe("alignDataFrame — axis=0 (rows only)", () => {
  it("aligns rows but NOT columns", () => {
    const a = makeDF({ x: [1, 2], y: [3, 4] }, ["r0", "r1"]);
    const b = makeDF({ y: [10], z: [20] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b, { axis: 0 });

    // Left columns unchanged
    expect(la.columns.toArray()).toEqual(["x", "y"]);
    // Right columns unchanged
    expect(ra.columns.toArray()).toEqual(["y", "z"]);
    // Both share the row index (outer by default)
    expect(la.index.toArray()).toEqual(["r0", "r1"]);
    expect(ra.index.toArray()).toEqual(["r0", "r1"]);
    expect(ra.col("y").toArray()).toEqual([null, 10]);
  });

  it("axis='index' is synonymous with axis=0", () => {
    const a = makeDF({ x: [1] }, ["r0"]);
    const b = makeDF({ x: [2] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b, { axis: "index" });
    expect(la.index.toArray()).toEqual(["r0", "r1"]);
    expect(ra.index.toArray()).toEqual(["r0", "r1"]);
    // columns untouched
    expect(la.columns.toArray()).toEqual(["x"]);
    expect(ra.columns.toArray()).toEqual(["x"]);
  });
});

// ─── alignDataFrame — axis=1 (columns only) ──────────────────────────────────

describe("alignDataFrame — axis=1 (columns only)", () => {
  it("aligns columns but NOT rows", () => {
    const a = makeDF({ x: [1, 2], y: [3, 4] }, ["r0", "r1"]);
    const b = makeDF({ y: [10], z: [20] }, ["r1"]);
    const [la, ra] = alignDataFrame(a, b, { axis: 1 });

    // Rows unchanged
    expect(la.index.toArray()).toEqual(["r0", "r1"]);
    expect(ra.index.toArray()).toEqual(["r1"]);
    // Columns aligned (outer union: x, y, z)
    expect(la.columns.toArray().sort()).toEqual(["x", "y", "z"]);
    expect(ra.columns.toArray().sort()).toEqual(["x", "y", "z"]);
    expect(la.col("z").toArray()).toEqual([null, null]);
    expect(ra.col("x").toArray()).toEqual([null]);
  });

  it("axis='columns' is synonymous with axis=1", () => {
    const a = makeDF({ a: [1] }, ["r0"]);
    const b = makeDF({ b: [2] }, ["r0"]);
    const [la, ra] = alignDataFrame(a, b, { axis: "columns" });
    // rows unchanged
    expect(la.index.toArray()).toEqual(["r0"]);
    expect(ra.index.toArray()).toEqual(["r0"]);
    // columns aligned
    expect(la.columns.toArray().sort()).toEqual(["a", "b"]);
    expect(ra.columns.toArray().sort()).toEqual(["a", "b"]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("alignSeries — property tests", () => {
  it("outer: both outputs share the same index", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 0, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 0, maxLength: 5 }),
        fc.array(fc.double({ noNaN: true }), { minLength: 0, maxLength: 5 }),
        fc.array(fc.double({ noNaN: true }), { minLength: 0, maxLength: 5 }),
        (labelsA, labelsB, dataA, dataB) => {
          // Ensure unique string labels
          const la = [...new Set(labelsA.map(String))];
          const lb = [...new Set(labelsB.map(String))];
          const da = dataA.slice(0, la.length);
          const db = dataB.slice(0, lb.length);
          // Pad with zeros if needed
          while (da.length < la.length) da.push(0);
          while (db.length < lb.length) db.push(0);

          const a = new Series<number>({ data: da, index: new Index(la) });
          const b = new Series<number>({ data: db, index: new Index(lb) });
          const [alignedA, alignedB] = alignSeries(a, b);
          return (
            alignedA.size === alignedB.size &&
            alignedA.index.toArray().join(",") === alignedB.index.toArray().join(",")
          );
        },
      ),
    );
  });

  it("inner: result size ≤ min(left.size, right.size)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 6 }),
        fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 6 }),
        (rawA, rawB) => {
          const la = [...new Set(rawA.map(String))];
          const lb = [...new Set(rawB.map(String))];
          const da = la.map(() => 1);
          const db = lb.map(() => 2);
          const a = new Series<number>({ data: da, index: new Index(la) });
          const b = new Series<number>({ data: db, index: new Index(lb) });
          const [ia, ib] = alignSeries(a, b, { join: "inner" });
          return (
            ia.size <= Math.min(a.size, b.size) &&
            ib.size === ia.size
          );
        },
      ),
    );
  });

  it("left: left series values are preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.double({ noNaN: true }), { minLength: 0, maxLength: 5 }),
        (rawA, rawB, dataA) => {
          const la = [...new Set(rawA.map(String))];
          const lb = [...new Set(rawB.map(String))];
          const da = dataA.slice(0, la.length);
          while (da.length < la.length) da.push(0);
          const db = lb.map(() => 0);
          const a = new Series<number>({ data: da, index: new Index(la) });
          const b = new Series<number>({ data: db, index: new Index(lb) });
          const [aligned] = alignSeries(a, b, { join: "left" });
          return (
            aligned.index.toArray().join(",") === la.join(",") &&
            aligned.toArray().every((v, i) => v === da[i])
          );
        },
      ),
    );
  });

  it("right: right series values are preserved", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.integer({ min: 0, max: 8 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.double({ noNaN: true }), { minLength: 0, maxLength: 5 }),
        (rawA, rawB, dataB) => {
          const la = [...new Set(rawA.map(String))];
          const lb = [...new Set(rawB.map(String))];
          const db = dataB.slice(0, lb.length);
          while (db.length < lb.length) db.push(0);
          const da = la.map(() => 0);
          const a = new Series<number>({ data: da, index: new Index(la) });
          const b = new Series<number>({ data: db, index: new Index(lb) });
          const [, aligned] = alignSeries(a, b, { join: "right" });
          return (
            aligned.index.toArray().join(",") === lb.join(",") &&
            aligned.toArray().every((v, i) => v === db[i])
          );
        },
      ),
    );
  });
});
