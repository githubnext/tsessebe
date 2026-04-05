/**
 * Tests for merge — database-style joins between DataFrames.
 */

import { describe, test, expect } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, merge } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function dfFromRec(rows: Record<string, number | string | null>[]) {
  return DataFrame.fromRecords(rows);
}

// ─── basic inner join ─────────────────────────────────────────────────────────

describe("merge — inner join", () => {
  test("simple inner join on single key column", () => {
    const left = dfFromRec([
      { id: 1, val: "a" },
      { id: 2, val: "b" },
      { id: 3, val: "c" },
    ]);
    const right = dfFromRec([
      { id: 2, score: 10 },
      { id: 3, score: 20 },
      { id: 4, score: 30 },
    ]);

    const result = merge(left, right, { on: "id" });
    expect(result.shape[0]).toBe(2);
    expect(result.columns.values).toEqual(["id", "val", "score"]);
    const recs = result.toRecords();
    expect(recs).toEqual([
      { id: 2, val: "b", score: 10 },
      { id: 3, val: "c", score: 20 },
    ]);
  });

  test("inner join with no matches returns empty DataFrame", () => {
    const left = dfFromRec([{ id: 1 }, { id: 2 }]);
    const right = dfFromRec([{ id: 3 }, { id: 4 }]);
    const result = merge(left, right, { on: "id" });
    expect(result.shape[0]).toBe(0);
  });

  test("inner join on multiple key columns", () => {
    const left = dfFromRec([
      { a: 1, b: "x", v: 10 },
      { a: 1, b: "y", v: 20 },
      { a: 2, b: "x", v: 30 },
    ]);
    const right = dfFromRec([
      { a: 1, b: "x", w: 100 },
      { a: 2, b: "y", w: 200 },
    ]);
    const result = merge(left, right, { on: ["a", "b"] });
    expect(result.shape[0]).toBe(1);
    const recs = result.toRecords();
    expect(recs[0]).toEqual({ a: 1, b: "x", v: 10, w: 100 });
  });

  test("many-to-many join expands rows", () => {
    const left = dfFromRec([
      { id: 1, lv: "a" },
      { id: 1, lv: "b" },
    ]);
    const right = dfFromRec([
      { id: 1, rv: "x" },
      { id: 1, rv: "y" },
    ]);
    const result = merge(left, right, { on: "id" });
    expect(result.shape[0]).toBe(4);
  });
});

// ─── left join ────────────────────────────────────────────────────────────────

describe("merge — left join", () => {
  test("left join preserves all left rows", () => {
    const left = dfFromRec([
      { id: 1, val: "a" },
      { id: 2, val: "b" },
      { id: 3, val: "c" },
    ]);
    const right = dfFromRec([
      { id: 2, score: 10 },
      { id: 3, score: 20 },
    ]);
    const result = merge(left, right, { on: "id", how: "left" });
    expect(result.shape[0]).toBe(3);
    const recs = result.toRecords();
    expect(recs[0]).toEqual({ id: 1, val: "a", score: null });
    expect(recs[1]).toEqual({ id: 2, val: "b", score: 10 });
    expect(recs[2]).toEqual({ id: 3, val: "c", score: 20 });
  });
});

// ─── right join ───────────────────────────────────────────────────────────────

describe("merge — right join", () => {
  test("right join preserves all right rows", () => {
    const left = dfFromRec([
      { id: 2, val: "b" },
      { id: 3, val: "c" },
    ]);
    const right = dfFromRec([
      { id: 1, score: 5 },
      { id: 2, score: 10 },
      { id: 3, score: 20 },
    ]);
    const result = merge(left, right, { on: "id", how: "right" });
    expect(result.shape[0]).toBe(3);
    const recs = result.toRecords();
    // The matched rows come first (in left scan order), then unmatched right rows
    const sorted = [...recs].sort((a, b) => (a["id"] as number) - (b["id"] as number));
    expect(sorted[0]).toEqual({ id: 1, score: 5, val: null });
    expect(sorted[1]).toEqual({ id: 2, score: 10, val: "b" });
    expect(sorted[2]).toEqual({ id: 3, score: 20, val: "c" });
  });
});

// ─── outer join ───────────────────────────────────────────────────────────────

describe("merge — outer join", () => {
  test("outer join includes all rows from both sides", () => {
    const left = dfFromRec([
      { id: 1, val: "a" },
      { id: 2, val: "b" },
    ]);
    const right = dfFromRec([
      { id: 2, score: 10 },
      { id: 3, score: 20 },
    ]);
    const result = merge(left, right, { on: "id", how: "outer" });
    expect(result.shape[0]).toBe(3);
    const recs = result.toRecords();
    const sorted = [...recs].sort((a, b) => (a["id"] as number) - (b["id"] as number));
    expect(sorted[0]).toEqual({ id: 1, val: "a", score: null });
    expect(sorted[1]).toEqual({ id: 2, val: "b", score: 10 });
    expect(sorted[2]).toEqual({ id: 3, val: null, score: 20 });
  });
});

// ─── left_on / right_on ──────────────────────────────────────────────────────

describe("merge — left_on / right_on", () => {
  test("joins on different column names per side", () => {
    const left = dfFromRec([
      { user_id: 1, name: "Alice" },
      { user_id: 2, name: "Bob" },
    ]);
    const right = dfFromRec([
      { uid: 1, dept: "Eng" },
      { uid: 3, dept: "HR" },
    ]);
    const result = merge(left, right, {
      left_on: "user_id",
      right_on: "uid",
      how: "inner",
    });
    expect(result.shape[0]).toBe(1);
    const recs = result.toRecords();
    expect(recs[0]?.["name"]).toBe("Alice");
    expect(recs[0]?.["dept"]).toBe("Eng");
  });
});

// ─── suffixes ────────────────────────────────────────────────────────────────

describe("merge — suffixes", () => {
  test("overlapping non-key columns get default suffixes", () => {
    const left = dfFromRec([{ id: 1, val: 10 }]);
    const right = dfFromRec([{ id: 1, val: 20 }]);
    const result = merge(left, right, { on: "id" });
    expect(result.columns.values).toContain("val_x");
    expect(result.columns.values).toContain("val_y");
    expect(result.toRecords()[0]).toEqual({ id: 1, val_x: 10, val_y: 20 });
  });

  test("custom suffixes are applied", () => {
    const left = dfFromRec([{ id: 1, score: 10 }]);
    const right = dfFromRec([{ id: 1, score: 20 }]);
    const result = merge(left, right, { on: "id", suffixes: ["_left", "_right"] });
    expect(result.columns.values).toContain("score_left");
    expect(result.columns.values).toContain("score_right");
  });
});

// ─── left_index / right_index ────────────────────────────────────────────────

describe("merge — index-based join", () => {
  test("left_index=true, right_index=true joins on indexes", () => {
    const left = DataFrame.fromColumns(
      { val: ["a", "b", "c"] },
      { index: [1, 2, 3] },
    );
    const right = DataFrame.fromColumns(
      { score: [10, 20] },
      { index: [2, 3] },
    );
    const result = merge(left, right, { left_index: true, right_index: true });
    expect(result.shape[0]).toBe(2);
    const recs = result.toRecords();
    expect(recs[0]?.["val"]).toBe("b");
    expect(recs[0]?.["score"]).toBe(10);
    expect(recs[1]?.["val"]).toBe("c");
    expect(recs[1]?.["score"]).toBe(20);
  });
});

// ─── auto-detect common columns ──────────────────────────────────────────────

describe("merge — auto-detect keys", () => {
  test("infers join columns from common column names", () => {
    const left = dfFromRec([{ id: 1, x: 10 }, { id: 2, x: 20 }]);
    const right = dfFromRec([{ id: 1, y: 100 }, { id: 3, y: 300 }]);
    const result = merge(left, right);
    expect(result.shape[0]).toBe(1);
    expect(result.toRecords()[0]).toEqual({ id: 1, x: 10, y: 100 });
  });

  test("throws when no common columns found", () => {
    const left = dfFromRec([{ a: 1 }]);
    const right = dfFromRec([{ b: 2 }]);
    expect(() => merge(left, right)).toThrow(/no common columns/);
  });
});

// ─── DataFrame.fromColumns index option ──────────────────────────────────────
// (this verifies the DataFrame.fromColumns index parameter accepted by our tests)
describe("DataFrame.fromColumns with index", () => {
  test("accepts index option", () => {
    const df = DataFrame.fromColumns({ val: [1, 2, 3] }, { index: [10, 20, 30] });
    expect(df.index.values).toEqual([10, 20, 30]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("merge — property-based", () => {
  test("inner join row count is between 0 and left.nRows * right.nRows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 6 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 6 }),
        (leftKeys, rightKeys) => {
          const left = DataFrame.fromColumns({ id: leftKeys, v: leftKeys.map((k) => k * 10) });
          const right = DataFrame.fromColumns({ id: rightKeys, w: rightKeys.map((k) => k * 100) });
          const result = merge(left, right, { on: "id" });
          const nRows = result.shape[0];
          expect(nRows).toBeGreaterThanOrEqual(0);
          expect(nRows).toBeLessThanOrEqual(leftKeys.length * rightKeys.length);
        },
      ),
    );
  });

  test("left join row count >= left row count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 6 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 6 }),
        (leftKeys, rightKeys) => {
          const left = DataFrame.fromColumns({ id: leftKeys });
          const right = DataFrame.fromColumns({ id: rightKeys, w: rightKeys });
          const result = merge(left, right, { on: "id", how: "left" });
          // Left join: at minimum one row per left row (may expand for multi-matches)
          expect(result.shape[0]).toBeGreaterThanOrEqual(leftKeys.length);
        },
      ),
    );
  });

  test("outer join row count >= both input row counts", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 4 }),
        fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 4 }),
        (leftKeys, rightKeys) => {
          const left = DataFrame.fromColumns({ id: leftKeys, v: leftKeys });
          const right = DataFrame.fromColumns({ id: rightKeys, w: rightKeys });
          const result = merge(left, right, { on: "id", how: "outer" });
          // Outer join must include all left and right rows (may be more due to fan-out)
          expect(result.shape[0]).toBeGreaterThanOrEqual(
            Math.max(leftKeys.length, rightKeys.length),
          );
        },
      ),
    );
  });
});
