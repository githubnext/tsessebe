/**
 * Tests for idxmin / idxmax — index label of extremum value.
 *
 * Covers:
 *   - Series: idxmin, idxmax with default and custom index
 *   - Series: skipna behaviour
 *   - Series: empty series, all-null series
 *   - DataFrame: axis 0 (per column → row label)
 *   - DataFrame: axis 1 (per row → column label)
 *   - DataFrame: skipna behaviour
 *   - Property tests (fast-check)
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import { DataFrame, Series } from "../../src/index.ts";
import {
  idxmax,
  idxmaxDataFrame,
  idxmin,
  idxminDataFrame,
} from "../../src/stats/idxminmax.ts";

// ─── Series: basic ────────────────────────────────────────────────────────────

describe("idxmin — Series", () => {
  test("returns label of minimum value (default RangeIndex)", () => {
    const s = new Series({ data: [3, 1, 2] });
    expect(idxmin(s)).toBe(1);
  });

  test("returns label of minimum value (custom string index)", () => {
    const s = new Series({ data: [3, 1, 2], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBe("b");
  });

  test("first occurrence wins for ties", () => {
    const s = new Series({ data: [1, 2, 1], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBe("a");
  });

  test("single element", () => {
    const s = new Series({ data: [42], index: ["x"] });
    expect(idxmin(s)).toBe("x");
  });

  test("all same value → first label", () => {
    const s = new Series({ data: [5, 5, 5], index: [10, 20, 30] });
    expect(idxmin(s)).toBe(10);
  });

  test("empty series → null", () => {
    const s = new Series({ data: [] });
    expect(idxmin(s)).toBeNull();
  });

  test("all nulls with skipna true → null", () => {
    const s = new Series({ data: [null, null, null], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBeNull();
  });

  test("NaN is skipped with skipna true", () => {
    const s = new Series({ data: [NaN, 2, 1], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBe("c");
  });

  test("skipna false: NaN encountered first returns its label", () => {
    const s = new Series({ data: [NaN, 2, 1], index: ["a", "b", "c"] });
    expect(idxmin(s, { skipna: false })).toBe("a");
  });

  test("skipna false: null encountered returns its label", () => {
    const s = new Series({ data: [null, 2, 1] as (number | null)[], index: ["a", "b", "c"] });
    expect(idxmin(s, { skipna: false })).toBe("a");
  });

  test("works with negative numbers", () => {
    const s = new Series({ data: [-5, -3, -7], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBe("c");
  });

  test("works with string values", () => {
    const s = new Series({ data: ["banana", "apple", "cherry"], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBe("b"); // "apple" < "banana" < "cherry"
  });

  test("works with boolean values (false < true)", () => {
    const s = new Series({ data: [true, false, true], index: ["a", "b", "c"] });
    expect(idxmin(s)).toBe("b");
  });
});

describe("idxmax — Series", () => {
  test("returns label of maximum value (default RangeIndex)", () => {
    const s = new Series({ data: [3, 1, 2] });
    expect(idxmax(s)).toBe(0);
  });

  test("returns label of maximum value (custom string index)", () => {
    const s = new Series({ data: [3, 1, 2], index: ["a", "b", "c"] });
    expect(idxmax(s)).toBe("a");
  });

  test("first occurrence wins for ties", () => {
    const s = new Series({ data: [2, 1, 2], index: ["a", "b", "c"] });
    expect(idxmax(s)).toBe("a");
  });

  test("single element", () => {
    const s = new Series({ data: [-1], index: ["z"] });
    expect(idxmax(s)).toBe("z");
  });

  test("empty series → null", () => {
    const s = new Series({ data: [] });
    expect(idxmax(s)).toBeNull();
  });

  test("all nulls with skipna true → null", () => {
    const s = new Series({ data: [null, null], index: ["p", "q"] });
    expect(idxmax(s)).toBeNull();
  });

  test("NaN is skipped with skipna true", () => {
    const s = new Series({ data: [NaN, 1, 5], index: ["a", "b", "c"] });
    expect(idxmax(s)).toBe("c");
  });

  test("skipna false: NaN encountered returns its label", () => {
    const s = new Series({ data: [NaN, 1, 5], index: ["a", "b", "c"] });
    expect(idxmax(s, { skipna: false })).toBe("a");
  });

  test("works with string values", () => {
    const s = new Series({ data: ["banana", "apple", "cherry"], index: ["a", "b", "c"] });
    expect(idxmax(s)).toBe("c"); // "cherry" > "banana" > "apple"
  });
});

// ─── DataFrame: axis 0 (per-column row labels) ───────────────────────────────

describe("idxminDataFrame — axis 0", () => {
  test("returns Series indexed by column names", () => {
    const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [1, 4, 0] });
    const result = idxminDataFrame(df);
    expect(result.index.toArray()).toEqual(["x", "y"]);
    expect(result.at(0)).toBe(1); // x min at row 1
    expect(result.at(1)).toBe(2); // y min at row 2
  });

  test("axis: 'index' behaves like axis: 0", () => {
    const df = DataFrame.fromColumns({ a: [10, 5, 8] });
    const r0 = idxminDataFrame(df, { axis: 0 });
    const ri = idxminDataFrame(df, { axis: "index" });
    expect(r0.at(0)).toBe(ri.at(0));
  });

  test("all same → first row label", () => {
    const df = DataFrame.fromColumns({ a: [7, 7, 7] });
    const result = idxminDataFrame(df);
    expect(result.at(0)).toBe(0);
  });

  test("column with null: skipna true → skips null", () => {
    const df = DataFrame.fromColumns({ a: [null, 5, 3] as (number | null)[] });
    const result = idxminDataFrame(df);
    expect(result.at(0)).toBe(2);
  });

  test("column with null: skipna false → returns label of null", () => {
    const df = DataFrame.fromColumns({ a: [null, 5, 3] as (number | null)[] });
    const result = idxminDataFrame(df, { skipna: false });
    expect(result.at(0)).toBe(0);
  });

  test("all null column → null in result", () => {
    const df = DataFrame.fromColumns({ a: [null, null] as (null)[] });
    const result = idxminDataFrame(df);
    expect(result.at(0)).toBeNull();
  });

  test("single-row DataFrame", () => {
    const df = DataFrame.fromColumns({ x: [42], y: [7] });
    const result = idxminDataFrame(df);
    expect(result.values).toEqual([0, 0]);
  });
});

describe("idxmaxDataFrame — axis 0", () => {
  test("returns row label of maximum per column", () => {
    const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [1, 4, 0] });
    const result = idxmaxDataFrame(df);
    expect(result.at(0)).toBe(0); // x max at row 0
    expect(result.at(1)).toBe(1); // y max at row 1
  });

  test("custom row index", () => {
    const df = DataFrame.fromColumns(
      { a: [1, 3, 2] },
      { index: ["r0", "r1", "r2"] },
    );
    const result = idxmaxDataFrame(df);
    expect(result.at(0)).toBe("r1");
  });
});

// ─── DataFrame: axis 1 (per-row column names) ─────────────────────────────────

describe("idxminDataFrame — axis 1", () => {
  test("returns Series indexed by row labels", () => {
    const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [1, 4, 0] });
    const result = idxminDataFrame(df, { axis: 1 });
    expect(result.index.toArray()).toEqual([0, 1, 2]);
    expect(result.at(0)).toBe("y"); // row 0: x=3, y=1 → y is min
    expect(result.at(1)).toBe("x"); // row 1: x=1, y=4 → x is min
    expect(result.at(2)).toBe("y"); // row 2: x=2, y=0 → y is min
  });

  test("axis: 'columns' behaves like axis: 1", () => {
    const df = DataFrame.fromColumns({ a: [5, 2], b: [3, 6] });
    const r1 = idxminDataFrame(df, { axis: 1 });
    const rc = idxminDataFrame(df, { axis: "columns" });
    expect(r1.toArray()).toEqual(rc.toArray());
  });

  test("row with null: skipna true", () => {
    const df = DataFrame.fromColumns({
      a: [null as unknown as number, 2],
      b: [1, 5],
    });
    const result = idxminDataFrame(df, { axis: 1 });
    expect(result.at(0)).toBe("b"); // a=null (skipped), b=1
  });

  test("row with null: skipna false → returns null's column", () => {
    const df = DataFrame.fromColumns({
      a: [null as unknown as number, 2],
      b: [1, 5],
    });
    const result = idxminDataFrame(df, { axis: 1, skipna: false });
    expect(result.at(0)).toBe("a"); // first missing → 'a'
  });
});

describe("idxmaxDataFrame — axis 1", () => {
  test("returns column name of maximum per row", () => {
    const df = DataFrame.fromColumns({ x: [3, 1, 2], y: [1, 4, 0] });
    const result = idxmaxDataFrame(df, { axis: 1 });
    expect(result.at(0)).toBe("x"); // row 0: x=3, y=1 → x is max
    expect(result.at(1)).toBe("y"); // row 1: x=1, y=4 → y is max
    expect(result.at(2)).toBe("x"); // row 2: x=2, y=0 → x is max
  });
});

// ─── property tests (fast-check) ─────────────────────────────────────────────

describe("idxmin / idxmax — property tests", () => {
  test("idxmin label points to a value ≤ all other values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1, maxLength: 50 }),
        (arr) => {
          const s = new Series({ data: arr });
          const label = idxmin(s) as number;
          const minVal = s.values[label];
          if (minVal === undefined || minVal === null) return true;
          return s.values.every(
            (v) =>
              v === null ||
              v === undefined ||
              (typeof v === "number" && Number.isNaN(v)) ||
              (v as number) >= (minVal as number),
          );
        },
      ),
    );
  });

  test("idxmax label points to a value ≥ all other values", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -1e6, max: 1e6 }), { minLength: 1, maxLength: 50 }),
        (arr) => {
          const s = new Series({ data: arr });
          const label = idxmax(s) as number;
          const maxVal = s.values[label];
          if (maxVal === undefined || maxVal === null) return true;
          return s.values.every(
            (v) =>
              v === null ||
              v === undefined ||
              (typeof v === "number" && Number.isNaN(v)) ||
              (v as number) <= (maxVal as number),
          );
        },
      ),
    );
  });

  test("idxmin and idxmax return labels that exist in the series index", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), {
          minLength: 1,
          maxLength: 20,
        }),
        (arr) => {
          const s = new Series({ data: arr });
          const minLabel = idxmin(s);
          const maxLabel = idxmax(s);
          const indexLabels = s.index.toArray() as number[];
          if (minLabel !== null) {
            expect(indexLabels).toContain(minLabel);
          }
          if (maxLabel !== null) {
            expect(indexLabels).toContain(maxLabel);
          }
        },
      ),
    );
  });

  test("single-element series: idxmin === idxmax", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (v, label) => {
          const s = new Series({ data: [v], index: [label] });
          expect(idxmin(s)).toBe(label);
          expect(idxmax(s)).toBe(label);
        },
      ),
    );
  });

  test("DataFrame axis-0: result indexed by column names", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), {
          minLength: 2,
          maxLength: 10,
        }),
        fc.array(fc.float({ noNaN: true, min: -100, max: 100 }), {
          minLength: 2,
          maxLength: 10,
        }),
        (col1, col2) => {
          const len = Math.min(col1.length, col2.length);
          const df = DataFrame.fromColumns({
            a: col1.slice(0, len),
            b: col2.slice(0, len),
          });
          const result = idxminDataFrame(df);
          expect(result.index.toArray()).toEqual(["a", "b"]);
          const labelA = result.at(0) as number;
          const labelB = result.at(1) as number;
          expect(labelA).toBeGreaterThanOrEqual(0);
          expect(labelA).toBeLessThan(len);
          expect(labelB).toBeGreaterThanOrEqual(0);
          expect(labelB).toBeLessThan(len);
        },
      ),
    );
  });
});
