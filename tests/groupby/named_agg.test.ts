/**
 * Tests for NamedAgg — named aggregation for DataFrameGroupBy.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import type { AggName } from "../../src/groupby/index.ts";
import { DataFrame, NamedAgg, isNamedAggSpec, namedAgg } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDf(): DataFrame {
  return DataFrame.fromColumns({
    dept: ["eng", "eng", "hr", "hr", "eng"],
    salary: [100, 120, 80, 90, 110],
    headcount: [1, 1, 1, 1, 1],
    score: [4.0, 5.0, 3.0, 4.0, 3.5],
  });
}

// ─── NamedAgg class ───────────────────────────────────────────────────────────

describe("NamedAgg class", () => {
  it("stores column and aggfunc", () => {
    const spec = new NamedAgg("salary", "sum");
    expect(spec.column).toBe("salary");
    expect(spec.aggfunc).toBe("sum");
  });

  it("accepts a function as aggfunc", () => {
    const fn = (vals: readonly Scalar[]) => vals.length;
    const spec = new NamedAgg("col", fn);
    expect(spec.aggfunc).toBe(fn);
  });
});

// ─── namedAgg factory ─────────────────────────────────────────────────────────

describe("namedAgg factory", () => {
  it("returns a NamedAgg instance", () => {
    const spec = namedAgg("salary", "mean");
    expect(spec).toBeInstanceOf(NamedAgg);
    expect(spec.column).toBe("salary");
    expect(spec.aggfunc).toBe("mean");
  });

  it("is identical to new NamedAgg()", () => {
    const a = namedAgg("x", "sum");
    const b = new NamedAgg("x", "sum");
    expect(a.column).toBe(b.column);
    expect(a.aggfunc).toBe(b.aggfunc);
  });
});

// ─── isNamedAggSpec ───────────────────────────────────────────────────────────

describe("isNamedAggSpec", () => {
  it("returns true for a dict of NamedAgg instances", () => {
    expect(isNamedAggSpec({ a: namedAgg("x", "sum") })).toBe(true);
    expect(isNamedAggSpec({ a: namedAgg("x", "sum"), b: namedAgg("y", "mean") })).toBe(true);
  });

  it("returns false for plain AggSpec records", () => {
    expect(isNamedAggSpec({ x: "sum" })).toBe(false);
  });

  it("returns false for non-objects", () => {
    expect(isNamedAggSpec(null)).toBe(false);
    expect(isNamedAggSpec("sum")).toBe(false);
    expect(isNamedAggSpec(undefined)).toBe(false);
  });

  it("returns true for empty object (vacuous truth)", () => {
    expect(isNamedAggSpec({})).toBe(true);
  });
});

// ─── DataFrameGroupBy.aggNamed ────────────────────────────────────────────────

describe("DataFrameGroupBy.aggNamed", () => {
  it("renames output columns", () => {
    const df = makeDf();
    const result = df.groupby("dept").aggNamed({
      total_salary: namedAgg("salary", "sum"),
    });
    expect(result.columns.toArray()).toContain("total_salary");
    expect(result.columns.toArray()).not.toContain("salary");
  });

  it("sums salary into total_salary", () => {
    const df = makeDf();
    const result = df.groupby("dept").aggNamed({
      total_salary: namedAgg("salary", "sum"),
    });
    // eng: 100+120+110=330, hr: 80+90=170
    const engIdx = result.index.toArray().indexOf("eng");
    const hrIdx = result.index.toArray().indexOf("hr");
    expect(result.col("total_salary").values[engIdx]).toBe(330);
    expect(result.col("total_salary").values[hrIdx]).toBe(170);
  });

  it("computes mean into avg_salary", () => {
    const df = makeDf();
    const result = df.groupby("dept").aggNamed({
      avg_salary: namedAgg("salary", "mean"),
    });
    const engIdx = result.index.toArray().indexOf("eng");
    const hrIdx = result.index.toArray().indexOf("hr");
    expect(result.col("avg_salary").values[engIdx]).toBeCloseTo(110, 5);
    expect(result.col("avg_salary").values[hrIdx]).toBeCloseTo(85, 5);
  });

  it("aggregates multiple columns with different names", () => {
    const df = makeDf();
    const result = df.groupby("dept").aggNamed({
      total_salary: namedAgg("salary", "sum"),
      avg_score: namedAgg("score", "mean"),
      employee_count: namedAgg("headcount", "sum"),
    });
    expect(result.columns.toArray()).toEqual(
      expect.arrayContaining(["total_salary", "avg_score", "employee_count"]),
    );
    const engIdx = result.index.toArray().indexOf("eng");
    expect(result.col("total_salary").values[engIdx]).toBe(330);
    expect(result.col("avg_score").values[engIdx]).toBeCloseTo((4.0 + 5.0 + 3.5) / 3, 5);
    expect(result.col("employee_count").values[engIdx]).toBe(3);
  });

  it("allows same source column with different agg fns", () => {
    const df = makeDf();
    const result = df.groupby("dept").aggNamed({
      min_salary: namedAgg("salary", "min"),
      max_salary: namedAgg("salary", "max"),
    });
    const engIdx = result.index.toArray().indexOf("eng");
    expect(result.col("min_salary").values[engIdx]).toBe(100);
    expect(result.col("max_salary").values[engIdx]).toBe(120);
  });

  it("accepts custom function in aggfunc", () => {
    const df = makeDf();
    const range = (vals: readonly Scalar[]) => {
      const nums = vals.filter((v): v is number => typeof v === "number");
      if (nums.length === 0) {
        return 0;
      }
      return Math.max(...nums) - Math.min(...nums);
    };
    const result = df.groupby("dept").aggNamed({
      salary_range: namedAgg("salary", range),
    });
    const engIdx = result.index.toArray().indexOf("eng");
    expect(result.col("salary_range").values[engIdx]).toBe(20); // 120-100
  });

  it("supports asIndex=false to include group key as column", () => {
    const df = makeDf();
    const result = df.groupby("dept").aggNamed({ total_salary: namedAgg("salary", "sum") }, false);
    expect(result.columns.toArray()).toContain("dept");
    expect(result.columns.toArray()).toContain("total_salary");
  });

  it("handles all built-in aggfuncs", () => {
    const df = DataFrame.fromColumns({
      g: ["a", "a", "b"],
      v: [1, 3, 5],
    });
    const result = df.groupby("g").aggNamed({
      v_sum: namedAgg("v", "sum"),
      v_mean: namedAgg("v", "mean"),
      v_min: namedAgg("v", "min"),
      v_max: namedAgg("v", "max"),
      v_count: namedAgg("v", "count"),
      v_first: namedAgg("v", "first"),
      v_last: namedAgg("v", "last"),
    });
    const aIdx = result.index.toArray().indexOf("a");
    expect(result.col("v_sum").values[aIdx]).toBe(4);
    expect(result.col("v_mean").values[aIdx]).toBe(2);
    expect(result.col("v_min").values[aIdx]).toBe(1);
    expect(result.col("v_max").values[aIdx]).toBe(3);
    expect(result.col("v_count").values[aIdx]).toBe(2);
    expect(result.col("v_first").values[aIdx]).toBe(1);
    expect(result.col("v_last").values[aIdx]).toBe(3);
  });

  it("handles std aggfunc", () => {
    const df = DataFrame.fromColumns({
      g: ["a", "a", "a"],
      v: [2, 4, 6],
    });
    const result = df.groupby("g").aggNamed({
      v_std: namedAgg("v", "std"),
    });
    const aIdx = result.index.toArray().indexOf("a");
    const std = result.col("v_std").values[aIdx] as number;
    expect(std).toBeCloseTo(2, 5);
  });

  it("handles single-row groups", () => {
    const df = DataFrame.fromColumns({
      g: ["a"],
      v: [42],
    });
    const result = df.groupby("g").aggNamed({
      doubled: namedAgg("v", "sum"),
    });
    expect(result.col("doubled").values[0]).toBe(42);
  });

  it("handles missing values — count excludes them", () => {
    const df = DataFrame.fromColumns({
      g: ["a", "a", "a"],
      v: [1, null, 3],
    });
    const result = df.groupby("g").aggNamed({
      non_null: namedAgg("v", "count"),
    });
    expect(result.col("non_null").values[0]).toBe(2);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe("NamedAgg property tests", () => {
  it("namedAgg sum == plain agg sum with renamed column", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            g: fc.constantFrom("a", "b", "c"),
            v: fc.double({ noNaN: true, min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (rows) => {
          const g = rows.map((r) => r.g);
          const v = rows.map((r) => r.v);
          const df = DataFrame.fromColumns({ g, v });

          const named = df.groupby("g").aggNamed({ total: namedAgg("v", "sum") });
          const plain = df.groupby("g").agg({ v: "sum" });

          // same groups
          const namedGroups = named.index.toArray().slice().sort();
          const plainGroups = plain.index.toArray().slice().sort();
          expect(namedGroups).toEqual(plainGroups);

          // same values (column just renamed)
          for (const grp of namedGroups) {
            const ni = named.index.toArray().indexOf(grp);
            const pi = plain.index.toArray().indexOf(grp);
            const namedVal = named.col("total").values[ni];
            const plainVal = plain.col("v").values[pi];
            if (
              typeof namedVal === "number" &&
              typeof plainVal === "number" &&
              !Number.isNaN(namedVal) &&
              !Number.isNaN(plainVal)
            ) {
              expect(namedVal).toBeCloseTo(plainVal as number, 5);
            }
          }
        },
      ),
    );
  });

  it("NamedAgg constructor stores values immutably", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.constantFrom<AggName>("sum", "mean", "min", "max", "count"),
        (col, agg) => {
          const spec = new NamedAgg(col, agg);
          expect(spec.column).toBe(col);
          expect(spec.aggfunc).toBe(agg);
        },
      ),
    );
  });
});
