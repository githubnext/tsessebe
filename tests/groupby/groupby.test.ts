/**
 * Tests for GroupBy — DataFrameGroupBy and SeriesGroupBy.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, DataFrameGroupBy, Series, SeriesGroupBy } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeDeptDf(): DataFrame {
  return DataFrame.fromColumns({
    dept: ["A", "A", "B", "B", "C"],
    region: ["East", "West", "East", "East", "West"],
    sales: [10, 20, 30, 40, 50],
    bonus: [1, 2, 3, 4, 5],
  });
}

// ─── DataFrameGroupBy ─────────────────────────────────────────────────────────

describe("DataFrameGroupBy", () => {
  describe("construction", () => {
    it("is produced by DataFrame.groupby()", () => {
      const df = makeDeptDf();
      const gb = df.groupby("dept");
      expect(gb).toBeInstanceOf(DataFrameGroupBy);
    });

    it("reports correct ngroups for single-key", () => {
      const df = makeDeptDf();
      expect(df.groupby("dept").ngroups).toBe(3);
    });

    it("reports correct ngroups for multi-key", () => {
      const df = makeDeptDf();
      expect(df.groupby(["dept", "region"]).ngroups).toBe(4);
    });

    it("groups property maps key → row labels", () => {
      const df = makeDeptDf();
      const groups = df.groupby("dept").groups;
      expect(groups.get("A")).toEqual([0, 1]);
      expect(groups.get("B")).toEqual([2, 3]);
      expect(groups.get("C")).toEqual([4]);
    });

    it("groupKeys returns all group keys in insertion order", () => {
      const df = makeDeptDf();
      expect(df.groupby("dept").groupKeys).toEqual(["A", "B", "C"]);
    });
  });

  describe("getGroup", () => {
    it("returns the sub-DataFrame for a group key", () => {
      const df = makeDeptDf();
      const sub = df.groupby("dept").getGroup("A");
      expect(sub.shape[0]).toBe(2);
      expect([...sub.col("sales").values]).toEqual([10, 20]);
    });

    it("throws for unknown key", () => {
      const df = makeDeptDf();
      expect(() => df.groupby("dept").getGroup("Z")).toThrow();
    });
  });

  describe("sum()", () => {
    it("sums numeric columns per group", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").sum();
      expect(result.shape).toEqual([3, 2]);
      expect([...result.col("sales").values]).toEqual([30, 70, 50]);
      expect([...result.col("bonus").values]).toEqual([3, 7, 5]);
    });

    it("uses group keys as row index", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").sum();
      expect(result.index.toArray()).toEqual(["A", "B", "C"]);
    });
  });

  describe("mean()", () => {
    it("computes mean per group", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").mean();
      expect([...result.col("sales").values]).toEqual([15, 35, 50]);
    });
  });

  describe("min() / max()", () => {
    it("computes min per group", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").min();
      expect([...result.col("sales").values]).toEqual([10, 30, 50]);
    });

    it("computes max per group", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").max();
      expect([...result.col("sales").values]).toEqual([20, 40, 50]);
    });
  });

  describe("count()", () => {
    it("counts non-missing values per group", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").count();
      expect([...result.col("sales").values]).toEqual([2, 2, 1]);
    });

    it("skips nulls in count", () => {
      const df = DataFrame.fromColumns({
        g: ["A", "A", "B"],
        v: [1, null, 2],
      });
      const result = df.groupby("g").count();
      expect([...result.col("v").values]).toEqual([1, 1]);
    });
  });

  describe("std()", () => {
    it("computes std per group (sample std)", () => {
      const df = DataFrame.fromColumns({
        g: ["A", "A", "B"],
        v: [2, 4, 10],
      });
      const result = df.groupby("g").std();
      const vals = result.col("v").values as number[];
      expect(vals[0]).toBeCloseTo(Math.sqrt(2));
      expect(Number.isNaN(vals[1] as number)).toBe(true); // single-element group
    });
  });

  describe("first() / last()", () => {
    it("returns first non-null per group", () => {
      const df = DataFrame.fromColumns({
        g: ["A", "A", "B"],
        v: [null, 3, 7],
      });
      const result = df.groupby("g").first();
      expect([...result.col("v").values]).toEqual([3, 7]);
    });

    it("returns last non-null per group", () => {
      const df = DataFrame.fromColumns({
        g: ["A", "A", "B"],
        v: [1, null, 7],
      });
      const result = df.groupby("g").last();
      expect([...result.col("v").values]).toEqual([1, 7]);
    });
  });

  describe("size()", () => {
    it("returns group sizes as a Series", () => {
      const df = makeDeptDf();
      const sz = df.groupby("dept").size();
      expect(sz).toBeInstanceOf(Series);
      expect([...sz.values]).toEqual([2, 2, 1]);
      expect(sz.index.toArray()).toEqual(["A", "B", "C"]);
    });
  });

  describe("agg()", () => {
    it("applies a custom function", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").agg((vals) => {
        const nums = vals.filter((v): v is number => typeof v === "number");
        return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : 0;
      });
      expect([...result.col("sales").values]).toEqual([30, 70, 50]);
    });

    it("applies per-column spec object", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").agg({ sales: "sum", bonus: "mean" });
      expect([...result.col("sales").values]).toEqual([30, 70, 50]);
      expect([...result.col("bonus").values]).toEqual([1.5, 3.5, 5]);
    });

    it("asIndex=false puts keys in columns", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").agg("sum", false);
      expect(result.columns.toArray()).toContain("dept");
      expect([...result.col("dept").values]).toEqual(["A", "B", "C"]);
    });
  });

  describe("transform()", () => {
    it("returns same-length DataFrame", () => {
      const df = makeDeptDf();
      const result = df
        .groupby("dept")
        .transform((vals) => vals.map((v) => (typeof v === "number" ? v * 2 : v)));
      expect(result.shape[0]).toBe(df.shape[0]);
    });

    it("broadcasts group mean back to original positions", () => {
      const df = DataFrame.fromColumns({
        g: ["A", "A", "B"],
        v: [2, 4, 6],
      });
      const result = df.groupby("g").transform((vals) => {
        const nums = vals.filter((x): x is number => typeof x === "number");
        const m = nums.reduce((a, b) => a + b, 0) / nums.length;
        return vals.map(() => m);
      });
      expect([...result.col("v").values]).toEqual([3, 3, 6]);
    });
  });

  describe("apply()", () => {
    it("concatenates results of per-group function", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").apply((sub) => sub.head(1));
      expect(result.shape[0]).toBe(3);
    });
  });

  describe("filter()", () => {
    it("keeps only groups matching predicate", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").filter((sub) => sub.shape[0] > 1);
      expect(result.shape[0]).toBe(4); // dept A (2) + dept B (2), C excluded
    });

    it("preserves original row order", () => {
      const df = makeDeptDf();
      const result = df.groupby("dept").filter((sub) => sub.shape[0] > 1);
      // rows 0,1 (A), 2,3 (B)
      expect([...result.col("sales").values]).toEqual([10, 20, 30, 40]);
    });
  });

  describe("multi-key groupby", () => {
    it("groups by two columns", () => {
      const df = makeDeptDf();
      const gb = df.groupby(["dept", "region"]);
      expect(gb.ngroups).toBe(4);
    });

    it("sum over multi-key groups", () => {
      const df = DataFrame.fromColumns({
        dept: ["A", "A", "A", "B"],
        region: ["East", "East", "West", "East"],
        sales: [10, 20, 30, 40],
      });
      const result = df.groupby(["dept", "region"]).sum();
      expect(result.shape[0]).toBe(3);
      const salesVals = [...result.col("sales").values];
      expect(salesVals).toContain(30); // A-East
      expect(salesVals).toContain(30); // A-West
      expect(salesVals).toContain(40); // B-East
    });
  });

  // ─── helpers for property tests ───────────────────────────────────────────────

  function checkGroupSum(keys: string[], vals: number[], result: DataFrame): boolean {
    const n = Math.min(keys.length, vals.length);
    const manual: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const k = keys[i] as string;
      manual[k] = (manual[k] ?? 0) + (vals[i] ?? 0);
    }
    for (const [key, expectedSum] of Object.entries(manual)) {
      const idx = result.index.toArray().indexOf(key);
      if (idx === -1) {
        return false;
      }
      const v = (result.col("v").values as number[])[idx];
      if (v !== expectedSum) {
        return false;
      }
    }
    return true;
  }

  describe("property-based tests", () => {
    it("sum equals manual sum for each group", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom("A", "B", "C"), { minLength: 1, maxLength: 20 }),
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
          (keys, vals) => {
            const n = Math.min(keys.length, vals.length);
            const df = DataFrame.fromColumns({
              g: keys.slice(0, n),
              v: vals.slice(0, n) as number[],
            });
            const result = df.groupby("g").sum();
            return checkGroupSum(keys.slice(0, n), vals.slice(0, n) as number[], result);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("size sums to total rows", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom("X", "Y", "Z"), { minLength: 1, maxLength: 30 }),
          (keys) => {
            const df = DataFrame.fromColumns({ g: keys, v: keys.map((_, i) => i) });
            const sz = df.groupby("g").size();
            const total = (sz.values as number[]).reduce((a, b) => a + b, 0);
            return total === keys.length;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

// ─── SeriesGroupBy ────────────────────────────────────────────────────────────

describe("SeriesGroupBy", () => {
  describe("construction", () => {
    it("is produced by Series.groupby()", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      expect(s.groupby(["A", "A", "B", "B"])).toBeInstanceOf(SeriesGroupBy);
    });

    it("reports correct ngroups", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      expect(s.groupby(["A", "A", "B", "B"]).ngroups).toBe(2);
    });
  });

  describe("sum()", () => {
    it("sums values per group", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      const result = s.groupby(["A", "A", "B", "B"]).sum();
      expect([...result.values]).toEqual([3, 7]);
      expect(result.index.toArray()).toEqual(["A", "B"]);
    });
  });

  describe("mean()", () => {
    it("computes mean per group", () => {
      const s = new Series({ data: [2, 4, 6] });
      const result = s.groupby(["A", "A", "B"]).mean();
      expect([...result.values]).toEqual([3, 6]);
    });
  });

  describe("count()", () => {
    it("counts non-missing per group", () => {
      const s = new Series({ data: [1, null, 3] });
      const result = s.groupby(["A", "A", "B"]).count();
      expect([...result.values]).toEqual([1, 1]);
    });
  });

  describe("size()", () => {
    it("returns total per group (including missing)", () => {
      const s = new Series({ data: [1, null, 3] });
      const result = s.groupby(["A", "A", "B"]).size();
      expect([...result.values]).toEqual([2, 1]);
    });
  });

  describe("agg() with custom function", () => {
    it("applies custom aggregator", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      const result = s
        .groupby(["A", "A", "B", "B"])
        .agg((vals) => (vals as number[]).reduce((a, b) => a + b, 0) * 2);
      expect([...result.values]).toEqual([6, 14]);
    });
  });

  describe("transform()", () => {
    it("returns same-length Series", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      const result = s
        .groupby(["A", "A", "B", "B"])
        .transform((vals) => vals.map((v) => (v as number) * 10));
      expect(result.size).toBe(4);
      expect([...result.values]).toEqual([10, 20, 30, 40]);
    });
  });

  describe("apply()", () => {
    it("concatenates per-group results", () => {
      const s = new Series({ data: [1, 2, 3, 4] });
      const result = s
        .groupby(["A", "A", "B", "B"])
        .apply((sub) => new Series({ data: [sub.max() as number] }));
      expect(result.size).toBe(2);
      expect([...result.values]).toEqual([2, 4]);
    });
  });

  describe("filter()", () => {
    it("keeps only groups matching predicate", () => {
      const s = new Series({ data: [1, 2, 3] });
      const result = s.groupby(["A", "A", "B"]).filter((sub) => sub.size > 1);
      expect(result.size).toBe(2);
      expect([...result.values]).toEqual([1, 2]);
    });
  });

  describe("getGroup()", () => {
    it("returns sub-Series for a key", () => {
      const s = new Series({ data: [10, 20, 30] });
      const g = s.groupby(["X", "Y", "X"]).getGroup("X");
      expect([...g.values]).toEqual([10, 30]);
    });

    it("throws for missing key", () => {
      const s = new Series({ data: [1, 2] });
      expect(() => s.groupby(["A", "B"]).getGroup("Z")).toThrow();
    });
  });

  describe("groups by another Series", () => {
    it("accepts a Series as key", () => {
      const s = new Series({ data: [1, 2, 3] });
      const keys = new Series({ data: ["A", "A", "B"] });
      const result = s.groupby(keys).sum();
      expect([...result.values]).toEqual([3, 3]);
    });
  });
});
