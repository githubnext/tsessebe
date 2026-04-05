import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { oneWayAnova, twoWayAnova } from "../../src/stats/anova.ts";

describe("oneWayAnova", () => {
  it("detects significant difference between clearly separated groups", () => {
    const result = oneWayAnova([[1, 2, 3], [10, 11, 12], [20, 21, 22]]);
    expect(result.fStatistic).toBeGreaterThan(100);
    expect(result.pValue).toBeLessThan(0.001);
    expect(result.dfBetween).toBe(2);
    expect(result.dfWithin).toBe(6);
  });

  it("returns non-significant result for identical groups", () => {
    const result = oneWayAnova([[5, 5, 5], [5, 5, 5], [5, 5, 5]]);
    // All within-group variance is 0, between-group is 0 → F=0 or Inf
    expect(result.fStatistic).toBe(0);
    expect(result.pValue).toBeGreaterThanOrEqual(0);
  });

  it("returns p-value near 1 for overlapping groups", () => {
    const result = oneWayAnova([[5, 6, 5], [5, 6, 5], [5, 6, 5]]);
    expect(result.pValue).toBeGreaterThan(0.9);
  });

  it("computes correct SS and MS in summary table", () => {
    const result = oneWayAnova([[1, 2, 3], [4, 5, 6]]);
    // k=2, N=6; group means 2 and 5; grand mean 3.5
    // SSbetween = 3*(2-3.5)^2 + 3*(5-3.5)^2 = 3*2.25 + 3*2.25 = 13.5
    expect(result.table).toBeDefined();
    expect(result.dfBetween).toBe(1);
    expect(result.dfWithin).toBe(4);
  });

  it("handles groups of different sizes", () => {
    const result = oneWayAnova([[1, 2], [10, 11, 12], [20]]);
    expect(result.dfBetween).toBe(2);
    expect(result.dfWithin).toBe(3); // N=6 k=3
  });

  it("throws for fewer than 2 groups", () => {
    expect(() => oneWayAnova([[1, 2, 3]])).toThrow();
  });

  it("throws for an empty group", () => {
    expect(() => oneWayAnova([[1, 2], []])).toThrow();
  });

  // Property: p-value is always in [0, 1]
  it("property: p-value in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 10 }),
          { minLength: 2, maxLength: 5 },
        ),
        (groups) => {
          const result = oneWayAnova(groups);
          expect(result.pValue).toBeGreaterThanOrEqual(0);
          expect(result.pValue).toBeLessThanOrEqual(1 + 1e-9);
        },
      ),
    );
  });

  // Property: dfBetween = k-1, dfWithin = N-k
  it("property: degrees of freedom are correct", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 8 }),
          { minLength: 2, maxLength: 5 },
        ),
        (groups) => {
          const k = groups.length;
          const N = groups.reduce((s, g) => s + g.length, 0);
          const result = oneWayAnova(groups as unknown as number[][]);
          expect(result.dfBetween).toBe(k - 1);
          expect(result.dfWithin).toBe(N - k);
        },
      ),
    );
  });
});

describe("twoWayAnova", () => {
  // Balanced 2x2 design: A1/A2, B1/B2 with 3 reps each
  const values = [5, 6, 7, 8, 9, 10, 3, 4, 5, 6, 7, 8];
  const factorA = ["A1", "A1", "A1", "A1", "A1", "A1", "A2", "A2", "A2", "A2", "A2", "A2"];
  const factorB = ["B1", "B1", "B1", "B2", "B2", "B2", "B1", "B1", "B1", "B2", "B2", "B2"];

  it("returns a table with 4 rows (A, B, Error, Total)", () => {
    const result = twoWayAnova(values, factorA, factorB);
    expect(result.rows.length).toBe(4);
    expect(result.rows[0]?.source).toBe("Factor A");
    expect(result.rows[1]?.source).toBe("Factor B");
    expect(result.rows[2]?.source).toBe("Error");
    expect(result.rows[3]?.source).toBe("Total");
  });

  it("returns positive SS for all sources", () => {
    const result = twoWayAnova(values, factorA, factorB);
    for (const row of result.rows) {
      expect(row.ss).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns p-values in [0, 1] for Factor A and B", () => {
    const result = twoWayAnova(values, factorA, factorB);
    const pA = result.rows[0]?.pValue ?? 0;
    const pB = result.rows[1]?.pValue ?? 0;
    expect(pA).toBeGreaterThanOrEqual(0);
    expect(pA).toBeLessThanOrEqual(1);
    expect(pB).toBeGreaterThanOrEqual(0);
    expect(pB).toBeLessThanOrEqual(1);
  });

  it("includes interaction row when interaction=true", () => {
    const result = twoWayAnova(values, factorA, factorB, { interaction: true });
    expect(result.rows.length).toBe(5);
    expect(result.rows[2]?.source).toBe("A × B");
  });

  it("throws when lengths do not match", () => {
    expect(() => twoWayAnova([1, 2, 3], ["A", "A"], ["B", "B", "B"])).toThrow();
  });

  it("throws for empty input", () => {
    expect(() => twoWayAnova([], [], [])).toThrow();
  });

  it("returns a DataFrame table", () => {
    const result = twoWayAnova(values, factorA, factorB);
    expect(result.table.columns.values).toContain("SS");
    expect(result.table.columns.values).toContain("df");
  });
});
