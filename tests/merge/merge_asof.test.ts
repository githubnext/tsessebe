/**
 * Tests for merge_asof — ordered nearest-key left-join.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, mergeAsof } from "../../src/index.ts";

// ─── basic backward (default) ─────────────────────────────────────────────────

describe("mergeAsof — backward direction (default)", () => {
  it("matches each left row to the most-recent right row", () => {
    const trades = DataFrame.fromColumns({
      time: [1, 5, 10],
      price: [100, 200, 300],
    });
    const quotes = DataFrame.fromColumns({
      time: [2, 6],
      bid: [98, 195],
    });

    const result = mergeAsof(trades, quotes, { on: "time" });

    expect(result.shape[0]).toBe(3);
    expect([...result.col("price").values]).toEqual([100, 200, 300]);
    // t=1: no quote ≤ 1 → null
    expect(result.col("bid").at(0)).toBeNull();
    // t=5: most recent quote ≤ 5 is at time=2 → bid=98
    expect(result.col("bid").at(1)).toBe(98);
    // t=10: most recent quote ≤ 10 is at time=6 → bid=195
    expect(result.col("bid").at(2)).toBe(195);
  });

  it("includes exact matches when allow_exact_matches=true (default)", () => {
    const left = DataFrame.fromColumns({ t: [1, 2, 3], v: [10, 20, 30] });
    const right = DataFrame.fromColumns({ t: [2, 4], w: [200, 400] });

    const result = mergeAsof(left, right, { on: "t" });

    // t=2 exactly matches right t=2
    expect(result.col("w").at(1)).toBe(200);
  });

  it("excludes exact matches when allow_exact_matches=false", () => {
    const left = DataFrame.fromColumns({ t: [1, 2, 3], v: [10, 20, 30] });
    const right = DataFrame.fromColumns({ t: [2, 4], w: [200, 400] });

    const result = mergeAsof(left, right, {
      on: "t",
      allow_exact_matches: false,
    });

    // t=2: no right key strictly < 2 → null
    expect(result.col("w").at(1)).toBeNull();
    // t=3: largest right key < 3 is t=2 → w=200
    expect(result.col("w").at(2)).toBe(200);
  });

  it("all left rows get null when right is empty", () => {
    const left = DataFrame.fromColumns({ t: [1, 2, 3], v: [1, 2, 3] });
    const right = DataFrame.fromColumns({ t: [] as number[], w: [] as number[] });

    const result = mergeAsof(left, right, { on: "t" });

    for (let i = 0; i < 3; i++) {
      expect(result.col("w").at(i)).toBeNull();
    }
  });

  it("all left rows get null when all right keys > max left key", () => {
    const left = DataFrame.fromColumns({ t: [1, 2, 3], v: [1, 2, 3] });
    const right = DataFrame.fromColumns({ t: [10, 20], w: [100, 200] });

    const result = mergeAsof(left, right, { on: "t" });

    for (let i = 0; i < 3; i++) {
      expect(result.col("w").at(i)).toBeNull();
    }
  });

  it("returns same rows as left (left-join semantics)", () => {
    const left = DataFrame.fromColumns({ t: [1, 3, 5, 7, 9], v: [10, 30, 50, 70, 90] });
    const right = DataFrame.fromColumns({ t: [2, 4, 6], w: [2, 4, 6] });

    const result = mergeAsof(left, right, { on: "t" });

    expect(result.shape[0]).toBe(5);
  });
});

// ─── forward direction ────────────────────────────────────────────────────────

describe("mergeAsof — forward direction", () => {
  it("matches each left row to the next right row", () => {
    const left = DataFrame.fromColumns({ t: [1, 3, 7], v: [10, 30, 70] });
    const right = DataFrame.fromColumns({ t: [2, 6, 10], w: [20, 60, 100] });

    const result = mergeAsof(left, right, { on: "t", direction: "forward" });

    // t=1: smallest right ≥ 1 is t=2 → w=20
    expect(result.col("w").at(0)).toBe(20);
    // t=3: smallest right ≥ 3 is t=6 → w=60
    expect(result.col("w").at(1)).toBe(60);
    // t=7: smallest right ≥ 7 is t=10 → w=100
    expect(result.col("w").at(2)).toBe(100);
  });

  it("produces null when no right key >= left key", () => {
    const left = DataFrame.fromColumns({ t: [10, 20], v: [1, 2] });
    const right = DataFrame.fromColumns({ t: [5, 8], w: [50, 80] });

    const result = mergeAsof(left, right, { on: "t", direction: "forward" });

    expect(result.col("w").at(0)).toBeNull();
    expect(result.col("w").at(1)).toBeNull();
  });
});

// ─── nearest direction ────────────────────────────────────────────────────────

describe("mergeAsof — nearest direction", () => {
  it("matches each left row to the closest right row", () => {
    const left = DataFrame.fromColumns({ t: [1, 5, 9], v: [10, 50, 90] });
    const right = DataFrame.fromColumns({ t: [2, 6, 10], w: [20, 60, 100] });

    const result = mergeAsof(left, right, { on: "t", direction: "nearest" });

    // t=1: nearest is t=2 (dist 1)
    expect(result.col("w").at(0)).toBe(20);
    // t=5: nearest is t=6 (dist 1) vs t=2 (dist 3)
    expect(result.col("w").at(1)).toBe(60);
    // t=9: nearest is t=10 (dist 1) vs t=6 (dist 3)
    expect(result.col("w").at(2)).toBe(100);
  });

  it("tie-breaks toward backward on exact midpoint", () => {
    const left = DataFrame.fromColumns({ t: [5], v: [1] });
    // midpoint between 3 and 7 is 5
    const right = DataFrame.fromColumns({ t: [3, 7], w: [30, 70] });

    const result = mergeAsof(left, right, { on: "t", direction: "nearest" });

    // Both at equal distance; backward wins (last element <= 5 is t=3)
    expect(result.col("w").at(0)).toBe(30);
  });
});

// ─── by-group matching ────────────────────────────────────────────────────────

describe("mergeAsof — by parameter (group matching)", () => {
  it("groups by ticker before asof match", () => {
    const trades = DataFrame.fromColumns({
      time: [1, 2, 3, 4],
      ticker: ["AAPL", "MSFT", "AAPL", "MSFT"],
      price: [100, 200, 110, 210],
    });
    const quotes = DataFrame.fromColumns({
      time: [1, 1, 3, 3],
      ticker: ["AAPL", "MSFT", "AAPL", "MSFT"],
      bid: [99, 198, 109, 208],
    });

    const result = mergeAsof(trades, quotes, { on: "time", by: "ticker" });

    expect(result.shape[0]).toBe(4);
    // trade AAPL t=1: matches quote AAPL t=1 → bid=99
    expect(result.col("bid").at(0)).toBe(99);
    // trade MSFT t=2: matches quote MSFT t=1 → bid=198
    expect(result.col("bid").at(1)).toBe(198);
    // trade AAPL t=3: matches quote AAPL t=3 → bid=109
    expect(result.col("bid").at(2)).toBe(109);
    // trade MSFT t=4: matches quote MSFT t=3 → bid=208
    expect(result.col("bid").at(3)).toBe(208);
  });

  it("returns null when no matching by-group row exists in right", () => {
    const left = DataFrame.fromColumns({
      time: [1, 2],
      grp: ["A", "B"],
      v: [10, 20],
    });
    const right = DataFrame.fromColumns({
      time: [1],
      grp: ["A"],
      w: [100],
    });

    const result = mergeAsof(left, right, { on: "time", by: "grp" });

    expect(result.col("w").at(0)).toBe(100); // group A matches
    expect(result.col("w").at(1)).toBeNull(); // group B has no entry in right
  });

  it("supports left_by/right_by with different column names", () => {
    const left = DataFrame.fromColumns({
      time: [1, 2],
      symbol: ["X", "Y"],
      v: [10, 20],
    });
    const right = DataFrame.fromColumns({
      time: [1, 1],
      ticker: ["X", "Y"],
      w: [100, 200],
    });

    const result = mergeAsof(left, right, {
      on: "time",
      left_by: "symbol",
      right_by: "ticker",
    });

    expect(result.col("w").at(0)).toBe(100);
    expect(result.col("w").at(1)).toBe(200);
  });
});

// ─── tolerance ────────────────────────────────────────────────────────────────

describe("mergeAsof — tolerance", () => {
  it("nulls out matches that exceed the tolerance", () => {
    const left = DataFrame.fromColumns({ t: [1, 5, 10], v: [1, 5, 10] });
    const right = DataFrame.fromColumns({ t: [1, 3, 8], w: [10, 30, 80] });

    const result = mergeAsof(left, right, { on: "t", tolerance: 2 });

    // t=1: exact match (dist=0) → w=10 ✓
    expect(result.col("w").at(0)).toBe(10);
    // t=5: closest backward is t=3 (dist=2) → w=30 ✓ (distance == tolerance)
    expect(result.col("w").at(1)).toBe(30);
    // t=10: closest backward is t=8 (dist=2) → w=80 ✓
    expect(result.col("w").at(2)).toBe(80);
  });

  it("nulls out match when distance exceeds tolerance", () => {
    const left = DataFrame.fromColumns({ t: [10], v: [1] });
    const right = DataFrame.fromColumns({ t: [5], w: [50] });

    const result = mergeAsof(left, right, { on: "t", tolerance: 3 });

    // dist = 5 > 3 → null
    expect(result.col("w").at(0)).toBeNull();
  });
});

// ─── left_on / right_on ───────────────────────────────────────────────────────

describe("mergeAsof — left_on/right_on", () => {
  it("supports different key column names", () => {
    const left = DataFrame.fromColumns({ ltime: [1, 5, 10], v: [1, 5, 10] });
    const right = DataFrame.fromColumns({ rtime: [2, 6], w: [20, 60] });

    const result = mergeAsof(left, right, {
      left_on: "ltime",
      right_on: "rtime",
    });

    expect(result.col("w").at(0)).toBeNull(); // ltime=1 < rtime=2 → no backward match
    expect(result.col("w").at(1)).toBe(20); // ltime=5 → rtime=2
    expect(result.col("w").at(2)).toBe(60); // ltime=10 → rtime=6
  });
});

// ─── suffixes ─────────────────────────────────────────────────────────────────

describe("mergeAsof — column name conflicts and suffixes", () => {
  it("applies default suffixes _x and _y for overlapping columns", () => {
    const left = DataFrame.fromColumns({ t: [1, 2], val: [10, 20] });
    const right = DataFrame.fromColumns({ t: [1, 2], val: [100, 200] });

    const result = mergeAsof(left, right, { on: "t" });

    const cols = [...result.columns.values];
    expect(cols).toContain("val_x");
    expect(cols).toContain("val_y");
    expect(cols).not.toContain("val");
  });

  it("applies custom suffixes", () => {
    const left = DataFrame.fromColumns({ t: [1], val: [1] });
    const right = DataFrame.fromColumns({ t: [1], val: [2] });

    const result = mergeAsof(left, right, {
      on: "t",
      suffixes: ["_left", "_right"],
    });

    expect([...result.columns.values]).toContain("val_left");
    expect([...result.columns.values]).toContain("val_right");
  });
});

// ─── left_index / right_index ─────────────────────────────────────────────────

describe("mergeAsof — left_index/right_index", () => {
  it("uses left index as key", () => {
    const left = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: [1, 5, 10] });
    const right = DataFrame.fromColumns({ t: [2, 6], w: [200, 600] });

    const result = mergeAsof(left, right, { left_index: true, right_on: "t" });

    expect(result.col("w").at(0)).toBeNull(); // index=1 < t=2 → null
    expect(result.col("w").at(1)).toBe(200); // index=5 → t=2
    expect(result.col("w").at(2)).toBe(600); // index=10 → t=6
  });
});

// ─── output structure ─────────────────────────────────────────────────────────

describe("mergeAsof — output structure", () => {
  it("output has exactly nLeft rows", () => {
    const left = DataFrame.fromColumns({ t: [1, 2, 3, 4, 5], v: [1, 2, 3, 4, 5] });
    const right = DataFrame.fromColumns({ t: [2, 4], w: [20, 40] });

    const result = mergeAsof(left, right, { on: "t" });

    expect(result.shape[0]).toBe(5);
  });

  it("key column appears once in output (on= mode)", () => {
    const left = DataFrame.fromColumns({ t: [1, 2], v: [1, 2] });
    const right = DataFrame.fromColumns({ t: [1, 2], w: [10, 20] });

    const result = mergeAsof(left, right, { on: "t" });
    const cols = [...result.columns.values];
    const tCount = cols.filter((c) => c === "t").length;
    expect(tCount).toBe(1);
  });

  it("preserves all left columns", () => {
    const left = DataFrame.fromColumns({ t: [1, 2], a: [10, 20], b: [100, 200] });
    const right = DataFrame.fromColumns({ t: [1], c: [999] });

    const result = mergeAsof(left, right, { on: "t" });

    expect([...result.columns.values]).toContain("a");
    expect([...result.columns.values]).toContain("b");
    expect([...result.columns.values]).toContain("c");
  });
});

// ─── error handling ───────────────────────────────────────────────────────────

describe("mergeAsof — error handling", () => {
  it("throws when no key can be inferred and none is specified", () => {
    const left = DataFrame.fromColumns({ a: [1, 2] });
    const right = DataFrame.fromColumns({ b: [1, 2] });

    expect(() => mergeAsof(left, right)).toThrow(/no common columns/i);
  });

  it("throws when left key column does not exist", () => {
    const left = DataFrame.fromColumns({ a: [1, 2] });
    const right = DataFrame.fromColumns({ t: [1, 2] });

    expect(() => mergeAsof(left, right, { left_on: "t", right_on: "t" })).toThrow(/left key column/i);
  });

  it("throws when by column does not exist in right", () => {
    const left = DataFrame.fromColumns({ t: [1], grp: ["A"] });
    const right = DataFrame.fromColumns({ t: [1], other: ["A"] });

    expect(() => mergeAsof(left, right, { on: "t", by: "grp" })).toThrow(/right_by column/i);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("mergeAsof — property tests", () => {
  it("output always has nLeft rows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 20 }),
        (leftTs, rightTs) => {
          const sortedLeft = [...leftTs].sort((a, b) => a - b);
          const sortedRight = [...rightTs].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({
            t: sortedLeft,
            v: sortedLeft.map((x) => x * 10),
          });
          const right = DataFrame.fromColumns({
            t: sortedRight,
            w: sortedRight.map((x) => x * 100),
          });

          const result = mergeAsof(left, right, { on: "t" });
          return result.shape[0] === sortedLeft.length;
        },
      ),
    );
  });

  it("backward result w is always <= left key (when not null)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 15 }),
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 15 }),
        (leftTs, rightTs) => {
          const sortedLeft = [...leftTs].sort((a, b) => a - b);
          const sortedRight = [...rightTs].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({
            t: sortedLeft,
            v: sortedLeft,
          });
          const right = DataFrame.fromColumns({
            t: sortedRight,
            w: sortedRight,
          });

          const result = mergeAsof(left, right, { on: "t" });

          for (let i = 0; i < sortedLeft.length; i++) {
            const lt = sortedLeft[i] as number;
            const rw = result.col("w").at(i);
            if (rw !== null && rw !== undefined) {
              if ((rw as number) > lt) return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("forward result w is always >= left key (when not null)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 15 }),
        fc.array(fc.integer({ min: 0, max: 50 }), { minLength: 1, maxLength: 15 }),
        (leftTs, rightTs) => {
          const sortedLeft = [...leftTs].sort((a, b) => a - b);
          const sortedRight = [...rightTs].sort((a, b) => a - b);

          const left = DataFrame.fromColumns({ t: sortedLeft, v: sortedLeft });
          const right = DataFrame.fromColumns({ t: sortedRight, w: sortedRight });

          const result = mergeAsof(left, right, { on: "t", direction: "forward" });

          for (let i = 0; i < sortedLeft.length; i++) {
            const lt = sortedLeft[i] as number;
            const rw = result.col("w").at(i);
            if (rw !== null && rw !== undefined) {
              if ((rw as number) < lt) return false;
            }
          }
          return true;
        },
      ),
    );
  });
});
