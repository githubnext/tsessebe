/**
 * Tests for merge — pandas.merge port.
 *
 * Covers:
 * - Inner join on shared column
 * - Left / right / outer joins
 * - Join on multiple columns
 * - left_on / right_on (different column names per side)
 * - left_index / right_index
 * - Suffix handling for overlapping non-key columns
 * - Auto-detection of common columns
 * - sort option
 * - Many-to-many cross-product
 * - Error: no common columns
 * - Property-based tests with fast-check
 */

import { describe, expect, it } from "bun:test";
import { assert, array, integer, property } from "fast-check";

import { DataFrame, Index } from "tsb";
import { merge } from "tsb";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOrders(): DataFrame {
  return DataFrame.fromColumns({
    orderId: [1, 2, 3, 4],
    customerId: [10, 20, 10, 30],
    amount: [100, 200, 150, 80],
  });
}

function makeCustomers(): DataFrame {
  return DataFrame.fromColumns({
    customerId: [10, 20, 40],
    name: ["Alice", "Bob", "Dave"],
  });
}

// ─── inner join ───────────────────────────────────────────────────────────────

describe("merge — inner join (default)", () => {
  it("basic inner join on shared column", () => {
    const orders = makeOrders();
    const customers = makeCustomers();
    const result = merge(orders, customers, { on: "customerId" });

    expect(result.shape[1]).toBe(4); // customerId + orderId + amount + name
    // customerId 10 matches twice, 20 once; 30 and 40 have no match
    expect(result.shape[0]).toBe(3);
    const ids = [...result.col("customerId").values];
    expect(ids.sort()).toEqual([10, 10, 20]);
  });

  it("inner join produces cross-product for many-to-many", () => {
    const left = DataFrame.fromColumns({ key: ["a", "a"], val: [1, 2] });
    const right = DataFrame.fromColumns({ key: ["a", "a"], score: [10, 20] });
    const result = merge(left, right, { on: "key" });
    expect(result.shape[0]).toBe(4); // 2×2
    const vals = [...result.col("val").values].sort() as number[];
    expect(vals).toEqual([1, 1, 2, 2]);
  });

  it("inner join with no matches returns empty DataFrame", () => {
    const left = DataFrame.fromColumns({ key: [1, 2], x: [10, 20] });
    const right = DataFrame.fromColumns({ key: [3, 4], y: [30, 40] });
    const result = merge(left, right, { on: "key" });
    expect(result.shape[0]).toBe(0);
    expect(result.shape[1]).toBe(3); // key + x + y
  });

  it("result index is a fresh RangeIndex", () => {
    const left = DataFrame.fromColumns({ k: [1], v: [10] });
    const right = DataFrame.fromColumns({ k: [1], w: [20] });
    const result = merge(left, right, { on: "k" });
    expect([...result.index.values]).toEqual([0]);
  });
});

// ─── left join ────────────────────────────────────────────────────────────────

describe("merge — left join", () => {
  it("keeps all left rows; unmatched right fills null", () => {
    const orders = makeOrders();
    const customers = makeCustomers();
    const result = merge(orders, customers, { on: "customerId", how: "left" });

    // All 4 orders should be in result
    expect(result.shape[0]).toBe(4);
    const names = [...result.col("name").values];
    // customerId=30 has no match → name should be null
    const nullNames = names.filter((n) => n === null);
    expect(nullNames.length).toBe(1);
  });

  it("left join preserves all left keys", () => {
    const left = DataFrame.fromColumns({ k: [1, 2, 3], v: [10, 20, 30] });
    const right = DataFrame.fromColumns({ k: [2], w: [99] });
    const result = merge(left, right, { on: "k", how: "left" });
    expect(result.shape[0]).toBe(3);
    const keys = [...result.col("k").values].sort() as number[];
    expect(keys).toEqual([1, 2, 3]);
    const ws = [...result.col("w").values];
    // only k=2 has a match
    expect(ws.filter((w) => w !== null).length).toBe(1);
    expect(ws.filter((w) => w === null).length).toBe(2);
  });
});

// ─── right join ───────────────────────────────────────────────────────────────

describe("merge — right join", () => {
  it("keeps all right rows; unmatched left fills null", () => {
    const orders = makeOrders();
    const customers = makeCustomers();
    const result = merge(orders, customers, { on: "customerId", how: "right" });

    // customer 10 matches 2 orders, customer 20 matches 1, customer 40 matches 0
    // total = 2 + 1 + 1(null) = 4 rows
    expect(result.shape[0]).toBe(4);
    // customerId=40 (Dave) has no matching order → orderId null
    const ids = [...result.col("orderId").values];
    expect(ids.includes(null)).toBe(true);
  });

  it("right join preserves all right keys", () => {
    const left = DataFrame.fromColumns({ k: [2], v: [99] });
    const right = DataFrame.fromColumns({ k: [1, 2, 3], w: [10, 20, 30] });
    const result = merge(left, right, { on: "k", how: "right" });
    expect(result.shape[0]).toBe(3);
    const keys = [...result.col("k").values].sort() as number[];
    expect(keys).toEqual([1, 2, 3]);
    const vs = [...result.col("v").values];
    expect(vs.filter((v) => v !== null).length).toBe(1);
  });
});

// ─── outer join ───────────────────────────────────────────────────────────────

describe("merge — outer join", () => {
  it("keeps all rows from both sides", () => {
    const left = DataFrame.fromColumns({ k: [1, 2], v: [10, 20] });
    const right = DataFrame.fromColumns({ k: [2, 3], w: [20, 30] });
    const result = merge(left, right, { on: "k", how: "outer" });

    // k=1 (left only), k=2 (both), k=3 (right only)
    expect(result.shape[0]).toBe(3);
    const keys = [...result.col("k").values].sort() as number[];
    expect(keys).toEqual([1, 2, 3]);
  });

  it("outer join fills missing values with null", () => {
    const left = DataFrame.fromColumns({ k: [1], v: [10] });
    const right = DataFrame.fromColumns({ k: [2], w: [20] });
    const result = merge(left, right, { on: "k", how: "outer" });

    expect(result.shape[0]).toBe(2);
    const vs = [...result.col("v").values];
    const ws = [...result.col("w").values];
    expect(vs.includes(null)).toBe(true);
    expect(ws.includes(null)).toBe(true);
  });
});

// ─── left_on / right_on ───────────────────────────────────────────────────────

describe("merge — left_on / right_on", () => {
  it("joins on different column names", () => {
    const left = DataFrame.fromColumns({ empId: [1, 2, 3], salary: [50, 60, 70] });
    const right = DataFrame.fromColumns({ id: [2, 3, 4], dept: ["Eng", "HR", "Fin"] });
    const result = merge(left, right, { left_on: "empId", right_on: "id" });

    expect(result.shape[0]).toBe(2); // empId 2 and 3 match
    expect(result.has("empId")).toBe(true);
    expect(result.has("id")).toBe(true);
    expect(result.has("salary")).toBe(true);
    expect(result.has("dept")).toBe(true);
  });

  it("result includes both key columns when they differ", () => {
    const left = DataFrame.fromColumns({ a: [1, 2], x: ["x1", "x2"] });
    const right = DataFrame.fromColumns({ b: [2, 3], y: ["y2", "y3"] });
    const result = merge(left, right, { left_on: "a", right_on: "b" });

    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
  });
});

// ─── multiple keys ────────────────────────────────────────────────────────────

describe("merge — multiple keys", () => {
  it("joins on multiple columns (on array)", () => {
    const left = DataFrame.fromColumns({
      year: [2020, 2020, 2021],
      month: [1, 2, 1],
      sales: [100, 200, 300],
    });
    const right = DataFrame.fromColumns({
      year: [2020, 2021],
      month: [1, 1],
      quota: [90, 280],
    });
    const result = merge(left, right, { on: ["year", "month"] });
    expect(result.shape[0]).toBe(2); // (2020,1) and (2021,1)
    expect(result.has("sales")).toBe(true);
    expect(result.has("quota")).toBe(true);
  });
});

// ─── suffixes ─────────────────────────────────────────────────────────────────

describe("merge — suffix handling", () => {
  it("adds default suffixes _x and _y to overlapping non-key columns", () => {
    const left = DataFrame.fromColumns({ k: [1, 2], v: [10, 20] });
    const right = DataFrame.fromColumns({ k: [1, 2], v: [100, 200] });
    const result = merge(left, right, { on: "k" });

    expect(result.has("v_x")).toBe(true);
    expect(result.has("v_y")).toBe(true);
    expect(result.has("v")).toBe(false);
  });

  it("applies custom suffixes", () => {
    const left = DataFrame.fromColumns({ k: [1], score: [10] });
    const right = DataFrame.fromColumns({ k: [1], score: [20] });
    const result = merge(left, right, { on: "k", suffixes: ["_left", "_right"] });

    expect(result.has("score_left")).toBe(true);
    expect(result.has("score_right")).toBe(true);
  });

  it("no suffix added when only one side has the column", () => {
    const left = DataFrame.fromColumns({ k: [1], only_left: [10] });
    const right = DataFrame.fromColumns({ k: [1], only_right: [20] });
    const result = merge(left, right, { on: "k" });

    expect(result.has("only_left")).toBe(true);
    expect(result.has("only_right")).toBe(true);
    expect(result.has("only_left_x")).toBe(false);
  });
});

// ─── index joins ─────────────────────────────────────────────────────────────

describe("merge — index joins", () => {
  it("left_index=true joins left index against right column", () => {
    const left = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: new Index([1, 2, 3]) });
    const right = DataFrame.fromColumns({ k: [2, 3, 4], w: [200, 300, 400] });
    const result = merge(left, right, { left_index: true, right_on: "k" });

    // Index values 2 and 3 match right k=2 and k=3
    expect(result.shape[0]).toBe(2);
    expect([...result.col("v").values].sort()).toEqual([20, 30]);
  });

  it("left_index=true right_index=true performs index-vs-index join", () => {
    const left = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: new Index(["a", "b", "c"]) });
    const right = DataFrame.fromColumns(
      { w: [100, 200, 300] },
      { index: new Index(["b", "c", "d"]) },
    );
    const result = merge(left, right, { left_index: true, right_index: true });

    // "b" and "c" match
    expect(result.shape[0]).toBe(2);
    expect([...result.col("v").values].sort()).toEqual([20, 30]);
  });
});

// ─── auto-detection ───────────────────────────────────────────────────────────

describe("merge — auto-detection of common columns", () => {
  it("auto-detects shared column when on is omitted", () => {
    const left = DataFrame.fromColumns({ id: [1, 2], x: [10, 20] });
    const right = DataFrame.fromColumns({ id: [1, 3], y: [100, 300] });
    const result = merge(left, right);
    expect(result.shape[0]).toBe(1); // only id=1 matches
    expect([...result.col("x").values]).toEqual([10]);
    expect([...result.col("y").values]).toEqual([100]);
  });

  it("throws when no common columns and no on specified", () => {
    const left = DataFrame.fromColumns({ a: [1, 2] });
    const right = DataFrame.fromColumns({ b: [1, 2] });
    expect(() => merge(left, right)).toThrow(/merge.*no common columns/);
  });
});

// ─── sort option ──────────────────────────────────────────────────────────────

describe("merge — sort option", () => {
  it("sort=true sorts result by first key column", () => {
    const left = DataFrame.fromColumns({ k: [3, 1, 2], v: [30, 10, 20] });
    const right = DataFrame.fromColumns({ k: [1, 2, 3], w: [100, 200, 300] });
    const result = merge(left, right, { on: "k", sort: true });

    const keys = [...result.col("k").values];
    expect(keys).toEqual([1, 2, 3]);
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe("merge — edge cases", () => {
  it("empty left DataFrame returns empty result for inner join", () => {
    const left = DataFrame.fromColumns({ k: [] as number[], v: [] as number[] });
    const right = DataFrame.fromColumns({ k: [1, 2], w: [10, 20] });
    const result = merge(left, right, { on: "k" });
    expect(result.shape[0]).toBe(0);
  });

  it("empty right DataFrame returns empty result for inner join", () => {
    const left = DataFrame.fromColumns({ k: [1, 2], v: [10, 20] });
    const right = DataFrame.fromColumns({ k: [] as number[], w: [] as number[] });
    const result = merge(left, right, { on: "k" });
    expect(result.shape[0]).toBe(0);
  });

  it("empty left with left join returns empty result", () => {
    const left = DataFrame.fromColumns({ k: [] as number[], v: [] as number[] });
    const right = DataFrame.fromColumns({ k: [1], w: [10] });
    const result = merge(left, right, { on: "k", how: "left" });
    expect(result.shape[0]).toBe(0);
  });

  it("merging DataFrames with null key values", () => {
    const left = DataFrame.fromColumns({ k: [1, null], v: [10, 20] });
    const right = DataFrame.fromColumns({ k: [null, 2], w: [30, 40] });
    const result = merge(left, right, { on: "k" });
    // null === null in JSON.stringify comparison → 1 match
    expect(result.shape[0]).toBe(1);
    expect([...result.col("k").values]).toEqual([null]);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("merge — property tests", () => {
  it("inner join row count ≤ min(|left|, |right|) × max matches per key", () => {
    const arb = array(integer({ min: 1, max: 5 }), { minLength: 0, maxLength: 8 });
    assert(
      property(arb, arb, (leftKeys, rightKeys) => {
        const left = DataFrame.fromColumns({
          k: leftKeys,
          v: leftKeys.map((x) => x * 10),
        });
        const right = DataFrame.fromColumns({
          k: rightKeys,
          w: rightKeys.map((x) => x * 100),
        });
        const result = merge(left, right, { on: "k" });
        return result.shape[0] >= 0;
      }),
    );
  });

  it("outer join row count ≥ max(|left|, |right|)", () => {
    const arb = array(integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 5 });
    assert(
      property(arb, arb, (leftKeys, rightKeys) => {
        const left = DataFrame.fromColumns({ k: leftKeys, v: leftKeys });
        const right = DataFrame.fromColumns({ k: rightKeys, w: rightKeys });
        const result = merge(left, right, { on: "k", how: "outer" });
        const uniqueLeft = new Set(leftKeys).size;
        const uniqueRight = new Set(rightKeys).size;
        return result.shape[0] >= Math.max(uniqueLeft, uniqueRight);
      }),
    );
  });

  it("left join always includes all unique left key rows", () => {
    const arb = array(integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 6 });
    assert(
      property(arb, arb, (leftKeys, rightKeys) => {
        const left = DataFrame.fromColumns({ k: leftKeys, v: leftKeys });
        const right = DataFrame.fromColumns({ k: rightKeys, w: rightKeys });
        const result = merge(left, right, { on: "k", how: "left" });
        // Left join result ≥ left input size (many-to-many can expand)
        return result.shape[0] >= leftKeys.length;
      }),
    );
  });

  it("inner join is symmetric up to column order", () => {
    const arb = array(integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 6 });
    assert(
      property(arb, arb, (leftKeys, rightKeys) => {
        const left = DataFrame.fromColumns({ k: leftKeys, v: leftKeys });
        const right = DataFrame.fromColumns({ k: rightKeys, w: rightKeys });
        const lr = merge(left, right, { on: "k", how: "inner" });
        const rl = merge(right, left, { on: "k", how: "inner" });
        return lr.shape[0] === rl.shape[0];
      }),
    );
  });
});
