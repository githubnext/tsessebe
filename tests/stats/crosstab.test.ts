/**
 * Tests for src/stats/crosstab.ts — crosstab and crosstabSeries.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { Series, crosstab, crosstabSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── basic count ──────────────────────────────────────────────────────────────

describe("crosstab — basic counts", () => {
  it("produces correct frequency table for simple inputs", () => {
    const a = new Series({ data: ["foo", "foo", "bar", "bar"], name: "A" });
    const b = new Series({ data: ["one", "two", "one", "two"], name: "B" });
    const ct = crosstab(a, b);

    // 2 rows × 2 cols
    expect(ct.index.size).toBe(2);
    expect(ct.columns.size).toBe(2);

    const rowLabels = [...ct.index.values];
    expect(rowLabels).toContain("bar");
    expect(rowLabels).toContain("foo");

    const colLabels = [...ct.columns.values];
    expect(colLabels).toContain("one");
    expect(colLabels).toContain("two");

    // each cell should be 1
    expect(ct.col("one").values[rowLabels.indexOf("bar")]).toBe(1);
    expect(ct.col("two").values[rowLabels.indexOf("foo")]).toBe(1);
  });

  it("counts multiple occurrences correctly", () => {
    const a = ["x", "x", "x", "y"] as Scalar[];
    const b = ["p", "p", "q", "p"] as Scalar[];
    const ct = crosstabSeries(a, b);

    const rowLabels = [...ct.index.values];
    const xi = rowLabels.indexOf("x");
    const yi = rowLabels.indexOf("y");

    expect(ct.col("p").values[xi]).toBe(2); // x,p appears twice
    expect(ct.col("q").values[xi]).toBe(1);
    expect(ct.col("p").values[yi]).toBe(1);
  });

  it("throws when index and columns have different lengths", () => {
    expect(() => crosstab(["a", "b"], ["x"])).toThrow();
  });

  it("returns empty DataFrame for empty inputs", () => {
    const ct = crosstab([], []);
    expect(ct.index.size).toBe(0);
    expect(ct.columns.size).toBe(0);
  });

  it("single-element inputs", () => {
    const ct = crosstab(["a"], ["b"]);
    expect(ct.index.size).toBe(1);
    expect(ct.columns.size).toBe(1);
    expect(ct.col("b").values[0]).toBe(1);
  });
});

// ─── dropna ───────────────────────────────────────────────────────────────────

describe("crosstab — dropna", () => {
  it("excludes null/NaN pairs when dropna=true (default)", () => {
    const a: Scalar[] = ["x", null, "y"];
    const b: Scalar[] = ["p", "q", "p"];
    const ct = crosstab(a, b, { dropna: true });
    const rows = [...ct.index.values];
    expect(rows).not.toContain("null");
    expect(rows.length).toBe(2);
  });

  it("includes null/NaN pairs when dropna=false", () => {
    const a: Scalar[] = ["x", null, "y"];
    const b: Scalar[] = ["p", "q", "p"];
    const ct = crosstab(a, b, { dropna: false });
    const rows = [...ct.index.values];
    expect(rows.length).toBe(3);
    expect(rows).toContain("null");
  });
});

// ─── margins ──────────────────────────────────────────────────────────────────

describe("crosstab — margins", () => {
  it("adds 'All' row and column totals", () => {
    const a = ["foo", "foo", "bar"] as Scalar[];
    const b = ["one", "two", "one"] as Scalar[];
    const ct = crosstab(a, b, { margins: true });

    const rows = [...ct.index.values];
    expect(rows).toContain("All");

    const cols = [...ct.columns.values];
    expect(cols).toContain("All");

    const allRowIdx = rows.indexOf("All");
    // All row should be column sums
    expect(ct.col("one").values[allRowIdx]).toBe(2); // bar:one=1 + foo:one=1
    expect(ct.col("two").values[allRowIdx]).toBe(1);
    // All column should be row totals
    const allCol = ct.col("All");
    const fooIdx = rows.indexOf("foo");
    expect(allCol.values[fooIdx]).toBe(2); // foo appears twice
  });

  it("uses custom margins_name", () => {
    const ct = crosstab(["a", "b"], ["x", "y"], { margins: true, margins_name: "Total" });
    const rows = [...ct.index.values];
    expect(rows).toContain("Total");
  });

  it("grand total in margins corner equals total observations", () => {
    const a = ["a", "a", "b", "b"] as Scalar[];
    const b = ["x", "y", "x", "y"] as Scalar[];
    const ct = crosstab(a, b, { margins: true });
    const rows = [...ct.index.values];
    const allRowIdx = rows.indexOf("All");
    const grandTotal = ct.col("All").values[allRowIdx];
    expect(grandTotal).toBe(4);
  });
});

// ─── normalize ────────────────────────────────────────────────────────────────

describe("crosstab — normalize", () => {
  it('normalize="all" sums to 1.0', () => {
    const a = ["a", "a", "b", "b"] as Scalar[];
    const b = ["x", "y", "x", "y"] as Scalar[];
    const ct = crosstab(a, b, { normalize: "all" });

    let total = 0;
    for (const col of ct.columns.values) {
      for (const v of ct.col(col).values) {
        total += typeof v === "number" ? v : 0;
      }
    }
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('normalize="index" each row sums to ~1.0', () => {
    const a = ["a", "a", "b", "b"] as Scalar[];
    const b = ["x", "y", "x", "y"] as Scalar[];
    const ct = crosstab(a, b, { normalize: "index" });

    for (let ri = 0; ri < ct.index.size; ri++) {
      let rowSum = 0;
      for (const col of ct.columns.values) {
        const v = ct.col(col).values[ri];
        rowSum += typeof v === "number" ? v : 0;
      }
      expect(rowSum).toBeCloseTo(1.0, 5);
    }
  });

  it('normalize="columns" each column sums to ~1.0', () => {
    const a = ["a", "a", "b", "b"] as Scalar[];
    const b = ["x", "y", "x", "y"] as Scalar[];
    const ct = crosstab(a, b, { normalize: "columns" });

    for (const col of ct.columns.values) {
      let colSum = 0;
      for (const v of ct.col(col).values) {
        colSum += typeof v === "number" ? v : 0;
      }
      expect(colSum).toBeCloseTo(1.0, 5);
    }
  });

  it("normalize=true behaves like normalize='all'", () => {
    const a = ["a", "b", "a"] as Scalar[];
    const b = ["x", "x", "y"] as Scalar[];
    const ct1 = crosstab(a, b, { normalize: true });
    const ct2 = crosstab(a, b, { normalize: "all" });
    for (const col of ct1.columns.values) {
      for (let ri = 0; ri < ct1.index.size; ri++) {
        expect(ct1.col(col).values[ri]).toBeCloseTo(ct2.col(col).values[ri] as number, 8);
      }
    }
  });
});

// ─── values + aggfunc ─────────────────────────────────────────────────────────

describe("crosstab — values + aggfunc", () => {
  it("sum aggregation", () => {
    const a: Scalar[] = ["x", "x", "y"];
    const b: Scalar[] = ["p", "p", "p"];
    const v: Scalar[] = [3, 7, 2];
    const ct = crosstab(a, b, { values: v, aggfunc: "sum" });
    const rows = [...ct.index.values];
    expect(ct.col("p").values[rows.indexOf("x")]).toBeCloseTo(10); // 3+7
    expect(ct.col("p").values[rows.indexOf("y")]).toBeCloseTo(2);
  });

  it("mean aggregation", () => {
    const a: Scalar[] = ["x", "x", "y"];
    const b: Scalar[] = ["p", "p", "q"];
    const v: Scalar[] = [4, 8, 5];
    const ct = crosstab(a, b, { values: v, aggfunc: "mean" });
    const rows = [...ct.index.values];
    expect(ct.col("p").values[rows.indexOf("x")]).toBeCloseTo(6); // (4+8)/2
  });

  it("min/max aggregation", () => {
    const a: Scalar[] = ["x", "x", "x"];
    const b: Scalar[] = ["p", "p", "p"];
    const v: Scalar[] = [1, 5, 3];
    const ctMin = crosstab(a, b, { values: v, aggfunc: "min" });
    const ctMax = crosstab(a, b, { values: v, aggfunc: "max" });
    expect(ctMin.col("p").values[0]).toBe(1);
    expect(ctMax.col("p").values[0]).toBe(5);
  });

  it("accepts Series as values", () => {
    const a = new Series({ data: ["x", "x"], name: "A" });
    const b = new Series({ data: ["p", "q"], name: "B" });
    const v = new Series({ data: [2, 8], name: "V" });
    const ct = crosstab(a, b, { values: v, aggfunc: "sum" });
    expect(ct.columns.size).toBe(2);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("crosstab — property-based", () => {
  it("total count equals number of non-null input pairs", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 20 }),
        fc.array(fc.constantFrom("x", "y", "z"), { minLength: 1, maxLength: 20 }),
        (rawA, rawB) => {
          const len = Math.min(rawA.length, rawB.length);
          const a = rawA.slice(0, len) as Scalar[];
          const b = rawB.slice(0, len) as Scalar[];
          const ct = crosstab(a, b);
          let total = 0;
          for (const col of ct.columns.values) {
            for (const v of ct.col(col).values) {
              total += typeof v === "number" ? v : 0;
            }
          }
          expect(total).toBe(len);
        },
      ),
    );
  });

  it("margins grand total equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b"), { minLength: 1, maxLength: 15 }),
        fc.array(fc.constantFrom("x", "y"), { minLength: 1, maxLength: 15 }),
        (rawA, rawB) => {
          const len = Math.min(rawA.length, rawB.length);
          const a = rawA.slice(0, len) as Scalar[];
          const b = rawB.slice(0, len) as Scalar[];
          const ct = crosstab(a, b, { margins: true });
          const rows = [...ct.index.values];
          const allRowIdx = rows.indexOf("All");
          const grandTotal = ct.col("All").values[allRowIdx];
          expect(grandTotal).toBe(len);
        },
      ),
    );
  });

  it("normalize=all: all cells sum to 1 (non-empty inputs)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c"), { minLength: 1, maxLength: 15 }),
        fc.array(fc.constantFrom("x", "y", "z"), { minLength: 1, maxLength: 15 }),
        (rawA, rawB) => {
          const len = Math.min(rawA.length, rawB.length);
          const a = rawA.slice(0, len) as Scalar[];
          const b = rawB.slice(0, len) as Scalar[];
          const ct = crosstab(a, b, { normalize: "all" });
          let total = 0;
          for (const col of ct.columns.values) {
            for (const v of ct.col(col).values) {
              total += typeof v === "number" ? v : 0;
            }
          }
          expect(total).toBeCloseTo(1.0, 4);
        },
      ),
    );
  });
});
